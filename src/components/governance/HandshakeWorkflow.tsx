'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Send, ClipboardCheck, Lock, History, ChevronRight, CheckCircle2 } from 'lucide-react'

type Step = 'SUBMISSION' | 'INTERVENTION' | 'HANDSHAKE' | 'FREEZE';

export default function HandshakeWorkflow() {
  const [currentStep, setCurrentStep] = useState<Step>('SUBMISSION')
  const [isOfficial, setIsOfficial] = useState(false)

  const steps = [
    { id: 'SUBMISSION', label: 'Submissão', icon: Send, description: 'CTV finaliza o planejamento' },
    { id: 'INTERVENTION', label: 'Intervenção', icon: ClipboardCheck, description: 'Gestor revisa e altera' },
    { id: 'HANDSHAKE', label: 'Aperto de Mão', icon: ShieldCheck, description: 'Acordo final entre partes' },
    { id: 'FREEZE', label: 'Congelamento', icon: Lock, description: 'Gravação imutável' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-accent" size={24} />
            Workflow de Oficialização (Handshake)
          </h2>
          <p className="text-sm text-muted-foreground">Governança tática: Do rascunho ao plano de safra imutável</p>
        </div>
      </div>

      <div className="glass-card p-8">
        {/* Stepper */}
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = steps.findIndex(s => s.id === currentStep) > idx || isOfficial

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${isActive ? 'bg-accent border-accent shadow-lg shadow-accent/20 scale-110' : isCompleted ? 'bg-success border-success text-white' : 'bg-card border-white/10 text-muted-foreground'}`}>
                  {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </div>
                <div className="text-center">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-accent' : 'text-muted-foreground'}`}>{step.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/5 rounded-2xl border border-white/10 p-8 min-h-[300px] flex flex-col items-center justify-center text-center space-y-6"
          >
            {currentStep === 'SUBMISSION' && (
              <>
                <Send className="text-accent mb-2" size={48} />
                <h3 className="text-xl font-bold uppercase tracking-tight">Pronto para Submeter?</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ao submeter, seu plano ficará em modo <span className="text-warning font-bold">Somente Leitura</span> enquanto o gestor regional realiza a revisão tática.
                </p>
                <button 
                  onClick={() => setCurrentStep('INTERVENTION')}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
                >
                  Submeter Planejamento <ChevronRight size={18} />
                </button>
              </>
            )}

            {currentStep === 'INTERVENTION' && (
              <>
                <ClipboardCheck className="text-warning mb-2" size={48} />
                <h3 className="text-xl font-bold uppercase tracking-tight">Revisão do Gestor</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  O gestor regional pode realizar ajustes em áreas, previsões de vendas ou frequências de visita para alinhar com o budget.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setCurrentStep('HANDSHAKE')}
                    className="bg-warning text-warning-foreground px-8 py-3 rounded-xl font-bold shadow-lg shadow-warning/20 hover:opacity-90 transition-all"
                  >
                    Aplicar Ajustes e Prosseguir
                  </button>
                </div>
              </>
            )}

            {currentStep === 'HANDSHAKE' && (
              <>
                <div className="flex gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50">
                    <ShieldCheck className="text-accent" size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">O "De Acordo" Final</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  O CTV revisa as alterações do gestor. Ao clicar em "De Acordo", o plano é oficializado e congelado para a safra atual.
                </p>
                <button 
                  onClick={() => setCurrentStep('FREEZE')}
                  className="bg-success text-success-foreground px-8 py-3 rounded-xl font-bold shadow-lg shadow-success/20 hover:opacity-90 transition-all"
                >
                  Confirmar Handshake
                </button>
              </>
            )}

            {currentStep === 'FREEZE' && (
              <>
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center border-2 border-success shadow-[0_0_40px_rgba(34,197,94,0.3)] mb-4"
                >
                  <Lock className="text-success" size={40} />
                </motion.div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-success">Plano Oficializado</h3>
                <div className="bg-black/20 p-4 rounded-lg border border-white/5 text-left w-full max-w-md space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-2">
                    <History size={12} /> Log de Auditoria Imutável
                  </p>
                  <div className="text-[9px] font-mono space-y-1 opacity-70">
                    <p>TIMESTAMP: {new Date().toISOString()}</p>
                    <p>ACTION: SAFRA_PLAN_FREEZE</p>
                    <p>USER: CTV_DANIEL / MGR_RICARDO</p>
                    <p>HASH: 8f3e2b...d9a1</p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
