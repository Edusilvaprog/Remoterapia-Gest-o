import {localPreviewEnabled,createLocalPreviewClient} from '@/lib/local-preview-client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function createLiveClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-remoterapia-portal-auth-token' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component — ignorado se middleware renovar */ }
        },
      },
    }
  )
}

export async function createClient(){
 if(localPreviewEnabled())return createLocalPreviewClient() as Awaited<ReturnType<typeof createLiveClient>>
 return createLiveClient()
}
