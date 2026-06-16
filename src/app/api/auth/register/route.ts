// src/app/api/auth/register/route.ts
// Next.js 13 App Router API route (POST) – cadastro de usuário
// Segurança aplicada:
//   • Rate‑limit por IP (5 req/min) usando src/lib/rateLimiter.ts
//   • Verificação reCAPTCHA (Google)
//   • Sanitização simples de entrada
//   • Respostas com códigos HTTP corretos e mensagens amigáveis

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
  let payload: { name?: string; email?: string; password?: string; captchaToken?: string }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ message: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const name = payload.name?.trim() ?? ''
  const email = payload.email?.trim().toLowerCase() ?? ''
  const password = payload.password ?? ''
  const captchaToken = payload.captchaToken ?? ''

  if (!name || !email || !password || !captchaToken) {
    return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 })
  }

  // ------------------------------------------------------------------
  // reCAPTCHA validation
  // ------------------------------------------------------------------
  const captchaOk = await verifyRecaptcha(captchaToken, ip)
  if (!captchaOk) {
    return NextResponse.json({ message: 'Falha na verificação anti‑bot (reCAPTCHA).' }, { status: 400 })
  }

  // ------------------------------------------------------------------
  // Supabase signup – cria usuário e (opcional) liga ao tenant default
  // ------------------------------------------------------------------
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }, // metadata customizada
        // Se precisar de email de confirmação, já vem habilitado no projeto Supabase
      },
    })

    if (error) {
      // Normalizamos mensagens para o front‑end
      const msg = error.message.includes('already registered')
        ? 'E‑mail já está em uso.'
        : 'Erro ao criar conta.'
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    // Opcional: associar usuário ao tenant padrão – aqui exemplo rápido
    // await supabase.from('user_tenants').insert({ user_id: data.user?.id, tenant_id: DEFAULT_TENANT_ID })

    return NextResponse.json({ message: 'Conta criada com sucesso.' }, { status: 200 })
  } catch (e) {
    console.error('Signup error', e)
    return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 })
  }
}
