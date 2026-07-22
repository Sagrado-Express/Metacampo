import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useSession } from '@/hooks/useSession';

interface NovoClienteModalProps {
  onClose: () => void;
  onSuccess: () => void;
  clienteToEdit?: any;
}

interface AreaRow {
  cropName: string;
  areaHa: string; // string no form, convertido no submit
}

/**
 * Cadastro de cliente com MÚLTIPLOS cultivos por produtor.
 *
 * Motivo da mudança: na operação real, um mesmo cliente costuma plantar mais
 * de uma cultura (ex: Soja + Milho safrinha + Café). O formulário antigo só
 * aceitava 1 cultivo/área por cliente, então cadastrar a carteira real exigia
 * duplicar o cliente por cultivo — o que quebra o cálculo de VPM total e a
 * visão de carteira. Agora é uma lista de linhas Cultivo × Hectares.
 */
export default function NovoClienteModal({ onClose, onSuccess, clienteToEdit }: NovoClienteModalProps) {
  const [name, setName] = useState(clienteToEdit?.name || '');
  const [city, setCity] = useState(clienteToEdit?.city || '');
  const [state, setState] = useState(clienteToEdit?.state || 'MG');
  const [areaRows, setAreaRows] = useState<AreaRow[]>(
    clienteToEdit?.areas?.length
      ? clienteToEdit.areas.map((a: any) => ({ cropName: a.cropName, areaHa: String(a.areaHa) }))
      : [{ cropName: '', areaHa: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeCultures, setActiveCultures] = useState<{ customName: string; internalKey: string }[]>([]);
  const { data: sessionData } = useSession();

  // Cultivos ativos vêm da configuração do tenant (Regra #6: nada hardcoded no fluxo principal).
  useEffect(() => {
    if (!sessionData?.tenantId) return;
    fetch(`/api/cultures?tenantId=${sessionData.tenantId}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) && data.length > 0 ? data : [];
        setActiveCultures(list);
        if (list.length > 0 && areaRows[0].cropName === '') {
          setAreaRows(prev => prev.map(r => (r.cropName ? r : { ...r, cropName: list[0].customName })));
        }
      })
      .catch(() => setActiveCultures([]));
  }, [sessionData?.tenantId]);

  const addRow = () => {
    setAreaRows(prev => [...prev, { cropName: activeCultures[0]?.customName || '', areaHa: '' }]);
  };

  const removeRow = (index: number) => {
    setAreaRows(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, patch: Partial<AreaRow>) => {
    setAreaRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validRows = areaRows.filter(r => r.cropName && r.areaHa && parseFloat(r.areaHa) > 0);
    if (!name || !city || !state || validRows.length === 0) {
      setError('Preencha nome, município, UF e ao menos um cultivo com área.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name,
        city,
        state,
        region: 'Região Geral',
        areas: validRows.map(r => ({ cropName: r.cropName, areaHa: parseFloat(r.areaHa) })),
      };

      const url = clienteToEdit ? `/api/clientes?id=${clienteToEdit.id}` : '/api/clientes';
      const method = clienteToEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(clienteToEdit ? 'Cliente atualizado' : 'Cliente cadastrado');
        onSuccess();
      } else {
        const err = await res.json();
        setError(err.error || 'Erro ao processar requisição.');
      }
    } catch (err: any) {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 rounded-3xl w-full max-w-lg shadow-2xl border border-white/60 p-6 space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted/30 p-2 rounded-xl transition-all"
        >
          <X size={18} />
        </button>

        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">
            {clienteToEdit ? '✎ Editar Cliente' : '✨ Novo Cliente'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre cada cultivo e sua área para cálculo automático de VPM.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-xs font-black text-red-700 uppercase tracking-wide">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Nome do Produtor</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold"
              placeholder="Ex: Fazenda Santa Maria"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Município</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold"
                placeholder="Ex: Uberaba"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">UF</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold"
              >
                {['MG', 'SP', 'GO', 'PR', 'BA', 'MT', 'MS', 'RS', 'SC'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de cultivos × área — múltiplas linhas por cliente */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
              Cultivos & Áreas
            </label>
            {areaRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={row.cropName}
                  onChange={(e) => updateRow(i, { cropName: e.target.value })}
                  className="flex-1 px-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold"
                >
                  <option value="" disabled>Selecione…</option>
                  {activeCultures.map(culture => (
                    <option key={culture.internalKey} value={culture.customName}>{culture.customName}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={row.areaHa}
                  onChange={(e) => updateRow(i, { areaHa: e.target.value })}
                  className="w-28 px-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold"
                  placeholder="ha"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={areaRows.length === 1}
                  className="p-2 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remover cultivo"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-emerald-300 text-emerald-700 text-xs font-black uppercase tracking-wider hover:bg-emerald-50 transition-colors"
            >
              <Plus size={14} /> Adicionar cultivo
            </button>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white xs text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              {clienteToEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
