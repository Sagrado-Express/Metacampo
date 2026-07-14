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

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ============================================================
// Types
// ============================================================

export interface TenantClassificacao {
  id: string;
  tenantId: string;
  internalKey: string;
  parentKey: string | null;
  customName: string;
  aliases: string[];
  isActive: boolean;
  displayOrder: number;
  color: string;
  createdAt?: Date;
}

export interface TenantCultura {
  id: string;
  tenantId: string;
  internalKey: string;
  customName: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: Date;
}

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
        throw new Error(`Classificação com chave "${internalKey}" já existe para este tenant.`);
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
          throw new Error(`Classificação pai "${input.parentKey}" não encontrada ou inativa.`);
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
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Updates an existing product classification.
   * If customName changes, internal_key is NOT regenerated (stability guarantee).
   */
  static async updateClassificacao(
    supabase: SupabaseClient,
    tenantId: string,
    id: string,
    input: UpdateClassificacaoInput
  ): Promise<TenantClassificacao> {
    try {
      const updatePayload: Record<string, any> = {};

      if (input.customName !== undefined) updatePayload.custom_name = input.customName;
      if (input.aliases !== undefined) updatePayload.aliases = input.aliases;
      if (input.isActive !== undefined) updatePayload.is_active = input.isActive;
      if (input.displayOrder !== undefined) updatePayload.display_order = input.displayOrder;
      if (input.color !== undefined) updatePayload.color = input.color;

      const { data, error } = await supabase
        .from('tenant_config_classificacoes')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return mapRowToClassificacao(data);
    } catch (err: any) {
      throw err;
    }
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('internal_key', internalKey)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error(`Cultura com chave "${internalKey}" já existe para este tenant.`);
      }

      const { data, error } = await supabase
        .from('tenant_config_culturas')
        .insert({
          tenant_id: tenantId,
          internal_key: internalKey,
          custom_name: input.customName,
          display_order: input.displayOrder ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRowToCultura(data);
    } catch (err: any) {
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
    } catch (err: any) {
      throw err;
    }
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
    } catch (err: any) {
      throw err;
    }
  }
}

// ============================================================
// Row Mappers (Supabase snake_case → TypeScript camelCase)
// ============================================================

function mapRowToClassificacao(row: any): TenantClassificacao {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    internalKey: row.internal_key,
    parentKey: row.parent_key,
    customName: row.custom_name,
    aliases: row.aliases || [],
    isActive: row.is_active,
    displayOrder: row.display_order,
    color: row.color,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

function mapRowToCultura(row: any): TenantCultura {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    internalKey: row.internal_key,
    customName: row.custom_name,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

