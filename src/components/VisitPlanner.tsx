'use client'

import { motion } from 'framer-motion'
import { Calendar, AlertCircle, Clock, CheckCircle2, ChevronRight, UserCheck } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const mockVisits = [
  { id: '1', client: 'Fazenda Boa Vista', priority: 'CRITICAL', reason: 'Pareto A + Confiança Vermelha', deadline: 'Hoje' },
  { id: '2', client: 'Grupo SLC Agrícola', priority: 'HIGH', reason: 'Pareto A - Manutenção de Share', deadline: 'Amanhã' },
  { id: '3', client: 'Agropecuária Santa Helena', priority: 'HIGH', reason: 'Janela de Plantio Iniciando', deadline: '2 dias' },
  { id: '4', client: 'Usina Raízen', priority: 'MEDIUM', reason: 'Check-in Mensal', deadline: 'Próx. Semana' },
]

export function VisitPlanner() {
  return (
    <div className="glass-card p-8 space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight uppercase">Plano de Visitas (Passo 16)</h3>
          <p className="text-sm text-muted-foreground">Priorização Baseada em Pareto e Risco</p>
        </div>
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
          <Calendar size={24} />
        </div>
      </div>

      <div className="space-y-3">
        {mockVisits.map((visit, i) => (
          <motion.div 
            key={visit.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group flex items-center gap-4 p-4 bg-muted/20 border border-transparent hover:border-accent/30 rounded-2xl transition-all cursor-pointer"
          >
            <div className={cn(
              "w-2 h-12 rounded-full",
              visit.priority === 'CRITICAL' ? "bg-destructive shadow-[0_0_8px_rgba(var(--destructive),0.4)]" :
              visit.priority === 'HIGH' ? "bg-warning" : "bg-primary/40"
            )} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold truncate">{visit.client}</span>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                  visit.priority === 'CRITICAL' ? "text-destructive" :
                  visit.priority === 'HIGH' ? "text-warning" : "text-muted-foreground"
                )}>
                  {visit.priority}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{visit.reason}</p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                <Clock size={10} /> {visit.deadline}
              </div>
              <button className="p-1 hover:bg-accent/10 rounded text-accent transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <button className="w-full mt-4 py-4 bg-accent/5 border border-dashed border-accent/20 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent/10 transition-all">
        <UserCheck size={14} /> Sincronizar com Agenda (Google/Outlook)
      </button>
    </div>
  )
}
