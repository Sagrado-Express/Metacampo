/**
 * Catálogo de produtos agrícolas da PAM/IBGE, com separação por safra do
 * LSPA/IBGE onde ela existe.
 *
 * Isto é um CATÁLOGO, não uma lista fixa: serve para o tenant habilitar o que
 * atende sem digitar tudo, e continua sendo possível criar culturas fora dele
 * (ex.: "HF" agrupando frutas e vegetais). A Regra Nº6 do CLAUDE.md proíbe
 * lista FIXA — o catálogo não limita o tenant, apenas o poupa de digitação.
 *
 * Fica em código, e não em tabela, porque é dado de referência que muda de
 * década em década: virar tabela significaria uma linha por tenant no banco,
 * com RLS, para conteúdo idêntico em todos eles.
 *
 * Base: PAM (Produção Agrícola Municipal), 31 temporárias + 33 permanentes,
 * conforme fornecida pelo usuário a partir da classificação do IBGE. A PAM
 * não separa por safra (ex.: um "Milho (em grão)" só, somando 1ª e 2ª safra).
 *
 * Safra/variedade (19/08/2026): decisão da reunião Daniel×Marco Polo foi
 * separar por safra os produtos onde isso muda o pacote tecnológico — dado
 * que a PAM não tem, mas o LSPA (Levantamento Sistemático da Produção
 * Agrícola) sim. Extraído de 96 arquivos LSPA (nov/2025-dez/2026, ver
 * memória `reuniao_2026-08-19_marco_polo.md`): só 5 produtos têm essa
 * separação nacionalmente — Milho (1ª/2ª safra), Feijão (1ª/2ª/3ª),
 * Batata-inglesa (1ª/2ª/3ª), Amendoim (1ª/2ª), e Café por variedade
 * (Arábica/Canephora, não safra). Os outros 21 produtos do LSPA já existiam
 * na PAM sem diferença de nome — não duplicados aqui.
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
  'Amendoim (em casca) 1ª safra',
  'Amendoim (em casca) 2ª safra',
  'Arroz (em casca)',
  'Aveia (em grão)',
  'Batata-doce',
  'Batata-inglesa 1ª safra',
  'Batata-inglesa 2ª safra',
  'Batata-inglesa 3ª safra',
  'Cana-de-açúcar',
  'Cebola',
  'Cevada (em grão)',
  'Cevada (em palha)',
  'Ervilha (em grão)',
  'Fava (em grão)',
  'Feijão (em grão) 1ª safra',
  'Feijão (em grão) 2ª safra',
  'Feijão (em grão) 3ª safra',
  'Fumo (em folha)',
  'Girassol (em grão)',
  'Juta (fibra)',
  'Linho (semente)',
  'Malva (fibra)',
  'Mamona (em baga)',
  'Mandioca',
  'Melancia',
  'Melão',
  'Milho (em grão) 1ª safra',
  'Milho (em grão) 2ª safra',
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
  'Café (em grão) Arábica',
  'Café (em grão) Canephora',
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
