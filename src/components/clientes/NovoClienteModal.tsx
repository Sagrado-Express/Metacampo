import React, { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';

interface NovoClienteModalProps {
  onClose: () => void;
  onSuccess: () => void;
  clienteToEdit?: any;
}

export default function NovoClienteModal({ onClose, onSuccess, clienteToEdit }: NovoClienteModalProps) {
  const [name, setName] = useState(clienteToEdit?.name || '');
  const [city, setCity] = useState(clienteToEdit?.city || '');
  const [state, setState] = useState(clienteToEdit?.state || 'MG');
  const [cropName, setCropName] = useState(clienteToEdit?.areas?.[0]?.cropName || '');
  const [areaHa, setAreaHa] = useState(clienteToEdit?.areas?.[0]?.areaHa || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeCultures, setActiveCultures] = useState<{customName: string; internalKey: string}[]>([]);

  // Fetch active cultures dynamically from API
  useEffect(() => {
    const tenantId = '00000000-0000-0000-0000-000000000000';
    fetch(`/api/cultures?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setActiveCultures(data);
          if (!cropName && data.length > 0) {
            setCropName(data[0].customName);
          }
        } else {
          // Fallback to defaults if API returns empty
          const fallback = [
            { customName: 'Soja', internalKey: 'SOJA' },
            { customName: 'Milho', internalKey: 'MILHO' },
            { customName: 'Café', internalKey: 'CAFE' },
          ];
          setActiveCultures(fallback);
          if (!cropName) setCropName('Soja');
        }
      })
      .catch(() => {
        const fallback = [
          { customName: 'Soja', internalKey: 'SOJA' },
          { customName: 'Milho', internalKey: 'MILHO' },
          { customName: 'Café', internalKey: 'CAFE' },
        ];
        setActiveCultures(fallback);
        if (!cropName) setCropName('Soja');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city || !state || !cropName || !areaHa) {
      setError('Por favor, preencha todos os campos obrigatórios.');
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
        areas: [
          {
            cropName,
            areaHa: parseFloat(areaHa)
          }
        ]
      };

      const url = clienteToEdit 
        ? `/api/clientes?id=${clienteToEdit.id}`
        : '/api/clientes';

      const method = clienteToEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
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
      <div className="bg-white/95 rounded-3xl w-full max-w-md shadow-2xl border border-white/60 p-6 space-y-6 relative overflow-hidden">
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
            Cadastre os dados de cultivo para cálculo automático de VPM.
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Cultivo Principal</label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold"
              >
                {activeCultures.map(culture => (
                  <option key={culture.internalKey} value={culture.customName}>{culture.customName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Área (ha)</label>
              <input
                type="number"
                value={areaHa}
                onChange={(e) => setAreaHa(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold"
                placeholder="Ex: 500"
                required
              />
            </div>
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
