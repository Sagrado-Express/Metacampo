/**
 * Soma valor_planejado_centavos (a "meta") por CTV × segmento, juntando
 * planejamento_cliente_segmento -> clientes.ctv_id — NUNCA pelo ctv_id
 * gravado na própria linha de planejamento, que reflete quem clicou na
 * célula do Heatmap (pode ser um admin editando em nome de outro CTV), não
 * o dono do cliente. Mesmo cuidado que /api/tenant/members já toma pro VPM
 * potencial. Usado tanto na importação de faturamento (calcular a meta de
 * cada linha) quanto no Acompanhamento Orçamentário (Passo 5) — extraído
 * pra não duplicar essa junção (e o cuidado acima) nos dois lugares.
 */

export interface ClienteCtvRow {
  id: string;
  ctv_id: string;
}

export interface PlanejamentoValorRow {
  cliente_id: string;
  segmento: string;
  valor_planejado_centavos: number;
}

/** Chave do mapa retornado: `${ctvId}|${segmento}`. */
export function computeMetaPorCtvSegmento(
  clientes: ClienteCtvRow[],
  planejamentoRows: PlanejamentoValorRow[]
): Map<string, number> {
  const ctvIdPorCliente = new Map(clientes.map((c) => [c.id, c.ctv_id]));
  const metaPorCtvSegmento = new Map<string, number>();

  for (const p of planejamentoRows) {
    const ctvId = ctvIdPorCliente.get(p.cliente_id);
    if (!ctvId) continue;
    const key = `${ctvId}|${p.segmento}`;
    metaPorCtvSegmento.set(key, (metaPorCtvSegmento.get(key) || 0) + Number(p.valor_planejado_centavos || 0));
  }

  return metaPorCtvSegmento;
}
