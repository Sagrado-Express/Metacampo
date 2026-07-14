-- ============================================================
-- TENANT INVITES TABLE
-- Invitation tokens for user registration with mandatory tenant
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins of their own tenant can see/create invites
CREATE POLICY "tenant_invites_select_own_tenant"
    ON public.tenant_invites FOR SELECT
    USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_invites_insert_own_tenant"
    ON public.tenant_invites FOR INSERT
    WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email_tenant ON public.tenant_invites(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_expires_at ON public.tenant_invites(expires_at);
