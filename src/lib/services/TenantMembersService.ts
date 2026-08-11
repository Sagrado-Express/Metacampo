import { supabaseAdmin } from '@/lib/supabase';

export interface TenantMember {
  userId: string;
  email: string;
  fullName: string;
}

/**
 * Lista os membros (usuários já registrados) de um tenant. Precisa de
 * supabaseAdmin (service_role): a policy user_tenants_self só deixa cada
 * usuário ver a própria linha em user_tenants via RLS, e auth.users não é
 * exposto via PostgREST de jeito nenhum — só pela Admin Auth API.
 *
 * listUsers() é global ao projeto Supabase (todos os tenants), não só
 * deste — pagina até esgotar e filtra pelo Set de user_id do tenant.
 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('user_tenants')
    .select('user_id')
    .eq('tenant_id', tenantId);

  if (membershipsError) throw membershipsError;

  const memberIds = new Set((memberships || []).map((m) => m.user_id));
  if (memberIds.size === 0) return [];

  const members: TenantMember[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    for (const u of data.users) {
      if (memberIds.has(u.id)) {
        members.push({
          userId: u.id,
          email: u.email || '',
          fullName: (u.user_metadata as any)?.full_name || u.email || '',
        });
      }
    }

    if (!data.nextPage) break;
    page = data.nextPage;
  }

  return members;
}
