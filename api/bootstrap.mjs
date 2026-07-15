import { authorize, ensureSchema, getSql, methodNotAllowed } from './_shared.mjs'

async function readState() {
  const sql = getSql()
  try {
    const [state] = await sql`SELECT save, settings, initialized FROM app_state WHERE id = 1`
    if (state) return state
  } catch (error) {
    if (error?.code !== '42P01') throw error
  }
  const initializedSql = await ensureSchema()
  const [state] = await initializedSql`SELECT save, settings, initialized FROM app_state WHERE id = 1`
  return state
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
  if (!authorize(request, response)) return
  try {
    const state = await readState()
    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json({
      initialized: state.initialized,
      save: state.save,
      settings: state.settings,
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Unable to load cloud save' })
  }
}
