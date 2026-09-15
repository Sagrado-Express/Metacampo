/**
 * Regra de negócio pura da importação de faturamento (real vendido) por
 * CSV — sem I/O, testável do mesmo jeito que ImportClientesService.ts.
 * Extraído de src/app/api/faturamento/import/route.ts (que continua fazendo
 * toda a busca no banco e a gravação; só a resolução/validação de cada
 * linha mora aqui).
 *
 * faturamento_snapshots é pré-agregada em (mes, ctv, segmento) — não guarda
 * produto nem cliente individual — então várias linhas do CSV pra essa
 * mesma combinação somam entre si em vez de virar erro de duplicidade.
 */

import { parseBRLParaCentavos } from '@/lib/utils';

// Uma linha do CSV enviado pelo usuário — campos crus, sem validação ainda.
export interface FaturamentoCsvRow {
  mes?: string;
  email_ctv?: string;
  segmento?: string;
  valor_realizado?: string | number;
}

export interface FaturamentoMemberLike {
  userId: string;
  email: string;
}

export interface ResolveFaturamentoContext {
  /** e-mail (lowercase) -> membro do tenant, pra resolver email_ctv. */
  membersByEmail: Map<string, FaturamentoMemberLike>;
  /** nome ou apelido (lowercase) -> nome de exibição ATUAL do grupo de produto. */
  segmentoPorNomeOuApelido: Map<string, string>;
  /** `${ctvUserId}|${segmentoCustomName}` -> soma de valor_planejado_centavos (a meta). */
  metaPorCtvSegmento: Map<string, number>;
  /** `${mes}|${ctvUserId}|${segmentoCustomName}` já gravado — upsert vira "update", não "create". */
  existentes: Set<string>;
}

export interface FaturamentoResolvido {
  key: string;
  mes: string;
  ctvEmail: string;
  ctvId: string | null;
  segmentoOriginal: string;
  segmentoResolvido: string | null;
  valorRealizadoCentavos: number;
  valorMetaCentavos: number;
  action: 'create' | 'update' | 'error';
  erro: string | null;
  resultado?: 'criado' | 'substituido' | 'erro';
  erroCommit?: string | null;
}

interface LinhaResolvida {
  mes: string | null;
  ctvEmail: string;
  ctvId: string | null;
  segmentoOriginal: string;
  segmentoResolvido: string | null;
  valorRealizadoCentavos: number;
  erro: string | null;
}

const MESES_VALIDOS = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);

function normalizarMes(raw: string): string | null {
  const trimmed = raw.trim();
  const padded = trimmed.length === 1 ? `0${trimmed}` : trimmed;
  return MESES_VALIDOS.has(padded) ? padded : null;
}

/**
 * Resolve e agrupa as linhas cruas do CSV de faturamento contra o estado
 * atual do tenant (membros, grupos de produto ativos, meta já planejada e
 * meses já importados). Nunca grava nada — é a MESMA função usada tanto no
 * preview (`dryRun=true`) quanto no commit, pra preview e gravação nunca
 * divergirem de regra.
 */
export function resolveFaturamentoImport(
  rows: FaturamentoCsvRow[],
  ctx: ResolveFaturamentoContext
): FaturamentoResolvido[] {
  const { membersByEmail, segmentoPorNomeOuApelido, metaPorCtvSegmento, existentes } = ctx;

  const linhas: LinhaResolvida[] = rows.map((row) => {
    const erros: string[] = [];

    const mesRaw = String(row.mes || '').trim();
    const mes = normalizarMes(mesRaw);
    if (!mes) erros.push(`mês inválido: "${mesRaw || '(vazio)'}" (use 01-12)`);

    const ctvEmail = String(row.email_ctv || '').trim().toLowerCase();
    const member = ctvEmail ? membersByEmail.get(ctvEmail) : undefined;
    if (!ctvEmail) erros.push('email_ctv é obrigatório');
    else if (!member) erros.push(`e-mail de CTV não encontrado neste tenant: ${ctvEmail}`);

    const segmentoOriginal = String(row.segmento || '').trim();
    const segmentoResolvido = segmentoOriginal
      ? (segmentoPorNomeOuApelido.get(segmentoOriginal.toLowerCase()) ?? null)
      : null;
    if (!segmentoOriginal) erros.push('segmento é obrigatório');
    else if (!segmentoResolvido) erros.push(`grupo de produto não reconhecido no tenant: ${segmentoOriginal}`);

    const valorRealizadoCentavos = parseBRLParaCentavos(String(row.valor_realizado ?? '0'));
    if (valorRealizadoCentavos <= 0) erros.push('valor_realizado deve ser maior que zero');

    return {
      mes,
      ctvEmail,
      ctvId: member ? member.userId : null,
      segmentoOriginal,
      segmentoResolvido,
      valorRealizadoCentavos,
      erro: erros.length > 0 ? erros.join('; ') : null,
    };
  });

  // Agrupa as linhas válidas por (mes, ctv, segmento), somando o valor —
  // a tabela é pré-agregada nesse grão, sem granularidade mais fina
  // (produto/cliente) a preservar dentro de um mesmo upload.
  const gruposValidos = new Map<string, LinhaResolvida>();
  const linhasComErro: LinhaResolvida[] = [];

  for (const linha of linhas) {
    if (linha.erro || !linha.mes || !linha.ctvId || !linha.segmentoResolvido) {
      linhasComErro.push(linha);
      continue;
    }
    const key = `${linha.mes}|${linha.ctvId}|${linha.segmentoResolvido}`;
    const atual = gruposValidos.get(key);
    if (atual) {
      atual.valorRealizadoCentavos += linha.valorRealizadoCentavos;
    } else {
      gruposValidos.set(key, { ...linha });
    }
  }

  const resolvidos: FaturamentoResolvido[] = linhasComErro.map((linha, idx) => ({
    key: `erro-${idx + 1}`,
    mes: linha.mes || '',
    ctvEmail: linha.ctvEmail,
    ctvId: linha.ctvId,
    segmentoOriginal: linha.segmentoOriginal,
    segmentoResolvido: linha.segmentoResolvido,
    valorRealizadoCentavos: linha.valorRealizadoCentavos,
    valorMetaCentavos: 0,
    action: 'error',
    erro: linha.erro,
  }));

  for (const [key, linha] of gruposValidos) {
    const metaKey = `${linha.ctvId}|${linha.segmentoResolvido}`;
    resolvidos.push({
      key,
      mes: linha.mes as string,
      ctvEmail: linha.ctvEmail,
      ctvId: linha.ctvId,
      segmentoOriginal: linha.segmentoOriginal,
      segmentoResolvido: linha.segmentoResolvido,
      valorRealizadoCentavos: linha.valorRealizadoCentavos,
      valorMetaCentavos: metaPorCtvSegmento.get(metaKey) || 0,
      action: existentes.has(key) ? 'update' : 'create',
      erro: null,
    });
  }

  return resolvidos;
}
