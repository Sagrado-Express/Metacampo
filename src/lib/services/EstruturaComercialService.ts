import type { SupabaseClient } from '@supabase/supabase-js';

export interface Regional {
  id: string;
  codigo: string;
  userId: string;
}
export interface Distrital {
  id: string;
  regionalId: string;
  codigo: string;
  userId: string;
}
export interface Territorio {
  id: string;
  distritalId: string;
  nome: string;
  ctvUserId: string;
}

export interface EstruturaComercialTree {
  regionais: Regional[];
  distritais: Distrital[];
  territorios: Territorio[];
}

/**
 * Hierarquia comercial com código: Regional → Distrital → Território → CTV.
 * Substitui a árvore por manager_id (ver TenantMembersService) como fonte da
 * tela Estrutura Comercial — manager_id continua no schema, não é removido.
 *
 * Todas as operações usam o client tenant-scoped (RLS via current_tenant_id()),
 * igual cultures/classifications — nada aqui precisa de supabaseAdmin.
 */
export const EstruturaComercialService = {
  async getAll(supabase: SupabaseClient): Promise<EstruturaComercialTree> {
    const [regionaisRes, distritaisRes, territoriosRes] = await Promise.all([
      supabase.from('regionais').select('id, codigo, user_id').order('codigo'),
      supabase.from('distritais').select('id, regional_id, codigo, user_id').order('codigo'),
      supabase.from('territorios').select('id, distrital_id, nome, ctv_user_id').order('nome'),
    ]);
    if (regionaisRes.error) throw regionaisRes.error;
    if (distritaisRes.error) throw distritaisRes.error;
    if (territoriosRes.error) throw territoriosRes.error;

    return {
      regionais: (regionaisRes.data || []).map((r) => ({ id: r.id, codigo: r.codigo, userId: r.user_id })),
      distritais: (distritaisRes.data || []).map((d) => ({
        id: d.id,
        regionalId: d.regional_id,
        codigo: d.codigo,
        userId: d.user_id,
      })),
      territorios: (territoriosRes.data || []).map((t) => ({
        id: t.id,
        distritalId: t.distrital_id,
        nome: t.nome,
        ctvUserId: t.ctv_user_id,
      })),
    };
  },

  /**
   * Cadastro em formato de linha (planilha): Regional código+pessoa,
   * Distrital código+pessoa, Território nome+CTV. Cada nível é get-or-create
   * por código (regional/distrital) — reenviar o mesmo código com pessoa
   * diferente reatribui, não duplica. Território é get-or-create por
   * (distrital, nome).
   */
  async upsertLinha(
    supabase: SupabaseClient,
    tenantId: string,
    linha: {
      regionalCodigo: string;
      regionalUserId: string;
      distritalCodigo: string;
      distritalUserId: string;
      territorioNome: string;
      ctvUserId: string;
    }
  ): Promise<{ regional: Regional; distrital: Distrital; territorio: Territorio }> {
    const regional = await upsertPorCodigo(supabase, 'regionais', tenantId, linha.regionalCodigo, linha.regionalUserId, {});

    const distrital = await upsertPorCodigo(supabase, 'distritais', tenantId, linha.distritalCodigo, linha.distritalUserId, {
      regional_id: regional.id,
    });

    const { data: existente, error: buscaError } = await supabase
      .from('territorios')
      .select('id, distrital_id, nome, ctv_user_id')
      .eq('distrital_id', distrital.id)
      .ilike('nome', linha.territorioNome)
      .maybeSingle();
    if (buscaError) throw buscaError;

    let territorioRow;
    if (existente) {
      const { data, error } = await supabase
        .from('territorios')
        .update({ ctv_user_id: linha.ctvUserId })
        .eq('id', existente.id)
        .select('id, distrital_id, nome, ctv_user_id')
        .single();
      if (error) throw error;
      territorioRow = data;
    } else {
      const { data, error } = await supabase
        .from('territorios')
        .insert({
          tenant_id: tenantId,
          distrital_id: distrital.id,
          nome: linha.territorioNome,
          ctv_user_id: linha.ctvUserId,
        })
        .select('id, distrital_id, nome, ctv_user_id')
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Esse CTV já está atribuído a outro território.');
        }
        throw error;
      }
      territorioRow = data;
    }

    return {
      regional: { id: regional.id, codigo: regional.codigo, userId: regional.user_id },
      distrital: { id: distrital.id, regionalId: distrital.regional_id, codigo: distrital.codigo, userId: distrital.user_id },
      territorio: {
        id: territorioRow.id,
        distritalId: territorioRow.distrital_id,
        nome: territorioRow.nome,
        ctvUserId: territorioRow.ctv_user_id,
      },
    };
  },

  async reatribuir(
    supabase: SupabaseClient,
    nivel: 'regional' | 'distrital' | 'territorio',
    id: string,
    novoUserId: string
  ): Promise<void> {
    const tabela = nivel === 'regional' ? 'regionais' : nivel === 'distrital' ? 'distritais' : 'territorios';
    const coluna = nivel === 'territorio' ? 'ctv_user_id' : 'user_id';
    const { error } = await supabase.from(tabela).update({ [coluna]: novoUserId }).eq('id', id);
    if (error) {
      if (error.code === '23505') {
        throw new Error('Essa pessoa já está atribuída a outro nó da hierarquia.');
      }
      throw error;
    }
  },

  async excluir(supabase: SupabaseClient, nivel: 'regional' | 'distrital' | 'territorio', id: string): Promise<void> {
    const tabela = nivel === 'regional' ? 'regionais' : nivel === 'distrital' ? 'distritais' : 'territorios';
    const { error } = await supabase.from(tabela).delete().eq('id', id);
    if (error) throw error;
  },
};

// get-or-create por (tenant_id, codigo) — se já existe, reatribui o
// responsável (user_id) quando vier diferente; extras (ex.: regional_id da
// distrital) são aplicados junto.
async function upsertPorCodigo(
  supabase: SupabaseClient,
  tabela: 'regionais' | 'distritais',
  tenantId: string,
  codigo: string,
  userId: string,
  extra: Record<string, string>
) {
  const { data: existente, error: buscaError } = await supabase
    .from(tabela)
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();
  if (buscaError) throw buscaError;

  if (existente) {
    const precisaAtualizar = existente.user_id !== userId || Object.entries(extra).some(([k, v]) => existente[k] !== v);
    if (!precisaAtualizar) return existente;
    const { data, error } = await supabase
      .from(tabela)
      .update({ user_id: userId, ...extra })
      .eq('id', existente.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from(tabela)
    .insert({ tenant_id: tenantId, codigo, user_id: userId, ...extra })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
