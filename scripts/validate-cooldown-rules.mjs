import assert from 'node:assert/strict'
import { getNextAvailableAt } from '../shared/cooldown-rules.mjs'

const local = (year, month, day, hour = 20) => new Date(year, month - 1, day, hour)
const parts = (timestamp) => {
  const value = new Date(timestamp)
  return [value.getFullYear(), value.getMonth() + 1, value.getDate(), value.getHours(), value.getMinutes()]
}

assert.deepEqual(parts(getNextAvailableAt(local(2026, 7, 13), '每日')), [2026, 7, 14, 0, 0])
assert.deepEqual(parts(getNextAvailableAt(local(2026, 7, 13), '每周')), [2026, 7, 20, 0, 0])
assert.deepEqual(parts(getNextAvailableAt(local(2026, 7, 19), '每周')), [2026, 7, 20, 0, 0])
assert.deepEqual(parts(getNextAvailableAt(local(2026, 7, 31), '每月')), [2026, 8, 1, 0, 0])
assert.deepEqual(parts(getNextAvailableAt(local(2026, 12, 31), '每年')), [2027, 1, 1, 0, 0])
assert.equal(getNextAvailableAt(local(2026, 7, 13), '终身一次'), Number.POSITIVE_INFINITY)
assert.equal(getNextAvailableAt('not-a-date', '每日'), 0)

console.log('Cooldown calendar-boundary validation passed.')
