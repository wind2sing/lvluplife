import { authorize, ensureSchema, getChallenges, methodNotAllowed } from './_shared.mjs'

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
  if (!authorize(request, response)) return
  try {
    const sql = await ensureSchema()
    const [state] = await sql`SELECT save, settings, initialized FROM app_state WHERE id = 1`
    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json({
      initialized: state.initialized,
      challenges: getChallenges(),
      save: state.save,
      settings: state.settings,
    })
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Unable to load cloud save' })
  }
}
