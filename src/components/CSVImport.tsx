'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react'
import { MiddlewareService } from '../domain/services/middleware.service'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function CSVImport() {
  const [isUploading, setIsUploading] = useState(false)
  const [importResult, setImportResult] = useState<{clientCount: number, totalRevenue: number, recordCount: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const parsedData = MiddlewareService.parseBillingCSV(content)
        
        // Simulation of a brief processing delay for UX
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const consolidated = MiddlewareService.processStrategicConsolidation(parsedData, [])
        const clientCount = Object.keys(consolidated).length
        const totalRevenue = Object.values(consolidated).reduce((acc: number, curr: { totalRevenue: number }) => acc + curr.totalRevenue, 0)

        setImportResult({
          clientCount,
          totalRevenue,
          recordCount: parsedData.length
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao processar arquivo.')
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="glass-card p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
          <Database size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight uppercase">Importação Estratégica</h3>
          <p className="text-sm text-muted-foreground">Consolidação de faturamento ERP (Memory-First)</p>
        </div>
      </div>

      {!importResult && !isUploading && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group cursor-pointer border-2 border-dashed border-muted-foreground/20 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-accent/50 hover:bg-accent/5 transition-all"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
            <Upload size={32} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold">Clique ou arraste o arquivo CSV</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Layout: ID_Cliente, Nome_Cliente, Produto, Segmento, Volume, Faturamento_R$, 
              vendedor, marca, principio_ativo, data_emissao, loja_cliente, uf_entrega, cidade_entrega...
            </p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
        </div>
      )}

      {isUploading && (
        <div className="py-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="text-accent animate-spin" size={40} />
          <p className="text-sm font-bold animate-pulse">Processando em Memória Volátil...</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Soberania de Dados Ativa</p>
        </div>
      )}

      {importResult && (
        <div className="p-6 bg-success/5 border border-success/20 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 size={20} />
            <span className="text-sm font-bold">Consolidação Concluída com Sucesso</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background/50 p-4 rounded-xl border border-success/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Registros</p>
              <p className="text-lg font-bold">{importResult.recordCount}</p>
            </div>
            <div className="bg-background/50 p-4 rounded-xl border border-success/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Clientes</p>
              <p className="text-lg font-bold">{importResult.clientCount}</p>
            </div>
            <div className="bg-background/50 p-4 rounded-xl border border-success/10">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Faturamento</p>
              <p className="text-lg font-bold">R$ {(importResult.totalRevenue / 1e6).toFixed(1)}M</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => setImportResult(null)}
              className="px-6 py-2 rounded-xl text-xs font-bold hover:bg-muted transition-colors"
            >
              Descartar
            </button>
            <button className="bg-success text-success-foreground px-8 py-2 rounded-xl text-xs font-bold shadow-lg shadow-success/20">
              Persistir Resultados Estratégicos
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive animate-in shake-1 duration-300">
          <AlertCircle size={20} />
          <p className="text-xs font-bold">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-[10px] font-bold uppercase tracking-widest hover:underline"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  )
}
