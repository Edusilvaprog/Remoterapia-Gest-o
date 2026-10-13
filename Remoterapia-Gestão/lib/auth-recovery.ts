import type { SupabaseClient } from '@supabase/supabase-js'

export async function hasRecentRecoverySession(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  const now = Math.floor(Date.now() / 1000)
  const issuer = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') + '/auth/v1'
  if (error || !claims || claims.sub !== userId || claims.iss !== issuer ||
      claims.role !== 'authenticated' || claims.is_anonymous !== false ||
      typeof claims.session_id !== 'string' || !claims.session_id ||
      typeof claims.exp !== 'number' || claims.exp <= now ||
      !(claims.aud === 'authenticated' || (Array.isArray(claims.aud) && claims.aud.includes('authenticated')))) return false
  return Array.isArray(claims.amr) && claims.amr.some(entry =>
    typeof entry === 'object' && entry !== null && entry.method === 'recovery' &&
    typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp) &&
    entry.timestamp <= now + 30 && now - entry.timestamp <= 15 * 60
  )
}

export function configuredAppOrigin(): string | null {
  try {
    const value = process.env.NEXT_PUBLIC_SITE_URL
    if (!value) return process.env.NODE_ENV === 'production' ? null : 'http://localhost:3005'
    const url = new URL(value)
    if (url.username || url.password) return null
    if (url.protocol === 'https:') return url.origin
    if (process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return url.origin
    return null
  } catch { return null }
}
