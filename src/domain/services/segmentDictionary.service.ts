/**
 * Antigravity V4 - Segment Dictionary Service
 * 
 * Manages the lifecycle of the tenant's product classification dictionary.
 * Implements the "Dictionary Pattern" (Metadata-Oriented Architecture):
 * - internal_key: canonical UPPER_SNAKE_CASE code used by all engines
 * - custom_name: display name customized by the tenant
 * - aliases: alternative names for CSV/ERP matching
 * - parent_key: hierarchy support (Classification → Sub-classification)
 * 
 * Aligned with Meeting Daniel × Marco Polo (16/06/2026):
 * "Exists a battle naval A1, A2, A3... cells have codes. 
 *  The whole system does calculations looking at the code.
 *  But the name I bring is associated to what I decided to call it."
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TenantClassificacao, TenantCultura } from '@/types/schema';

// ============================================================
// Types
// ============================================================
//
// TenantClassificacao e TenantCultura vem de @/types/schema — fonte unica.
// Ate 17/08/2026 este arquivo tinha sua propria copia de TenantCultura com
// ibgeProduto/ibgeTipo que a copia em @/types/schema nao tinha, forcando
// CatalogoCulturas.tsx a manter um terceiro tipo local so pra contornar o
// tipo compartilhado incompleto. Reexportar aqui mantem quem ja importa
// { TenantClassificacao, TenantCultura } deste arquivo funcionando.

export type { TenantClassificacao, TenantCultura };

export interface ClassificacaoTree {
  root: TenantClassificacao;
  children: TenantClassificacao[];
}

export interface CreateClassificacaoInput {
  customName: string;
  parentKey?: string | null;
  aliases?: string[];
  color?: string;
  displayOrder?: number;
}

export interface UpdateClassificacaoInput {
  customName?: string;
  aliases?: string[];
  isActive?: boolean;
  displayOrder?: number;
  color?: string;
}

export interface CreateCulturaInput {
  customName: string;
  displayOrder?: number;
  aliases?: string[];
  /** De-para inicial (0, 1 ou N produtos IBGE) — ver CulturaIbgeProduto. */
  ibgeProdutos?: { produto: string; tipo: 'temporaria' | 'permanente' | null }[];
}

interface ClassificacaoUpdatePayload {
  custom_name?: string;
  aliases?: string[];
  is_active?: boolean;
  display_order?: number;
  color?: string;
}

interface CulturaUpdatePayload {
  custom_name?: string;
  display_order?: number;
  is_active?: boolean;
  aliases?: string[];
}

// Formato bruto das linhas como o Supabase devolve (snake_case), refletindo
// as colunas reais de tenant_config_classificacoes / tenant_config_culturas
// em docs/schema_completo_supabase.sql.
interface ClassificacaoRow {
  id: string;
  tenant_id: string;
  internal_key: string;
  parent_key: string | null;
  custom_name: string;
  aliases: string[] | null;
  is_active: boolean | null;
  display_order: number | null;
  color: string | null;
  created_at: string | null;
}

interface CulturaRow {
  id: string;
  tenant_id: string;
  internal_key: string;
  custom_name: string;
  aliases: string[] | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
}

// Linha de tenant_cultura_ibge_produtos (de-para, N produtos por cultura).
interface CulturaIbgeProdutoRow {
  tenant_cultura_id: string;
  ibge_produto: string;
  ibge_tipo: 'temporaria' | 'permanente' | null;
}

// ============================================================
// Normalization
// ============================================================

/**
 * Normalizes a display name into an UPPER_SNAKE_CASE internal key.
 * Removes accents, special characters, and collapses whitespace.
 */
export function normalizeToKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove accents (diacritical marks)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')       // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_')               // Collapse consecutive underscores
    .replace(/^_|_$/g, '');            // Trim leading/trailing underscores
}

// ============================================================
// Default color palette (Morning Dew theme)
// ============================================================

