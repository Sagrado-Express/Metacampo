'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { MOCK_TEST_DATA } from '@/data/mock_database'

export default function VisitPlanner() {
  const [frequencies, setFrequencies] = useState({
    azul: 4,
    verde: 2,
    amarelo: 1,
    vermelho: 0.5
  })

  // Calculate counts dynamically from real database
  const counts = useMemo(() => {
    let azul = 0, verde = 0, amarelo = 0, vermelho = 0;
    MOCK_TEST_DATA.forEach(d => {
      if (d.rating === 'A' && d.relacionamento >= 5) {
        azul++;
      } else if (d.rating === 'A') {
        verde++;
      } else if (d.rating === 'B' && d.relacionamento >= 4) {
        amarelo++;
      } else {
        vermelho++;
      }
    });
    return { azul, verde, amarelo, vermelho };
  }, []);

  const totalVisits = useMemo(() => {
    return (
      (counts.azul * frequencies.azul) +
      (counts.verde * frequencies.verde) +
      (counts.amarelo * frequencies.amarelo) +
      (counts.vermelho * frequencies.vermelho)
    );
  }, [counts, frequencies]);

  const workingDays = 20
  const isOverCapacity = totalVisits > workingDays

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="text-accent" size={24} />
            Plano de Visitas e Capacidade
          </h2>
          <p className="text-sm text-muted-foreground">Definição da frequência comercial vs. disponibilidade operacional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Frequency Configuration */}
        <div className="lg:col-span-2 glass-card p-8">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
            <Clock className="text-muted-foreground" size={18} />
            Frequência por Segmento (Visitas/Mês)
          </h3>
          
          <div className="space-y-8">
            <FrequencySlider label="Azul (Estratégico)" color="bg-primary" value={frequencies.azul} count={counts.azul} onChange={(v: number) => setFrequencies({...frequencies, azul: v})} />
            <FrequencySlider label="Verde (Crescimento)" color="bg-success" value={frequencies.verde} count={counts.verde} onChange={(v: number) => setFrequencies({...frequencies, verde: v})} />
            <FrequencySlider label="Amarelo (Manutenção)" color="bg-warning" value={frequencies.amarelo} count={counts.amarelo} onChange={(v: number) => setFrequencies({...frequencies, amarelo: v})} />
            <FrequencySlider label="Vermelho (Baixa Prioridade)" color="bg-destructive" value={frequencies.vermelho} count={counts.vermelho} onChange={(v: number) => setFrequencies({...frequencies, vermelho: v})} />
          </div>
        </div>

        {/* Capacity Validation */}
        <div className="space-y-6">
          <div className={`glass-card p-8 border-2 transition-all ${isOverCapacity ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'}`}>
            <div className="text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Carga Comercial Total</p>
              <h3 className={`text-6xl font-black font-tabular ${isOverCapacity ? 'text-destructive' : 'text-success'}`}>
                {totalVisits.toFixed(0)}
              </h3>
              <p className="text-xs font-bold uppercase">Visitas Planejadas / Mês</p>
              
              <div className="h-px bg-white/10 my-6" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span>Capacidade (20 dias úteis)</span>
                  <span>{workingDays} Visitas</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalVisits / workingDays * 100))}%` }}
                    className={`h-full ${isOverCapacity ? 'bg-destructive' : 'bg-success'}`}
                  />
                </div>
              </div>

              {isOverCapacity ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg text-[10px] font-bold text-left mt-6"
                >
                  <AlertTriangle size={20} className="flex-shrink-0" />
                  <span>PLANO IMPOSSÍVEL: Excesso de {totalVisits - workingDays} visitas detectado. Ajuste as frequências.</span>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-success bg-success/10 p-3 rounded-lg text-[10px] font-bold text-left mt-6"
                >
                  <CheckCircle2 size={20} className="flex-shrink-0" />
                  <span>PLANO VIÁVEL: Carga comercial dentro da capacidade operacional.</span>
                </motion.div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 flex items-start gap-4">
            <Info className="text-accent flex-shrink-0" size={20} />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Regra de Negócio:</strong> A capacidade baseia-se em uma visita produtiva por dia útil. 
              Para frequências menores que 1, considere visitas bimestrais ou semestrais.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FrequencySliderProps {
  label: string;
  color: string;
  value: number;
  count: number;
  onChange: (v: number) => void;
}

function FrequencySlider({ label, color, value, count, onChange }: FrequencySliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-sm ${color}`} />
          <p className="text-sm font-bold uppercase">{label}</p>
          <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded">{count} Clientes</span>
        </div>
        <span className="text-lg font-black text-accent font-tabular">{value}x/mês</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="8" 
        step="0.5"
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
      />
    </div>
  )
}
