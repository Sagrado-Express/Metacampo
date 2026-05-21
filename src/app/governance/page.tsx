'use client'

import HandshakeWorkflow from '@/components/governance/HandshakeWorkflow'
import { motion } from 'framer-motion'
import { ShieldCheck, History, RotateCcw, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function GovernancePage() {
  const [mounted, setMounted] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleReset = () => {
    localStorage.removeItem('metacampo_handshake_status')
    localStorage.removeItem('metacampo_handshake_snapshot')
    localStorage.removeItem('metacampo_audit_logs')
    setRefreshKey(prev => prev + 1)
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center border border-success/50 shadow-lg shadow-success/20">
            <ShieldCheck className="text-success" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Governança & Handshake</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Protocolo de Oficialização de Plano de Safra</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {mounted && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all shadow-lg"
            >
              <RotateCcw size={12} /> Resetar Governança (Testes)
            </button>
          )}

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
            <History className="text-muted-foreground" size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Audit Trail Ativo</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <motion.section 
          key={refreshKey}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <HandshakeWorkflow />
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-16"
        >
          <div className="flex items-center gap-2 mb-8">
            <History className="text-accent" size={20} />
            <h3 className="text-lg font-bold uppercase tracking-widest">Audit Trail & Histórico</h3>
          </div>
          <GovernanceTimeline key={`timeline-${refreshKey}`} />
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

function GovernanceTimeline() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const defaultEvents = [
      { date: '10/05/2026', time: '14:30', user: 'Daniel (CTV)', action: 'Materialização de Área Concluída', status: 'success', reason: 'Área consolidada na Tabela Mãe' },
      { date: '11/05/2026', time: '09:15', user: 'Daniel (CTV)', action: 'Proposta de Meta Enviada', status: 'warning', reason: 'Submissão inicial do plano de safra' },
      { date: '11/05/2026', time: '10:00', user: 'Ricardo (Gestor)', action: 'Revisão de Budget Solicitada', status: 'error', reason: 'Ajuste fino no saldo de fertilizantes' },
      { date: '11/05/2026', time: '11:20', user: 'Daniel (CTV)', action: 'Meta Ajustada e Re-submetida', status: 'success', reason: 'Planilhas atualizadas conforme GTMGC' },
    ]

    const savedLogsRaw = localStorage.getItem('metacampo_audit_logs');
    if (savedLogsRaw) {
      try {
        const parsed = JSON.parse(savedLogsRaw);
        // Map dynamic logs to our timeline view structure
        const mappedLogs = parsed.map((l: any) => {
          const d = new Date(l.changedAt);
          return {
            date: d.toLocaleDateString('pt-BR'),
            time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            user: l.changedBy,
            action: `${l.entityType}: ${l.newValue}`,
            status: 'success',
            reason: l.reason || 'Assinatura eletrônica e Snapshot gerado.'
          };
        });
        setLogs([...mappedLogs, ...defaultEvents]);
      } catch (err) {
        setLogs(defaultEvents);
      }
    } else {
      setLogs(defaultEvents);
    }
  }, [])

  return (
    <div className="space-y-4">
      {logs.map((event, i) => (
        <div key={i} className="flex gap-4 group">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full mt-1.5 ${
              event.status === 'success' ? 'bg-success' : 
              event.status === 'warning' ? 'bg-warning' : 'bg-destructive'
            } ring-4 ring-white/5`} />
            {i < logs.length - 1 && <div className="w-0.5 flex-1 bg-white/10 my-2" />}
          </div>
          <div className="flex-1 pb-6">
            <div className="glass-card p-4 group-hover:border-accent/30 transition-all">
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs font-black text-primary uppercase">{event.action}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{event.date} • {event.time}</p>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Usuário: {event.user}</p>
              {event.reason && (
                <div className="mt-2 text-[9px] bg-white/5 px-2 py-1 rounded border border-white/5 text-muted-foreground italic">
                  Motivo: {event.reason}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
