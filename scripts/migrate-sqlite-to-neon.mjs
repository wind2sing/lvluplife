import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const sqlitePath = resolve(process.argv[2] ?? 'data/lvluplife.sqlite')
if (!existsSync(sqlitePath)) throw new Error(`SQLite database not found: ${sqlitePath}`)

const db = new DatabaseSync(sqlitePath, { readOnly: true })
const hasHiddenState = db.prepare('PRAGMA table_info(quest_state)').all().some((item) => item.name === 'hidden')
const hasCustomJson = db.prepare('PRAGMA table_info(challenges)').all().some((item) => item.name === 'custom_json')
const stateRows = db.prepare(`SELECT challenge_id, active, favorite, ${hasHiddenState ? 'hidden' : '0 AS hidden'} FROM quest_state`).all()
const hasRewardSnapshot = db.prepare('PRAGMA table_info(completions)').all().some((item) => item.name === 'reward_json')
const completionRows = db.prepare(`SELECT id, challenge_id, note, completed_at, ${hasRewardSnapshot ? 'reward_json' : 'NULL AS reward_json'} FROM completions ORDER BY completed_at DESC`).all()
const settingsColumns = db.prepare('PRAGMA table_info(settings)').all().map((item) => item.name)
const settingsRow = db.prepare(`SELECT language, font, ${settingsColumns.includes('custom_features') ? 'custom_features' : '1 AS custom_features'}, ${settingsColumns.includes('hide_personal_content') ? 'hide_personal_content' : '1 AS hide_personal_content'}, ${settingsColumns.includes('collection_features') ? 'collection_features' : '1 AS collection_features'} FROM settings WHERE id = 1`).get() ?? { language: 'zh', font: 'noto', custom_features: 1, hide_personal_content: 1, collection_features: 1 }
const customChallenges = hasCustomJson ? db.prepare("SELECT custom_json FROM challenges WHERE source = 'custom' AND custom_json IS NOT NULL").all().flatMap((item) => {
  try { return [JSON.parse(item.custom_json)] } catch { return [] }
}) : []
let dailyBoard = { date: '', energy: 'normal', reroll: 0 }
try { dailyBoard = { ...dailyBoard, ...JSON.parse(db.prepare("SELECT value FROM app_meta WHERE key = 'daily_board'").get()?.value ?? '{}') } } catch {}
let gameplayState = { plans: [], specialization: null, cosmetics: { titleId: 'title-solo', frameId: 'frame-basic', themeId: 'theme-camp' } }
try { gameplayState = { ...gameplayState, ...JSON.parse(db.prepare("SELECT value FROM app_meta WHERE key = 'gameplay_state'").get()?.value ?? '{}') } } catch {}

const save = {
  activeIds: stateRows.filter((item) => item.active).map((item) => item.challenge_id),
  favoriteIds: stateRows.filter((item) => item.favorite).map((item) => item.challenge_id),
  hiddenIds: stateRows.filter((item) => item.hidden).map((item) => item.challenge_id),
  customChallenges,
  dailyBoard,
  plans: gameplayState.plans,
  specialization: gameplayState.specialization,
  cosmetics: gameplayState.cosmetics,
  completions: completionRows.map((item) => { let reward; try { reward = item.reward_json ? JSON.parse(item.reward_json) : undefined } catch {}; return { id: item.id, challengeId: item.challenge_id, note: item.note, completedAt: item.completed_at, attachments: [], reward } }),
}
const settings = { language: settingsRow.language, font: settingsRow.font, customFeatures: Boolean(settingsRow.custom_features), hidePersonalContentWhenDisabled: Boolean(settingsRow.hide_personal_content), collectionFeatures: Boolean(settingsRow.collection_features) }

const sql = neon(databaseUrl)
await sql`
  CREATE TABLE IF NOT EXISTS app_state (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    save JSONB NOT NULL DEFAULT '{"activeIds":[],"favoriteIds":[],"hiddenIds":[],"customChallenges":[],"dailyBoard":{"date":"","energy":"normal","reroll":0},"plans":[],"specialization":null,"cosmetics":{"titleId":"title-solo","frameId":"frame-basic","themeId":"theme-camp"},"completions":[]}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{"language":"zh","font":"noto","customFeatures":true,"hidePersonalContentWhenDisabled":true,"collectionFeatures":true}'::jsonb,
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
