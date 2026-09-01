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
 * Busca cada membro por getUserById em vez de paginar listUsers() (que é
 * global ao projeto Supabase, todos os tenants, não só deste) — o tenant já
 * sabe exatamente quais user_id precisa via user_tenants, então não há
 * motivo pra varrer o projeto inteiro pra filtrar depois. Achado em
 * auditoria de performance 31/08/2026 (780-1149ms medido ao vivo).
 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('user_tenants')
    .select('user_id, role, manager_id')
    .eq('tenant_id', tenantId);

  if (membershipsError) throw membershipsError;
  if (!memberships || memberships.length === 0) return [];

  const users = await Promise.all(
    memberships.map((m) => supabaseAdmin.auth.admin.getUserById(m.user_id))
  );

  const members: TenantMember[] = [];
  for (let i = 0; i < memberships.length; i++) {
    const membership = memberships[i];
    const u = users[i].data.user;
    if (!u) continue; // usuário removido do Auth mas ainda com linha em user_tenants
    members.push({
      userId: u.id,
      email: u.email || '',
      fullName: (u.user_metadata as { full_name?: string })?.full_name || u.email || '',
      role: membership.role,
      managerId: membership.manager_id,
    });
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
