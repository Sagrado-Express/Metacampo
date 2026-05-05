'use client'

import HandshakeWorkflow from '@/components/governance/HandshakeWorkflow'
import { motion } from 'framer-motion'
import { ShieldCheck, History } from 'lucide-react'

export default function GovernancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center border border-success/50 shadow-lg shadow-success/20">
            <ShieldCheck className="text-success" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Governança & Handshake</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Protocolo de Oficialização de Plano de Safra</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
          <History className="text-muted-foreground" size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Audit Trail Ativo</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <HandshakeWorkflow />
        </motion.section>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 opacity-60">
          <div className="glass-card p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest">Regras de Congelamento</h4>
            <ul className="text-[10px] space-y-2 list-disc list-inside uppercase font-bold">
              <li>Pós-Handshake, o plano torna-se Read-Only.</li>
              <li>Alterações exigem ticket de reset do Admin.</li>
              <li>Dados consolidados são gravados em Snapshot Safra.</li>
            </ul>
          </div>
          <div className="glass-card p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest">Conformidade e Auditoria</h4>
            <p className="text-[10px] leading-relaxed uppercase font-bold">
              Todas as interações (quem alterou meta, quem aprovou budget) são rastreadas via ID de transação imutável no banco de dados.
            </p>
          </div>
        </div>
      </main>

      <footer className="pt-12 border-t border-white/10 text-center">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          Governance Compliance Engine • Antigravity AI
        </p>
      </footer>
    </div>
  )
}
