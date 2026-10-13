import {localPreviewEnabled} from '@/lib/local-preview-client'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  if(localPreviewEnabled())return NextResponse.next({request})
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-remoterapia-gestao-auth-token' },
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()
  const user = error ? null : verifiedUser
  const redirectWithCookies = (url: URL) => {
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }

  const path = request.nextUrl.pathname
  const isGestaoRoute     = path.startsWith('/gestao')
  const isMensalistaRoute = path.startsWith('/mensalistas') && path !== '/mensalistas/login'
  const isGestaoLogin     = path === '/gestao/login'
  const isGestaoSetup     = path === '/gestao/setup'
  const isMensalistaLogin = path === '/mensalistas/login'

  // Protege rotas de gestão
  if (!user && isGestaoRoute && !isGestaoLogin && !isGestaoSetup) {
    const url = request.nextUrl.clone()
    url.pathname = '/gestao/login'
    return redirectWithCookies(url)
  }

  // Protege rotas de mensalistas
  if (!user && isMensalistaRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/mensalistas/login'
    return redirectWithCookies(url)
  }

  // Redireciona usuários já logados das telas de login ou da raiz /gestao
  if (user && (isGestaoLogin || path === '/gestao')) {
    const url = request.nextUrl.clone()
    url.pathname = '/gestao/selecionar-area'
    return redirectWithCookies(url)
  }
  if (user && isMensalistaLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/mensalistas/dashboard'
    return redirectWithCookies(url)
  }

  if (user && isGestaoRoute && !isGestaoLogin && !isGestaoSetup && path!=="/gestao/seguranca" && path!=="/gestao/redefinir-senha") {
    const {data:aal,error:mfaError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if(mfaError || (aal.nextLevel==="aal2" && aal.currentLevel!=="aal2")) { const url=request.nextUrl.clone();url.pathname="/gestao/seguranca";return redirectWithCookies(url) }
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
