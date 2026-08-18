import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { getTenantMembers } from '@/lib/services/TenantMembersService';
import { fetchAllRows } from '@/lib/db';
import { getErrorMessage } from '@/lib/utils';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem importar clientes.' },
  { status: 403 }
);

// Uma linha do CSV enviado pelo usuário — campos crus, sem validação ainda.
interface CsvRow {
  documento?: string;
  nome_cliente?: string;
  cidade?: string;
  uf?: string;
  email_ctv?: string;
  grupo_economico?: string;
  cultivo?: string;
  hectares?: string | number;
}

// Linhas do Supabase (snake_case), só os campos selecionados nas queries
// desta rota.
interface ClienteExistenteRow {
  id: string;
  document: string | null;
  name: string;
  city: string;
  state: string;
  ctv_id: string;
}

interface AreaExistenteRow {
  id: string;
  customer_id: string;
  crop_name: string;
  area_ha: number;
}

interface CulturaAtivaRow {
  custom_name: string;
}

interface GrupoEconomicoRow {
  id: string;
  nome: string;
}

interface AreaResolvida {
  cultivo: string;
  hectares: number;
  valida: boolean;
  motivo?: string;
  areaAnteriorHa?: number | null;
}

interface GroupResult {
  key: string;
  documento: string | null;
  nome: string;
  cidade: string;
  uf: string;
  ctvEmail: string;
  ctvId: string | null;
  grupoEconomicoNome: string | null;
  grupoEconomicoId: string | null;
  clienteExistenteId: string | null;
  action: 'create' | 'update' | 'error';
  erro: string | null;
  areas: AreaResolvida[];
  resultado?: 'criado' | 'atualizado' | 'erro';
  erroCommit?: string | null;
}

/**
 * Importação de clientes em massa por CSV, um cliente pode ter várias
 * linhas (uma por cultivo). `dryRun=true` roda toda a resolução/validação
 * sem gravar nada — é a MESMA lógica usada no commit (`dryRun=false`), pra
 * preview e gravação nunca divergirem em regra de negócio. O que pode
 * divergir é o resultado (mundo mudou entre preview e commit) — por isso o
 * commit é best-effort por cliente, não tudo-ou-nada, e a resposta final
 * sempre reflete o que realmente foi gravado, nunca assume que bateu com o
 * preview.
 *
 * Regras de agrupamento (uma linha = cliente × cultivo):
 * - Linhas com o mesmo `documento` sempre viram o mesmo cliente.
 * - Linhas SEM `documento` nunca se fundem entre si (evita duas fazendas de
 *   nome igual virarem uma só por engano) — cada uma só vira "atualização"
 *   se bater nome+cidade+uf+ctv com um cliente JÁ EXISTENTE no tenant.
 */
