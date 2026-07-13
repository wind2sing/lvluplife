export const CADENCE_OPTIONS = ['每日', '每周', '每月', '每年', '终身一次']

export function getNextAvailableAt(completedAt, cadence) {
  if (cadence === '终身一次') return Number.POSITIVE_INFINITY
  const completed = new Date(completedAt)
  if (Number.isNaN(completed.getTime())) return 0
  const ready = new Date(completed)
  ready.setHours(0, 0, 0, 0)

  if (cadence === '每日') {
    ready.setDate(ready.getDate() + 1)
    return ready.getTime()
  }
  if (cadence === '每周') {
    const day = ready.getDay()
    ready.setDate(ready.getDate() + (day === 1 ? 7 : (8 - day) % 7))
    return ready.getTime()
  }
  if (cadence === '每月') {
    ready.setDate(1)
    ready.setMonth(ready.getMonth() + 1)
    return ready.getTime()
  }
  if (cadence === '每年') {
    ready.setFullYear(ready.getFullYear() + 1, 0, 1)
    return ready.getTime()
  }
  return 0
}
