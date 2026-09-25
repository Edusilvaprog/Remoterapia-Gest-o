import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from '@/lib/actions/auditoria'

// Configura se as variáveis existirem
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { base64, categoria, autor } = await request.json()
    if (!base64) return NextResponse.json({ error: 'Nenhuma foto enviada' }, { status: 400 })

    let fotoUrl = base64
    const tipoFormatado = (categoria && String(categoria).toLowerCase().includes('segur')) ? 'Segurança' : 'Paisagem'
    const staffNome = autor || session.user.user_metadata?.nome || 'Instrutor'

    // Se tiver Cloudinary configurado, sobe na nuvem
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const uploadRes = await cloudinary.uploader.upload(base64, {
        folder: `remoterapia/${tipoFormatado.toLowerCase()}`,
        resource_type: 'image',
      })
      fotoUrl = uploadRes.secure_url
    }

    // Registra na tabela oficial 'fotos'
    const { error: insertError } = await supabase.from('fotos').insert({
      tipo: tipoFormatado,
      autor: staffNome,
      img_url: fotoUrl,
      data: new Date().toISOString().split('T')[0],
    })

    if (insertError) {
      console.warn('Aviso na gravação em fotos:', insertError.message)
    }

    await registrarAuditoria(`Foto (${tipoFormatado}) registrada por ${staffNome}`)
    return NextResponse.json({ ok: true, url: fotoUrl })

  } catch (error: any) {
    console.error('Erro no upload de foto:', error)
    return NextResponse.json({ error: error.message || 'Erro ao processar foto' }, { status: 500 })
  }
}


