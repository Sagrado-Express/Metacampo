import React, { useState, useRef, useEffect } from 'react';

interface HeatmapProps {
  data: { clientName: string; cropName: string; sharePercentual: number }[];
  clients: string[];
  crops: string[];
  /** Chaves "cliente::CULTIVO" (cultivo em maiúsculas) com área cadastrada —
   * células fora desse conjunto ficam desabilitadas em vez de aceitar um
   * share que a rota rejeitaria de qualquer forma (cliente não planta aquilo). */
  validCombos: Set<string>;
  onCellChange: (clientName: string, cropName: string, newShare: number) => void;
}

/**
 * Heatmap Cliente × Cultivo com edição inline estilo Excel:
 * - Duplo clique: célula vira input
 * - Enter: salva | Escape: cancela
 * - Tab: salva e move para a próxima célula da linha
 * (Substituiu o antigo window.prompt(), que quebrava o fluxo de edição.)
 */
export default function Heatmap({ data, clients, crops, validCombos, onCellChange }: HeatmapProps) {
  const [editing, setEditing] = useState<{ client: string; crop: string } | null>(null);
  const [draft, setDraft] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const getCellColor = (val: number) => {
    if (val === 0) return 'bg-red-500/25 border-red-500/40 text-red-700';
    if (val < 50) return 'bg-amber-500/25 border-amber-500/40 text-amber-700';
    return 'bg-emerald-500/25 border-emerald-500/40 text-emerald-700';
  };

  const startEdit = (client: string, crop: string, currentVal: number) => {
    setEditing({ client, crop });
    setDraft(String(currentVal));
  };

  const commit = (moveNext = false) => {
    if (!editing) return;
    const num = parseFloat(draft.replace(',', '.'));
    if (!isNaN(num) && num >= 0 && num <= 100) {
      onCellChange(editing.client, editing.crop, num);
    }
    if (moveNext) {
      const cropIdx = crops.indexOf(editing.crop);
      const nextCrop = crops[cropIdx + 1];
      if (nextCrop) {
        const match = data.find(
          d => d.clientName === editing.client && d.cropName.toUpperCase() === nextCrop.toUpperCase()
        );
        setEditing({ client: editing.client, crop: nextCrop });
        setDraft(String(match ? match.sharePercentual : 0));
        return;
      }
    }
    setEditing(null);
  };

  const cancel = () => setEditing(null);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-white/40 backdrop-blur-sm p-4">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-border/40">
            <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest pl-2">Cliente / Produtor</th>
            {crops.map(crop => (
              <th key={crop} className="pb-3 text-center font-black text-muted-foreground uppercase tracking-widest px-4">{crop}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
              <td className="py-3 font-black text-slate-800 pl-2">{client}</td>
              {crops.map(crop => {
                const match = data.find(d => d.clientName === client && d.cropName.toUpperCase() === crop.toUpperCase());
                const val = match ? match.sharePercentual : 0;
                const isEditing = editing?.client === client && editing?.crop === crop;
                const hasArea = validCombos.has(`${client}::${crop.toUpperCase()}`);
                return (
                  <td key={crop} className="py-2 px-1 text-center">
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commit();
                          else if (e.key === 'Escape') cancel();
                          else if (e.key === 'Tab') {
                            e.preventDefault();
                            commit(true);
                          }
                        }}
                        onBlur={() => commit()}
                        className="mx-auto w-16 py-2 rounded-xl border-2 border-emerald-600 text-[11px] font-black text-center bg-white outline-none"
                        aria-label={`Share % de ${client} em ${crop}`}
                      />
                    ) : hasArea ? (
                      <div
                        onDoubleClick={() => startEdit(client, crop, val)}
                        className={`mx-auto w-16 py-2 rounded-xl border text-[11px] font-black cursor-pointer select-none transition-all hover:scale-105 active:scale-95 ${getCellColor(val)}`}
                        title="Duplo clique para editar • Enter salva • Esc cancela • Tab próxima"
                      >
                        {val}%
                      </div>
                    ) : (
                      <div
                        className="mx-auto w-16 py-2 rounded-xl border border-dashed border-muted-foreground/25 text-[11px] font-bold text-muted-foreground/40 cursor-not-allowed select-none"
                        title={`${client} não tem área cadastrada de ${crop}`}
                      >
                        —
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        💡 Duplo clique para editar • Enter salva • Esc cancela • Tab pula para o próximo cultivo
      </div>
    </div>
  );
}
