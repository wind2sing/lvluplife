import { handleUpload } from '@vercel/blob/client'
import { authorize, methodNotAllowed, readBody } from './_shared.mjs'

const allowedContentTypes = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'text/markdown', 'application/zip',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST')
  if (!authorize(request, response)) return
  try {
    const body = await readBody(request)
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? '{}')
        if (typeof payload.challengeId !== 'string' || !pathname.startsWith(`completions/${payload.challengeId}/`)) throw new Error('Invalid upload path')
        return {
          allowedContentTypes,
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        }
      },
    })
    response.status(200).json(result)
  } catch (error) {
    console.error(error)
    response.status(400).json({ error: 'Unable to authorize upload' })
  }
}
