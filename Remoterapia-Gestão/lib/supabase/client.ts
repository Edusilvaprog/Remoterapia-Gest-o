import {localPreviewEnabled,createLocalPreviewClient} from '@/lib/local-preview-client'
import { createBrowserClient } from '@supabase/ssr'

function createLiveClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: 'sb-remoterapia-gestao-auth-token' } }
  )
}

export function createClient(){
 if(localPreviewEnabled())return createLocalPreviewClient() as ReturnType<typeof createLiveClient>
 return createLiveClient()
}
