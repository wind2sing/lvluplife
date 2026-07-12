export type RewardStatKey = 'STR' | 'CUL' | 'ENV' | 'CHA' | 'TAL' | 'INT'
export type RewardEnergy = 'low' | 'normal' | 'high'
export const TIER_NAMES: string[]
export const CATEGORY_REWARD_STATS: Record<string, [RewardStatKey, RewardStatKey]>
export function inferTier(energyDemand?: RewardEnergy, cadence?: string): number
export function inferQuestEnergy(tier: number): RewardEnergy
export function calculateReward(input: { level?: number; tier?: number; energyDemand?: RewardEnergy; cadence?: string; primaryStat?: RewardStatKey; secondaryStat?: RewardStatKey }): { tier: number; tierName: string; xp: number; stats: { key: RewardStatKey; points: number }[]; energyDemand: RewardEnergy }
