import { NextResponse } from 'next/server';
import { getAuthedContext } from '@/lib/auth';
import { getTenantMembers } from '@/lib/services/TenantMembersService';
import { fetchAllRows } from '@/lib/db';
import { getErrorMessage } from '@/lib/utils';
import { rateLimitResponse } from '@/lib/rateLimiter';
import { SegmentDictionaryService } from '@/domain/services/segmentDictionary.service';
import { computeMetaPorCtvSegmento, type ClienteCtvRow, type PlanejamentoValorRow } from '@/lib/services/PlanejamentoMetaService';
import {
  resolveFaturamentoImport,
  type FaturamentoCsvRow,
  type FaturamentoMemberLike,
} from '@/lib/services/FaturamentoImportService';

const UNAUTHORIZED = NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: 'FORBIDDEN', message: 'Só administradores podem importar faturamento.' },
  { status: 403 }
);

interface FaturamentoExistenteRow {
  mes: string;
  id_ctv: string;
  segmento: string;
}

/**
 * Importação de faturamento (real vendido) em massa por CSV — fecha o
 * Épico 5 do PRD (Passo 12 do GTMGC). `dryRun=true` roda toda a
 * resolução/validação sem gravar nada, igual ao padrão já usado em
 * /api/clientes/import — preview e commit usam a MESMA função
 * (resolveFaturamentoImport), nunca podem divergir em regra de negócio.
 *
 * A meta (`valor_meta_centavos`) não vem do CSV: é somada, na hora, a
 * partir de planejamento_cliente_segmento — join por `clientes.ctv_id`,
 * não pelo `ctv_id` gravado na própria linha de planejamento (que reflete
 * quem clicou na célula do Heatmap, não o dono do cliente — mesmo cuidado
 * que /api/tenant/members já toma).
 */
export async function POST(request: Request) {
  const ctx = await getAuthedContext();
  if (!ctx) return UNAUTHORIZED;
  if (ctx.role !== 'admin') return FORBIDDEN;
  const limited = rateLimitResponse(ctx.userId, 12);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dryRun') !== 'false';

  try {
    const body = (await request.json()) as { rows?: FaturamentoCsvRow[] };
    const rows: FaturamentoCsvRow[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'SEM_LINHAS', message: 'Nenhuma linha para importar.' }, { status: 400 });
    }

    // fetchAllRows nas tabelas que crescem com o tenant — mesmo motivo de
    // /api/clientes/import: acima de ~1000 linhas o PostgREST trunca sem
    // erro, e o join clientes->planejamento pra calcular a meta ficaria
    // sub-contado em silêncio.
    const [members, classificacoes, clientes, existentesRows] = await Promise.all([
      getTenantMembers(ctx.tenantId),
      SegmentDictionaryService.getActiveClassificacoes(ctx.supabase, ctx.tenantId),
      fetchAllRows<ClienteCtvRow>((from, to) => ctx.supabase.from('clientes').select('id, ctv_id').range(from, to)),
      fetchAllRows<FaturamentoExistenteRow>((from, to) =>
        ctx.supabase.from('faturamento_snapshots').select('mes, id_ctv, segmento').range(from, to)
      ),
    ]);

    const membersByEmail = new Map<string, FaturamentoMemberLike>(
      members.map((m) => [m.email.toLowerCase(), { userId: m.userId, email: m.email }])
    );

    // Nome OU apelido (lowercase) -> nome de exibição atual — mesma ideia
    // de SegmentDictionaryService.buildInvertedMap, mas resolvendo pro
    // custom_name (o que planejamento_cliente_segmento/faturamento_snapshots
    // de fato guardam), não pro internal_key.
    const segmentoPorNomeOuApelido = new Map<string, string>();
    for (const c of classificacoes) {
      segmentoPorNomeOuApelido.set(c.customName.toLowerCase(), c.customName);
      for (const alias of c.aliases) segmentoPorNomeOuApelido.set(alias.toLowerCase(), c.customName);
    }

    const clienteIds = clientes.map((c) => c.id);
    const planejamentoRows =
      clienteIds.length > 0
        ? await fetchAllRows<PlanejamentoValorRow>((from, to) =>
            ctx.supabase
              .from('planejamento_cliente_segmento')
              .select('cliente_id, segmento, valor_planejado_centavos')
              .in('cliente_id', clienteIds)
              .range(from, to)
          )
        : [];

    const metaPorCtvSegmento = computeMetaPorCtvSegmento(clientes, planejamentoRows);
    const existentes = new Set(existentesRows.map((r) => `${r.mes}|${r.id_ctv}|${r.segmento}`));

    // Agrupamento + resolução/validação: lógica pura, sem I/O, extraída pra
    // src/lib/services/FaturamentoImportService.ts (testada em
    // FaturamentoImportService.test.ts).
    const results = resolveFaturamentoImport(rows, {
      membersByEmail,
      segmentoPorNomeOuApelido,
      metaPorCtvSegmento,
      existentes,
    });

    if (dryRun) {
      return NextResponse.json({
        rows: results,
        resumo: {
          total: results.length,
          criar: results.filter((r) => r.action === 'create').length,
          substituir: results.filter((r) => r.action === 'update').length,
          erro: results.filter((r) => r.action === 'error').length,
        },
      });
    }

    const validos = results.filter((r) => r.action !== 'error');
    if (validos.length > 0) {
      const { error } = await ctx.supabase.from('faturamento_snapshots').upsert(
        validos.map((r) => ({
          tenant_id: ctx.tenantId,
          mes: r.mes,
          id_ctv: r.ctvId,
          segmento: r.segmentoResolvido,
          valor_realizado_centavos: r.valorRealizadoCentavos,
          valor_meta_centavos: r.valorMetaCentavos,
        })),
        { onConflict: 'tenant_id,mes,id_ctv,segmento' }
      );

      for (const r of results) {
        if (r.action === 'error') {
          r.resultado = 'erro';
          r.erroCommit = r.erro;
        } else {
          r.resultado = error ? 'erro' : r.action === 'create' ? 'criado' : 'substituido';
          r.erroCommit = error ? getErrorMessage(error) : null;
        }
      }
    } else {
      for (const r of results) {
        r.resultado = 'erro';
        r.erroCommit = r.erro;
      }
    }

    return NextResponse.json({
      rows: results,
      resumo: {
        total: results.length,
        criados: results.filter((r) => r.resultado === 'criado').length,
        substituidos: results.filter((r) => r.resultado === 'substituido').length,
        erros: results.filter((r) => r.resultado === 'erro').length,
      },
    });
  } catch (error) {
    console.error('[api/faturamento/import][POST]', error);
    return NextResponse.json(
      { error: 'DATA_SOURCE_UNAVAILABLE', message: 'Não foi possível processar a importação.' },
      { status: 503 }
    );
  }
}
