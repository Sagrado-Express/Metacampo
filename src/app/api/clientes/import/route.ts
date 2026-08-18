import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { getTenantMembers } from '@/lib/services/TenantMembersService';
import { fetchAllRows } from '@/lib/db';
import { getErrorMessage } from '@/lib/utils';
import { rateLimitResponse } from '@/lib/rateLimiter';
import {
  resolveImportGroups,
  type CsvRow,
  type ClienteExistenteRow,
  type AreaExistenteRow,
  type GrupoEconomicoRow,
} from '@/lib/services/ImportClientesService';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem importar clientes.' },
  { status: 403 }
);

interface CulturaAtivaRow {
  custom_name: string;
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
  // Operação pesada (lê o tenant inteiro, grava em lote) — limite bem mais
  // baixo que as rotas de config comuns, mas ainda dá espaço pra alguns
  // ciclos de preview (dryRun=true) enquanto o usuário corrige o CSV.
  const limited = rateLimitResponse(ctx.userId, 12);
  if (limited) return limited;

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

    // Agrupamento + resolução/validação: lógica pura, sem I/O, extraída pra
    // src/lib/services/ImportClientesService.ts (testada em
    // ImportClientesService.test.ts).
    const results = resolveImportGroups(rows, {
      membersByEmail,
      culturasAtivas,
      clientesExistentes,
      areasExistentes,
      gruposExistentes,
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
