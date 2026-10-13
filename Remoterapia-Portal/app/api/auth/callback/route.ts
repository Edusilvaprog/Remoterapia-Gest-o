import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

function trustedAppOrigin(request: Request): string | null {
  try {
    const requested = new URL(request.url)
    if (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(requested.hostname)) {
      return requested.origin
    }
    const configured = process.env.NEXT_PUBLIC_SITE_URL
    if (!configured) return null
    const url = new URL(configured)
    if (url.username || url.password || url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const appOrigin = trustedAppOrigin(request)
  if (!appOrigin) {
    return NextResponse.json({ error: 'Acesso temporariamente indisponível.' }, { status: 503 })
  }
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, appOrigin), 303)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  }

  try {
    const code = new URL(request.url).searchParams.get('code')
    if (!code || code.length > 4096) return redirect('/?error=auth_error')

    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) return redirect('/?error=auth_error')

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    const { data: verified, error: claimsError } = await supabase.auth.getClaims()
    const claims = verified?.claims
    const issuer = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') + '/auth/v1'
    const now = Math.floor(Date.now() / 1000)
    if (
      userError || !user || claimsError || !claims || claims.sub !== user.id || claims.iss !== issuer ||
      claims.role !== 'authenticated' || claims.is_anonymous !== false ||
      typeof claims.session_id !== 'string' || !claims.session_id ||
      typeof claims.exp !== 'number' || claims.exp <= now ||
      !(claims.aud === 'authenticated' || (Array.isArray(claims.aud) && claims.aud.includes('authenticated')))
    ) return redirect('/?error=auth_error')

    const { data: aluno, error: alunoError } = await supabase
      .from('mensalistas')
      .select('id')
      .eq('auth_id', user.id)
      .is('arquivado_em', null)
      .maybeSingle()
    if (alunoError || !aluno) return redirect('/?error=account_unavailable')

    const recovery = Array.isArray(claims.amr) && claims.amr.some(entry =>
      typeof entry === 'object' && entry !== null && entry.method === 'recovery' &&
      typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp) &&
      entry.timestamp <= now + 30 && now - entry.timestamp <= 15 * 60
    )
    const c = await cookies()
    c.delete('aluno_id')
    if (recovery) {
      // This flag controls the screen only; password updates independently verify signed claims.
      c.set('redefinir_senha', '1', { httpOnly: true, secure: new URL(appOrigin).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 15 * 60 })
    } else {
      c.delete('redefinir_senha')
    }

    return redirect(recovery ? '/#trocar_senha' : '/#home')
  } catch {
    return redirect('/?error=auth_error')
  }
}

