export type RewardStatKey = 'STR' | 'CUL' | 'ENV' | 'CHA' | 'TAL' | 'INT'
export type RewardEnergy = 'low' | 'normal' | 'high'
export const TIER_NAMES: string[]
export const CATEGORY_REWARD_STATS: Record<string, [RewardStatKey, RewardStatKey]>
export function inferTier(estimatedMinutes: number, energyDemand?: RewardEnergy): number
export function inferQuestConditions(tier: number): { estimatedMinutes: number; energyDemand: RewardEnergy }
export function calculateReward(input: { level?: number; tier?: number; estimatedMinutes?: number; energyDemand?: RewardEnergy; cadence?: string; primaryStat?: RewardStatKey; secondaryStat?: RewardStatKey }): { tier: number; tierName: string; xp: number; stats: { key: RewardStatKey; points: number }[]; estimatedMinutes: number; energyDemand: RewardEnergy }
