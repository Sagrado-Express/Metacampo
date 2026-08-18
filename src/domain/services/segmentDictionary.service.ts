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
  ibgeProduto?: string | null;
  ibgeTipo?: 'temporaria' | 'permanente' | null;
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
  ibge_produto: string | null;
  ibge_tipo: 'temporaria' | 'permanente' | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
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
      // Validate uniqueness within tenant
      const { data: existing, error: checkError } = await supabase
        .from('tenant_config_classificacoes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('internal_key', internalKey)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error(`Grupo de produto com chave "${internalKey}" já existe para este tenant.`);
      }

      // If parent_key is provided, validate it exists
      if (input.parentKey) {
        const { data: parent, error: parentError } = await supabase
          .from('tenant_config_classificacoes')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('internal_key', input.parentKey)
          .eq('is_active', true)
          .maybeSingle();

        if (parentError) throw parentError;
        if (!parent) {
          throw new Error(`Grupo de produto pai "${input.parentKey}" não encontrado ou inativo.`);
        }
      }

      // Determine next color from palette
      const { count, error: countError } = await supabase
        .from('tenant_config_classificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

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
        await supabase
          .from('it_se_configurations')
          .update({ segment_name: input.customName })
          .eq('tenant_id', tenantId)
          .eq('segment_name', nomeAnterior);

        await supabase
          .from('planejamento_cliente_segmento')
          .update({ segmento: input.customName })
          .eq('tenant_id', tenantId)
          .eq('segmento', nomeAnterior);
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
        // ibge_produto, que sobrava listado como "fora do catálogo" enquanto
        // o original ficava desabilitado e invisível pra sempre — relato
        // Marco Polo, 13/08/2026.
        return this.updateCultura(supabase, tenantId, existing.id, {
          customName: input.customName,
          isActive: true,
          aliases: input.aliases,
        });
      }

      const { data, error } = await supabase
        .from('tenant_config_culturas')
        .insert({
          tenant_id: tenantId,
          internal_key: internalKey,
          custom_name: input.customName,
          display_order: input.displayOrder ?? 0,
          aliases: input.aliases ?? [],
          ibge_produto: input.ibgeProduto ?? null,
          ibge_tipo: input.ibgeTipo ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRowToCultura(data);
    } catch (err) {
      throw err;
    }
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
      return (data || []).map(mapRowToCultura);
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
    return (data || []).map(mapRowToCultura);
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
      await supabase
        .from('it_se_configurations')
        .update({ crop_name: input.customName })
        .eq('tenant_id', tenantId)
        .eq('crop_name', nomeAnterior);

      await supabase
        .from('customer_crop_areas')
        .update({ crop_name: input.customName })
        .eq('tenant_id', tenantId)
        .eq('crop_name', nomeAnterior);

      await supabase
        .from('planejamento_cliente_segmento')
        .update({ cultivo: input.customName })
        .eq('tenant_id', tenantId)
        .eq('cultivo', nomeAnterior);
    }

    return mapRowToCultura(data);
  }

  /**
   * Deactivates a crop (soft-delete).
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

function mapRowToCultura(row: CulturaRow): TenantCultura {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    internalKey: row.internal_key,
    customName: row.custom_name,
    aliases: row.aliases || [],
    ibgeProduto: row.ibge_produto ?? null,
    ibgeTipo: row.ibge_tipo ?? null,
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

