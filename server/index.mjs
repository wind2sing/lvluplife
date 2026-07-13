import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const root = fileURLToPath(new URL('..', import.meta.url))
const dataDir = join(root, 'data')
const distDir = join(root, 'dist')
const port = Number(process.env.PORT ?? 8787)

mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(join(dataDir, 'lvluplife.sqlite'))
db.exec(readFileSync(join(root, 'server/schema.sql'), 'utf8'))

const questStateColumns = db.prepare('PRAGMA table_info(quest_state)').all().map((item) => item.name)
if (!questStateColumns.includes('hidden')) db.exec('ALTER TABLE quest_state ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1))')
const challengeColumns = db.prepare('PRAGMA table_info(challenges)').all().map((item) => item.name)
if (!challengeColumns.includes('custom_json')) db.exec('ALTER TABLE challenges ADD COLUMN custom_json TEXT')
const completionColumns = db.prepare('PRAGMA table_info(completions)').all().map((item) => item.name)
if (!completionColumns.includes('reward_json')) db.exec('ALTER TABLE completions ADD COLUMN reward_json TEXT')

const settingsTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'settings'").get()?.sql ?? ''
if (!settingsTableSql.includes("'pixel'")) {
  db.exec(`
    BEGIN;
    ALTER TABLE settings RENAME TO settings_legacy;
    CREATE TABLE settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      language TEXT NOT NULL DEFAULT 'zh' CHECK (language IN ('zh', 'en')),
      font TEXT NOT NULL DEFAULT 'noto' CHECK (font IN ('noto', 'zcool', 'pixel', 'system')),
      custom_features INTEGER NOT NULL DEFAULT 1 CHECK (custom_features IN (0, 1)),
      hide_personal_content INTEGER NOT NULL DEFAULT 1 CHECK (hide_personal_content IN (0, 1)),
      collection_features INTEGER NOT NULL DEFAULT 1 CHECK (collection_features IN (0, 1))
    );
    INSERT INTO settings (id, language, font) SELECT id, language, font FROM settings_legacy;
    DROP TABLE settings_legacy;
    COMMIT;
  `)
}
const settingsColumns = db.prepare('PRAGMA table_info(settings)').all().map((item) => item.name)
if (!settingsColumns.includes('custom_features')) db.exec('ALTER TABLE settings ADD COLUMN custom_features INTEGER NOT NULL DEFAULT 1 CHECK (custom_features IN (0, 1))')
if (!settingsColumns.includes('hide_personal_content')) db.exec('ALTER TABLE settings ADD COLUMN hide_personal_content INTEGER NOT NULL DEFAULT 1 CHECK (hide_personal_content IN (0, 1))')
if (!settingsColumns.includes('collection_features')) db.exec('ALTER TABLE settings ADD COLUMN collection_features INTEGER NOT NULL DEFAULT 1 CHECK (collection_features IN (0, 1))')

const challengeSeed = JSON.parse(readFileSync(join(root, 'src/data/challenges.json'), 'utf8'))
const challengeSeedMap = new Map(challengeSeed.map((challenge) => [challenge.id, challenge]))
const upsertChallenge = db.prepare(`
  INSERT INTO challenges (
    id, title_zh, title_en, category_zh, category_en, level, tier,
    tier_name_zh, xp, cadence_zh, stats_json, source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title_zh = excluded.title_zh,
    title_en = excluded.title_en,
    category_zh = excluded.category_zh,
    category_en = excluded.category_en,
    level = excluded.level,
    tier = excluded.tier,
    tier_name_zh = excluded.tier_name_zh,
    xp = excluded.xp,
    cadence_zh = excluded.cadence_zh,
    stats_json = excluded.stats_json,
    source = excluded.source
`)

db.exec('BEGIN')
try {
  for (const challenge of challengeSeed) {
    upsertChallenge.run(
      challenge.id,
      challenge.title,
      challenge.titleOriginal,
      challenge.category,
      challenge.categoryOriginal,
      challenge.level,
      challenge.tier,
      challenge.tierName,
      challenge.xp,
      challenge.cadence,
      JSON.stringify(challenge.stats),
      challenge.source,
    )
  }
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
}

