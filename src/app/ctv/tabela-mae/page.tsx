'use client'

import TabelaMae from '@/components/ctv/workspaces/TabelaMae'

export default function TabelaMaePage() {
  return (
    <div className="p-8 lg:p-12 space-y-8 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Plano de Negócios</h1>
        <p className="text-muted-foreground mt-2 font-medium">Mapeamento de Potencial e Materialização de Área (Passos 2 e 3)</p>
      </div>
      <TabelaMae />
    </div>
  )
}
