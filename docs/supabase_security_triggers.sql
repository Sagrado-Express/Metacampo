-- ==============================================================================
-- META CAMPO V4 - SUPABASE SECURITY HARDENING & JWT CLAIMS INJECTION
-- ==============================================================================
-- Este script implementa a defesa contra injeção de Tenant ID por usuários mal
-- intencionados e garante o isolamento seguro (RLS) baseado em claims gerados
-- EXCLUSIVAMENTE pelo backend do Supabase via Triggers Seguras no PostgreSQL.
-- ==============================================================================

-- 1. Criação da Tabela de Relacionamento (User <-> Tenant) 
-- Garante que um usuário de Autenticação tem vínculo imutável com seu Tenant no DB
CREATE TABLE IF NOT EXISTS public.user_tenants (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS estrito na tabela de relacionamento para impedir manipulações de escalonamento de privilégios
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only read their own tenant assignment" 
    ON public.user_tenants FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Trigger Function: custom_access_token_hook
-- Injeta de forma autoritária o `tenant_id` correto no payload do JWT no momento 
-- da renovação/criação do token, barrando qualquer manipulação client-side.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    claims jsonb;
    user_tenant_id uuid;
BEGIN
    -- Busca o Tenant ID do usuário logado diretamente da base segura do DB
    SELECT tenant_id INTO user_tenant_id 
    FROM public.user_tenants 
    WHERE user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    IF user_tenant_id IS NOT NULL THEN
        -- Sobrescreve o `tenant_id` no JWT de forma forçada via PostgreSQL Backend
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(user_tenant_id));
    ELSE
        -- Bloqueia tokens sem Tenant (Fallback Seguro)
        claims := jsonb_set(claims, '{app_metadata, tenant_id}', 'null'::jsonb);
    END IF;

    -- Retorna o JWT processado e seguro
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

-- 3. Conceder permissão ao papel de Supabase Auth para executar o Hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO authenticated;

-- NOTA IMPORTANTE DE IMPLANTAÇÃO:
-- Vá ao Dashboard do Supabase -> Authentication -> Hooks -> Custom Access Token Hook
-- E habilite o hook utilizando a função `public.custom_access_token_hook`
