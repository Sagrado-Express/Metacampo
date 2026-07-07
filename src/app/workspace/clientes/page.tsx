'use client';

import { useSession } from '@/hooks/useSession';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import NovoClienteModal from '@/components/clientes/NovoClienteModal';
import { Loader2, Plus, Edit2, Trash2, Users2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export default function ClientesPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);

  const tenantId = sessionData?.tenantId || "00000000-0000-0000-0000-000000000000";

  const { data: clientes = [], refetch, isLoading } = useQuery({
    queryKey: ['clientes', tenantId],
    queryFn: async () => {
      const res = await fetch('/api/clientes');
      if (!res.ok) throw new Error('Falha ao buscar clientes');
      return res.json();
    },
    enabled: !!tenantId
  });

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este produtor?')) {
      try {
        const res = await fetch(`/api/clientes?id=${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          refetch();
        }
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Carregando sessão...
      </div>
    );
  }

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

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : (
        <div className="glass-card-premium p-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest pl-2">Produtor</th>
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">Município / UF</th>
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">Cultivo Principal</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">Área (ha)</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">VPM Potencial</th>
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
              ) : (
                clientes.map((c: any) => {
                  const area = c.areas?.[0];
                  return (
                    <tr key={c.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="py-3 pl-2 font-black text-slate-800">{c.name}</td>
                      <td className="py-3 text-muted-foreground">{c.city} - {c.state}</td>
                      <td className="py-3 font-semibold text-slate-700">{area?.cropName || '-'}</td>
                      <td className="py-3 text-right font-bold text-slate-700">{area?.areaHa ? Number(area.areaHa).toLocaleString('pt-BR') : '-'}</td>
                      <td className="py-3 text-right font-black text-emerald-600">{fmt(c.vpmTotalCentavos / 100)}</td>
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
                          className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NovoClienteModal
          clienteToEdit={editClient}
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
