import { readFileSync } from 'node:fs'

const challenges = JSON.parse(readFileSync(new URL('../src/data/challenges.json', import.meta.url), 'utf8'))
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
if (books.some((item) => item.tier !== 2)) failures.push('经典书单当前统一使用支线任务奖励档')

const suspiciousDaily = challenges.filter((item) => item.cadence === '每日' && /去|参观|购买|买|观看|看|完成|读完|旅行|加入|举办|组织|写一|制作|拍摄|捐|获得|学习|尝试|参加|拜访|探索/.test(item.title))
if (suspiciousDaily.length) warnings.push(`${suspiciousDaily.length} 项每日任务可能实际更适合每周、每月或终身一次，需要逐项人工判断`)

const vagueTitles = challenges.filter((item) => /一些东西|某事|做一些|某件事/.test(item.title))
if (vagueTitles.length) warnings.push(`${vagueTitles.length} 个标题表达较宽泛，可以在后续中文润色中进一步明确`)

const purchaseOrDonation = challenges.filter((item) => /买|购买|支付|捐赠/.test(item.title))
if (purchaseOrDonation.length) warnings.push(`${purchaseOrDonation.length} 项涉及消费或捐赠，推荐系统应避免把它们当作默认轻量任务`)

console.log('LvlUpLife 挑战数据审计')
console.log(`- 挑战：${challenges.length}`)
console.log(`- 分类：${new Set(challenges.map((item) => item.category)).size}`)
console.log(`- 周期：${JSON.stringify(countBy(challenges, (item) => item.cadence))}`)
console.log(`- 经典书单：${books.length} 项，全部 Lv.1 / 终身一次`)
warnings.forEach((warning) => console.warn(`- 待人工复核：${warning}`))

if (failures.length) {
  failures.forEach((failure) => console.error(`- 错误：${failure}`))
  process.exit(1)
}
