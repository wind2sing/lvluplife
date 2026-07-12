import { authorize, ensureSchema, methodNotAllowed, readBody } from './_shared.mjs'

export default async function handler(request, response) {
  if (request.method !== 'PUT') return methodNotAllowed(response, 'PUT')
  if (!authorize(request, response)) return
  try {
    const settings = await readBody(request)
    if (!['zh', 'en'].includes(settings.language) || !['noto', 'zcool', 'pixel', 'system'].includes(settings.font)) {
      return response.status(400).json({ error: 'Invalid settings' })
    }
    const sql = await ensureSchema()
    await sql`UPDATE app_state SET settings = CAST(${JSON.stringify({ language: settings.language, font: settings.font, customFeatures: settings.customFeatures !== false, hidePersonalContentWhenDisabled: settings.hidePersonalContentWhenDisabled !== false })} AS jsonb), updated_at = NOW() WHERE id = 1`
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Unable to save settings' })
  }
}
