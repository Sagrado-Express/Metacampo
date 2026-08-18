import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { buildItLookup, calcVpm } from '@/lib/services/VpmService';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

type AuthResult =
  | { error: NextResponse; supabase: null; tenantId: null; userId: null }
  | { error: null; supabase: SupabaseClient; tenantId: string; userId: string };

// Formato bruto das linhas do Supabase (snake_case), refletindo as colunas
// reais em docs/schema_completo_supabase.sql — só os campos lidos aqui.
interface ClienteRow {
  id: string;
  tenant_id: string;
  ctv_id: string;
  name: string;
  document: string | null;
  city: string;
  state: string;
  region: string;
  grupo_economico_id: string | null;
}

interface CropAreaRow {
  id: string;
  customer_id: string;
  crop_name: string;
  area_ha: number;
}

interface ItConfigRow {
  crop_name: string;
  segment_name: string;
  value_per_hectare: number;
}

interface ClassificacaoRow {
  custom_name: string;
}

interface CulturaRow {
  custom_name: string;
}

interface GrupoEconomicoRow {
  id: string;
  nome: string;
}

interface AreaInput {
  cropName?: string;
  areaHa?: number | string;
}

interface ClienteRequestBody {
  name?: string;
  city?: string;
  state?: string;
  areas?: AreaInput[];
  cultivo?: string;
  area_hectares?: number | string;
  grupoEconomicoId?: string | null;
}

/**
 * Devolve um client Supabase que carrega o JWT do usuário: o RLS filtra por
 * tenant automaticamente. O tenantId vem da claim assinada — não há mais
 * default para o tenant Piloto, que dava acesso a dados alheios.
 */
async function checkAuth(): Promise<AuthResult> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return {
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      supabase: null,
      tenantId: null,
      userId: null,
    };
  }
  return { error: null, supabase: ctx.supabase, tenantId: ctx.tenantId, userId: ctx.userId };
}

