import { readFileSync, writeFileSync } from 'node:fs'
import { TIER_NAMES } from '../shared/reward-rules.mjs'

const challengesUrl = new URL('../src/data/challenges.json', import.meta.url)
const auditUrl = new URL('../data/challenge-balance-audit.json', import.meta.url)
const challenges = JSON.parse(readFileSync(challengesUrl, 'utf8'))
const audit = JSON.parse(readFileSync(auditUrl, 'utf8'))
const auditMap = new Map(audit.map((item) => [item.id, item]))

if (auditMap.size !== challenges.length || audit.length !== challenges.length) throw new Error('奖励审计必须逐项覆盖全部挑战，且不能有重复 ID')

const updated = challenges.map((challenge) => {
  const reviewed = auditMap.get(challenge.id)
  if (!reviewed) throw new Error(`缺少奖励审计：${challenge.id}`)
  return {
    ...challenge,
    tier: reviewed.tier,
    tierName: TIER_NAMES[reviewed.tier],
    xp: reviewed.xp,
    cadence: reviewed.cadence,
    stats: reviewed.stats,
    energyDemand: reviewed.energyDemand,
  }
})

const extraIds = [...auditMap.keys()].filter((id) => !challenges.some((challenge) => challenge.id === id))
if (extraIds.length) throw new Error(`审计文件包含未知任务：${extraIds.join(', ')}`)

writeFileSync(challengesUrl, `${JSON.stringify(updated, null, 2)}\n`)
console.log(`Applied reviewed balance to ${updated.length} challenges.`)
