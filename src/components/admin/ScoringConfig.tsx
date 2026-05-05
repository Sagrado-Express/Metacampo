'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Info, AlertCircle } from 'lucide-react'
import { ScoringWeights } from '@/types/blueprint'

export default function ScoringConfig() {
  const [weights, setWeights] = useState<ScoringWeights>({
    vpm: 40,
    acesso: 30,
    gapTecnico: 20,
    relacionamento: 10
  })

  const total = weights.vpm + weights.acesso + weights.gapTecnico + weights.relacionamento
  const isInvalid = total !== 100

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Award className="text-accent" size={24} />
            Scoring Multicriterial (A Régua de Cor)
          </h2>
          <p className="text-sm text-muted-foreground">Configure os pesos que definem a importância e prioridade dos clientes</p>
        </div>
      </div>

      <div className="glass-card p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <WeightSlider 
              label="VPM (Potencial de Mercado)" 
              value={weights.vpm} 
              onChange={(v: number) => handleWeightChange('vpm', v)} 
              description="Peso do volume financeiro total possível por cliente."
            />
            <WeightSlider 
              label="Share de Acesso" 
              value={weights.acesso} 
              onChange={(v: number) => handleWeightChange('acesso', v)} 
              description="Peso da participação atual da empresa no cliente."
            />
            <WeightSlider 
              label="Gap Técnico (Embrapa)" 
              value={weights.gapTecnico} 
              onChange={(v: number) => handleWeightChange('gapTecnico', v)} 
              description="Oportunidade baseada na diferença entre uso real e recomendado."
            />
            <WeightSlider 
              label="Relacionamento / Risco" 
              value={weights.relacionamento} 
              onChange={(v: number) => handleWeightChange('relacionamento', v)} 
              description="Fatores qualitativos e fidelidade comercial."
            />
          </div>

          <div className="flex flex-col items-center justify-center space-y-6 p-8 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">Total de Pesos</p>
              <h3 className={`text-6xl font-black font-tabular transition-colors ${isInvalid ? 'text-destructive' : 'text-success'}`}>
                {total}%
              </h3>
            </div>

            {isInvalid && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-lg text-xs font-bold"
              >
                <AlertCircle size={16} />
                A soma dos pesos deve ser exatamente 100%
              </motion.div>
            )}

            <div className="w-full space-y-4 pt-6">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center">Impacto na Segmentação</p>
              <div className="flex justify-between w-full gap-2">
                <ColorBox color="bg-primary" label="Azul" range="> 8.5" />
                <ColorBox color="bg-success" label="Verde" range="7.0 - 8.5" />
                <ColorBox color="bg-warning" label="Amarelo" range="5.0 - 7.0" />
                <ColorBox color="bg-destructive" label="Vermelho" range="< 5.0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface WeightSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  description: string;
}

function WeightSlider({ label, value, onChange, description }: WeightSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-tight">{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        <span className="text-lg font-black text-accent font-tabular">{value}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
      />
    </div>
  )
}

interface ColorBoxProps {
  color: string;
  label: string;
  range: string;
}

function ColorBox({ color, label, range }: ColorBoxProps) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className={`w-full h-8 rounded-md shadow-lg ${color}`} />
      <span className="text-[10px] font-bold">{label}</span>
      <span className="text-[9px] text-muted-foreground font-tabular">{range}</span>
    </div>
  )
}
