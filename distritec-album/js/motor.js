// =============================================
// DISTRITEC ALBUM 2026 — Motor del Sobre
// 7 láminas con reglas inteligentes
// =============================================

import { getTodosColaboradores, getColeccion, canjearCodigo } from './supabase.js'

// Cache de colaboradores para no pedir a Supabase en cada sobre
let _todosCache = null

export async function getTodos() {
  if (_todosCache) return _todosCache
  const res = await getTodosColaboradores()
  if (res.ok) _todosCache = res.data
  return _todosCache || []
}

function pickRandom(arr, n) {
  const a = [...arr]
  const res = []
  for (let i = 0; i < Math.min(n, a.length); i++) {
    const idx = Math.floor(Math.random() * a.length)
    res.push(a.splice(idx, 1)[0])
  }
  return res
}

// =============================================
// MOTOR PRINCIPAL — genera las 7 láminas
// =============================================
export async function generarSobre(cedula) {
  const todos = await getTodos()
  if (!todos.length) return { ok: false, error: 'No hay colaboradores' }

  // Obtener colección actual del usuario
  const colRes = await getColeccion(cedula)
  const coleccionIds = new Set(
    colRes.ok ? colRes.data.map(c => c.lamina_id) : []
  )

  const lideres   = todos.filter(p => p.categoria === 'LIDER')
  const faltantes = todos.filter(p => !coleccionIds.has(p.id))
  const lideresFaltantes = lideres.filter(p => !coleccionIds.has(p.id))

  const sobre = new Set()  // anti-duplicados dentro del mismo sobre
  const resultado = []

  // --- LÁMINA 7: Líder especial ---
  const pool7 = lideresFaltantes.length > 0 ? lideresFaltantes : lideres.length > 0 ? lideres : todos
  const lam7  = pickRandom(pool7.filter(p => !sobre.has(p.id)), 1)[0]
  if (lam7) {
    sobre.add(lam7.id)
    resultado.push({ ...lam7, slot: 7, tipo: 'lider', esNueva: !coleccionIds.has(lam7.id) })
  }

  // --- LÁMINAS 1-4: Garantizadas nuevas ---
  const poolNuevas = faltantes.filter(p => !sobre.has(p.id))
  const nuevas = pickRandom(poolNuevas, Math.min(4, poolNuevas.length))
  nuevas.forEach((p, i) => {
    sobre.add(p.id)
    resultado.push({ ...p, slot: i + 1, tipo: 'nueva', esNueva: true })
  })

  // Si faltan para llegar a 5, completar con random
  while (resultado.length < 5) {
    const extra = pickRandom(todos.filter(p => !sobre.has(p.id)), 1)[0]
    if (!extra) break
    sobre.add(extra.id)
    resultado.push({ ...extra, slot: resultado.length + 1, tipo: 'nueva', esNueva: !coleccionIds.has(extra.id) })
  }

  // --- LÁMINAS 5-6: Aleatorias puras (pueden repetir) ---
  const aleatorias = pickRandom(todos.filter(p => !sobre.has(p.id)), 2)
  aleatorias.forEach((p, i) => {
    sobre.add(p.id)
    const esNueva = !coleccionIds.has(p.id)
    resultado.push({ ...p, slot: 5 + i, tipo: esNueva ? 'aleatoria_nueva' : 'repetida', esNueva })
  })

  // Asegurar exactamente 7
  while (resultado.length < 7) {
    const extra = pickRandom(todos.filter(p => !sobre.has(p.id)), 1)[0]
    if (!extra) break
    sobre.add(extra.id)
    resultado.push({ ...extra, slot: resultado.length + 1, tipo: 'aleatoria_nueva', esNueva: !coleccionIds.has(extra.id) })
  }

  // Ordenar por slot
  resultado.sort((a, b) => a.slot - b.slot)

  return {
    ok: true,
    laminas: resultado,
    stats: {
      total:     resultado.length,
      nuevas:    resultado.filter(l => l.esNueva).length,
      repetidas: resultado.filter(l => !l.esNueva).length,
      lideres:   resultado.filter(l => l.tipo === 'lider').length,
    }
  }
}

// =============================================
// CANJEAR — valida código y abre sobre
// =============================================
export async function abrirSobre(token, cedula) {
  // 1. Generar las 7 láminas
  const sobreRes = await generarSobre(cedula)
  if (!sobreRes.ok) return sobreRes

  const ids = sobreRes.laminas.map(l => l.id)

  // 2. Canjear en Supabase (quema el código y guarda colección)
  const canjeo = await canjearCodigo(token, cedula, ids)
  if (!canjeo.ok) return { ok: false, error: canjeo.error }

  // 3. Limpiar cache para que la próxima consulta sea fresca
  _todosCache = null

  return {
    ok: true,
    laminas: sobreRes.laminas,
    stats:   sobreRes.stats
  }
}

// =============================================
// HELPERS para el álbum
// =============================================

export function getLabelTipo(tipo) {
  const map = {
    lider:           '⭐ Líder',
    nueva:           '✨ Nueva',
    aleatoria_nueva: '🎲 Nueva',
    repetida:        '🔄 Repetida',
  }
  return map[tipo] || tipo
}

export function getColorTipo(tipo) {
  const map = {
    lider:           '#D4AF37',
    nueva:           '#00A86B',
    aleatoria_nueva: '#4A90D9',
    repetida:        '#E8956A',
  }
  return map[tipo] || '#888'
}

export function getInicialesNombre(nombre) {
  const partes = nombre.trim().split(' ')
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return nombre.substring(0, 2).toUpperCase()
}

export function getPorcentajeAlbum(coleccionSize, total = 198) {
  return Math.round((coleccionSize / total) * 100)
}
