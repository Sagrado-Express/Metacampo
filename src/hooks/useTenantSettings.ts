"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface TenantSettings {
  labelGrupoProduto: string | null;
}

async function fetchTenantSettings(): Promise<TenantSettings> {
  const response = await fetch("/api/tenant/settings");
  if (!response.ok) throw new Error("Failed to fetch tenant settings");
  return response.json();
}

async function updateLabelGrupoProduto(labelGrupoProduto: string | null): Promise<TenantSettings> {
  const response = await fetch("/api/tenant/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labelGrupoProduto }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update tenant settings");
  }
  return response.json();
}

export function useTenantSettings() {
  const queryClient = useQueryClient();
  const QUERY_KEY = ["tenant-settings"];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTenantSettings,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: updateLabelGrupoProduto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    labelGrupoProduto: query.data?.labelGrupoProduto ?? null,
    setLabelGrupoProduto: mutation.mutateAsync,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
