-- Tabela de Planejamento (Cliente × Segmento × Cultivo)
CREATE TABLE IF NOT EXISTS public.planejamento_cliente_segmento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ctv_id TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  cultivo VARCHAR(100) NOT NULL,
  segmento VARCHAR(100) NOT NULL,
  valor_planejado_centavos BIGINT NOT NULL DEFAULT 0,
  share_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, cliente_id, cultivo, segmento)
);

-- Enable RLS
ALTER TABLE public.planejamento_cliente_segmento ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users see only their tenant's planejamento" ON public.planejamento_cliente_segmento;
CREATE POLICY "Users see only their tenant's planejamento"
  ON public.planejamento_cliente_segmento FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can insert planejamento for their tenant" ON public.planejamento_cliente_segmento;
CREATE POLICY "Users can insert planejamento for their tenant"
  ON public.planejamento_cliente_segmento FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can update their tenant's planejamento" ON public.planejamento_cliente_segmento;
CREATE POLICY "Users can update their tenant's planejamento"
  ON public.planejamento_cliente_segmento FOR UPDATE
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can delete their tenant's planejamento" ON public.planejamento_cliente_segmento;
CREATE POLICY "Users can delete their tenant's planejamento"
  ON public.planejamento_cliente_segmento FOR DELETE
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_planejamento_tenant ON public.planejamento_cliente_segmento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_cliente ON public.planejamento_cliente_segmento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_cultivo ON public.planejamento_cliente_segmento(cultivo);
