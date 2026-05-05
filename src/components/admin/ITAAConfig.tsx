'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings2, Save, Info } from 'lucide-react'
import { ITAAEngine, SEGMENTOS } from '@/domain/services/itAAEngine'
import { Segmento, ITAAConfig as ITAAConfigType } from '@/types/blueprint'

export default function ITAAConfig() {
  const [configs, setConfigs] = useState<Record<string, ITAAConfigType>>({
    'Soja': ITAAEngine.calculateITAA('Soja', {
      'Semente': 800,
      'Fertilizante': 1200,
      'Defensivos': 900,
      'Nutrição': 300,
      'Biológicos': 150
    }),
    'Milho': ITAAEngine.calculateITAA('Milho', {
      'Semente': 600,
      'Fertilizante': 1500,
      'Defensivos': 700,
      'Nutrição': 250,
      'Biológicos': 100
    })
  })

  const handleValueChange = (cultura: string, segmento: Segmento, value: number) => {
    setConfigs(prev => {
      const currentValores = { ...prev[cultura].valores, [segmento]: value }
      return {
        ...prev,
        [cultura]: ITAAEngine.calculateITAA(cultura, currentValores)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="text-accent" size={24} />
            Matriz ITAA (DNA Financeiro)
          </h2>
          <p className="text-sm text-muted-foreground">Definição do Investimento Tecnológico por Área (R$/ha)</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <Save size={18} /> Salvar Padrão Global
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(configs).map(([cultura, config]) => (
          <motion.div 
            key={cultura}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold uppercase tracking-wider">{cultura}</h3>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">ITAA Total</p>
                <p className="text-xl font-black text-accent font-tabular">
                  R$ {config.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {SEGMENTOS.map((segmento) => (
                <div key={segmento} className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
                      {segmento}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <input 
                        type="number"
                        value={config.valores[segmento as Segmento]}
                        onChange={(e) => handleValueChange(cultura, segmento, Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-tabular"
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right pt-5">
                    <p className="text-[10px] text-muted-foreground font-bold">MIX</p>
                    <p className="text-xs font-bold text-success font-tabular">
                      {(config.mixTecnico[segmento as Segmento] * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                <Info size={14} />
                <span>O Mix Técnico é calculado automaticamente com base no valor total.</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
