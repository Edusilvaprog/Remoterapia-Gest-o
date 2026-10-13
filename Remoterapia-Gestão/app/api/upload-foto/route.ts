import {localPreviewEnabled} from '@/lib/local-preview-client'
import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/actions/auditoria'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 8192

class UploadRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    const requestedUrl = new URL(request.url)
    if (
      process.env.NODE_ENV !== 'production' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(requestedUrl.hostname) &&
      origin === requestedUrl.origin
    ) return true

    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!configuredUrl) return false
    return origin === new URL(configuredUrl).origin
  } catch {
    return false
  }
}

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new UploadRequestError(415, 'Envie a imagem no formato esperado.')
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (declaredLength > MAX_BODY_BYTES) {
    throw new UploadRequestError(413, 'A imagem deve ter no máximo 4 MB.')
  }

  const reader = request.body?.getReader()
  if (!reader) throw new UploadRequestError(400, 'Dados incompletos.')

  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new UploadRequestError(413, 'A imagem deve ter no máximo 4 MB.')
    }
    chunks.push(value)
  }

  try {
    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Invalid payload')
    }
    return payload as Record<string, unknown>
  } catch {
    throw new UploadRequestError(400, 'Dados inválidos.')
  }
}

function validateImage(value: unknown): string {
  if (typeof value !== 'string') throw new UploadRequestError(400, 'Nenhuma foto enviada.')
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[2].length % 4 !== 0) {
    throw new UploadRequestError(400, 'Use uma imagem PNG, JPEG ou WebP.')
  }

  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new UploadRequestError(413, 'A imagem deve ter no máximo 4 MB.')
  }
  if (bytes.toString('base64') !== match[2]) {
    throw new UploadRequestError(400, 'Imagem inválida.')
  }

  const isPng = bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.subarray(12, 16).toString('ascii') === 'IHDR'
  const isJpeg = bytes.length >= 4 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
    bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
  const isWebp = bytes.length >= 16 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP' &&
    bytes.readUInt32LE(4) === bytes.length - 8 &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.subarray(12, 16).toString('ascii'))

  if (
    (match[1] === 'png' && !isPng) ||
    (match[1] === 'jpeg' && !isJpeg) ||
    (match[1] === 'webp' && !isWebp)
  ) throw new UploadRequestError(400, 'O conteúdo não corresponde ao formato da imagem.')

  return value
}

function configureCloudinary(): boolean {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return false
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  return true
}

export async function POST(request: Request) {
 if(localPreviewEnabled())return Response.json({error:'Integração externa desativada na prévia local.'},{status:409});

  try {
    if (!hasTrustedOrigin(request)) {
      return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('perfis_staff')
      .select('id, nome, ativo, role, roles')
      .eq('id', user.id)
      .maybeSingle()
    const roles = perfil ? [perfil.role, ...(Array.isArray(perfil.roles) ? perfil.roles : [])] : []
    if (perfilError || !perfil || perfil.ativo !== true || !roles.some(role => ['admin', 'dona', 'instrutor'].includes(role))) {
      return NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403 })
    }

    const payload = await readPayload(request)
    const base64 = validateImage(payload.base64)
    const tipo = payload.categoria === 'Segurança' ? 'Segurança' : 'Paisagem'
    if (!configureCloudinary()) {
      return NextResponse.json({ error: 'O envio de fotos está temporariamente indisponível.' }, { status: 503 })
    }

    const { data: quotaAllowed, error: quotaError } = await supabase.rpc('consumir_cota_upload', { p_escopo: 'midia' })
    if (quotaError) return NextResponse.json({ error: 'O envio de fotos está temporariamente indisponível.' }, { status: 503 })
    if (quotaAllowed !== true) {
      const now = new Date()
      const retryAfter = Math.max(1, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000))
      return NextResponse.json({ error: 'Limite diário de envio de fotos atingido. Tente novamente amanhã.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
    }

    const uploadRes = await cloudinary.uploader.upload(base64, {
      folder: `remoterapia/${tipo.toLowerCase()}`,
      resource_type: 'image',
      allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
      format: 'webp',
      transformation: [{ width: 2400, height: 2400, crop: 'limit', quality: 'auto' }],
    })

    const { data: foto, error } = await supabase.from('fotos').insert({
      tipo,
      autor: perfil.nome,
      img_url: uploadRes.secure_url,
      data: new Date().toISOString().split('T')[0],
    }).select('id').maybeSingle()
    if (error || !foto) throw new Error('Photo record insert failed')

    await registrarAuditoria(`Foto (${tipo}) registrada por ${perfil.nome}`)
    return NextResponse.json({ ok: true, url: uploadRes.secure_url })
  } catch (error: unknown) {
    if (error instanceof UploadRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Falha ao processar foto da operação.')
    return NextResponse.json({ error: 'Não foi possível salvar a foto.' }, { status: 500 })
  }
}

