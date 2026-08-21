'use client';

import { useSession } from '@/hooks/useSession';
import { useQuery } from '@tanstack/react-query';
import { Fragment, useMemo, useState } from 'react';
import NovoClienteModal from '@/components/clientes/NovoClienteModal';
import {
  Loader2, Plus, Edit2, Trash2, Users2, ChevronLeft, AlertTriangle, UploadCloud,
  ChevronDown, ChevronRight, Building2, Search, ArrowUp, ArrowDown,
  ChevronsUpDown,
} from 'lucide-react';
import Link from 'next/link';
import { useRetryMutation } from '@/hooks/useRetryMutation';
import { useToast } from '@/components/Toast/ToastContext';

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

type SortField = 'nome' | 'area' | 'vpm' | 'cultivo';

interface AreaCliente {
  id: string;
  cropName: string;
  areaHa: number;
  vpmCentavos: number;
  indiceTecnologicoDefinido: boolean;
  culturaCadastrada: boolean;
  aviso: string | null;
}

interface Cliente {
  id: string;
  name: string;
  city: string;
  state: string;
  areas: AreaCliente[];
  vpmTotalCentavos: number;
  grupoEconomicoId: string | null;
  grupoEconomicoNome: string | null;
}

interface ClientesResponse {
  data: Cliente[];
  configuracao?: {
    semSegmentosConfigurados: boolean;
    semCulturasConfiguradas: boolean;
    culturasNaoCadastradas: string[];
  };
}

// Soma todas as áreas cadastradas do cliente (um cliente pode ter várias
// culturas/áreas) — usado para ordenação e para os totais do rodapé.
const totalAreaHa = (c: Cliente) => (c.areas || []).reduce((s: number, a: AreaCliente) => s + Number(a.areaHa || 0), 0);

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) {
  if (sortField !== field) return <ChevronsUpDown size={12} className="opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
}

