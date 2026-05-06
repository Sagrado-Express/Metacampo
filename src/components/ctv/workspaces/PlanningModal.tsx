'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Info, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Segmento } from '@/types/blueprint'

interface PlanningModalProps {
  isOpen: boolean
  onClose: () => void
  clienteNome: string
}

const CULTIVOS = ['Soja', 'Milho', 'Algodão', 'Café', 'HF']
const SEGMENTOS: Segmento[] = ['Semente', 'Fertilizante', 'Agroquímicos', 'Nutrição', 'Biológico', 'Regulador de Crescimento']

export default function PlanningModal({ isOpen, onClose, clienteNome }: PlanningModalProps) {
  const [planningData, setPlanningData] = useState<Record<string, Record<string, number>>>({})
  const [isHandshakeComplete, setIsHandshakeComplete] = useState(false)

  if (!isOpen) return null

  const handleValueChange = (cultivo: string, segmento: string, value: number) => {
    setPlanningData(prev => ({
      ...prev,
      [cultivo]: {
        ...(prev[cultivo] || {}),
        [segmento]: value
      }
    }))
  }

  const getRealismStatus = (value: number) => {
    if (value > 2000) return { label: 'Agressivo', color: 'text-warning', icon: AlertTriangle }
    if (value > 0) return { label: 'Realista', color: 'text-success', icon: CheckCircle2 }
    return { label: 'Pendente', color: 'text-muted-foreground', icon: Info }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-background/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-accent/20"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/40">
              <Target className="text-accent" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Planejamento Cirúrgico</h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Produtor: {clienteNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Matrix Area */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-background/95 backdrop-blur p-4 text-left text-[10px] uppercase font-bold text-muted-foreground border-b border-white/5 min-w-[150px]">
                  Cultivo / Segmento
                </th>
                {SEGMENTOS.map(seg => (
                  <th key={seg} className="p-4 text-center text-[10px] uppercase font-bold text-muted-foreground border-b border-white/5 min-w-[120px]">
                    {seg}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {CULTIVOS.map(cultivo => (
                <tr key={cultivo} className="group hover:bg-white/2">
                  <td className="sticky left-0 z-20 bg-background/95 backdrop-blur p-4 font-bold text-sm uppercase tracking-wide border-r border-white/5">
                    {cultivo}
                  </td>
                  {SEGMENTOS.map(segmento => {
                    const val = planningData[cultivo]?.[segmento] || 0
                    const status = getRealismStatus(val)
                    return (
                      <td key={segmento} className="p-4">
                        <div className="space-y-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                            <input 
                              type="number"
                              placeholder="0,00"
                              value={val || ''}
                              onChange={(e) => handleValueChange(cultivo, segmento, Number(e.target.value))}
                              disabled={isHandshakeComplete}
                              className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-3 py-2 text-xs font-tabular focus:ring-1 focus:ring-accent outline-none transition-all"
                            />
                          </div>
                          <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter ${status.color}`}>
                            <status.icon size={10} />
                            {status.label}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Handshake */}
        <div className="p-8 border-t border-white/5 bg-white/2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="glass-card px-4 py-2 bg-accent/5 border-accent/20">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Investimento Planejado</p>
              <p className="text-xl font-black text-accent font-tabular">R$ 450.200,00</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground font-bold uppercase">Termômetro de Realismo</p>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-1.5 w-6 rounded-full ${i < 3 ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-[10px] text-muted-foreground text-right max-w-[200px] leading-tight italic">
              *Ao confirmar, os dados serão congelados para a safra atual (Protocolo Handshake).
            </p>
            <button 
              onClick={() => setIsHandshakeComplete(true)}
              disabled={isHandshakeComplete}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${
                isHandshakeComplete 
                  ? 'bg-success text-white' 
                  : 'bg-accent text-white hover:scale-105 hover:shadow-accent/30 active:scale-95'
              }`}
            >
              {isHandshakeComplete ? (
                <><ShieldCheck size={20} /> Plano Oficializado</>
              ) : (
                <><CheckCircle2 size={20} /> Confirmar Handshake</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
