/**
 * Antigravity V4 - useCultureDictionary Hook
 * 
 * TanStack Query Offline-First hook for the tenant's crop/culture dictionary.
 * Regra 6 (GEMINI.md): Offline-First via TanStack Query.
 * 
 * Provides:
 * - cultures: ordered list of TenantCultura
 * - translateKey(internalKey): resolves to custom_name for display
 */

'use client';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { TenantCultura } from '@/types/schema';

// ============================================================
// Data Fetcher
// ============================================================

async function fetchCultureDictionary(tenantId: string): Promise<TenantCultura[]> {
  // todas=true: inclui culturas desabilitadas. Sem isso, a aba Cultivos
  // (que usa este hook) perde de vista qualquer cultura desligada e não
  // sobra nenhuma forma de reabilitá-la por ali (bug reportado por Marco
  // Polo, 13/08/2026).
  const response = await fetch(`/api/cultures?tenantId=${tenantId}&todas=true`);

  if (!response.ok) {
    throw new Error('Failed to fetch culture dictionary');
  }

  return response.json();
}

// ============================================================
// Hook
// ============================================================

export function useCultureDictionary(tenantId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['culture-dictionary', tenantId],
    queryFn: () => fetchCultureDictionary(tenantId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: !!tenantId,
    retry: 1,                        // Fail fast if API unreachable
  });

  const cultures = query.data || [];

  // Memoized: lookup map for O(1) translation
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    cultures.forEach(c => {
      map.set(c.internalKey, c.customName);
    });
    return map;
  }, [cultures]);

  // Translate internal_key → custom_name for display
  const translateKey = useCallback((internalKey: string): string => {
    return nameMap.get(internalKey) || internalKey;
  }, [nameMap]);

  // Force refetch
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['culture-dictionary', tenantId] });
  }, [queryClient, tenantId]);

  return {
    cultures,
    translateKey,
    invalidate,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
