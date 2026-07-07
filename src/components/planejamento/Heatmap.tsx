import React from 'react';

interface HeatmapProps {
  data: { clientName: string; cropName: string; sharePercentual: number }[];
  clients: string[];
  crops: string[];
  onCellChange: (clientName: string, cropName: string, newShare: number) => void;
}

export default function Heatmap({ data, clients, crops, onCellChange }: HeatmapProps) {
  const getCellColor = (val: number) => {
    if (val === 0) return 'bg-red-500/25 border-red-500/40 text-red-700';
    if (val < 50) return 'bg-amber-500/25 border-amber-500/40 text-amber-700';
    return 'bg-emerald-500/25 border-emerald-500/40 text-emerald-700';
  };

  const handleDoubleClick = (client: string, crop: string, currentVal: number) => {
    const input = prompt(`Definir novo Apetite Comercial (Share %) para ${client} (${crop}):`, String(currentVal));
    if (input !== null) {
      const num = parseFloat(input);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        onCellChange(client, crop, num);
      } else {
        alert('Por favor, informe um valor numérico entre 0 e 100.');
      }
    }
  };

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
          {clients.map(client => {
            return (
              <tr key={client} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                <td className="py-3 font-black text-slate-800 pl-2">{client}</td>
                {crops.map(crop => {
                  const match = data.find(d => d.clientName === client && d.cropName.toUpperCase() === crop.toUpperCase());
                  const val = match ? match.sharePercentual : 0;
                  return (
                    <td key={crop} className="py-2 px-1 text-center">
                      <div
                        onDoubleClick={() => handleDoubleClick(client, crop, val)}
                        className={`mx-auto w-16 py-2 rounded-xl border text-[11px] font-black cursor-pointer select-none transition-all hover:scale-105 active:scale-95 ${getCellColor(val)}`}
                        title="Dê duplo clique para editar"
                      >
                        {val}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-2">
        <span>💡 Dica: Dê duplo clique sobre qualquer célula para editar o apetite comercial (% share) de um cultivo.</span>
      </div>
    </div>
  );
}
