# Deployment Guide: Antigravity (Meta Campo)

Este guia orienta a publicação do sistema nos ambientes de homologação e produção seguindo o stack V3.

## 1. Supabase (Backend & Database)
1.  **Tier**: Assinar o plano **Supabase Pro** (~$25/mo) para habilitar backups e performance necessária.
2.  **Schema**: Executar os scripts de migração (Pasta `supabase/migrations`) para criar as tabelas de VPM, Auditoria e Safras.
3.  **RLS**: Garantir que todas as tabelas tenham Row Level Security habilitado vinculando ao `auth.uid()`.

## 2. Vercel (Frontend & Middleware)
1.  **Framework**: Next.js (App Router).
2.  **Environment Variables**:
    - `NEXT_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase.
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima pública.
    - `UPSTASH_REDIS_REST_URL`: Para o cache do middleware.
    - `UPSTASH_REDIS_REST_TOKEN`: Para o cache do middleware.
3.  **Edge Functions**: O sistema detectará automaticamente o uso de `runtime = 'edge'` nos arquivos de API do middleware.

## 3. Integração Resend (E-mails)
1.  Obter a API Key no dashboard do Resend.
2.  Configurar o domínio verificado (ex: `agora.gtm-gc.com.br`).
3.  Adicionar `RESEND_API_KEY` às variáveis de ambiente da Vercel.

## 4. Checklist de Produção
- [ ] Domínio customizado configurado.
- [ ] SSL ativado.
- [ ] RLS Policies validadas.
- [ ] Limpeza de dados de teste (Transient Middleware check).

---
*Para suporte, consulte o time de infraestrutura.*