const DEFAULT_COLORS = [
  '#22C55E', // Verde Clorofila
  '#3B82F6', // Azul Safira
  '#F59E0B', // Âmbar Colheita
  '#8B5CF6', // Violeta Orvalho
  '#EF4444', // Vermelho Alerta
  '#06B6D4', // Ciano Água
  '#EC4899', // Rosa Flor
  '#14B8A6', // Teal Folha
  '#F97316', // Laranja Solo
  '#6366F1', // Índigo Noite
];

// ============================================================
// Service
// ============================================================

export class SegmentDictionaryService {

  // ----------------------------------------------------------
  // Classificações (Product Classifications)
  // ----------------------------------------------------------

  /**
   * Creates a new product classification for a tenant.
   * Generates internal_key automatically from customName.
   * Validates uniqueness of internal_key within tenant scope.
   */
  static async createClassificacao(
    supabase: SupabaseClient,
    tenantId: string,
    input: CreateClassificacaoInput
  ): Promise<TenantClassificacao> {
    const internalKey = normalizeToKey(input.customName);

    try {
      // As 3 checagens não dependem uma da outra — em paralelo em vez de
      // sequencial (achado em auditoria de performance 31/08/2026).
      const [
        { data: existing, error: checkError },
        parentCheck,
        { count, error: countError },
      ] = await Promise.all([
        // Validate uniqueness within tenant
        supabase
          .from('tenant_config_classificacoes')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('internal_key', internalKey)
          .maybeSingle(),
        // If parent_key is provided, validate it exists
        input.parentKey
          ? supabase
              .from('tenant_config_classificacoes')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('internal_key', input.parentKey)
              .eq('is_active', true)
              .maybeSingle()
          : Promise.resolve(null),
        // Determine next color from palette
        supabase.from('tenant_config_classificacoes').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);

      if (checkError) throw checkError;
      if (existing) {
        throw new Error(`Grupo de produto com chave "${internalKey}" já existe para este tenant.`);
      }

      if (input.parentKey) {
        if (parentCheck?.error) throw parentCheck.error;
        if (!parentCheck?.data) {
          throw new Error(`Grupo de produto pai "${input.parentKey}" não encontrado ou inativo.`);
        }
      }

      if (countError) throw countError;

      const colorIndex = (count || 0) % DEFAULT_COLORS.length;
      const defaultColor = input.color || DEFAULT_COLORS[colorIndex];

      const { data, error } = await supabase
        .from('tenant_config_classificacoes')
        .insert({
          tenant_id: tenantId,
          internal_key: internalKey,
          parent_key: input.parentKey || null,
          custom_name: input.customName,
          aliases: input.aliases || [],
          display_order: input.displayOrder ?? 0,
          color: defaultColor,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRowToClassificacao(data);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Updates an existing product classification.
   * If customName changes, internal_key is NOT regenerated (stability guarantee).
   *
   * Renomear propaga o novo nome para as tabelas que referenciam o segmento
   * por NOME, não por internal_key: `it_se_configurations.segment_name` e
   * `planejamento_cliente_segmento.segmento`. Sem essa propagação, renomear
   * um segmento órfã o Índice Tecnológico e o VPM da carteira cai a zero
   * silenciosamente (verificado: 10.000.000 → 0 após um rename).
   */
  static async updateClassificacao(
    supabase: SupabaseClient,
    tenantId: string,
    id: string,
    input: UpdateClassificacaoInput
  ): Promise<TenantClassificacao> {
    try {
      const updatePayload: ClassificacaoUpdatePayload = {};

      if (input.customName !== undefined) updatePayload.custom_name = input.customName;
      if (input.aliases !== undefined) updatePayload.aliases = input.aliases;
      if (input.isActive !== undefined) updatePayload.is_active = input.isActive;
      if (input.displayOrder !== undefined) updatePayload.display_order = input.displayOrder;
      if (input.color !== undefined) updatePayload.color = input.color;

      // Nome anterior, necessário para localizar as linhas dependentes
      let nomeAnterior: string | null = null;
      if (input.customName !== undefined) {
        const { data: atual } = await supabase
          .from('tenant_config_classificacoes')
          .select('custom_name')
          .eq('id', id)
          .maybeSingle();
        nomeAnterior = atual?.custom_name ?? null;

        // Mesma checagem de duplicata do lado de culturas — renomear ou
        // promover um apelido a nome podia criar dois grupos de produto com
        // o mesmo custom_name sem aviso (bug relatado 03/09/2026).
        if (nomeAnterior !== null && input.customName !== nomeAnterior) {
          const { data: conflito, error: conflitoError } = await supabase
            .from('tenant_config_classificacoes')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .neq('id', id)
            .ilike('custom_name', input.customName)
            .maybeSingle();
          if (conflitoError) throw conflitoError;
          if (conflito) {
            throw new Error(`Grupo de produto "${input.customName}" já existe.`);
          }
        }
      }

      const { data, error } = await supabase
        .from('tenant_config_classificacoes')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      if (input.customName && nomeAnterior && nomeAnterior !== input.customName) {
        // As duas tabelas são independentes entre si — em paralelo (achado
        // em auditoria de performance 31/08/2026).
        await Promise.all([
          supabase
            .from('it_se_configurations')
            .update({ segment_name: input.customName })
            .eq('tenant_id', tenantId)
            .eq('segment_name', nomeAnterior),
          supabase
            .from('planejamento_cliente_segmento')
            .update({ segmento: input.customName })
            .eq('tenant_id', tenantId)
            .eq('segmento', nomeAnterior),
        ]);
      }

      return mapRowToClassificacao(data);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Promove um apelido a nome de exibição.
   *
   * É uma troca, não uma substituição: o apelido escolhido passa a ser o
   * custom_name e o nome anterior entra na lista de apelidos, para o matching
   * de CSV/ERP continuar reconhecendo os arquivos já existentes.
   * O internal_key permanece o mesmo (garantia de estabilidade).
   */
  static async promoverAliasParaNome(
    supabase: SupabaseClient,
    tenantId: string,
    id: string,
    alias: string
  ): Promise<TenantClassificacao> {
    const { data: atual, error: fetchError } = await supabase
      .from('tenant_config_classificacoes')
      .select('custom_name, aliases')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError) throw fetchError;

    const novoNome = alias.trim();
    if (!novoNome) throw new Error('Apelido vazio não pode virar nome.');

    const nomeAnterior: string = atual.custom_name;
    if (novoNome === nomeAnterior) return this.updateClassificacao(supabase, tenantId, id, {});

    const restantes: string[] = (atual.aliases || []).filter(
      (a: string) => a.toLowerCase() !== novoNome.toLowerCase()
    );

    // O nome antigo passa a ser apelido, sem duplicar caso já esteja lá
    const jaTem = restantes.some((a) => a.toLowerCase() === nomeAnterior.toLowerCase());
    const novosAliases = jaTem ? restantes : [...restantes, nomeAnterior];

    return this.updateClassificacao(supabase, tenantId, id, {
      customName: novoNome,
      aliases: novosAliases,
    });
  }

  /**
   * Soft-delete: sets is_active = false.
   */
  static async deactivateClassificacao(
    supabase: SupabaseClient,
    tenantId: string,
    id: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenant_config_classificacoes')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Adds a new alias to an existing classification.
   * Used by the ReconciliationModal learning loop.
   */
  static async addAlias(
    supabase: SupabaseClient,
    tenantId: string,
    id: string,
    newAlias: string
  ): Promise<TenantClassificacao> {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('tenant_config_classificacoes')
        .select('aliases')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      const currentAliases: string[] = current.aliases || [];
      const normalizedAlias = newAlias.trim();

      if (currentAliases.some(a => a.toLowerCase() === normalizedAlias.toLowerCase())) {
        const { data, error: selectError } = await supabase
          .from('tenant_config_classificacoes')
          .select()
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (selectError) throw selectError;
        return mapRowToClassificacao(data);
      }

      const updatedAliases = [...currentAliases, normalizedAlias];
      return this.updateClassificacao(supabase, tenantId, id, { aliases: updatedAliases });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Returns all active classifications for a tenant, ordered by display_order.
   */
  static async getActiveClassificacoes(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<TenantClassificacao[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_config_classificacoes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapRowToClassificacao);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Returns all classifications (active and inactive) for admin view.
   */
  static async getAllClassificacoes(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<TenantClassificacao[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_config_classificacoes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapRowToClassificacao);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Returns a hierarchical tree structure: roots with their children.
   */
  static async getTreeStructure(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<ClassificacaoTree[]> {
    const all = await this.getActiveClassificacoes(supabase, tenantId);

    const roots = all.filter(c => c.parentKey === null);
    const children = all.filter(c => c.parentKey !== null);

    return roots.map(root => ({
      root,
      children: children
        .filter(c => c.parentKey === root.internalKey)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }));
  }

  /**
   * Builds an inverted map: { alias_lowercase → internal_key }
   */
  static async buildInvertedMap(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<Record<string, string>> {
    const classifications = await this.getActiveClassificacoes(supabase, tenantId);
    const map: Record<string, string> = {};

    for (const cls of classifications) {
      map[cls.customName.toLowerCase()] = cls.internalKey;
      map[cls.internalKey.toLowerCase()] = cls.internalKey;
      for (const alias of cls.aliases) {
        map[alias.toLowerCase()] = cls.internalKey;
      }
    }

    return map;
  }

  // ----------------------------------------------------------
  // Culturas (Crops)
  // ----------------------------------------------------------

  /**
   * Creates a new crop for a tenant.
   */
  static async createCultura(
    supabase: SupabaseClient,
    tenantId: string,
    input: CreateCulturaInput
  ): Promise<TenantCultura> {
    const internalKey = normalizeToKey(input.customName);

    try {
      const { data: existing, error: checkError } = await supabase
        .from('tenant_config_culturas')
        .select('id, is_active')
        .eq('tenant_id', tenantId)
        .eq('internal_key', internalKey)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.is_active) {
          throw new Error(`Cultura com chave "${internalKey}" já existe para este tenant.`);
        }
        // Já existiu e foi desabilitada: reativa em vez de bloquear com um
        // erro sem saída. Sem isso, um usuário que digitasse o mesmo nome de
        // novo (não achando como reabilitar) criava um registro órfão sem
        // produto, que sobrava listado como "fora do catálogo" enquanto
        // o original ficava desabilitado e invisível pra sempre — relato
        // Marco Polo, 13/08/2026.
        const reativada = await this.updateCultura(supabase, tenantId, existing.id, {
          customName: input.customName,
          isActive: true,
          aliases: input.aliases,
        });
        for (const p of input.ibgeProdutos ?? []) {
          await this.addProdutoIbge(supabase, tenantId, existing.id, p.produto, p.tipo);
        }
        return input.ibgeProdutos?.length ? this.getCultura(supabase, tenantId, existing.id) : reativada;
      }

      const { data, error } = await supabase
        .from('tenant_config_culturas')
        .insert({
          tenant_id: tenantId,
          internal_key: internalKey,
          custom_name: input.customName,
          display_order: input.displayOrder ?? 0,
          aliases: input.aliases ?? [],
        })
        .select()
        .single();

      if (error) throw error;

      if (input.ibgeProdutos?.length) {
        const { error: produtosError } = await supabase.from('tenant_cultura_ibge_produtos').insert(
          input.ibgeProdutos.map((p) => ({
            tenant_id: tenantId,
            tenant_cultura_id: data.id,
            ibge_produto: p.produto,
            ibge_tipo: p.tipo,
          }))
        );
        if (produtosError) throw produtosError;
      }

      return mapRowToCultura(
        data,
        (input.ibgeProdutos ?? []).map((p) => ({ tenant_cultura_id: data.id, ibge_produto: p.produto, ibge_tipo: p.tipo }))
      );
    } catch (err) {
      throw err;
    }
  }

  /** Uma cultura só, com o de-para já anexado. */
  static async getCultura(supabase: SupabaseClient, tenantId: string, id: string): Promise<TenantCultura> {
    const { data, error } = await supabase
      .from('tenant_config_culturas')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error) throw error;
    const produtos = await fetchProdutosPorCultura(supabase, tenantId, [id]);
    return mapRowToCultura(data, produtos.get(id) ?? []);
  }

  /**
   * Associa mais um produto IBGE a uma cultura já existente (de-para) — o
   * mesmo produto pode estar fora do catálogo oficial (ibgeTipo null).
   */
  static async addProdutoIbge(
    supabase: SupabaseClient,
    tenantId: string,
    culturaId: string,
    produto: string,
    tipo: 'temporaria' | 'permanente' | null
  ): Promise<void> {
    const { error } = await supabase.from('tenant_cultura_ibge_produtos').insert({
      tenant_id: tenantId,
      tenant_cultura_id: culturaId,
      ibge_produto: produto,
      ibge_tipo: tipo,
    });
    if (error) {
      if (error.code === '23505') throw new Error('Esse produto já está associado a esta cultura.');
      throw error;
    }
  }

  /** Remove uma associação do de-para — a cultura em si não é afetada. */
  static async removeProdutoIbge(
    supabase: SupabaseClient,
    tenantId: string,
    culturaId: string,
    produto: string
  ): Promise<void> {
    const { error } = await supabase
      .from('tenant_cultura_ibge_produtos')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('tenant_cultura_id', culturaId)
      .eq('ibge_produto', produto);
    if (error) throw error;
  }

  /**
   * Returns all active crops for a tenant, ordered by display_order.
   */
  static async getActiveCulturas(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<TenantCultura[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_config_culturas')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      const rows = (data as CulturaRow[]) || [];
      const produtos = await fetchProdutosPorCultura(supabase, tenantId, rows.map((r) => r.id));
      return rows.map((r) => mapRowToCultura(r, produtos.get(r.id) ?? []));
    } catch (err) {
      throw err;
    }
  }

  /**
   * Todas as culturas do tenant, ativas e inativas.
   * O catalogo precisa das inativas para mostrar o que esta desligado.
   */
  static async getAllCulturas(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<TenantCultura[]> {
    const { data, error } = await supabase
      .from('tenant_config_culturas')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    const rows = (data as CulturaRow[]) || [];
    const produtos = await fetchProdutosPorCultura(supabase, tenantId, rows.map((r) => r.id));
    return rows.map((r) => mapRowToCultura(r, produtos.get(r.id) ?? []));
  }

  /**
   * Renomeia uma cultura.
   *
   * O internal_key não é regerado (mesma garantia de estabilidade das
   * classificações). O novo nome é propagado para as tabelas que referenciam
   * a cultura por NOME: `it_se_configurations.crop_name`,
   * `customer_crop_areas.crop_name` e `planejamento_cliente_segmento.cultivo`.
   *
   * Sem essa propagação, renomear zerava o VPM e ainda fazia as áreas dos
   * produtores aparecerem como "cultura não cadastrada".
   */
  static async updateCultura(
    supabase: SupabaseClient,
    tenantId: string,
    id: string,
    input: { customName?: string; displayOrder?: number; isActive?: boolean; aliases?: string[] }
  ): Promise<TenantCultura> {
    const updatePayload: CulturaUpdatePayload = {};
    if (input.customName !== undefined) updatePayload.custom_name = input.customName;
    if (input.displayOrder !== undefined) updatePayload.display_order = input.displayOrder;
    if (input.isActive !== undefined) updatePayload.is_active = input.isActive;
    if (input.aliases !== undefined) updatePayload.aliases = input.aliases;

    let nomeAnterior: string | null = null;
    if (input.customName !== undefined) {
      const { data: atual } = await supabase
        .from('tenant_config_culturas')
        .select('custom_name')
        .eq('id', id)
        .maybeSingle();
      nomeAnterior = atual?.custom_name ?? null;

      // Renomear (duplo clique) ou promover um apelido a nome podiam criar
      // duas culturas com o mesmo custom_name — só internal_key é único no
      // banco. Sem essa checagem, as duas passavam a existir sem aviso
      // nenhum (bug relatado pelo Marco Polo, 03/09/2026).
      if (nomeAnterior !== null && input.customName !== nomeAnterior) {
        const { data: conflito, error: conflitoError } = await supabase
          .from('tenant_config_culturas')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .neq('id', id)
          .ilike('custom_name', input.customName)
          .maybeSingle();
        if (conflitoError) throw conflitoError;
        if (conflito) {
          throw new Error(`Cultura "${input.customName}" já existe.`);
        }
      }
    }

    const { data, error } = await supabase
      .from('tenant_config_culturas')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    if (input.customName && nomeAnterior && nomeAnterior !== input.customName) {
      // As três tabelas são independentes entre si — em paralelo (achado em
      // auditoria de performance 31/08/2026).
      await Promise.all([
        supabase
          .from('it_se_configurations')
          .update({ crop_name: input.customName })
          .eq('tenant_id', tenantId)
          .eq('crop_name', nomeAnterior),
        supabase
          .from('customer_crop_areas')
          .update({ crop_name: input.customName })
          .eq('tenant_id', tenantId)
          .eq('crop_name', nomeAnterior),
        supabase
          .from('planejamento_cliente_segmento')
          .update({ cultivo: input.customName })
          .eq('tenant_id', tenantId)
          .eq('cultivo', nomeAnterior),
      ]);
    }

    const produtos = await fetchProdutosPorCultura(supabase, tenantId, [id]);
    return mapRowToCultura(data, produtos.get(id) ?? []);
  }

  /**
   * Deactivates a crop (soft-delete) — usada pelo toggle habilitar/desabilitar.
   */
  static async deactivateCultura(
    supabase: SupabaseClient,
    tenantId: string,
    id: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenant_config_culturas')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Exclui de verdade uma cultura — só quando nenhum dado real usa o nome
   * dela ainda (mesmas 3 tabelas que updateCultura propaga rename para:
   * it_se_configurations, customer_crop_areas, planejamento_cliente_segmento
   * — todas casam por nome, não por FK). Se estiver em uso, lança
   * 'CULTURA_EM_USO' em vez de apagar — o botão "Excluir" antes fazia um
   * soft-delete disfarçado de exclusão permanente (dizia "não pode ser
   * desfeita" e o item nunca sumia da lista, já que a aba Cultura mostra
   * ativas e inativas) — bug relatado pelo Marco Polo em 25/08/2026.
   */
  static async deleteCultura(supabase: SupabaseClient, tenantId: string, id: string): Promise<void> {
    const { data: cultura, error: buscaError } = await supabase
      .from('tenant_config_culturas')
      .select('custom_name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (buscaError) throw buscaError;

    const nome = cultura.custom_name;

    const [itUso, areasUso, planejamentoUso] = await Promise.all([
      supabase.from('it_se_configurations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('crop_name', nome),
      supabase.from('customer_crop_areas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('crop_name', nome),
      supabase.from('planejamento_cliente_segmento').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('cultivo', nome),
    ]);
    if (itUso.error) throw itUso.error;
    if (areasUso.error) throw areasUso.error;
    if (planejamentoUso.error) throw planejamentoUso.error;

    const totalEmUso = (itUso.count || 0) + (areasUso.count || 0) + (planejamentoUso.count || 0);
    if (totalEmUso > 0) {
      throw new Error('CULTURA_EM_USO');
    }

    const { error: deleteError } = await supabase
      .from('tenant_config_culturas')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (deleteError) throw deleteError;
  }

  /**
   * Substitui uma cultura por outra já existente em todo o dado do tenant —
   * repointa `customer_crop_areas`, `it_se_configurations` e
   * `planejamento_cliente_segmento` da cultura de origem pra de destino.
   * A cultura de origem em si NÃO é excluída (fica com 0 usos, e o botão
   * "Excluir" já existente passa a funcionar nela).
   *
   * Pedido do Marco Polo, 03/09/2026: hoje excluir uma cultura em uso exige
   * reeditar cliente por cliente pra tirar a referência — inviável com uma
   * carteira de centenas de clientes. Decisão do usuário (mesma data): em
   * caso de conflito (o mesmo cliente/safra+segmento já tem registro nas
   * duas culturas), o valor da cultura de DESTINO prevalece — o da origem
   * é descartado nesse caso específico, não somado.
   */
  static async substituirCultura(
    supabase: SupabaseClient,
    tenantId: string,
    fromId: string,
    toId: string
  ): Promise<{ areas: number; areasConflito: number; it: number; itConflito: number; planejamento: number; planejamentoConflito: number }> {
    if (fromId === toId) {
      throw new Error('Não é possível substituir uma cultura por ela mesma.');
    }

    const [{ data: de, error: deErr }, { data: para, error: paraErr }] = await Promise.all([
      supabase.from('tenant_config_culturas').select('custom_name').eq('id', fromId).eq('tenant_id', tenantId).single(),
      supabase.from('tenant_config_culturas').select('custom_name, is_active').eq('id', toId).eq('tenant_id', tenantId).single(),
    ]);
    if (deErr) throw deErr;
    if (paraErr) throw paraErr;
    // Migrar pra uma cultura desabilitada recriaria o bug de VPM órfão da
    // auditoria de 31/08 (dado passa a apontar pra uma cultura que o
    // cálculo de VPM ignora) — a UI já filtra isso, checagem aqui é defesa
    // em profundidade, não o único ponto de bloqueio.
    if (!para.is_active) {
      throw new Error('Não é possível substituir por uma cultura desabilitada.');
    }
    const nomeDe = de.custom_name;
    const nomePara = para.custom_name;

    // 1. customer_crop_areas — UNIQUE(customer_id, crop_name): conflita
    //    quando o mesmo cliente já tem área cadastrada nas duas culturas.
    const [{ data: areasDe, error: areasDeErr }, { data: areasPara, error: areasParaErr }] = await Promise.all([
      supabase.from('customer_crop_areas').select('id, customer_id').eq('tenant_id', tenantId).eq('crop_name', nomeDe),
      supabase.from('customer_crop_areas').select('customer_id').eq('tenant_id', tenantId).eq('crop_name', nomePara),
    ]);
    if (areasDeErr) throw areasDeErr;
    if (areasParaErr) throw areasParaErr;
    const clientesComPara = new Set((areasPara ?? []).map((a) => a.customer_id));
    const areasSemConflito = (areasDe ?? []).filter((a) => !clientesComPara.has(a.customer_id));
    const areasComConflito = (areasDe ?? []).filter((a) => clientesComPara.has(a.customer_id));

    if (areasSemConflito.length) {
      const { error } = await supabase
        .from('customer_crop_areas')
        .update({ crop_name: nomePara })
        .in('id', areasSemConflito.map((a) => a.id));
      if (error) throw error;
    }
    if (areasComConflito.length) {
      const { error } = await supabase
        .from('customer_crop_areas')
        .delete()
        .in('id', areasComConflito.map((a) => a.id));
      if (error) throw error;
    }

    // 2. it_se_configurations — chave conceitual (safra, segment_name):
    //    conflita quando já existe configuração da cultura destino pro
    //    mesmo par safra+segmento.
    const [{ data: itDe, error: itDeErr }, { data: itPara, error: itParaErr }] = await Promise.all([
      supabase.from('it_se_configurations').select('id, safra, segment_name').eq('tenant_id', tenantId).eq('crop_name', nomeDe),
      supabase.from('it_se_configurations').select('safra, segment_name').eq('tenant_id', tenantId).eq('crop_name', nomePara),
    ]);
    if (itDeErr) throw itDeErr;
    if (itParaErr) throw itParaErr;
    const chavesItPara = new Set((itPara ?? []).map((c) => `${c.safra}|${c.segment_name}`));
    const itSemConflito = (itDe ?? []).filter((c) => !chavesItPara.has(`${c.safra}|${c.segment_name}`));
    const itComConflito = (itDe ?? []).filter((c) => chavesItPara.has(`${c.safra}|${c.segment_name}`));

    if (itSemConflito.length) {
      const { error } = await supabase
        .from('it_se_configurations')
        .update({ crop_name: nomePara })
        .in('id', itSemConflito.map((c) => c.id));
      if (error) throw error;
    }
    if (itComConflito.length) {
      const { error } = await supabase
        .from('it_se_configurations')
        .delete()
        .in('id', itComConflito.map((c) => c.id));
      if (error) throw error;
    }

    // 3. planejamento_cliente_segmento — UNIQUE(tenant_id, cliente_id,
    //    cultivo, segmento): conflita quando o mesmo cliente já tem
    //    planejamento na cultura destino pro mesmo segmento.
    const [{ data: planDe, error: planDeErr }, { data: planPara, error: planParaErr }] = await Promise.all([
      supabase.from('planejamento_cliente_segmento').select('id, cliente_id, segmento').eq('tenant_id', tenantId).eq('cultivo', nomeDe),
      supabase.from('planejamento_cliente_segmento').select('cliente_id, segmento').eq('tenant_id', tenantId).eq('cultivo', nomePara),
    ]);
    if (planDeErr) throw planDeErr;
    if (planParaErr) throw planParaErr;
    const chavesPlanPara = new Set((planPara ?? []).map((p) => `${p.cliente_id}|${p.segmento}`));
    const planSemConflito = (planDe ?? []).filter((p) => !chavesPlanPara.has(`${p.cliente_id}|${p.segmento}`));
    const planComConflito = (planDe ?? []).filter((p) => chavesPlanPara.has(`${p.cliente_id}|${p.segmento}`));

    if (planSemConflito.length) {
      const { error } = await supabase
        .from('planejamento_cliente_segmento')
        .update({ cultivo: nomePara })
        .in('id', planSemConflito.map((p) => p.id));
      if (error) throw error;
    }
    if (planComConflito.length) {
      const { error } = await supabase
        .from('planejamento_cliente_segmento')
        .delete()
        .in('id', planComConflito.map((p) => p.id));
      if (error) throw error;
    }

    return {
      areas: areasSemConflito.length,
      areasConflito: areasComConflito.length,
      it: itSemConflito.length,
      itConflito: itComConflito.length,
      planejamento: planSemConflito.length,
      planejamentoConflito: planComConflito.length,
    };
  }
}

// ============================================================
// Row Mappers (Supabase snake_case → TypeScript camelCase)
// ============================================================

function mapRowToClassificacao(row: ClassificacaoRow): TenantClassificacao {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    internalKey: row.internal_key,
    parentKey: row.parent_key,
    customName: row.custom_name,
    aliases: row.aliases || [],
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    color: row.color ?? DEFAULT_COLORS[0],
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

function mapRowToCultura(row: CulturaRow, produtos: CulturaIbgeProdutoRow[] = []): TenantCultura {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    internalKey: row.internal_key,
    customName: row.custom_name,
    aliases: row.aliases || [],
    ibgeProdutos: produtos.map((p) => ({ produto: p.ibge_produto, tipo: p.ibge_tipo })),
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

/** Busca o de-para de um conjunto de culturas de uma vez, agrupado por cultura. */
async function fetchProdutosPorCultura(
  supabase: SupabaseClient,
  tenantId: string,
  culturaIds: string[]
): Promise<Map<string, CulturaIbgeProdutoRow[]>> {
  const map = new Map<string, CulturaIbgeProdutoRow[]>();
  if (culturaIds.length === 0) return map;

  const { data, error } = await supabase
    .from('tenant_cultura_ibge_produtos')
    .select('tenant_cultura_id, ibge_produto, ibge_tipo')
    .eq('tenant_id', tenantId)
    .in('tenant_cultura_id', culturaIds);
  if (error) throw error;

  for (const row of (data as CulturaIbgeProdutoRow[]) || []) {
    const lista = map.get(row.tenant_cultura_id) || [];
    lista.push(row);
    map.set(row.tenant_cultura_id, lista);
  }
  return map;
}

