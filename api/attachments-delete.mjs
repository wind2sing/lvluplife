import { del } from '@vercel/blob'
import { authorize, methodNotAllowed, readBody } from './_shared.mjs'

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST')
  if (!authorize(request, response)) return
  try {
    const body = await readBody(request)
    const pathnames = Array.isArray(body.pathnames) ? body.pathnames.filter((item) => typeof item === 'string' && item.startsWith('completions/')).slice(0, 10) : []
    if (pathnames.length) await del(pathnames)
    response.status(200).json({ ok: true, deleted: pathnames.length })
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Unable to delete attachments' })
  }
}
