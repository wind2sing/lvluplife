import { authorize, ensureSchema, methodNotAllowed } from './_shared.mjs'

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
  if (!authorize(request, response)) return
  try {
    const sql = await ensureSchema()
    await sql`SELECT 1`
    response.status(200).json({ ok: true, database: 'neon-postgres' })
  } catch (error) {
    console.error(error)
    response.status(500).json({ ok: false, error: 'Database unavailable' })
  }
}
