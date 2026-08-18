import { supabaseAdmin } from '@/lib/supabase';

export interface TenantMember {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  managerId: string | null;
}

/**
 * Lista os membros (usuários já registrados) de um tenant. Precisa de
 * supabaseAdmin (service_role): a policy user_tenants_self só deixa cada
 * usuário ver a própria linha em user_tenants via RLS, e auth.users não é
 * exposto via PostgREST de jeito nenhum — só pela Admin Auth API.
 *
 * listUsers() é global ao projeto Supabase (todos os tenants), não só
 * deste — pagina até esgotar e filtra pelo Map de user_id do tenant.
 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('user_tenants')
    .select('user_id, role, manager_id')
    .eq('tenant_id', tenantId);

  if (membershipsError) throw membershipsError;

  const membershipByUserId = new Map((memberships || []).map((m) => [m.user_id, m]));
  if (membershipByUserId.size === 0) return [];

  const members: TenantMember[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    for (const u of data.users) {
      const membership = membershipByUserId.get(u.id);
      if (membership) {
        members.push({
          userId: u.id,
          email: u.email || '',
          fullName: (u.user_metadata as { full_name?: string })?.full_name || u.email || '',
          role: membership.role,
          managerId: membership.manager_id,
        });
      }
    }

    if (!data.nextPage) break;
    page = data.nextPage;
  }

  return members;
}

/**
 * Atualiza o gerente de um membro do tenant (árvore comercial CTV → gerente
 * → diretor). `managerId: null` remove o vínculo (topo da árvore).
 *
 * Validações que a FK composta (manager_id, tenant_id) do banco não cobre:
 * managerId precisa já ser membro deste tenant (senão a FK rejeita, mas
 * aqui devolvemos um erro específico em vez de deixar o Postgres estourar),
 * e não pode criar ciclo (A gerencia B, B gerencia A, ... de volta a A).
 */
export async function setMemberManager(
  tenantId: string,
  userId: string,
  managerId: string | null
): Promise<void> {
  if (managerId === userId) {
    throw new Error('SELF_MANAGER');
  }

  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('user_tenants')
    .select('user_id, manager_id')
    .eq('tenant_id', tenantId);
  if (membershipsError) throw membershipsError;

  const byUserId = new Map((memberships || []).map((m) => [m.user_id, m]));
  if (!byUserId.has(userId)) throw new Error('NOT_FOUND');
  if (managerId && !byUserId.has(managerId)) throw new Error('MANAGER_NOT_IN_TENANT');

  // Anda a cadeia a partir do gerente proposto: se em algum momento chegar
  // de volta em userId, atribuir esse gerente criaria um ciclo.
  if (managerId) {
    let cursor: string | null = managerId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === userId) throw new Error('CYCLE');
      if (seen.has(cursor)) break; // ciclo pré-existente alhures — não é problema desta atribuição
      seen.add(cursor);
      cursor = byUserId.get(cursor)?.manager_id ?? null;
    }
  }

  const { error } = await supabaseAdmin
    .from('user_tenants')
    .update({ manager_id: managerId })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);
  if (error) throw error;
}
