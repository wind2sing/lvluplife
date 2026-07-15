import { readFileSync } from 'node:fs'

const challenges = JSON.parse(readFileSync(new URL('../src/data/challenges.json', import.meta.url), 'utf8'))
const categories = Map.groupBy(challenges.filter((item) => item.category !== '经典书单'), (item) => item.category)

function milestones(items) {
  const countThrough = (tier) => items.filter((item) => item.tier <= tier).length
  return [0, 0, Math.min(1, countThrough(1)), Math.min(3, countThrough(2)), Math.min(10, countThrough(3))]
}

function maxTier(completed, values) {
  if (completed >= values[4]) return 4
  if (completed >= values[3]) return 3
  if (completed >= values[2]) return 2
  return 1
}

function nextMilestone(completed, values) {
  return [...new Set(values.slice(2))].find((value) => value > completed) ?? null
}

function simulate(items, completedIds, globalLevel, initialDiscovered = []) {
  const completed = completedIds.size
  const values = milestones(items)
  const tier = maxTier(completed, values)
  const next = nextMilestone(completed, values)
  const discovered = new Set([...initialDiscovered, ...completedIds])
  const eligible = items.filter((item) => item.level <= globalLevel && item.tier <= tier)
  const target = Math.min(eligible.length, Math.max(4 + completed * 2, next ?? 0))
  let eligibleDiscovered = eligible.filter((item) => discovered.has(item.id)).length
  for (const item of items) {
    if (eligibleDiscovered >= target) break
    if (item.level > globalLevel || item.tier > tier || discovered.has(item.id)) continue
    discovered.add(item.id)
    eligibleDiscovered += 1
  }
  const available = eligible.filter((item) => discovered.has(item.id) && !completedIds.has(item.id)).length
  const futureLevels = items.filter((item) => item.level > globalLevel && item.tier <= tier && !completedIds.has(item.id)).map((item) => item.level)
  return { available, maxTier: tier, nextLevel: futureLevels.length ? Math.min(...futureLevels) : null, nextMilestone: next }
}

const errors = []
for (const [category, items] of categories) {
  const values = milestones(items)
  const cumulative = [0, 1, 2, 3].map((tier) => items.filter((item) => item.tier <= tier).length)
  if (values[2] > cumulative[1]) errors.push(`${category}: tier 2 milestone is unreachable`)
  if (values[3] > cumulative[2]) errors.push(`${category}: tier 3 milestone is unreachable`)
  if (values[4] > cumulative[3]) errors.push(`${category}: tier 4 milestone is unreachable`)
}

const travel = categories.get('旅行')
if (!travel) errors.push('Travel category is missing')
else {
  const pollutedDiscovery = travel.filter((item) => item.level >= 13).map((item) => item.id)
  const levelOne = simulate(travel, new Set(['travel-001']), 1, pollutedDiscovery)
  if (levelOne.available !== 0 || levelOne.nextLevel !== 2 || levelOne.nextMilestone !== 3) errors.push(`Travel level 1 blocker is reported incorrectly: ${JSON.stringify(levelOne)}`)
  const levelTwo = simulate(travel, new Set(['travel-001']), 2, pollutedDiscovery)
  if (levelTwo.available < 2) errors.push(`Future discoveries consumed current Travel slots: ${JSON.stringify(levelTwo)}`)
}

const reading = categories.get('阅读')
if (!reading) errors.push('Reading category is missing')
else if (simulate(reading, new Set(reading.filter((item) => item.tier <= 3).map((item) => item.id)), 30).maxTier !== 4) errors.push('Reading tier 4 cannot unlock after all lower-tier quests are complete')

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Discovery validation passed for ${categories.size} exploration categories.`)
