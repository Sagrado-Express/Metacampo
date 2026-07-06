import { useQuery } from "@tanstack/react-query";

interface SessionData {
  tenantId: string;
  email: string;
  userId: string;
  role: string;
}

export function useSession() {
  return useQuery<SessionData>({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/session");
      if (!response.ok) throw new Error("Failed to fetch session");
      const data = await response.json();
      const user = data?.session?.user;
      return {
        tenantId: user?.app_metadata?.tenant_id || "00000000-0000-0000-0000-000000000000",
        email: user?.email || "",
        userId: user?.id || "",
        role: user?.app_metadata?.role || "",
      };
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    retry: 1,
  });
}
