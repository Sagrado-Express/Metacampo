/**
 * Antigravity V4 - useITConfigurations Hook
 *
 * TanStack Query Offline-First hook for IT-SE (Índice Tecnológico) configurations.
 * Connects to /api/indice-tecnologico (GET/POST/PATCH/DELETE).
 */

"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export interface ITConfig {
  id: string;
  tenantId: string;
  safra: string;
  cultivo: string;
  segmento: string;
  valorPorHectareCentavos: number;
  createdAt?: string;
}

export interface UpsertITConfigInput {
  id?: string;
  safra: string;
  cultivo: string;
  segmento: string;
  valorPorHectareCentavos: number;
}

async function fetchITConfigurations(): Promise<ITConfig[]> {
  const response = await fetch("/api/indice-tecnologico");
  if (!response.ok) throw new Error("Failed to fetch IT configurations");
  return response.json();
}

async function createITConfiguration(input: UpsertITConfigInput): Promise<ITConfig> {
  const response = await fetch("/api/indice-tecnologico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create IT configuration");
  }
  return response.json();
}

async function updateITConfiguration(input: UpsertITConfigInput & { id: string }): Promise<ITConfig> {
  const response = await fetch("/api/indice-tecnologico", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update IT configuration");
  }
  return response.json();
}

async function deleteITConfiguration(id: string): Promise<void> {
  const response = await fetch(`/api/indice-tecnologico?id=${id}`, { method: "DELETE" });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete IT configuration");
  }
}

export function useITConfigurations() {
  const queryClient = useQueryClient();
  const QUERY_KEY = ["it-configurations"];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchITConfigurations,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const configs: ITConfig[] = query.data || [];

  const matrixMap = useMemo(() => {
    const map = new Map<string, ITConfig>();
    configs.forEach((c) => map.set(`${c.cultivo}|${c.segmento}`, c));
    return map;
  }, [configs]);

  const getCell = useCallback(
    (cultivo: string, segmento: string) => matrixMap.get(`${cultivo}|${segmento}`),
    [matrixMap]
  );

  const getCellValue = useCallback(
    (cultivo: string, segmento: string) =>
      matrixMap.get(`${cultivo}|${segmento}`)?.valorPorHectareCentavos ?? 0,
    [matrixMap]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const upsertMutation = useMutation({
    mutationFn: async (input: UpsertITConfigInput) => {
      const existing = getCell(input.cultivo, input.segmento);
      if (existing) return updateITConfiguration({ ...input, id: existing.id });
      return createITConfiguration(input);
    },
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteITConfiguration,
    onSuccess: () => invalidate(),
  });

  return {
    configs,
    getCell,
    getCellValue,
    invalidate,
    upsertConfig: upsertMutation.mutateAsync,
    deleteConfig: deleteMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
