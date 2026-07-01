"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query Provider for the Antigravity V4 application.
 * 
 * Wraps the app with QueryClientProvider to enable:
 * - useSegmentDictionary hook (classification dictionary)
 * - useCultureDictionary hook (culture dictionary)
 * 
 * Configured with:
 * - staleTime: 5 minutes (matches hooks' staleTime)
 * - gcTime: 30 minutes (garbage collection)
 * - No refetch on window focus (metadata is stable)
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,       // 5 minutes
            gcTime: 30 * 60 * 1000,          // 30 minutes garbage collection
            refetchOnWindowFocus: false,      // Metadata doesn't change on tab focus
            retry: 2,                         // Retry twice on failure
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
