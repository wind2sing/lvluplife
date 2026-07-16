import { readFileSync } from 'node:fs'

const challenges = JSON.parse(readFileSync(new URL('../src/data/challenges.json', import.meta.url), 'utf8'))
const balanceAudit = JSON.parse(readFileSync(new URL('../data/challenge-balance-audit.json', import.meta.url), 'utf8'))
const failures = []
const warnings = []
const countBy = (items, getKey) => Object.fromEntries(Object.entries(items.reduce((result, item) => {
  const key = getKey(item)
  result[key] = (result[key] ?? 0) + 1
  return result
}, {})).sort(([left], [right]) => left.localeCompare(right, 'zh-CN')))

if (challenges.length !== 538) failures.push(`原版挑战数量应为 538，当前为 ${challenges.length}`)
if (new Set(challenges.map((item) => item.id)).size !== challenges.length) failures.push('存在重复任务 ID')
if (new Set(challenges.map((item) => item.title)).size !== challenges.length) failures.push('存在重复中文标题')
if (challenges.some((item) => !item.description || !item.descriptionOriginal)) failures.push('存在缺少中英文描述的任务')
if (new Set(challenges.map((item) => item.category)).size !== 18) failures.push('原版挑战应覆盖 18 个数据分组')

const books = challenges.filter((item) => item.categoryOriginal === 'Top 150')
if (books.length !== 150) failures.push(`经典书单应包含 150 项，当前为 ${books.length}`)
if (books.some((item) => item.level !== 1)) failures.push('经典书单必须全部为等级 1')
if (books.some((item) => item.cadence !== '终身一次')) failures.push('经典书单必须全部为终身一次')
const auditMap = new Map(balanceAudit.map((item) => [item.id, item]))
const xpMatrix = { 1: { low: 35, normal: 45, high: 60 }, 2: { low: 75, normal: 95, high: 120 }, 3: { low: 160, normal: 210, high: 270 }, 4: { low: 350, normal: 450, high: 600 } }
const statBudgets = { 1: 2, 2: 4, 3: 7, 4: 12 }
if (balanceAudit.length !== challenges.length || auditMap.size !== challenges.length) failures.push('奖励审计必须无重复地覆盖全部 538 项任务')
for (const challenge of challenges) {
  const reviewed = auditMap.get(challenge.id)
  if (!reviewed) { failures.push(`缺少奖励审计：${challenge.id}`); continue }
  if (!reviewed.rationale?.trim()) failures.push(`缺少人工判断理由：${challenge.id}`)
  if (reviewed.xp !== xpMatrix[reviewed.tier]?.[reviewed.energyDemand]) failures.push(`经验不符合固定矩阵：${challenge.id}`)
  if (reviewed.stats.reduce((sum, stat) => sum + stat.points, 0) !== statBudgets[reviewed.tier]) failures.push(`属性预算不符合难度档位：${challenge.id}`)
  for (const key of ['cadence', 'tier', 'energyDemand', 'xp', 'stats']) {
    if (JSON.stringify(challenge[key]) !== JSON.stringify(reviewed[key])) failures.push(`任务数据未同步审计字段 ${key}：${challenge.id}`)
  }
}

const vagueTitles = challenges.filter((item) => /一些东西|某事|做一些|某件事/.test(item.title))
if (vagueTitles.length) warnings.push(`${vagueTitles.length} 个标题表达较宽泛，可以在后续中文润色中进一步明确`)

const purchaseOrDonation = challenges.filter((item) => /买|购买|支付|捐赠/.test(item.title))
if (purchaseOrDonation.length) warnings.push(`${purchaseOrDonation.length} 项涉及消费或捐赠，推荐系统应避免把它们当作默认轻量任务`)

console.log('LvlUpLife 挑战数据审计')
console.log(`- 挑战：${challenges.length}`)
console.log(`- 分类：${new Set(challenges.map((item) => item.category)).size}`)
console.log(`- 周期：${JSON.stringify(countBy(challenges, (item) => item.cadence))}`)
console.log(`- 经典书单：${books.length} 项，全部 Lv.1 / 终身一次，已逐本评估阅读难度`)
console.log(`- 奖励审计：${balanceAudit.length} 项均包含逐任务判断理由`)
warnings.forEach((warning) => console.warn(`- 待人工复核：${warning}`))

if (failures.length) {
  failures.forEach((failure) => console.error(`- 错误：${failure}`))
  process.exit(1)
}
