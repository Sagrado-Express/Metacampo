'use client'

import { useState } from 'react'
import { Calendar, Plus, Trash2, Save, Globe, Leaf } from 'lucide-react'
import { AgriculturalWindow } from '../types/schema'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function AgriculturalWindowConfig() {
  const [windows, setWindows] = useState<AgriculturalWindow[]>([
    {
      id: '1',
      empresaId: 'E1',
      cultivoId: 'Soja',
      region: 'Cerrado',
      plantingStart: new Date('2024-09-15'),
      plantingEnd: new Date('2024-11-30'),
      harvestStart: new Date('2025-02-01'),
      harvestEnd: new Date('2025-04-15'),
    }
  ])

  const [isAdding, setIsAdding] = useState(false)
  const [newWindow, setNewWindow] = useState<Partial<AgriculturalWindow>>({
    cultivoId: 'Soja',
    region: 'Sul',
    plantingStart: new Date(),
    plantingEnd: new Date(),
    harvestStart: new Date(),
    harvestEnd: new Date(),
  })

  const handleAdd = () => {
    const window: AgriculturalWindow = {
      ...(newWindow as AgriculturalWindow),
      id: Math.random().toString(36).substr(2, 9),
      empresaId: 'E1',
    }
    setWindows([...windows, window])
    setIsAdding(false)
  }

  const handleDelete = (id: string) => {
    setWindows(windows.filter(w => w.id !== id))
  }

  return (
    <div className="glass-card p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight uppercase">Janelas Agrícolas</h3>
          <p className="text-sm text-muted-foreground">Configuração dinâmica de ciclos por cultura e região</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={18} /> Nova Janela
        </button>
      </div>

      {isAdding && (
        <div className="p-6 bg-muted/30 border border-accent/20 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cultura</label>
              <select 
                value={newWindow.cultivoId}
                onChange={(e) => setNewWindow({...newWindow, cultivoId: e.target.value})}
                className="w-full p-3 bg-background border rounded-xl text-sm focus:ring-2 focus:ring-accent/30"
              >
                <option value="Soja">Soja (Glycine max)</option>
                <option value="Milho">Milho (Zea mays)</option>
                <option value="Algodão">Algodão (Gossypium)</option>
                <option value="Café">Café (Coffea)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Região</label>
              <input 
                type="text" 
                value={newWindow.region}
                onChange={(e) => setNewWindow({...newWindow, region: e.target.value})}
                placeholder="Ex: Sul, Cerrado, Nordeste..."
                className="w-full p-3 bg-background border rounded-xl text-sm focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-tighter flex items-center gap-2 text-accent">
                <Leaf size={14} /> Janela de Plantio
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground">Início</label>
                  <input 
                    type="date" 
                    onChange={(e) => setNewWindow({...newWindow, plantingStart: new Date(e.target.value)})}
                    className="w-full p-2 bg-background border rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground">Fim</label>
                  <input 
                    type="date" 
                    onChange={(e) => setNewWindow({...newWindow, plantingEnd: new Date(e.target.value)})}
                    className="w-full p-2 bg-background border rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-tighter flex items-center gap-2 text-primary">
                <Calendar size={14} /> Janela de Colheita
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground">Início</label>
                  <input 
                    type="date" 
                    onChange={(e) => setNewWindow({...newWindow, harvestStart: new Date(e.target.value)})}
                    className="w-full p-2 bg-background border rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground">Fim</label>
                  <input 
                    type="date" 
                    onChange={(e) => setNewWindow({...newWindow, harvestEnd: new Date(e.target.value)})}
                    className="w-full p-2 bg-background border rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-6 py-2 rounded-xl text-xs font-bold hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAdd}
              className="bg-accent text-accent-foreground px-8 py-2 rounded-xl text-xs font-bold shadow-lg shadow-accent/20"
            >
              Salvar Janela
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              <th className="px-6 py-4">Cultura</th>
              <th className="px-6 py-4">Região</th>
              <th className="px-6 py-4">Plantio</th>
              <th className="px-6 py-4">Colheita</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {windows.map((w) => (
              <tr key={w.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                      <Leaf size={16} />
                    </div>
                    <span className="text-sm font-bold">{w.cultivoId}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe size={14} /> {w.region}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-tabular">
                    {w.plantingStart.toLocaleDateString()} - {w.plantingEnd.toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-tabular">
                    {w.harvestStart.toLocaleDateString()} - {w.harvestEnd.toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(w.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {windows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm italic">
                  Nenhuma janela configurada. Clique em "Nova Janela" para iniciar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
