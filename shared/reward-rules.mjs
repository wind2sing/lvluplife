export const TIER_NAMES = ['', '轻松一胜', '支线任务', '进阶挑战', '史诗任务']

export const CATEGORY_REWARD_STATS = {
  艺术与创意: ['TAL', 'CUL'], 音乐: ['TAL', 'CUL'], 摄影: ['TAL', 'ENV'], 写作: ['TAL', 'INT'],
  事业与财务: ['INT', 'CHA'], 健身与健康: ['STR', 'INT'], 运动: ['STR', 'TAL'], 美食与烹饪: ['TAL', 'CHA'],
  家务与手作: ['ENV', 'TAL'], 善意与公益: ['CHA', 'CUL'], 心智与情绪: ['INT', 'STR'], 户外: ['ENV', 'STR'],
  阅读: ['INT', 'CUL'], 经典书单: ['INT', 'CUL'], 学习与成长: ['INT', 'TAL'], 社交: ['CHA', 'CUL'],
  旅行: ['ENV', 'CUL'], 一生必去: ['CUL', 'ENV'],
}

const energyMultiplier = { low: 0.9, normal: 1, high: 1.15 }
const cadenceMultiplier = { 每日: 0.82, 每周: 0.95, 每月: 1.05, 每年: 1.15, 终身一次: 1.25 }
const cadenceStatMultiplier = { 每日: 0.82, 每周: 0.95, 每月: 1, 每年: 1.08, 终身一次: 1.15 }

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const roundFive = (value) => Math.round(value / 5) * 5

export function inferTier(energyDemand = 'normal', cadence = '终身一次') {
  const energyTier = energyDemand === 'low' ? 1 : energyDemand === 'high' ? 3 : 2
  return cadence === '终身一次' && energyDemand === 'high' ? 4 : energyTier
}

export function inferQuestEnergy(tier) {
  const normalizedTier = clamp(Math.round(Number(tier) || 1), 1, 4)
  return normalizedTier === 1 ? 'low' : normalizedTier >= 3 ? 'high' : 'normal'
}

export function calculateReward({ level = 1, tier, energyDemand = 'normal', cadence = '终身一次', primaryStat = 'INT', secondaryStat }) {
  const normalizedEnergy = energyMultiplier[energyDemand] ? energyDemand : 'normal'
  const normalizedCadence = cadenceMultiplier[cadence] ? cadence : '终身一次'
  const normalizedTier = tier ? clamp(Math.round(Number(tier) || 1), 1, 4) : inferTier(normalizedEnergy, normalizedCadence)
  const normalizedLevel = clamp(Math.round(Number(level) || 1), 1, 30)
  const base = [0, 55, 115, 235, 480][normalizedTier]
  const levelMultiplier = Math.min(1.35, 1 + (normalizedLevel - 1) * 0.012)
  const xp = clamp(roundFive(base * energyMultiplier[normalizedEnergy] * cadenceMultiplier[normalizedCadence] * levelMultiplier), 25, 1500)
  const statBudget = clamp(Math.round((normalizedTier * 3 + normalizedLevel / 8) * energyMultiplier[normalizedEnergy] * cadenceStatMultiplier[normalizedCadence]), 2, 18)
  const pointCap = Math.max(normalizedLevel * 3, normalizedTier * 3)
  const hasSecondary = normalizedTier > 1 && secondaryStat && secondaryStat !== primaryStat
  const primaryPoints = clamp(hasSecondary ? Math.ceil(statBudget * 0.65) : statBudget, 1, pointCap)
  const secondaryPoints = hasSecondary ? clamp(statBudget - primaryPoints, 1, pointCap) : 0
  return {
    tier: normalizedTier,
    tierName: TIER_NAMES[normalizedTier],
    xp,
    stats: [{ key: primaryStat, points: primaryPoints }, ...(hasSecondary ? [{ key: secondaryStat, points: secondaryPoints }] : [])],
    energyDemand: normalizedEnergy,
  }
}
