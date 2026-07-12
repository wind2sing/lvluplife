import { timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const challenges = JSON.parse(readFileSync(new URL('../src/data/challenges.json', import.meta.url), 'utf8'))
let schemaReady

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  return neon(process.env.DATABASE_URL)
}

export async function ensureSchema() {
  if (!schemaReady) {
    const sql = getSql()
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_state (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          save JSONB NOT NULL DEFAULT '{"activeIds":[],"favoriteIds":[],"hiddenIds":[],"customChallenges":[],"dailyBoard":{"date":"","energy":"normal","reroll":0},"plans":[],"specialization":null,"cosmetics":{"titleId":"title-solo","frameId":"frame-basic","themeId":"theme-camp"},"completions":[]}'::jsonb,
          settings JSONB NOT NULL DEFAULT '{"language":"zh","font":"noto","customFeatures":true,"hidePersonalContentWhenDisabled":true}'::jsonb,
          initialized BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`INSERT INTO app_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING`
    })().catch((error) => {
      schemaReady = undefined
      throw error
    })
  }
  await schemaReady
  return getSql()
}

export function authorize(request, response) {
  const expected = process.env.PERSONAL_ACCESS_KEY
  if (!expected) {
    response.status(500).json({ error: 'PERSONAL_ACCESS_KEY is not configured' })
    return false
  }
  const header = request.headers.authorization ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    response.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

export function getChallenges() {
  return challenges
}

export async function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body === 'string') return JSON.parse(request.body)
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

export function methodNotAllowed(response, allowed) {
  response.setHeader('Allow', allowed)
  response.status(405).json({ error: 'Method not allowed' })
}
