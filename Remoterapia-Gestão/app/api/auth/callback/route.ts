import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { configuredAppOrigin, hasRecentRecoverySession } from '@/lib/auth-recovery'

export async function GET(request: Request) {
  const origin = configuredAppOrigin()
  if (!origin) return NextResponse.json({ error: 'Acesso temporariamente indisponível.' }, { status: 503 })
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin), 303)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  }
  try {
    const code = new URL(request.url).searchParams.get('code')
    if (!code || code.length > 4096) return redirect('/gestao/login?error=recovery')
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return redirect('/gestao/login?error=recovery')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return redirect('/gestao/login?error=recovery')
    const { data: perfil, error: profileError } = await supabase.from('perfis_staff').select('id,role,ativo').eq('id', user.id).eq('ativo', true).maybeSingle()
    if (profileError || !perfil || !['admin','dona','instrutor','recepcao','guardaria'].includes(perfil.role) || !await hasRecentRecoverySession(supabase, user.id)) {
      await supabase.auth.signOut({ scope: 'local' })
      return redirect('/gestao/login?error=recovery')
    }
    return redirect('/gestao/redefinir-senha')
  } catch { return redirect('/gestao/login?error=recovery') }
}
