'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  Users, 
  Target, 
  TrendingUp, 
  MapPin, 
  ChevronRight,
  Calculator,
  ShieldCheck
} from 'lucide-react'

import DiagnosisWorkspace from '@/components/ctv/workspaces/DiagnosisWorkspace'

// Placeholder Workspaces (will be moved to separate files)
import TabelaMae from '@/components/ctv/workspaces/TabelaMae'
import ExecutionWorkspace from '@/components/ctv/workspaces/ExecutionWorkspace'
import TacticalAgendaWorkspace from '@/components/ctv/workspaces/TacticalAgendaWorkspace'
import ParetoPlanning from '@/components/ctv/workspaces/ParetoPlanning'

type Workspace = 'DIAGNOSIS' | 'PORTFOLIO' | 'PLANNING' | 'EXECUTION' | 'AGENDA'

export default function CTVPlanningPage() {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>('DIAGNOSIS')

  const navItems = [
    { id: 'DIAGNOSIS', label: 'Diagnóstico', icon: Activity, description: 'Passos 1, 3, 6, 7' },
    { id: 'PORTFOLIO', label: 'Plano de Negócios', icon: Users, description: 'Passos 2, 9, 11, 14, 15' },

    { id: 'PLANNING', label: 'Planejamento', icon: Target, description: 'Passos 4, 5, 8, 10' },
    { id: 'EXECUTION', label: 'Execução', icon: TrendingUp, description: 'Passos 12, 13' },
    { id: 'AGENDA', label: 'Agenda', icon: MapPin, description: 'Passo 16' },
  ]

  return (
    <div className="flex flex-col">
      {/* Top Navigation Premium */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-8">
        <div className="max-w-7xl mx-auto h-24 flex items-center justify-between">
          <div className="flex items-center gap-8 h-full">
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-primary">
                MetaCampo
              </h1>
              <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1">SaaS de Gestão Estratégica</p>
            </div>

            <nav className="flex h-full items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveWorkspace(item.id as Workspace)}
                  className={`relative group px-6 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                    activeWorkspace === item.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <item.icon size={18} className={activeWorkspace === item.id ? 'text-primary' : 'group-hover:text-foreground'} />
                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className="text-[7px] font-bold opacity-50 uppercase tracking-tighter mt-0.5">{item.description}</span>
                  
                  {activeWorkspace === item.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute -bottom-[13px] left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_15px_rgba(45,90,39,0.5)]"
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>


          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Share Atual</p>
              <p className="text-sm font-black text-accent">32.4%</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <button className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
              <ShieldCheck size={16} /> Submeter Plano
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeWorkspace}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
          >
            {activeWorkspace === 'DIAGNOSIS' && (
              <DiagnosisWorkspace />
            )}

            {activeWorkspace === 'PORTFOLIO' && (
              <TabelaMae onNavigate={() => setActiveWorkspace('PLANNING')} />
            )}

            {activeWorkspace === 'PLANNING' && (
              <ParetoPlanning />
            )}

            {activeWorkspace === 'EXECUTION' && (
              <ExecutionWorkspace />
            )}

            {activeWorkspace === 'AGENDA' && (
              <TacticalAgendaWorkspace />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="p-8 text-center opacity-30">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]">
          GTM-GC SaaS • Protocolo V4 Ativo • {activeWorkspace} Workspace
        </p>
      </footer>
    </div>
  )
}