export async function GET(request: Request) {
  const { error, supabase, tenantId } = await checkAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // 1. Fetch customers (with pagination)
    const { data: customers, error: custError, count } = await supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .range(offset, offset + limit - 1) as { data: ClienteRow[] | null; error: PostgrestError | null; count: number | null };

    if (custError) throw custError;

    // 2. Fetch crop areas só dos clientes desta página, não do tenant
    //    inteiro — antes buscava tudo e filtrava em JS por cliente
    //    (O(página × total de áreas do tenant) a cada request), achado em
    //    auditoria de performance 11/08/2026.
    const customerIds = (customers || []).map((c) => c.id);
    const { data: cropAreas, error: areasError } =
      customerIds.length > 0
        ? await supabase.from('customer_crop_areas').select('*').in('customer_id', customerIds) as { data: CropAreaRow[] | null; error: PostgrestError | null }
        : { data: [] as CropAreaRow[], error: null };

    if (areasError) throw areasError;

    // 3. Fetch all IT configurations and build lookup
    const { data: indices } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    // 4. Fetch active segments for VPM calculation
    const { data: segments } = await supabase
      .from('tenant_config_classificacoes')
      .select('custom_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('parent_key', null);

    // Sem fallback para uma lista fixa de segmentos (Regra Nº6): se o tenant
    // não configurou segmento nenhum, o VPM é 0 e a resposta diz o porquê.
    // A versão anterior caía em ['Sementes','Fertilizantes','Defensivos'] e
    // calculava VPM sobre segmentos que o tenant nunca definiu.
    const segNames: string[] = ((segments as ClassificacaoRow[]) || []).map((s) => s.custom_name);
    const semSegmentosConfigurados = segNames.length === 0;

    // 5. Culturas cadastradas do tenant — usadas para distinguir
    //    "cultura não cadastrada" de "Índice Tecnológico não definido".
    //    Os dois zeram o VPM, mas exigem ações diferentes do usuário.
    const { data: culturasCfg } = await supabase
      .from('tenant_config_culturas')
      .select('custom_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const culturasCadastradas = new Set(
      ((culturasCfg as CulturaRow[]) || []).map((c) => String(c.custom_name).toUpperCase())
    );

    // 6. Grupos econômicos do tenant, para exibir o nome junto de cada cliente
    //    sem precisar de uma segunda ida ao banco por linha.
    const { data: gruposCfg } = await supabase
      .from('grupos_economicos')
      .select('id, nome')
      .eq('tenant_id', tenantId);

    const gruposPorId = new Map(((gruposCfg as GrupoEconomicoRow[]) || []).map((g) => [g.id, g.nome]));

    const itLookup = buildItLookup(
      ((indices as ItConfigRow[]) || []).map((ind) => ({
        cultivo: ind.crop_name,
        segmento: ind.segment_name,
        valorPorHectareCentavos: Number(ind.value_per_hectare),
      }))
    );

    // 5. Map customers and calculate VPM on-read
    const result = (customers || []).map(cust => {
      const areas = (cropAreas || []).filter(area => area.customer_id === cust.id);

      let vpmTotalCentavos = 0;
      const mappedAreas = areas.map(area => {
        const areaHa = Number(area.area_ha);
        let areaVpm = 0;

        // Calculate VPM across all segments for this crop area
        for (const seg of segNames) {
          areaVpm += calcVpm({
            hectares: areaHa,
            cropName: area.crop_name,
            segmentName: seg,
            itLookup,
          });
        }
        vpmTotalCentavos += areaVpm;

        // Check if ANY IT is defined for this crop
        const hasIt = segNames.some(seg => {
          const key = `${area.crop_name.toUpperCase()}::${seg.toUpperCase()}`;
          return itLookup[key] != null && itLookup[key] > 0;
        });

        const culturaCadastrada = culturasCadastradas.has(String(area.crop_name).toUpperCase());

        // Um único motivo, na ordem em que o usuário precisa resolver:
        // não adianta pedir Índice Tecnológico de uma cultura que nem existe.
        const aviso = !culturaCadastrada
          ? 'CULTURA_NAO_CADASTRADA'
          : semSegmentosConfigurados
            ? 'SEM_SEGMENTOS_CONFIGURADOS'
            : !hasIt
              ? 'INDICE_TECNOLOGICO_NAO_DEFINIDO'
              : null;

        return {
          id: area.id,
          cropName: area.crop_name,
          areaHa: areaHa,
          vpmCentavos: areaVpm,
          indiceTecnologicoDefinido: hasIt,
          culturaCadastrada,
          aviso,
        };
      });

      // Root level cultivo mapping for Sprint 0.5 view compatibility
      const mainArea = mappedAreas[0];
      // Sum all areas for area_hectares
      const totalAreaHa = mappedAreas.reduce((acc, a) => acc + a.areaHa, 0);

      return {
        id: cust.id,
        tenantId: cust.tenant_id,
        ctvId: cust.ctv_id,
        name: cust.name,
        document: cust.document || '',
        city: cust.city,
        state: cust.state,
        region: cust.region,
        cultivo: mainArea ? mainArea.cropName : '-',
        area_hectares: totalAreaHa,
        areas: mappedAreas,
        vpmTotalCentavos,
        vpm_total_centavos: vpmTotalCentavos,
        grupoEconomicoId: cust.grupo_economico_id || null,
        grupoEconomicoNome: cust.grupo_economico_id ? gruposPorId.get(cust.grupo_economico_id) || null : null,
      };
    });

    return NextResponse.json({
      data: result,
      // Estado da configuração do tenant, para a tela explicar VPM zerado
      // em vez de mostrar zero sem motivo.
      configuracao: {
        semSegmentosConfigurados,
        semCulturasConfiguradas: culturasCadastradas.size === 0,
        culturasNaoCadastradas: [
          ...new Set(
            result
              .flatMap((c) => c.areas)
              .filter((a) => !a.culturaCadastrada)
              .map((a) => a.cropName)
          ),
        ],
      },
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (err) {
    console.error('[api/clientes] Supabase error (GET):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível carregar os dados do banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const { error, supabase, tenantId, userId } = await checkAuth();
  if (error) return error;
  const ctvId = userId;

  try {
    const body = await request.json() as ClienteRequestBody;
    const { name, city, state, areas, cultivo: bodyCultivo, area_hectares: bodyAreaHa, grupoEconomicoId } = body;

    // Parse areas list: support new multi-crop format and fallback to old single-crop format
    const areaList: { cropName: string; areaHa: number }[] =
      Array.isArray(areas) && areas.length > 0
        ? areas
            .map((a) => ({ cropName: a.cropName ?? '', areaHa: Number(a.areaHa) }))
            .filter((a) => a.cropName && a.areaHa > 0)
        : bodyCultivo && bodyAreaHa
          ? [{ cropName: bodyCultivo, areaHa: Number(bodyAreaHa) }]
          : [];

    if (areaList.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos um cultivo com área.' }, { status: 400 });
    }

    // Fetch IT configurations from database for this tenant
    const { data: indices } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    const itLookup = buildItLookup(
      ((indices as ItConfigRow[]) || []).map((ind) => ({
        cultivo: ind.crop_name,
        segmento: ind.segment_name,
        valorPorHectareCentavos: Number(ind.value_per_hectare),
      }))
    );

    // Fetch active segments to calculate VPM across all of them
    const { data: segments } = await supabase
      .from('tenant_config_classificacoes')
      .select('custom_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('parent_key', null);

    // Sem fallback para lista fixa de segmentos (Regra Nº6): tenant sem
    // segmento configurado resulta em VPM 0, nunca em VPM sobre segmento fantasma.
    const segNames: string[] = ((segments as ClassificacaoRow[]) || []).map((s) => s.custom_name);

    // Calculate VPM per area
    const vpmPorArea = areaList.map((a) => {
      let vpm = 0;
      for (const seg of segNames) {
        vpm += calcVpm({ hectares: a.areaHa, cropName: a.cropName, segmentName: seg, itLookup });
      }
      return vpm;
    });
    const vpmCentavos = vpmPorArea.reduce((acc, v) => acc + v, 0);

    // 1. Insert customer
    const { data: customer, error: custError } = await supabase
      .from('clientes')
      .insert({
        tenant_id: tenantId,
        ctv_id: ctvId,
        name,
        city,
        state,
        region: 'Região Geral',
        document: `doc-${Date.now()}`,
        grupo_economico_id: grupoEconomicoId || null,
      })
      .select()
      .single() as { data: ClienteRow; error: PostgrestError | null };

    if (custError) throw custError;

    // 2. Insert crop areas (all of them)
    const { data: areasData, error: areaError } = await supabase
      .from('customer_crop_areas')
      .insert(
        areaList.map((a) => ({
          tenant_id: tenantId,
          customer_id: customer.id,
          crop_name: a.cropName,
          area_ha: a.areaHa
        }))
      )
      .select() as { data: CropAreaRow[] | null; error: PostgrestError | null };

    if (areaError) throw areaError;

    const returnedClient = {
      id: customer.id,
      tenantId: customer.tenant_id,
      ctvId: customer.ctv_id,
      name: customer.name,
      city: customer.city,
      state: customer.state,
      cultivo: areaList[0].cropName,
      area_hectares: areaList.reduce((sum, a) => sum + a.areaHa, 0),
      areas: (areasData || []).map((area, idx) => ({
        id: area.id,
        cropName: area.crop_name,
        areaHa: Number(area.area_ha),
        vpmCentavos: vpmPorArea[idx]
      })),
      vpm_total_centavos: vpmCentavos,
      vpmTotalCentavos: vpmCentavos,
      grupoEconomicoId: customer.grupo_economico_id || null,
    };

    return NextResponse.json(returnedClient, { status: 201 });
  } catch (err) {
    console.error('[api/clientes] Supabase error (POST):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível salvar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  const { error, supabase, tenantId } = await checkAuth();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  try {
    const body = await request.json() as ClienteRequestBody;
    const { name, city, state, areas, cultivo: bodyCultivo, area_hectares: bodyAreaHa, grupoEconomicoId } = body;

    // Parse areas list: support new multi-crop format and fallback to old single-crop format
    const areaList: { cropName: string; areaHa: number }[] =
      Array.isArray(areas) && areas.length > 0
        ? areas
            .map((a) => ({ cropName: a.cropName ?? '', areaHa: Number(a.areaHa) }))
            .filter((a) => a.cropName && a.areaHa > 0)
        : bodyCultivo && bodyAreaHa
          ? [{ cropName: bodyCultivo, areaHa: Number(bodyAreaHa) }]
          : [];

    if (areaList.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos um cultivo com área.' }, { status: 400 });
    }

    // Fetch IT configurations from database for this tenant
    const { data: indices } = await supabase
      .from('it_se_configurations')
      .select('*')
      .eq('tenant_id', tenantId);

    const itLookup = buildItLookup(
      ((indices as ItConfigRow[]) || []).map((ind) => ({
        cultivo: ind.crop_name,
        segmento: ind.segment_name,
        valorPorHectareCentavos: Number(ind.value_per_hectare),
      }))
    );

    // Fetch active segments
    const { data: segments } = await supabase
      .from('tenant_config_classificacoes')
      .select('custom_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('parent_key', null);

    // Sem fallback para lista fixa de segmentos (Regra Nº6): tenant sem
    // segmento configurado resulta em VPM 0, nunca em VPM sobre segmento fantasma.
    const segNames: string[] = ((segments as ClassificacaoRow[]) || []).map((s) => s.custom_name);

    // Calculate VPM per area
    const vpmPorArea = areaList.map((a) => {
      let vpm = 0;
      for (const seg of segNames) {
        vpm += calcVpm({ hectares: a.areaHa, cropName: a.cropName, segmentName: seg, itLookup });
      }
      return vpm;
    });
    const vpmCentavos = vpmPorArea.reduce((acc, v) => acc + v, 0);

    // 1. Update customer in DB
    const { data: customer, error: custError } = await supabase
      .from('clientes')
      .update({
        name,
        city,
        state,
        grupo_economico_id: grupoEconomicoId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single() as { data: ClienteRow; error: PostgrestError | null };

    if (custError) throw custError;

    // 2. Delete old areas and insert new ones
    await supabase
      .from('customer_crop_areas')
      .delete()
      .eq('customer_id', id)
      .eq('tenant_id', tenantId);

    const { data: areasData, error: areaError } = await supabase
      .from('customer_crop_areas')
      .insert(
        areaList.map((a) => ({
          tenant_id: tenantId,
          customer_id: id,
          crop_name: a.cropName,
          area_ha: a.areaHa
        }))
      )
      .select() as { data: CropAreaRow[] | null; error: PostgrestError | null };

    if (areaError) throw areaError;

    return NextResponse.json({
      id: customer.id,
      tenantId: customer.tenant_id,
      name: customer.name,
      city: customer.city,
      state: customer.state,
      cultivo: areaList[0].cropName,
      area_hectares: areaList.reduce((sum, a) => sum + a.areaHa, 0),
      areas: (areasData || []).map((area, idx) => ({
        id: area.id,
        cropName: area.crop_name,
        areaHa: Number(area.area_ha),
        vpmCentavos: vpmPorArea[idx]
      })),
      vpm_total_centavos: vpmCentavos,
      vpmTotalCentavos: vpmCentavos,
      grupoEconomicoId: customer.grupo_economico_id || null,
    });
  } catch (err) {
    console.error('[api/clientes] Supabase error (PATCH):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível atualizar os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  const { error, supabase, tenantId } = await checkAuth();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  try {
    const { error: dbError } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/clientes] Supabase error (DELETE):', err);
    return NextResponse.json(
      {
        error: 'DATA_SOURCE_UNAVAILABLE',
        message: 'Não foi possível excluir os dados no banco. Tente novamente em instantes.',
      },
      { status: 503 }
    );
  }
}
