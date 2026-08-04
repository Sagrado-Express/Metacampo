// src/app/api/auth/register/route.ts
// Next.js 13 App Router API route (POST) – cadastro de usuário
// Segurança aplicada:
//   • Rate‑limit por IP (5 req/min) usando src/lib/rateLimiter.ts
//   • Verificação reCAPTCHA (Google)
//   • Sanitização simples de entrada
//   • Respostas com códigos HTTP corretos e mensagens amigáveis

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkRateLimit, getRetryAfter } from '@/lib/rateLimiter'

/** Helper: extrai IP real mesmo atrás de CDN */
function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  // fallback para endereço remoto (não sempre disponível no edge)
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/** Helper: valida token reCAPTCHA via Google */
async function verifyRecaptcha(token: string, ip: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    console.warn('reCAPTCHA secret not set – bypass verification')
    return true // em dev, permite passagem
  }

  const params = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  })

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    })
    const data = await res.json()
    return data.success === true && data.score >= 0.5 // score threshold optional
  } catch (e) {
    console.error('reCAPTCHA verification error', e)
    return false
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req)

  // ------------------------------------------------------------------
  // Rate‑limit por IP (5 tentativas por minuto)
  // ------------------------------------------------------------------
  const allowed = checkRateLimit(ip, 5, 60_000)
  if (!allowed) {
    const retryAfter = getRetryAfter(ip, 60_000)
    return NextResponse.json(
      { message: 'Muitas tentativas. Por favor aguarde e tente novamente.' },
      { status: 429, headers: { 'Retry-After': retryAfter.toString() } },
    )
  }

  // ------------------------------------------------------------------
  // Parse & sanitização do payload
  // ------------------------------------------------------------------
  let payload: { name?: string; email?: string; password?: string; captchaToken?: string; inviteToken?: string }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ message: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const name = payload.name?.trim() ?? ''
  const email = payload.email?.trim().toLowerCase() ?? ''
  const password = payload.password ?? ''
  const captchaToken = payload.captchaToken ?? ''
  const inviteToken = payload.inviteToken ?? ''

  if (!name || !email || !password || !captchaToken) {
    return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 })
  }

  // FAIL-CLOSED: Convite é obrigatório
  if (!inviteToken) {
    return NextResponse.json(
      { message: 'Cadastro requer convite válido. Solicite um convite ao administrador do seu tenant.' },
      { status: 403 }
    )
  }

  // ------------------------------------------------------------------
  // Validar convite antes de prosseguir
  //
  // Usa supabaseAdmin (service_role) de propósito: esta é uma rota pré-auth
  // — não existe usuário logado, então não há tenant_id de JWT para o RLS de
  // tenant_invites comparar, e a query nunca encontraria nada com o client
  // anônimo. A autorização aqui não vem de sessão, vem do próprio token
  // (24 bytes aleatórios) — é ele que prova o direito de aceitar o convite.
  // ------------------------------------------------------------------
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('tenant_invites')
    .select('*')
    .eq('token', inviteToken)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteError || !invite) {
    return NextResponse.json(
      { message: 'Convite inválido ou expirado.' },
      { status: 403 }
    )
  }

  // Email do convite deve coincidir
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { message: 'Este convite foi emitido para outro e-mail.' },
      { status: 403 }
    )
  }

  // ------------------------------------------------------------------
  // reCAPTCHA validation
  // ------------------------------------------------------------------
  const captchaOk = await verifyRecaptcha(captchaToken, ip)
  if (!captchaOk) {
    return NextResponse.json({ message: 'Falha na verificação anti‑bot (reCAPTCHA).' }, { status: 400 })
  }

  // ------------------------------------------------------------------
  // Supabase signup – cria usuário e vincula ao tenant do convite
  // ------------------------------------------------------------------
  try {
    // supabase.auth.signUp() (client anônimo) só grava user_metadata — não
    // existe API pública para setar app_metadata. Sem tenant_id ali, o
    // usuário criava conta e nunca mais conseguia logar: getSession() é
    // fail-closed (rejeita token sem tenant_id) e o RLS também rejeitaria
    // toda query, já que current_tenant_id() dependeria de uma claim
    // inexistente. Por isso o cadastro por convite usa o client admin, que
    // grava app_metadata.tenant_id direto na criação.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // o convite já validou a posse do e-mail
      app_metadata: { tenant_id: invite.tenant_id, role: 'user' },
      user_metadata: { full_name: name },
    })

    if (error) {
      const msg = error.message.includes('already registered') || error.message.includes('already been registered')
        ? 'E‑mail já está em uso.'
        : 'Erro ao criar conta.'
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    if (!data.user?.id) {
      return NextResponse.json({ message: 'Falha ao criar usuário.' }, { status: 500 })
    }

    // Vincular usuário ao tenant do convite (FAIL-CLOSED)
    const { error: linkError } = await supabaseAdmin
      .from('user_tenants')
      .insert({
        user_id: data.user.id,
        tenant_id: invite.tenant_id
      })

    if (linkError) {
      console.error('[auth/register] Falha ao vincular usuario ao tenant:', linkError)
      return NextResponse.json({ message: 'Erro ao vincular usuário ao tenant.' }, { status: 500 })
    }

    // Marcar convite como usado
    const { error: updateError } = await supabaseAdmin
      .from('tenant_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (updateError) {
      console.warn('[auth/register] Aviso ao marcar convite como usado:', updateError)
      // Não falha a requisição, user foi criado
    }

    return NextResponse.json({ message: 'Conta criada com sucesso.' }, { status: 200 })
  } catch (e) {
    console.error('Signup error', e)
    return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 })
  }
}
