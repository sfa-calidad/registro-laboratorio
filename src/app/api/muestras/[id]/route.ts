import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getRoleFromRequest } from '@/lib/auth'
import { derivarEstado } from '@/lib/muestras'

const ensayoSchema = z.object({
  parametroId: z.number().int().nullable().optional(),
  libre: z.string().nullable().optional(),
})

const schema = z.object({
  numero: z.string().min(1),
  fecha: z.string(),
  producto: z.string().min(1),
  detalle: z.string().optional(),
  tipoOrigen: z.string().optional(),
  identificacionOrigen: z.string().optional(),
  lugarMuestreo: z.string().optional(),
  contacto: z.string().optional(),
  solicitadoPor: z.string().optional(),
  remito: z.string().optional(),
  envase: z.string().optional(),
  laboratorio: z.string().optional(),
  estado: z.enum(['IDENTIFICADA', 'EN_ANALISIS', 'ENVIADA', 'CON_RESULTADO', 'ANULADA']).optional(),
  fechaEnvio: z.string().nullable().optional(),
  awb: z.string().optional(),
  protocolo: z.string().optional(),
  fechaResultado: z.string().nullable().optional(),
  resultado: z.string().optional(),
  adjuntoUrl: z.string().optional(),
  observacion: z.string().optional(),
  cargadoPor: z.string().optional(),
  ensayos: z.array(ensayoSchema).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { ensayos, ...datos } = parsed.data

  const lab = datos.laboratorio
    ? await prisma.laboratorio.findFirst({ where: { nombre: { equals: datos.laboratorio.trim(), mode: 'insensitive' } } })
    : null

  const estado = datos.estado ?? derivarEstado({
    fechaResultado: datos.fechaResultado,
    resultado: datos.resultado,
    protocolo: datos.protocolo,
    fechaEnvio: datos.fechaEnvio,
    labEsExterno: lab ? lab.esExterno : null,
  })

  const protocolo = datos.protocolo || (lab && !lab.esExterno ? datos.numero : null)

  const muestra = await prisma.muestra.update({
    where: { id: Number(id) },
    data: {
      numero: datos.numero.trim(),
      fecha: new Date(datos.fecha),
      producto: datos.producto,
      detalle: datos.detalle || null,
      tipoOrigen: datos.tipoOrigen || null,
      identificacionOrigen: datos.identificacionOrigen || null,
      lugarMuestreo: datos.lugarMuestreo || null,
      contacto: datos.contacto || null,
      solicitadoPor: datos.solicitadoPor || null,
      remito: datos.remito || null,
      envase: datos.envase || null,
      laboratorio: datos.laboratorio || null,
      estado,
      fechaEnvio: datos.fechaEnvio ? new Date(datos.fechaEnvio) : null,
      awb: datos.awb || null,
      protocolo,
      fechaResultado: datos.fechaResultado ? new Date(datos.fechaResultado) : null,
      resultado: datos.resultado || null,
      adjuntoUrl: datos.adjuntoUrl || null,
      observacion: datos.observacion || null,
      cargadoPor: datos.cargadoPor || null,
      // Los ensayos se reemplazan completos, igual que los resultados de tanque.
      ensayos: {
        deleteMany: {},
        create: (ensayos ?? [])
          .filter((e) => e.parametroId != null || e.libre)
          .map((e) => ({ parametroId: e.parametroId ?? null, libre: e.libre || null })),
      },
    },
    include: { ensayos: { include: { parametro: true } } },
  })
  return NextResponse.json(muestra)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getRoleFromRequest(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  // Los ensayos caen solos por el onDelete: Cascade de la relación.
  await prisma.muestra.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
