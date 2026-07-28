/**
 * Catálogo de produtos agrícolas da PAM/IBGE.
 *
 * Isto é um CATÁLOGO, não uma lista fixa: serve para o tenant habilitar o que
 * atende sem digitar tudo, e continua sendo possível criar culturas fora dele
 * (ex.: "HF" agrupando frutas e vegetais, ou "Milho safrinha" separado do
 * "Milho safra"). A Regra Nº6 do CLAUDE.md proíbe lista FIXA — o catálogo não
 * limita o tenant, apenas o poupa de digitação.
 *
 * Fica em código, e não em tabela, porque é dado de referência que muda de
 * década em década: virar tabela significaria 64 linhas por tenant no banco,
 * com RLS, para conteúdo idêntico em todos eles.
 *
 * Lista conforme fornecida pelo usuário a partir da classificação do IBGE
 * (culturas temporárias e permanentes da Produção Agrícola Municipal).
 */

export type TipoCultura = 'temporaria' | 'permanente';

export interface ProdutoIbge {
  nome: string;
  tipo: TipoCultura;
}

/** Ciclo curto ou médio: exigem novo plantio após cada colheita. */
export const CULTURAS_TEMPORARIAS: string[] = [
  'Abacaxi',
  'Algodão herbáceo (em caroço)',
  'Alho',
  'Amendoim (em casca)',
  'Arroz (em casca)',
  'Aveia (em grão)',
  'Batata-doce',
  'Batata-inglesa',
  'Cana-de-açúcar',
  'Cebola',
  'Cevada (em grão)',
  'Cevada (em palha)',
  'Ervilha (em grão)',
  'Fava (em grão)',
  'Feijão (em grão)',
  'Fumo (em folha)',
  'Girassol (em grão)',
  'Juta (fibra)',
  'Linho (semente)',
  'Malva (fibra)',
  'Mamona (em baga)',
  'Mandioca',
  'Melancia',
  'Melão',
  'Milho (em grão)',
  'Rami (fibra)',
  'Soja (em grão)',
  'Sorgo (em grão)',
  'Tomate',
  'Trigo (em grão)',
  'Triticale (em grão)',
];

/** Ciclo longo: produzem por vários anos sem replantio. */
export const CULTURAS_PERMANENTES: string[] = [
  'Abacate',
  'Açaí (fruto)',
  'Azeitona',
  'Banana (cacho)',
  'Cacau (em amêndoa)',
  'Café (Total - Arábica e Canephora)',
  'Cajá',
  'Caju',
  'Caqui',
  'Castanha-de-caju',
  'Chá-da-índia (folha verde)',
  'Coco-da-baía',
  'Dendê (cacho de frutos)',
  'Figo',
  'Goiaba',
  'Guaraná (semente)',
  'Kiwi',
  'Laranja',
  'Limão',
  'Maçã',
  'Mamão',
  'Manga',
  'Maracujá',
  'Marmelo',
  'Noz (fruto seco)',
  'Palmito',
  'Pera',
  'Pêssego',
  'Pimenta-do-reino',
  'Pinha',
  'Romã',
  'Seringueira (coágulo e látex)',
  'Tangerina',
];

export const CATALOGO_IBGE: ProdutoIbge[] = [
  ...CULTURAS_TEMPORARIAS.map((nome): ProdutoIbge => ({ nome, tipo: 'temporaria' })),
  ...CULTURAS_PERMANENTES.map((nome): ProdutoIbge => ({ nome, tipo: 'permanente' })),
];

export const TOTAL_TEMPORARIAS = CULTURAS_TEMPORARIAS.length;
export const TOTAL_PERMANENTES = CULTURAS_PERMANENTES.length;
