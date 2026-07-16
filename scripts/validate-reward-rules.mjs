import { calculateReward } from '../shared/reward-rules.mjs'

const base = { tier: 2, primaryStat: 'INT', secondaryStat: 'TAL' }
const short = calculateReward({ ...base, energyDemand: 'low' })
const medium = calculateReward({ ...base, energyDemand: 'normal' })
const long = calculateReward({ ...base, energyDemand: 'high' })
const lowLevel = calculateReward({ ...base, level: 1, cadence: '每日', energyDemand: 'normal' })
const highLevel = calculateReward({ ...base, level: 30, cadence: '终身一次', energyDemand: 'normal' })

if (!(short.xp < medium.xp && medium.xp < long.xp)) throw new Error('XP must increase with energy demand')
if ([short, medium, long].some((reward) => reward.tier !== 2)) throw new Error('Explicit task difficulty must determine tier')
if (lowLevel.xp !== highLevel.xp || JSON.stringify(lowLevel.stats) !== JSON.stringify(highLevel.stats)) throw new Error('Level and cadence must not change the reward for the same task difficulty')
if ([short, medium, long].some((reward) => reward.xp < 25 || reward.xp > 1500 || reward.stats.some((stat) => stat.points < 1 || stat.points > 18))) throw new Error('Reward limits are invalid')

console.log(JSON.stringify({ short, medium, long, stableReward: lowLevel }, null, 2))
