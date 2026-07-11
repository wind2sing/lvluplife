import { readFileSync, writeFileSync } from 'node:fs'

const sourcePath = new URL('../data/original-challenges.txt', import.meta.url)
const outputPath = new URL('../src/data/challenges.json', import.meta.url)

const categoryStats = {
  'Arts & Creativity': ['TAL', 'CUL'],
  Music: ['TAL', 'CUL'],
  Photography: ['TAL', 'ENV'],
  Writing: ['TAL', 'INT'],
  'Career & Finances': ['INT', 'CHA'],
  'Fitness & Health': ['STR', 'INT'],
  Sports: ['STR', 'TAL'],
  'Food & Cooking': ['TAL', 'CHA'],
  'Household & DIY': ['ENV', 'TAL'],
  Humanity: ['CHA', 'CUL'],
  Mental: ['INT', 'STR'],
  Outdoors: ['ENV', 'STR'],
  Reading: ['INT', 'CUL'],
  'Top 150': ['INT', 'CUL'],
  'School & Learning': ['INT', 'TAL'],
  Social: ['CHA', 'CUL'],
  Travel: ['ENV', 'CUL'],
  Destinations: ['CUL', 'ENV'],
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
  if (/every day|each day|a day|daily|one day/.test(value)) return 'Daily'
  if (/week|weekly/.test(value)) return 'Weekly'
  if (/month|monthly/.test(value)) return 'Monthly'
  if (/year|annual|birthday|holiday/.test(value)) return 'Yearly'
  if (
    category === 'Destinations' ||
    /graduate|license|passport|move to|quit smoking|never started|visit a country|travel to a different continent/.test(
      value,
    )
  )
    return 'Lifetime'
  return ['Daily', 'Weekly', 'Monthly', 'Lifetime'][tier - 1]
}

const tierNames = ['Quick win', 'Side quest', 'Challenge', 'Epic quest']
const baseXp = [70, 125, 250, 650]
const challenges = []

for (const [category, items] of categoryItems) {
  if (!categoryStats[category]) throw new Error(`Missing category config: ${category}`)
  items.forEach((title, index) => {
    const progress = items.length === 1 ? 0 : index / (items.length - 1)
    const tier = progress < 0.42 ? 1 : progress < 0.72 ? 2 : progress < 0.9 ? 3 : 4
    const level = Math.max(1, Math.round(progress * 19) + 1)
    const stats = categoryStats[category]
    const points = tier * 2 + (index % 3)
    const id = `${slugify(category)}-${String(index + 1).padStart(3, '0')}`

    challenges.push({
      id,
      title,
      category,
      level,
      tier,
      tierName: tierNames[tier - 1],
      xp: baseXp[tier - 1] + (index % 4) * (tier === 1 ? 5 : tier * 10),
      cadence: getCadence(title, category, tier),
      stats: [
        { key: stats[0], points },
        ...(tier > 1 ? [{ key: stats[1], points: Math.max(1, points - 2) }] : []),
      ],
      source: 'LvlUpLife challenge list backup',
    })
  })
}

writeFileSync(outputPath, `${JSON.stringify(challenges, null, 2)}\n`)
if (challenges.length !== 538 || categoryItems.size !== 18) {
  throw new Error(`Import integrity check failed: ${challenges.length} challenges, ${categoryItems.size} categories`)
}
console.log(`Generated ${challenges.length} challenges across ${categoryItems.size} categories.`)