const selectChallenges = db.prepare(`
  SELECT id, title_zh, title_en, category_zh, category_en, level, tier,
    tier_name_zh, xp, cadence_zh, stats_json, source
  FROM challenges WHERE source != 'custom' ORDER BY rowid
`)
const selectCustomChallenges = db.prepare("SELECT custom_json FROM challenges WHERE source = 'custom' AND custom_json IS NOT NULL ORDER BY rowid")
const selectQuestState = db.prepare('SELECT challenge_id, active, favorite, hidden FROM quest_state')
const selectCompletions = db.prepare('SELECT id, challenge_id, note, completed_at, reward_json FROM completions ORDER BY completed_at DESC')
const selectSettings = db.prepare('SELECT language, font, custom_features, hide_personal_content, collection_features FROM settings WHERE id = 1')
const selectInitialized = db.prepare("SELECT value FROM app_meta WHERE key = 'state_initialized'")
const upsertQuestState = db.prepare(`
  INSERT INTO quest_state (challenge_id, active, favorite, hidden) VALUES (?, ?, ?, ?)
  ON CONFLICT(challenge_id) DO UPDATE SET active = excluded.active, favorite = excluded.favorite, hidden = excluded.hidden
`)
const insertCompletion = db.prepare('INSERT INTO completions (id, challenge_id, note, completed_at, reward_json) VALUES (?, ?, ?, ?, ?)')
const updateSettings = db.prepare('UPDATE settings SET language = ?, font = ?, custom_features = ?, hide_personal_content = ?, collection_features = ? WHERE id = 1')
const markInitialized = db.prepare("INSERT INTO app_meta (key, value) VALUES ('state_initialized', '1') ON CONFLICT(key) DO UPDATE SET value = '1'")
const selectDailyBoard = db.prepare("SELECT value FROM app_meta WHERE key = 'daily_board'")
const upsertDailyBoard = db.prepare("INSERT INTO app_meta (key, value) VALUES ('daily_board', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
const selectGameplayState = db.prepare("SELECT value FROM app_meta WHERE key = 'gameplay_state'")
const upsertGameplayState = db.prepare("INSERT INTO app_meta (key, value) VALUES ('gameplay_state', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
const deleteCustomChallenges = db.prepare("DELETE FROM challenges WHERE source = 'custom'")
const insertCustomChallenge = db.prepare(`
  INSERT INTO challenges (
    id, title_zh, title_en, category_zh, category_en, level, tier,
    tier_name_zh, xp, cadence_zh, stats_json, source, custom_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?)
`)

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function getBootstrap() {
  const stateRows = selectQuestState.all()
  const completions = selectCompletions.all().map((item) => {
    let reward
    try { reward = item.reward_json ? JSON.parse(item.reward_json) : undefined } catch {}
    return { id: item.id, challengeId: item.challenge_id, note: item.note, completedAt: item.completed_at, reward }
  })
  const settings = selectSettings.get()
  const customChallenges = selectCustomChallenges.all().flatMap((item) => {
    try { const challenge = JSON.parse(item.custom_json); delete challenge.estimatedMinutes; return [challenge] } catch { return [] }
  })
  let dailyBoard = { date: '', energy: 'normal', reroll: 0 }
  try { dailyBoard = { ...dailyBoard, ...JSON.parse(selectDailyBoard.get()?.value ?? '{}') } } catch {}
  let gameplayState = { plans: [], specialization: null, cosmetics: { titleId: 'title-solo', frameId: 'frame-basic', themeId: 'theme-camp' }, discoveredIds: [], activeTrackingVersion: 0 }
  try { gameplayState = { ...gameplayState, ...JSON.parse(selectGameplayState.get()?.value ?? '{}') } } catch {}
  return {
    initialized: Boolean(selectInitialized.get()),
    challenges: selectChallenges.all().map((item) => ({
      id: item.id,
      title: item.title_zh,
      titleOriginal: item.title_en,
      description: challengeSeedMap.get(item.id)?.description,
      descriptionOriginal: challengeSeedMap.get(item.id)?.descriptionOriginal,
      category: item.category_zh,
      categoryOriginal: item.category_en,
      level: item.level,
      tier: item.tier,
      tierName: item.tier_name_zh,
      xp: item.xp,
      cadence: item.cadence_zh,
      stats: JSON.parse(item.stats_json),
      source: item.source,
    })),
    save: {
      activeIds: stateRows.filter((item) => item.active).map((item) => item.challenge_id),
      activeTrackingVersion: gameplayState.activeTrackingVersion,
      favoriteIds: stateRows.filter((item) => item.favorite).map((item) => item.challenge_id),
      hiddenIds: stateRows.filter((item) => item.hidden).map((item) => item.challenge_id),
      discoveredIds: gameplayState.discoveredIds,
      customChallenges,
      dailyBoard,
      plans: gameplayState.plans,
      specialization: gameplayState.specialization,
      cosmetics: gameplayState.cosmetics,
      completions,
    },
    settings: { language: settings.language, font: settings.font, customFeatures: Boolean(settings.custom_features), hidePersonalContentWhenDisabled: Boolean(settings.hide_personal_content), collectionFeatures: Boolean(settings.collection_features) },
  }
}

function replaceSave(save) {
  const activeIds = new Set(Array.isArray(save.activeIds) ? save.activeIds : [])
  const favoriteIds = new Set(Array.isArray(save.favoriteIds) ? save.favoriteIds : [])
  const hiddenIds = new Set(Array.isArray(save.hiddenIds) ? save.hiddenIds : [])
  const discoveredIds = Array.isArray(save.discoveredIds) ? save.discoveredIds.filter((item) => typeof item === 'string').slice(0, 2000) : []
  const activeTrackingVersion = Math.max(0, Math.round(Number(save.activeTrackingVersion) || 0))
  const challengeIds = new Set([...activeIds, ...favoriteIds, ...hiddenIds])
  const completions = Array.isArray(save.completions) ? save.completions : []
  const customChallenges = Array.isArray(save.customChallenges) ? save.customChallenges.filter((item) => item?.id?.startsWith('custom-')).slice(0, 500) : []
  const dailyBoard = save.dailyBoard && typeof save.dailyBoard === 'object' ? save.dailyBoard : { date: '', energy: 'normal', reroll: 0 }
  const plans = Array.isArray(save.plans) ? save.plans : []
  const specialization = ['STR', 'CUL', 'ENV', 'CHA', 'TAL', 'INT'].includes(save.specialization) ? save.specialization : null
  const cosmetics = save.cosmetics && typeof save.cosmetics === 'object' ? save.cosmetics : { titleId: 'title-solo', frameId: 'frame-basic', themeId: 'theme-camp' }

  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM quest_state; DELETE FROM completions;')
    deleteCustomChallenges.run()
    for (const item of customChallenges) {
      const normalizedItem = { ...item }
      delete normalizedItem.estimatedMinutes
      insertCustomChallenge.run(
        normalizedItem.id, String(normalizedItem.title ?? ''), String(normalizedItem.titleOriginal ?? normalizedItem.title ?? ''),
        String(normalizedItem.category ?? '学习与成长'), String(normalizedItem.categoryOriginal ?? 'Custom'),
        Number(normalizedItem.level) || 1, Number(normalizedItem.tier) || 1, String(normalizedItem.tierName ?? '支线任务'),
        Number(normalizedItem.xp) || 70, String(normalizedItem.cadence ?? '终身一次'), JSON.stringify(normalizedItem.stats ?? []), JSON.stringify(normalizedItem),
      )
    }
    for (const id of challengeIds) upsertQuestState.run(id, activeIds.has(id) ? 1 : 0, favoriteIds.has(id) ? 1 : 0, hiddenIds.has(id) ? 1 : 0)
    for (const item of completions) insertCompletion.run(item.id, item.challengeId, String(item.note ?? ''), item.completedAt, item.reward ? JSON.stringify(item.reward) : null)
    upsertDailyBoard.run(JSON.stringify(dailyBoard))
    upsertGameplayState.run(JSON.stringify({ plans, specialization, cosmetics, discoveredIds, activeTrackingVersion }))
    markInitialized.run()
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

function serveStatic(request, response) {
  if (!existsSync(distDir)) return false
  const pathname = new URL(request.url, 'http://localhost').pathname
  const requested = normalize(pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''))
  const candidate = join(distDir, requested)
  const file = candidate.startsWith(distDir) && existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(distDir, 'index.html')
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream' })
  response.end(readFileSync(file))
  return true
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/api/health') return json(response, 200, { ok: true, database: 'sqlite' })
    if (request.method === 'GET' && request.url === '/api/bootstrap') return json(response, 200, getBootstrap())
    if (request.method === 'PUT' && request.url === '/api/save') {
      replaceSave(await readJson(request))
      return json(response, 200, { ok: true })
    }
    if (request.method === 'PUT' && request.url === '/api/settings') {
      const settings = await readJson(request)
      if (!['zh', 'en'].includes(settings.language) || !['noto', 'zcool', 'pixel', 'system'].includes(settings.font)) return json(response, 400, { error: 'Invalid settings' })
      updateSettings.run(settings.language, settings.font, settings.customFeatures === false ? 0 : 1, settings.hidePersonalContentWhenDisabled === false ? 0 : 1, settings.collectionFeatures === false ? 0 : 1)
      return json(response, 200, { ok: true })
    }
    if (request.url?.startsWith('/api/')) return json(response, 404, { error: 'Not found' })
    if (!serveStatic(request, response)) return json(response, 404, { error: 'Run npm run build before starting the production server' })
  } catch (error) {
    console.error(error)
    json(response, 500, { error: 'Internal server error' })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`LvlUpLife SQLite server listening on http://127.0.0.1:${port}`)
})
