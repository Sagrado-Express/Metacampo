'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, Check, X, ShieldAlert } from 'lucide-react'
import { VpmService } from '../domain/services/vpm.service'
import { IBGEBenchmark } from '../types/schema'

// Mock IBGE Benchmark for the selected municipality (Passo Fundo/RS - Soja)
const mockBenchmark: IBGEBenchmark = {
  ibgeCode: '4314108',
  municipio: 'Passo Fundo',
  culturaNome: 'Soja',
  areaPlantadaHa: 50000,
  vpmHaReferencia: 3500,
  produtividadeRefKg: 3600,
  valorTotalBrl: 175000000
}

export function CropSimulationModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [area, setArea] = useState<number>(0)
  const [validation, setValidation] = useState<{ isValid: boolean, warning?: string }>({ isValid: true })

  useEffect(() => {
    // Real-time validation against IBGE ceiling (Step 2)
    // In a real app, 'summedClientArea' would be (current_total_in_db + new_area)
    const result = VpmService.validateAreaAgainstIBGE(area, mockBenchmark)
    setValidation(result)
  }, [area])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden"
      >
        <div className="px-8 py-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Info size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight uppercase">Simular Cultivo</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">IBGE ID: {mockBenchmark.ibgeCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Área do Cultivo (ha)</label>
            <div className="relative">
              <input 
                type="number" 
                value={area || ''}
                onChange={(e) => setArea(Number(e.target.value))}
                placeholder="Ex: 1200"
                className="w-full p-4 bg-muted/30 border rounded-2xl text-lg font-bold focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">ha</span>
            </div>
          </div>

          <AnimatePresence>
            {!validation.isValid && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex gap-4 overflow-hidden"
              >
                <div className="text-destructive mt-1 flex-shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-destructive uppercase tracking-widest mb-1">Bloqueio de Conformidade</p>
                  <p className="text-xs leading-relaxed text-destructive/80">
                    {validation.warning}
                  </p>
                  <p className="text-[10px] mt-2 text-destructive/60 font-bold">
                    O Antigravity impede lançamentos acima do teto municipal para evitar o "engano" de metas.
                  </p>
                </div>
              </motion.div>
            )}

            {validation.isValid && area > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-success/10 border border-success/20 rounded-2xl p-4 flex gap-4 overflow-hidden"
              >
                <div className="text-success mt-1 flex-shrink-0">
                  <Check size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-success uppercase tracking-widest mb-1">Área Validada</p>
                  <p className="text-xs leading-relaxed text-success/80">
                    Lançamento dentro dos limites do IBGE para {mockBenchmark.municipio}.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 flex justify-between items-center text-[10px] text-muted-foreground">
            <div className="flex flex-col">
              <span className="font-bold uppercase tracking-widest">Referência PAM</span>
              <span>{mockBenchmark.culturaNome}: {mockBenchmark.areaPlantadaHa.toLocaleString()} ha (Teto)</span>
            </div>
            <button 
              disabled={!validation.isValid || area <= 0}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Confirmar Área
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
