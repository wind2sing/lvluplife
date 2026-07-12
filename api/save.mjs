import { authorize, ensureSchema, methodNotAllowed, readBody } from './_shared.mjs'

const statKeys = new Set(['STR', 'CUL', 'ENV', 'CHA', 'TAL', 'INT'])
const cadences = new Set(['每日', '每周', '每月', '每年', '终身一次'])
const energyLevels = new Set(['low', 'normal', 'high'])

function normalizeCustomChallenge(item) {
  if (!item || typeof item.id !== 'string' || !item.id.startsWith('custom-')) return null
  const title = String(item.title ?? '').trim().slice(0, 120)
  if (!title) return null
  const level = Math.min(30, Math.max(1, Math.round(Number(item.level) || 1)))
  const tier = Math.min(4, Math.max(1, Math.round(Number(item.tier) || 1)))
  const stats = Array.isArray(item.stats) ? item.stats.filter((stat) => stat && statKeys.has(stat.key)).slice(0, 3).map((stat) => ({
    key: stat.key,
    points: Math.min(level * 3, Math.max(1, Math.round(Number(stat.points) || 1))),
  })) : []
  return {
    id: item.id.slice(0, 120),
    title,
    titleOriginal: String(item.titleOriginal ?? title).slice(0, 120),
    category: String(item.category ?? '学习与成长').slice(0, 60),
    categoryOriginal: String(item.categoryOriginal ?? 'Custom').slice(0, 60),
    level,
    tier,
    tierName: String(item.tierName ?? '支线任务').slice(0, 30),
    xp: Math.min(1500, Math.max(25, Math.round(Number(item.xp) || 70))),
    cadence: cadences.has(item.cadence) ? item.cadence : '终身一次',
    stats: stats.length ? stats : [{ key: 'INT', points: Math.min(level * 3, 2) }],
    source: 'custom',
    custom: true,
    description: String(item.description ?? '').slice(0, 600),
    completionPrompt: String(item.completionPrompt ?? '').slice(0, 180),
    estimatedMinutes: Math.min(1440, Math.max(5, Math.round(Number(item.estimatedMinutes) || 30))),
    energyDemand: energyLevels.has(item.energyDemand) ? item.energyDemand : 'normal',
    contexts: Array.isArray(item.contexts) ? item.contexts.filter((context) => typeof context === 'string').slice(0, 8).map((context) => context.slice(0, 30)) : [],
  }
}

function normalizeSave(value) {
  const dailyBoard = value?.dailyBoard ?? {}
  return {
    activeIds: Array.isArray(value.activeIds) ? value.activeIds.filter((item) => typeof item === 'string') : [],
    favoriteIds: Array.isArray(value.favoriteIds) ? value.favoriteIds.filter((item) => typeof item === 'string') : [],
    hiddenIds: Array.isArray(value.hiddenIds) ? value.hiddenIds.filter((item) => typeof item === 'string') : [],
    customChallenges: Array.isArray(value.customChallenges) ? value.customChallenges.map(normalizeCustomChallenge).filter(Boolean).slice(0, 500) : [],
    dailyBoard: {
      date: typeof dailyBoard.date === 'string' ? dailyBoard.date.slice(0, 10) : '',
      energy: energyLevels.has(dailyBoard.energy) ? dailyBoard.energy : 'normal',
      reroll: Math.min(1000, Math.max(0, Math.round(Number(dailyBoard.reroll) || 0))),
    },
    completions: Array.isArray(value.completions) ? value.completions.filter((item) => item && typeof item.id === 'string' && typeof item.challengeId === 'string' && typeof item.completedAt === 'string').map((item) => ({
      id: item.id,
      challengeId: item.challengeId,
      note: String(item.note ?? '').slice(0, 280),
      completedAt: item.completedAt,
      attachments: Array.isArray(item.attachments) ? item.attachments.filter((attachment) => attachment && typeof attachment.pathname === 'string' && attachment.pathname.startsWith('completions/')).slice(0, 3).map((attachment) => ({
        pathname: attachment.pathname,
        name: String(attachment.name ?? 'attachment').slice(0, 180),
        contentType: String(attachment.contentType ?? 'application/octet-stream').slice(0, 120),
        size: Number.isFinite(attachment.size) ? Math.max(0, attachment.size) : 0,
      })) : [],
    })) : [],
  }
}

export default async function handler(request, response) {
  if (request.method !== 'PUT') return methodNotAllowed(response, 'PUT')
  if (!authorize(request, response)) return
  try {
    const save = normalizeSave(await readBody(request))
    const sql = await ensureSchema()
    await sql`UPDATE app_state SET save = CAST(${JSON.stringify(save)} AS jsonb), initialized = TRUE, updated_at = NOW() WHERE id = 1`
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Unable to save progress' })
  }
}