export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dryRun') !== 'false';

  try {
    const body = await request.json() as { rows?: CsvRow[] };
    const rows: CsvRow[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'SEM_LINHAS', message: 'Nenhuma linha para importar.' }, { status: 400 });
    }

    // fetchAllRows em vez de .select('*') puro: acima de ~1000 clientes o
    // PostgREST truncaria a lista sem erro nenhum, e o matching por
    // documento/nome+cidade+uf+ctv abaixo passaria a falhar em silêncio
    // (viraria "create" duplicado em vez de "update") — achado em
    // auditoria 11/08/2026.
    const [members, culturasAtivasRows, clientesExistentes] = await Promise.all([
      getTenantMembers(ctx.tenantId),
      fetchAllRows<CulturaAtivaRow>((from, to) =>
        ctx.supabase.from('tenant_config_culturas').select('custom_name').eq('is_active', true).range(from, to)
      ),
      fetchAllRows<ClienteExistenteRow>((from, to) =>
        ctx.supabase.from('clientes').select('id, document, name, city, state, ctv_id').range(from, to)
      ),
    ]);

    const membersByEmail = new Map(members.map((m) => [m.email.toLowerCase(), m]));
    const culturasAtivas = new Map(
      culturasAtivasRows.map((c) => [String(c.custom_name).toUpperCase(), c.custom_name])
    );

    const clienteIds = clientesExistentes.map((c) => c.id);
    const [areasExistentes, gruposRows] = await Promise.all([
      clienteIds.length > 0
        ? fetchAllRows<AreaExistenteRow>((from, to) =>
            ctx.supabase
              .from('customer_crop_areas')
              .select('id, customer_id, crop_name, area_ha')
              .in('customer_id', clienteIds)
              .range(from, to)
          )
        : Promise.resolve([] as AreaExistenteRow[]),
      fetchAllRows<GrupoEconomicoRow>((from, to) => ctx.supabase.from('grupos_economicos').select('id, nome').range(from, to)),
    ]);
    const gruposExistentes = new Map(gruposRows.map((g) => [String(g.nome).toUpperCase(), g]));

    // ---- 1. Agrupar linhas em clientes ----
    const groupsByDoc = new Map<string, CsvRow[]>();
    const rowsSemDoc: CsvRow[] = [];

    for (const row of rows) {
      const doc = String(row.documento || '').trim();
      if (doc) {
        if (!groupsByDoc.has(doc)) groupsByDoc.set(doc, []);
        groupsByDoc.get(doc)!.push(row);
      } else {
        rowsSemDoc.push(row);
      }
    }

    const rawGroups: { documento: string | null; rows: CsvRow[] }[] = [
      ...Array.from(groupsByDoc.entries()).map(([documento, groupRows]) => ({ documento, rows: groupRows })),
      ...rowsSemDoc.map((row) => ({ documento: null, rows: [row] })),
    ];

    // ---- 2. Resolver cada grupo (validação — nunca grava aqui) ----
    const results: GroupResult[] = rawGroups.map((g, idx) => {
      const first = g.rows[0];
      const nome = String(first.nome_cliente || '').trim();
      const cidade = String(first.cidade || '').trim();
      const uf = String(first.uf || '').trim().toUpperCase();
      const ctvEmail = String(first.email_ctv || '').trim().toLowerCase();
      const grupoEconomicoNome = String(first.grupo_economico || '').trim() || null;

      const erros: string[] = [];

      if (!nome) erros.push('nome_cliente é obrigatório');
      if (!cidade) erros.push('cidade é obrigatória');
      if (!uf) erros.push('uf é obrigatória');
      if (!ctvEmail) erros.push('email_ctv é obrigatório');

      // Todas as linhas do grupo têm que concordar no CTV — evita atribuir
      // parte da carteira a um CTV e parte a outro por engano de digitação.
      const emailsDistintos = new Set(g.rows.map((r) => String(r.email_ctv || '').trim().toLowerCase()));
      if (emailsDistintos.size > 1) {
        erros.push('linhas deste cliente têm e-mails de CTV diferentes');
      }

      const member = ctvEmail ? membersByEmail.get(ctvEmail) : undefined;
      if (ctvEmail && !member) {
        erros.push(`e-mail de CTV não encontrado neste tenant: ${ctvEmail}`);
      }

      const existente = g.documento
        ? clientesExistentes.find((c) => c.document === g.documento)
        : clientesExistentes.find(
            (c) =>
              String(c.name).trim().toUpperCase() === nome.toUpperCase() &&
              String(c.city).trim().toUpperCase() === cidade.toUpperCase() &&
              String(c.state).trim().toUpperCase() === uf &&
              member &&
              c.ctv_id === member.userId
          );

      const areas: AreaResolvida[] = g.rows.map((row) => {
        const cultivoRaw = String(row.cultivo || '').trim();
        const hectares = Number(row.hectares);
        const cultivoResolvido = culturasAtivas.get(cultivoRaw.toUpperCase());

        if (!cultivoRaw) return { cultivo: cultivoRaw, hectares: 0, valida: false, motivo: 'cultivo é obrigatório' };
        if (!cultivoResolvido)
          return { cultivo: cultivoRaw, hectares: 0, valida: false, motivo: `cultivo não cadastrado no tenant: ${cultivoRaw}` };
        if (!hectares || hectares <= 0)
          return { cultivo: cultivoResolvido, hectares: 0, valida: false, motivo: 'hectares deve ser maior que zero' };

        const areaAnterior = existente
          ? (areasExistentes || []).find(
              (a) => a.customer_id === existente.id && String(a.crop_name).toUpperCase() === cultivoResolvido.toUpperCase()
            )
          : undefined;

        return {
          cultivo: cultivoResolvido,
          hectares,
          valida: true,
          areaAnteriorHa: areaAnterior ? Number(areaAnterior.area_ha) : null,
        };
      });

      const areasValidas = areas.filter((a) => a.valida);
      if (areasValidas.length === 0) erros.push('nenhuma linha de cultivo válida para este cliente');

      const grupoResolvido = grupoEconomicoNome ? gruposExistentes.get(grupoEconomicoNome.toUpperCase()) : undefined;

      return {
        key: g.documento || `linha-${idx + 1}`,
        documento: g.documento,
        nome,
        cidade,
        uf,
        ctvEmail,
        ctvId: member ? member.userId : null,
        grupoEconomicoNome,
        grupoEconomicoId: grupoResolvido ? grupoResolvido.id : null,
        clienteExistenteId: existente ? existente.id : null,
        action: erros.length > 0 ? 'error' : existente ? 'update' : 'create',
        erro: erros.length > 0 ? erros.join('; ') : null,
        areas,
      };
    });

    if (dryRun) {
      return NextResponse.json({
        groups: results,
        resumo: {
          total: results.length,
          criar: results.filter((r) => r.action === 'create').length,
          atualizar: results.filter((r) => r.action === 'update').length,
          erro: results.filter((r) => r.action === 'error').length,
        },
      });
    }

    // ---- 3. Gravar (best-effort por cliente, não tudo-ou-nada) ----
    for (const g of results) {
      if (g.action === 'error') {
        g.resultado = 'erro';
        g.erroCommit = g.erro;
        continue;
      }

      try {
        let grupoEconomicoId = g.grupoEconomicoId;
        if (!grupoEconomicoId && g.grupoEconomicoNome) {
          // Get-or-create: re-checa antes de criar pra não duplicar se o
          // mesmo grupo novo aparecer em mais de uma linha do lote.
          const { data: jaExiste } = await ctx.supabase
            .from('grupos_economicos')
            .select('id')
            .ilike('nome', g.grupoEconomicoNome)
            .maybeSingle();
          if (jaExiste) {
            grupoEconomicoId = jaExiste.id;
          } else {
            const { data: novoGrupo, error: grupoError } = await ctx.supabase
              .from('grupos_economicos')
              .insert({ tenant_id: ctx.tenantId, nome: g.grupoEconomicoNome })
              .select('id')
              .single();
            if (grupoError) throw grupoError;
            grupoEconomicoId = novoGrupo.id;
          }
        }

        let clienteId = g.clienteExistenteId;
        if (!clienteId) {
          const { data: novoCliente, error: clienteError } = await ctx.supabase
            .from('clientes')
            .insert({
              tenant_id: ctx.tenantId,
              ctv_id: g.ctvId,
              name: g.nome,
              city: g.cidade,
              state: g.uf,
              region: 'Região Geral',
              document: g.documento || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              grupo_economico_id: grupoEconomicoId,
            })
            .select('id')
            .single();
          if (clienteError) {
            // unique_violation em (tenant_id, document): outra linha deste
            // mesmo lote já criou um cliente com esse documento entre o
            // preview e agora.
            if (clienteError.code === '23505') {
              throw new Error(`documento já usado por outro cliente deste tenant: ${g.documento}`);
            }
            throw clienteError;
          }
          clienteId = novoCliente.id;
        } else if (grupoEconomicoId) {
          await ctx.supabase
            .from('clientes')
            .update({ grupo_economico_id: grupoEconomicoId, updated_at: new Date().toISOString() })
            .eq('id', clienteId);
        }

        for (const area of g.areas.filter((a) => a.valida)) {
          const { error: areaError } = await ctx.supabase.from('customer_crop_areas').upsert(
            { tenant_id: ctx.tenantId, customer_id: clienteId, crop_name: area.cultivo, area_ha: area.hectares },
            { onConflict: 'customer_id,crop_name' }
          );
          if (areaError) throw areaError;
        }

        g.resultado = g.clienteExistenteId ? 'atualizado' : 'criado';
        g.clienteExistenteId = clienteId;
      } catch (err) {
        g.resultado = 'erro';
        g.erroCommit = getErrorMessage(err) || 'Erro ao gravar';
      }
    }

    return NextResponse.json({
      groups: results,
      resumo: {
        total: results.length,
        criados: results.filter((r) => r.resultado === 'criado').length,
        atualizados: results.filter((r) => r.resultado === 'atualizado').length,
        erros: results.filter((r) => r.resultado === 'erro').length,
      },
    });
  } catch (error) {
    console.error('[api/clientes/import][POST]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível processar a importação.' },
      { status: 503 }
    );
  }
}
