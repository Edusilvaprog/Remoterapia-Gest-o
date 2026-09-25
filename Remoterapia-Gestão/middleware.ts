import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

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
    return NextResponse.redirect(url)
  }

  // Protege rotas de mensalistas
  if (!user && isMensalistaRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/mensalistas/login'
    return NextResponse.redirect(url)
  }

  // Redireciona usuários já logados das telas de login ou da raiz /gestao
  if (user && (isGestaoLogin || path === '/gestao')) {
    const url = request.nextUrl.clone()
    url.pathname = '/gestao/selecionar-area'
    return NextResponse.redirect(url)
  }
  if (user && isMensalistaLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/mensalistas/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
