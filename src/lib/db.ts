/**
 * O PostgREST (Supabase) trunca silenciosamente por volta de 1000 linhas
 * quando a query não usa `.range()` — sem erro, sem aviso. Pra rotas que
 * genuinamente precisam da tabela inteira (agregados, matching de import),
 * isso corrompe o resultado assim que o tenant passa de ~1000 linhas numa
 * tabela, não quando "escala" — é hoje mesmo, só que meio invisível com
 * poucas dezenas de linhas por tenant. `fetchAllRows` pagina de verdade até
 * a página vir menor que o tamanho pedido.
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await buildQuery(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}
