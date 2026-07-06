import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "../useSession";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useSession", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should fetch and return session data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session: {
          user: {
            id: "user-123",
            email: "teste@metacampo.com",
            app_metadata: {
              role: "admin",
              tenant_id: "tenant-123-abc",
            },
          },
        },
      }),
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      ) as any,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.tenantId).toBe("tenant-123-abc");
    expect(result.current.data?.email).toBe("teste@metacampo.com");
    expect(result.current.data?.userId).toBe("user-123");
    expect(result.current.data?.role).toBe("admin");
  });
});
