import { Readable } from 'node:stream'
import { get } from '@vercel/blob'
import { authorize, methodNotAllowed } from './_shared.mjs'

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET')
  if (!authorize(request, response)) return
  try {
    const url = new URL(request.url, 'http://localhost')
    const pathname = url.searchParams.get('pathname') ?? ''
    const filename = (url.searchParams.get('name') ?? 'attachment').replace(/[\r\n"]/g, '')
    if (!pathname.startsWith('completions/')) return response.status(400).json({ error: 'Invalid attachment path' })
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return response.status(404).json({ error: 'Attachment not found' })
    response.statusCode = 200
    response.setHeader('Content-Type', result.blob.contentType)
    response.setHeader('Content-Length', String(result.blob.size))
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(filename)}`)
    response.setHeader('Cache-Control', 'private, max-age=300')
    Readable.fromWeb(result.stream).pipe(response)
  } catch (error) {
    console.error(error)
    if (!response.headersSent) response.status(500).json({ error: 'Unable to read attachment' })
  }
}
