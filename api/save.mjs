import { authorize, ensureSchema, methodNotAllowed, readBody } from './_shared.mjs'

function normalizeSave(value) {
  return {
    activeIds: Array.isArray(value.activeIds) ? value.activeIds.filter((item) => typeof item === 'string') : [],
    favoriteIds: Array.isArray(value.favoriteIds) ? value.favoriteIds.filter((item) => typeof item === 'string') : [],
    completions: Array.isArray(value.completions) ? value.completions.filter((item) => item && typeof item.id === 'string' && typeof item.challengeId === 'string' && typeof item.completedAt === 'string').map((item) => ({
      id: item.id,
      challengeId: item.challengeId,
      note: String(item.note ?? '').slice(0, 280),
      completedAt: item.completedAt,
    })) : [],
  }
}

export default async function handler(request, response) {
  if (request.method !== 'PUT') return methodNotAllowed(response, 'PUT')
  if (!authorize(request, response)) return
  try {
    const save = normalizeSave(await readBody(request))
    const sql = await ensureSchema()
    await sql`UPDATE app_state SET save = CAST(${JSON.stringify(save)} AS jsonb), initialized = TRUE, updated_at = NOW() WHERE id = 1`
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Unable to save progress' })
  }
}
