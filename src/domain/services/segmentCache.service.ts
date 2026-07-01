/**
 * Antigravity V4 - Segment Cache Service (Upstash Redis)
 * 
 * Manages the Redis cache layer for the classification dictionary.
 * Provides O(1) lookup during CSV ingestion via an inverted map:
 *   { alias_lowercase → internal_key }
 * 
 * Cache strategy:
 * - TTL: 24 hours (86400s) as safety net for auto-healing
 * - Explicit invalidation via DEL on tenant dictionary changes (cache-aside pattern)
 * - Single GET per ingestion loads entire dictionary into memory
 * 
 * Fallback resilience:
 * - Redis failure: falls through to Supabase
 * - Supabase failure: returns empty Map (canonical keys used as-is) + console.warn for Sentry
 * 
 * Regra 1 (GEMINI.md): Processamento transiente em Edge Runtime.
 * Regra 7 (GEMINI.md): Isolamento por tenant_id na chave Redis.
 */

import { SegmentDictionaryService } from './segmentDictionary.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Types
// ============================================================

/**
 * Inverted dictionary: maps every alias/custom_name (lowercase) to its internal_key.
 * Example: { "mata-mato": "DEFENSIVOS", "defensivos": "DEFENSIVOS", "sementes": "SEMENTES" }
 */
export type InvertedDictionary = Record<string, string>;

interface CacheConfig {
  ttlSeconds: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttlSeconds: 86400, // 24 hours — metadados mudam ~1-2x/mês; DEL explícito no save() garante freshness
};

// ============================================================
// Redis Key Helpers
// ============================================================

/**
 * Generates the Redis key for a tenant's classification dictionary.
 * Format: tenant:{tenantId}:class_dict
 */
function getDictKey(tenantId: string): string {
  return `tenant:${tenantId}:class_dict`;
}

// ============================================================
// Service
// ============================================================

export class SegmentCacheService {

  /**
   * Loads the inverted dictionary for a tenant.
   * 
   * Strategy:
   * 1. Try GET from Redis (cache hit → O(1))
   * 2. If miss, fetch from Supabase, build inverted map, SET with TTL
   * 3. Return as a Map<string, string> for in-memory O(1) lookups
   * 
   * This should be called ONCE at the start of each ingestion.
   * The returned Map is then used for every CSV line without additional Redis calls.
   */
  static async loadDictionary(
    redis: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, opts?: any) => Promise<any> },
    supabase: SupabaseClient,
    tenantId: string,
    config: CacheConfig = DEFAULT_CACHE_CONFIG
  ): Promise<Map<string, string>> {
    const cacheKey = getDictKey(tenantId);

    // 1. Try cache hit
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: InvertedDictionary = typeof cached === 'string' 
          ? JSON.parse(cached) 
          : cached;
        return new Map(Object.entries(parsed));
      }
    } catch (err) {
      // Redis failure is non-fatal; fall through to Supabase
      console.warn(`[SegmentCache] Redis GET failed for ${cacheKey}:`, err);
    }

    // 2. Cache miss → build from Supabase
    try {
      const invertedMap = await SegmentDictionaryService.buildInvertedMap(supabase, tenantId);

      // 3. Warm cache with TTL
      try {
        await redis.set(cacheKey, JSON.stringify(invertedMap), { ex: config.ttlSeconds });
      } catch (err) {
        console.warn(`[SegmentCache] Redis SET failed for ${cacheKey}:`, err);
      }

      return new Map(Object.entries(invertedMap));
    } catch (err) {
      // Supabase also failed — return empty map so canonical keys are used as-is.
      // This respects Regra 5 (Safe Math): calculations never stop for a cosmetic issue.
      console.warn(
        `[SegmentCache] FALLBACK ACTIVATED for tenant ${tenantId}. ` +
        `Both Redis and Supabase failed. Using canonical keys as display names.`,
        err
      );
      return new Map();
    }
  }

  /**
   * Invalidates the cached dictionary for a tenant.
   * Called when the tenant saves changes in the admin UI
   * or when the ReconciliationModal saves a new alias (learning loop).
   */
  static async invalidateCache(
    redis: { del: (key: string) => Promise<any> },
    tenantId: string
  ): Promise<void> {
    const cacheKey = getDictKey(tenantId);
    try {
      await redis.del(cacheKey);
    } catch (err) {
      console.warn(`[SegmentCache] Redis DEL failed for ${cacheKey}:`, err);
    }
  }

  /**
   * Resolves a CSV segment string to its internal_key using the in-memory dictionary.
   * 
   * Performance: O(1) — simple Map.get() with lowercase normalization.
   * 
   * @returns internal_key if found, undefined if unmapped
   */
  static resolveClassificacao(
    dictionary: Map<string, string>,
    csvAlias: string
  ): string | undefined {
    if (!csvAlias || typeof csvAlias !== 'string') return undefined;
    return dictionary.get(csvAlias.trim().toLowerCase());
  }

  /**
   * Batch-resolves multiple CSV segment strings.
   * Returns resolved entries and a list of unmapped ones.
   * 
   * Used during ingestion to process all lines and identify 
   * which segments need the ReconciliationModal.
   */
  static batchResolve(
    dictionary: Map<string, string>,
    csvAliases: string[]
  ): { resolved: Map<string, string>; unmapped: string[] } {
    const resolved = new Map<string, string>();
    const unmappedSet = new Set<string>();

    for (const alias of csvAliases) {
      if (!alias) continue;
      const trimmed = alias.trim();
      const key = this.resolveClassificacao(dictionary, trimmed);

      if (key) {
        resolved.set(trimmed, key);
      } else {
        unmappedSet.add(trimmed);
      }
    }

    return {
      resolved,
      unmapped: Array.from(unmappedSet),
    };
  }
}
