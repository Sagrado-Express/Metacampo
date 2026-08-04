import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env.local file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

/**
 * Client novo a cada chamada, para operações de auth (signIn/signUp) do lado
 * do servidor.
 *
 * O `supabase` acima é um singleton — uma única instância viva pelo processo
 * inteiro. `auth.signInWithPassword()` muda o estado de sessão *daquela
 * instância*, e como o módulo é compartilhado por todas as requisições, uma
 * requisição concorrente que reusasse `supabase` no mesmo processo aquecido
 * podia herdar a sessão de outro usuário. Foi assim que uma query de convite
 * sem sessão nenhuma "encontrou" um convite de outro tenant durante os testes
 * desta auditoria: o processo ainda carregava a sessão de um login anterior.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(
    supabaseUrl || 'https://placeholder-project.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseServiceKey || supabaseAnonKey || 'placeholder-key'
)

export async function getSupabaseClientWithSession(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) {
    throw new Error('No authentication token found')
  }

  return createClient(
    supabaseUrl || 'https://placeholder-project.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      global: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    }
  )
}
