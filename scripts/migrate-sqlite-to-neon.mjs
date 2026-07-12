import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const sqlitePath = resolve(process.argv[2] ?? 'data/lvluplife.sqlite')
if (!existsSync(sqlitePath)) throw new Error(`SQLite database not found: ${sqlitePath}`)

const db = new DatabaseSync(sqlitePath, { readOnly: true })
const stateRows = db.prepare('SELECT challenge_id, active, favorite FROM quest_state').all()
const completionRows = db.prepare('SELECT id, challenge_id, note, completed_at FROM completions ORDER BY completed_at DESC').all()
const settingsRow = db.prepare('SELECT language, font FROM settings WHERE id = 1').get() ?? { language: 'zh', font: 'noto' }

const save = {
  activeIds: stateRows.filter((item) => item.active).map((item) => item.challenge_id),
  favoriteIds: stateRows.filter((item) => item.favorite).map((item) => item.challenge_id),
  completions: completionRows.map((item) => ({ id: item.id, challengeId: item.challenge_id, note: item.note, completedAt: item.completed_at, attachments: [] })),
}
const settings = { language: settingsRow.language, font: settingsRow.font }

const sql = neon(databaseUrl)
await sql`
  CREATE TABLE IF NOT EXISTS app_state (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    save JSONB NOT NULL DEFAULT '{"activeIds":[],"favoriteIds":[],"completions":[]}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{"language":"zh","font":"noto"}'::jsonb,
    initialized BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`
await sql`
  INSERT INTO app_state (id, save, settings, initialized, updated_at)
  VALUES (1, CAST(${JSON.stringify(save)} AS jsonb), CAST(${JSON.stringify(settings)} AS jsonb), TRUE, NOW())
  ON CONFLICT (id) DO UPDATE SET
    save = EXCLUDED.save,
    settings = EXCLUDED.settings,
    initialized = TRUE,
    updated_at = NOW()
`

console.log(`Migrated ${save.activeIds.length} active quests, ${save.favoriteIds.length} favorites, and ${save.completions.length} completions.`)
