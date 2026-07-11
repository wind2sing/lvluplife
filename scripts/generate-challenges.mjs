import { readFileSync, writeFileSync } from 'node:fs'

const sourcePath = new URL('../data/original-challenges.txt', import.meta.url)
const outputPath = new URL('../src/data/challenges.json', import.meta.url)
const translationsPath = new URL('../data/challenges-zh.json', import.meta.url)

const translations = JSON.parse(readFileSync(translationsPath, 'utf8'))

const categoryStats = {
  'Arts & Creativity': { zh: '艺术与创意', stats: ['TAL', 'CUL'], seed: [1, 1, 2, 2, 3] },
  Music: { zh: '音乐', stats: ['TAL', 'CUL'], seed: [1, 1, 2, 3, 3] },
  Photography: { zh: '摄影', stats: ['TAL', 'ENV'], seed: [1, 2, 3, 4, 5] },
  Writing: { zh: '写作', stats: ['TAL', 'INT'], seed: [1, 3, 4, 5, 6] },
  'Career & Finances': { zh: '事业与财务', stats: ['INT', 'CHA'], seed: [1, 1, 2, 2, 3] },
  'Fitness & Health': { zh: '健身与健康', stats: ['STR', 'INT'], seed: [1, 1, 2, 2, 3] },
  Sports: { zh: '运动', stats: ['STR', 'TAL'], seed: [10, 11, 11, 12, 12] },
  'Food & Cooking': { zh: '美食与烹饪', stats: ['TAL', 'CHA'], seed: [1, 1, 2, 2, 3] },
  'Household & DIY': { zh: '家务与手作', stats: ['ENV', 'TAL'], seed: [1, 1, 2, 2, 3] },
  Humanity: { zh: '善意与公益', stats: ['CHA', 'CUL'], seed: [1, 1, 2, 2, 3] },
  Mental: { zh: '心智与情绪', stats: ['INT', 'STR'], seed: [1, 1, 2, 2, 3] },
  Outdoors: { zh: '户外', stats: ['ENV', 'STR'], seed: [1, 1, 2, 2, 3] },
  Reading: { zh: '阅读', stats: ['INT', 'CUL'], seed: [1, 2, 3, 4, 4] },
  'Top 150': { zh: '经典书单', stats: ['INT', 'CUL'], seed: [1, 1, 1, 1, 1], divisor: 5 },
  'School & Learning': { zh: '学习与成长', stats: ['INT', 'TAL'], seed: [1, 2, 2, 3, 3] },
  Social: { zh: '社交', stats: ['CHA', 'CUL'], seed: [1, 1, 2, 2, 3] },
  Travel: { zh: '旅行', stats: ['ENV', 'CUL'], seed: [1, 2, 2, 4, 6] },
  Destinations: { zh: '一生必去', stats: ['CUL', 'ENV'], seed: [8, 9, 10, 11, 12] },
}

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const raw = readFileSync(sourcePath, 'utf8')
  .replace(/^\uFEFF/, '')
  .replace(/\r/g, '')

const categoryItems = new Map()
let currentCategory = ''

for (const rawLine of raw.split('\n')) {
  const line = rawLine.trim()
  if (!line || line === '________________') continue
  if (line.startsWith('* ')) {
    if (!currentCategory) throw new Error(`Challenge without category: ${line}`)
    const items = categoryItems.get(currentCategory) ?? []
    items.push(line.slice(2).trim())
    categoryItems.set(currentCategory, items)
  } else {
    currentCategory = line
  }
}

const getCadence = (title, category, tier) => {
  const value = title.toLowerCase()
  if (/every day|each day|a day|daily|one day/.test(value)) return '每日'
  if (/week|weekly/.test(value)) return '每周'
  if (/month|monthly/.test(value)) return '每月'
  if (/year|annual|birthday|holiday/.test(value)) return '每年'
  if (
    category === 'Destinations' ||
    /graduate|license|passport|move to|quit smoking|never started|visit a country|travel to a different continent/.test(
      value,
    )
  )
    return '终身一次'
  return ['每日', '每周', '每月', '终身一次'][tier - 1]
}

const tierNames = ['轻松一胜', '支线任务', '进阶挑战', '史诗任务']
const baseXp = [70, 125, 250, 650]
const challenges = []

for (const [category, items] of categoryItems) {
  if (!categoryStats[category]) throw new Error(`Missing category config: ${category}`)
  items.forEach((title, index) => {
    const progress = items.length === 1 ? 0 : index / (items.length - 1)
    const tier = progress < 0.42 ? 1 : progress < 0.72 ? 2 : progress < 0.9 ? 3 : 4
    const config = categoryStats[category]
    const divisor = config.divisor ?? 2
    const projectedLevel = Math.ceil((index + 1) / divisor) + (config.seed[4] - Math.ceil(5 / divisor))
    const level = index < config.seed.length ? config.seed[index] : Math.max(config.seed[4], projectedLevel)
    const stats = config.stats
    const points = tier * 2 + (index % 3)
    const id = `${slugify(category)}-${String(index + 1).padStart(3, '0')}`

    challenges.push({
      id,
      title: translations[id],
      titleOriginal: title,
      category: config.zh,
      categoryOriginal: category,
      level,
      tier,
      tierName: tierNames[tier - 1],
      xp: baseXp[tier - 1] + (index % 4) * (tier === 1 ? 5 : tier * 10),
      cadence: getCadence(title, category, tier),
      stats: [
        { key: stats[0], points },
        ...(tier > 1 ? [{ key: stats[1], points: Math.max(1, points - 2) }] : []),
      ],
      source: 'LvlUpLife 挑战列表备份',
    })
  })
}

writeFileSync(outputPath, `${JSON.stringify(challenges, null, 2)}\n`)
if (challenges.length !== 538 || categoryItems.size !== 18) {
  throw new Error(`Import integrity check failed: ${challenges.length} challenges, ${categoryItems.size} categories`)
}
console.log(`Generated ${challenges.length} challenges across ${categoryItems.size} categories.`)
