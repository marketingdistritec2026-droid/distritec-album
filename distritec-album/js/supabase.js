// =============================================
// DISTRITEC ALBUM 2026 — Conexión Supabase
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = 'https://pokkdyilcwhhpxgcqwun.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva2tkeWlsY3doaHB4Z2Nxd3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTEyOTcsImV4cCI6MjA5NTQ2NzI5N30.8NAopQnYugYdPXI1AGYWItUyfIwX2dz5kuB6drzmgcg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

export async function loginPorCedula(cedula) {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('cedula', cedula)
    .eq('activo', true)
    .single()
  if (error || !data) return { ok: false, error: 'Cédula no encontrada' }
  localStorage.setItem('distritec_user', JSON.stringify(data))
  return { ok: true, colaborador: data }
}

export function getUsuarioActual() {
  const raw = localStorage.getItem('distritec_user')
  return raw ? JSON.parse(raw) : null
}

export function cerrarSesion() {
  localStorage.removeItem('distritec_user')
  window.location.href = 'index.html'
}

export async function getColeccion(cedula) {
  const { data, error } = await supabase
    .from('coleccion')
    .select(`lamina_id, cantidad, via, obtenida_en,
      colaboradores!coleccion_lamina_id_fkey(id,nombre,cargo,ciudad,grupo,grupo_name,categoria,num_lamina,foto_url)`)
    .eq('cedula_dueno', cedula)
  if (error) return { ok: false, error }
  return { ok: true, data }
}

export async function getTodosColaboradores() {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('activo', true)
    .order('grupo')
    .order('num_lamina')
  if (error) return { ok: false, error }
  return { ok: true, data }
}

export async function canjearCodigo(token, cedula, laminas) {
  const { data, error } = await supabase
    .rpc('canjear_codigo', {
      p_token: token.toUpperCase(),
      p_cedula: cedula,
      p_laminas: laminas
    })
  if (error) return { ok: false, error }
  return data
}

export async function validarCodigo(token, cedula) {
  const { data, error } = await supabase
    .from('codigos').select('*')
    .eq('token', token.toUpperCase()).single()
  if (error || !data) return { ok: false, error: 'Código no existe' }
  if (data.cedula_dueno !== cedula) {
    await supabase.from('codigos').update({ intento_cedula: cedula }).eq('token', token.toUpperCase())
    return { ok: false, error: 'Este código no te pertenece' }
  }
  if (data.estado !== 'pendiente') return { ok: false, error: 'Código ya usado o expirado' }
  if (data.expira_en && new Date(data.expira_en) < new Date()) {
    await supabase.from('codigos').update({ estado: 'expirado' }).eq('token', token.toUpperCase())
    return { ok: false, error: 'Código expirado' }
  }
  return { ok: true, codigo: data }
}

export async function getLaminasRepetidas(cedula) {
  const { data, error } = await supabase
    .from('coleccion')
    .select(`lamina_id, cantidad,
      colaboradores!coleccion_lamina_id_fkey(id,nombre,cargo,ciudad,grupo,grupo_name,categoria,foto_url)`)
    .eq('cedula_dueno', cedula).gt('cantidad', 1)
  if (error) return { ok: false, error }
  return { ok: true, data }
}

export async function ofrecerIntercambio(cedulaOfrece, laminaOfrecida) {
  const { data, error } = await supabase
    .from('intercambios')
    .insert({ cedula_ofrece: cedulaOfrece, lamina_ofrecida: laminaOfrecida, estado: 'pendiente' })
    .select().single()
  if (error) return { ok: false, error }
  return { ok: true, data }
}

export async function getIntercambiosDisponibles(cedula) {
  const { data, error } = await supabase
    .from('intercambios')
    .select(`*, oferente:colaboradores!intercambios_cedula_ofrece_fkey(nombre,ciudad,grupo),
      lamina:colaboradores!intercambios_lamina_ofrecida_fkey(id,nombre,cargo,ciudad,grupo,categoria)`)
    .eq('estado', 'pendiente').neq('cedula_ofrece', cedula)
  if (error) return { ok: false, error }
  return { ok: true, data }
}

export async function completarIntercambio(intercambioId) {
  const { data: inter } = await supabase.from('intercambios').select('*').eq('id', intercambioId).single()
  if (!inter) return { ok: false, error: 'No encontrado' }
  await Promise.all([
    supabase.from('coleccion').insert({ cedula_dueno: inter.cedula_solicita, lamina_id: inter.lamina_ofrecida, via: 'intercambio' }),
    supabase.from('coleccion').insert({ cedula_dueno: inter.cedula_ofrece, lamina_id: inter.lamina_pedida, via: 'intercambio' }),
    supabase.from('intercambios').update({ estado: 'completado', completado_en: new Date().toISOString() }).eq('id', intercambioId)
  ])
  return { ok: true }
}

export async function getLeaderboard() {
  const { data, error } = await supabase.from('coleccion').select('cedula_dueno')
  if (error) return { ok: false, error }
  const counts = {}
  data.forEach(r => { counts[r.cedula_dueno] = (counts[r.cedula_dueno] || 0) + 1 })
  const ranking = Object.entries(counts).map(([cedula, total]) => ({ cedula, total }))
    .sort((a, b) => b.total - a.total).slice(0, 20)
  const { data: colabs } = await supabase.from('colaboradores')
    .select('cedula,nombre,ciudad,grupo').in('cedula', ranking.map(r => r.cedula))
  return { ok: true, data: ranking.map(r => ({ ...r, ...colabs.find(c => c.cedula === r.cedula) })) }
}
