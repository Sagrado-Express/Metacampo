/**
 * Antigravity V4 - useSegmentDictionary Hook
 * 
 * TanStack Query Offline-First hook for the tenant's product classification dictionary.
 * Regra 6 (GEMINI.md): Offline-First via TanStack Query.
 * 
 * Provides:
 * - classifications: ordered list of TenantClassificacao
 * - rootClassifications: only level-1 (parent_key === null)
 * - getChildren(parentKey): sub-classifications for a parent
 * - translateKey(internalKey): resolves to custom_name for display
 * - getColor(internalKey): resolves to HEX color for charts
 */

'use client';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { TenantClassificacao } from '@/types/schema';

// ============================================================
// Data Fetcher (Supabase)
// ============================================================

async function fetchClassificationDictionary(tenantId: string): Promise<TenantClassificacao[]> {
  // Use the API route to fetch classifications
  // This avoids importing Supabase client directly in the hook
  const response = await fetch(`/api/classifications?tenantId=${tenantId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch classification dictionary');
  }

  return response.json();
}

// ============================================================
// Hook
// ============================================================

export function useSegmentDictionary(tenantId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['classification-dictionary', tenantId],
    queryFn: () => fetchClassificationDictionary(tenantId),
    staleTime: 5 * 60 * 1000,       // 5 min stale before refetch
    gcTime: 30 * 60 * 1000,         // 30 min garbage collection
    refetchOnWindowFocus: false,     // Don't refetch on tab focus
    placeholderData: keepPreviousData, // Keep previous data while refetching
    enabled: !!tenantId,             // Don't fetch without tenantId
    retry: 1,                        // Fail fast if API unreachable
  });

  const classifications = query.data || [];

  // Memoized: root classifications (level 1)
  const rootClassifications = useMemo(() => {
    return classifications.filter(c => c.parentKey === null && c.isActive);
  }, [classifications]);

  // Memoized: get children of a parent classification
  const getChildren = useCallback((parentKey: string): TenantClassificacao[] => {
    return classifications.filter(c => c.parentKey === parentKey && c.isActive);
  }, [classifications]);

  // Memoized: lookup maps for O(1) translation
  const lookupMaps = useMemo(() => {
    const nameMap = new Map<string, string>();
    const colorMap = new Map<string, string>();

    classifications.forEach(c => {
      nameMap.set(c.internalKey, c.customName);
      colorMap.set(c.internalKey, c.color);
    });

    return { nameMap, colorMap };
  }, [classifications]);

  // Translate internal_key → custom_name for display
  const translateKey = useCallback((internalKey: string): string => {
    return lookupMaps.nameMap.get(internalKey) || internalKey;
  }, [lookupMaps]);

  // Get color for a classification
  const getColor = useCallback((internalKey: string): string => {
    return lookupMaps.colorMap.get(internalKey) || '#6B7280';
  }, [lookupMaps]);

  // Build inverted map for ingestion (alias → internal_key)
  const invertedMap = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    classifications.forEach(c => {
      map.set(c.customName.toLowerCase(), c.internalKey);
      map.set(c.internalKey.toLowerCase(), c.internalKey);
      c.aliases.forEach(alias => {
        map.set(alias.toLowerCase(), c.internalKey);
      });
    });
    return map;
  }, [classifications]);

  // Force refetch (used after saving new aliases in ReconciliationModal)
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['classification-dictionary', tenantId] });
  }, [queryClient, tenantId]);

  return {
    // Data
    classifications,
    rootClassifications,
    invertedMap,

    // Helpers
    getChildren,
    translateKey,
    getColor,
    invalidate,

    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