export default function ClientesPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Cliente | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<{ id: string; nome: string } | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const tenantId = sessionData?.tenantId || "00000000-0000-0000-0000-000000000000";

  const { data: payload, refetch, isLoading } = useQuery({
    queryKey: ['clientes', tenantId],
    queryFn: async (): Promise<ClientesResponse> => {
      const res = await fetch('/api/clientes');
      if (!res.ok) throw new Error('Falha ao buscar clientes');
      return res.json();
    },
    enabled: !!tenantId
  });

  // A rota responde { data, configuracao, pagination } desde a paginação.
  const clientes: Cliente[] = useMemo(() => payload?.data ?? [], [payload?.data]);
  const configuracao = payload?.configuracao;

  // Busca por nome do produtor ou município/UF, aplicada antes do agrupamento
  // — os totais e os grupos abaixo já refletem só o que está filtrado.
  const clientesFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.state?.toLowerCase().includes(q)
    );
  }, [clientes, search]);

  // Agrupa por grupo econômico (várias fazendas da mesma família), com o
  // VPM somado de todas as fazendas do grupo. Cliente sem grupo vira o seu
  // próprio "grupo" (nome = nome do cliente) em vez de cair num bucket
  // genérico "Sem grupo econômico" — pedido do Marco Polo em 11/08: o grupo
  // econômico de quem está sozinho é ele mesmo.
  const grupos = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; clientes: Cliente[]; vpmTotal: number; areaTotal: number; synthetic: boolean }>();
    for (const c of clientesFiltrados) {
      const gid = c.grupoEconomicoId || `cliente:${c.id}`;
      const gnome = c.grupoEconomicoId ? (c.grupoEconomicoNome || '—') : c.name;
      if (!map.has(gid)) map.set(gid, { id: gid, nome: gnome, clientes: [], vpmTotal: 0, areaTotal: 0, synthetic: !c.grupoEconomicoId });
      const g = map.get(gid)!;
      g.clientes.push(c);
      g.vpmTotal += Number(c.vpmTotalCentavos || 0);
      g.areaTotal += totalAreaHa(c);
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const cmpCliente = (a: Cliente, b: Cliente) => {
      if (sortField === 'nome') return dir * String(a.name).localeCompare(b.name, 'pt-BR');
      if (sortField === 'area') return dir * (totalAreaHa(a) - totalAreaHa(b));
      if (sortField === 'cultivo') {
        return dir * String(a.areas?.[0]?.cropName || '').localeCompare(String(b.areas?.[0]?.cropName || ''), 'pt-BR');
      }
      return dir * (Number(a.vpmTotalCentavos || 0) - Number(b.vpmTotalCentavos || 0));
    };
    // cultivo não tem um valor "de grupo" — várias fazendas da mesma família
    // podem plantar coisas diferentes. Usa o cultivo do primeiro cliente do
    // grupo (já ordenado por cmpCliente antes deste sort rodar) como critério.
    const cmpGrupo = (
      a: { nome: string; areaTotal: number; vpmTotal: number; clientes: Cliente[] },
      b: { nome: string; areaTotal: number; vpmTotal: number; clientes: Cliente[] }
    ) => {
      if (sortField === 'nome') return dir * a.nome.localeCompare(b.nome, 'pt-BR');
      if (sortField === 'area') return dir * (a.areaTotal - b.areaTotal);
      if (sortField === 'cultivo') {
        const ca = a.clientes[0]?.areas?.[0]?.cropName || '';
        const cb = b.clientes[0]?.areas?.[0]?.cropName || '';
        return dir * ca.localeCompare(cb, 'pt-BR');
      }
      return dir * (a.vpmTotal - b.vpmTotal);
    };

    const lista = Array.from(map.values());
    for (const g of lista) g.clientes.sort(cmpCliente);
    lista.sort(cmpGrupo);
    return lista;
  }, [clientesFiltrados, sortField, sortDir]);

  const totais = useMemo(() => ({
    area: clientesFiltrados.reduce((s: number, c) => s + totalAreaHa(c), 0),
    vpm: clientesFiltrados.reduce((s: number, c) => s + Number(c.vpmTotalCentavos || 0), 0),
  }), [clientesFiltrados]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allGroupIds = useMemo(() => grupos.map(g => g.id), [grupos]);
  const allCollapsed = allGroupIds.length > 0 && allGroupIds.every(id => collapsedGroups.has(id));
  const toggleAllGroups = () => {
    setCollapsedGroups(allCollapsed ? new Set() : new Set(allGroupIds));
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const renameGroup = async (id: string, nome: string) => {
    setEditingGroup(null);
    if (!nome.trim()) return;
    try {
      const res = await fetch('/api/grupos-economicos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nome: nome.trim() }),
      });
      if (!res.ok) throw new Error();
      addToast('Grupo renomeado', 'success');
      refetch();
    } catch {
      addToast('Erro ao renomear grupo', 'error');
    }
  };

  const deleteMutation = useRetryMutation(
    async (id: string) => {
      const res = await fetch(`/api/clientes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao deletar');
      return res.json();
    },
    {
      maxAttempts: 3,
      baseDelayMs: 500,
      onSuccess: () => {
        addToast('Produtor excluído com sucesso', 'success');
        refetch();
      },
      onError: () => {
        addToast('Erro ao excluir produtor. Tente novamente.', 'error', 5000);
      },
    }
  );

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este produtor?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Carregando sessão...
      </div>
    );
  }

  const renderClienteRow = (c: Cliente) => {
    const area = c.areas?.[0];
    const pendencia = (c.areas || []).find((a) => a.aviso)?.aviso ?? null;
    const textoPendencia =
      pendencia === 'CULTURA_NAO_CADASTRADA'
        ? 'Cultura não cadastrada'
        : pendencia === 'SEM_SEGMENTOS_CONFIGURADOS'
          ? 'Nenhum segmento cadastrado'
          : pendencia === 'INDICE_TECNOLOGICO_NAO_DEFINIDO'
            ? 'Índice Tecnológico não definido'
            : null;

    return (
      <tr key={c.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
        <td className="py-3 pl-8 font-black text-slate-800">{c.name}</td>
        <td className="py-3 text-muted-foreground">{c.city} - {c.state}</td>
        <td className="py-3 font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            {area?.cropName || '-'}
            {pendencia === 'CULTURA_NAO_CADASTRADA' && (
              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
            )}
          </span>
        </td>
        <td className="py-3 text-right font-bold text-slate-700">{area?.areaHa ? Number(area.areaHa).toLocaleString('pt-BR') : '-'}</td>
        <td className="py-3 text-right">
          {textoPendencia ? (
            <span
              className="inline-flex items-center gap-1.5 text-amber-700 font-bold"
              title={`VPM não calculado: ${textoPendencia}`}
            >
              <AlertTriangle size={13} className="shrink-0" />
              {textoPendencia}
            </span>
          ) : (
            <span className="font-black text-emerald-600">{fmt(c.vpmTotalCentavos / 100)}</span>
          )}
        </td>
        <td className="py-2 text-center flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setEditClient(c);
              setShowModal(true);
            }}
            className="p-1.5 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 rounded-lg transition-all"
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDelete(c.id)}
            disabled={deleteMutation.isPending}
            className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Excluir"
          >
            {deleteMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/workspace"
            className="mt-1 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
            title="Voltar"
          >
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users2 size={20} className="text-emerald-600" />
              <h1 className="text-2xl font-bold tracking-tight text-[#3E2723]">Meus Clientes / Produtores</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Cadastre e gerencie a carteira de produtores atendidos pelo CTV.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {sessionData?.role === 'admin' && (
            <Link
              href="/workspace/clientes/importar"
              className="bg-white border border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <UploadCloud size={16} /> Importar CSV
            </Link>
          )}
          <button
            onClick={() => {
              setEditClient(null);
              setShowModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/10 active:scale-95 transition-all"
          >
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Avisos de configuração: explicam VPM zerado em vez de mostrar zero sem motivo */}
      {configuracao?.semCulturasConfiguradas && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Nenhuma cultura cadastrada</p>
            <p>
              Cadastre as culturas em{' '}
              <Link href="/workspace/settings/configuracao" className="underline font-semibold">
                Configuração
              </Link>{' '}
              antes de registrar as áreas dos produtores.
            </p>
          </div>
        </div>
      )}

      {configuracao?.semSegmentosConfigurados && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Nenhum segmento cadastrado</p>
            <p>
              Sem segmento não é possível criar Índice Tecnológico, e o VPM fica zerado.
              Cadastre em{' '}
              <Link href="/workspace/settings/segments" className="underline font-semibold">
                Segmentos
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {(configuracao?.culturasNaoCadastradas?.length ?? 0) > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">
              Cultura não cadastrada: {configuracao?.culturasNaoCadastradas.join(', ')}
            </p>
            <p>
              Há áreas registradas com cultura que não existe na configuração do tenant.
              O VPM dessas áreas não é calculado até a cultura ser cadastrada em{' '}
              <Link href="/workspace/settings/configuracao" className="underline font-semibold">
                Configuração
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : (
        <div className="glass-card-premium p-6 overflow-x-auto">
          {/* Busca + atalho de colapsar/expandir todos os grupos */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou município..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            {grupos.length > 0 && (
              <button
                onClick={toggleAllGroups}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/20 transition-colors"
              >
                {allCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {allCollapsed ? 'Desagrupar tudo' : 'Agrupar tudo'}
              </button>
            )}
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest pl-2">
                  <button onClick={() => toggleSort('nome')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Produtor <SortIcon field="nome" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">Município / UF</th>
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">
                  <button onClick={() => toggleSort('cultivo')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Cultivo Principal <SortIcon field="cultivo" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">
                  <button onClick={() => toggleSort('area')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                    Área (ha) <SortIcon field="area" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">
                  <button onClick={() => toggleSort('vpm')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                    VPM Potencial <SortIcon field="vpm" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="pb-3 text-center font-black text-muted-foreground uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground font-semibold uppercase tracking-wider">
                    Nenhum produtor cadastrado. Clique em Novo Cliente para começar.
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground font-semibold uppercase tracking-wider">
                    Nenhum produtor encontrado para &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                grupos.map((g) => {
                  const collapsed = collapsedGroups.has(g.id);
                  const isEditing = editingGroup?.id === g.id;

                  return (
                    <Fragment key={g.id}>
                      {/* Cliente sem grupo econômico vira seu próprio "grupo", com o
                          próprio nome como cabeçalho — não é um grupo de verdade
                          (não renomeável), mas mantém a mesma estrutura visual das
                          famílias/grupos reais. */}
                      <tr className="bg-muted/20 border-b border-border/30">
                        <td colSpan={6} className="py-2 pl-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleGroup(g.id)}
                              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <Building2 size={13} className={g.synthetic ? 'text-muted-foreground/50' : 'text-emerald-600'} />

                            {isEditing ? (
                              <input
                                autoFocus
                                defaultValue={g.nome}
                                onBlur={(e) => renameGroup(g.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') renameGroup(g.id, (e.target as HTMLInputElement).value);
                                  if (e.key === 'Escape') setEditingGroup(null);
                                }}
                                className="px-2 py-0.5 rounded-lg border border-emerald-300 text-xs font-black tracking-wider focus:outline-none"
                              />
                            ) : (
                              <span
                                onDoubleClick={() => !g.synthetic && setEditingGroup({ id: g.id, nome: g.nome })}
                                className={`text-xs font-black tracking-wider ${g.synthetic ? 'text-muted-foreground' : 'text-slate-700 cursor-text'}`}
                                title={g.synthetic ? undefined : 'Duplo clique para renomear'}
                              >
                                {g.nome}
                              </span>
                            )}

                            <span className="text-[10px] text-muted-foreground font-semibold">
                              · {g.clientes.length} {g.clientes.length === 1 ? 'cliente' : 'clientes'}
                            </span>

                            <span className="ml-auto pr-4 text-xs font-black text-emerald-700">
                              {fmt(g.vpmTotal / 100)}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {!collapsed && g.clientes.map(renderClienteRow)}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {clientesFiltrados.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-emerald-600/20">
                  <td colSpan={3} className="pt-3 pl-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
                    Total · {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'produtor' : 'produtores'}
                  </td>
                  <td className="pt-3 text-right font-black text-slate-700">{totais.area.toLocaleString('pt-BR')}</td>
                  <td className="pt-3 text-right font-black text-emerald-700">{fmt(totais.vpm / 100)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {showModal && (
        <NovoClienteModal
          clienteToEdit={editClient ?? undefined}
          onClose={() => {
            setShowModal(false);
            setEditClient(null);
          }}
          onSuccess={() => {
            refetch();
            setShowModal(false);
            setEditClient(null);
          }}
        />
      )}
    </div>
  );
}
