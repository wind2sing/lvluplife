import { calculateReward } from '../shared/reward-rules.mjs'

const base = { level: 5, cadence: '每周', primaryStat: 'INT', secondaryStat: 'TAL' }
const short = calculateReward({ ...base, energyDemand: 'low' })
const medium = calculateReward({ ...base, energyDemand: 'normal' })
const long = calculateReward({ ...base, energyDemand: 'high' })
const daily = calculateReward({ ...base, energyDemand: 'normal', cadence: '每日' })
const lifetime = calculateReward({ ...base, energyDemand: 'normal', cadence: '终身一次' })

if (!(short.xp < medium.xp && medium.xp < long.xp)) throw new Error('XP must increase with energy demand')
if (!(short.tier < medium.tier && medium.tier < long.tier)) throw new Error('Tier must increase with energy demand')
if (!(daily.xp < lifetime.xp)) throw new Error('Repeatable daily quests must reward less than lifetime quests')
if ([short, medium, long].some((reward) => reward.xp < 25 || reward.xp > 1500 || reward.stats.some((stat) => stat.points < 1 || stat.points > 18))) throw new Error('Reward limits are invalid')

console.log(JSON.stringify({ short, medium, long, dailyXp: daily.xp, lifetimeXp: lifetime.xp }, null, 2))
