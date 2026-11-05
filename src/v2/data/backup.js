import { inspectBackup } from '../../lib/backup'

export function inspectV2Backup(value) {
  const summary = inspectBackup(value)
  for (const { key, label } of summary.counts) {
    if (value[key]?.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error(`${label} 항목의 형식이 올바르지 않아요.`)
  }
  if (Object.hasOwn(value, 'taskCategories') && (!Array.isArray(value.taskCategories) || value.taskCategories.some((name) => typeof name !== 'string' || !name.trim()))) throw new Error('할 일 분류 형식이 올바르지 않아요.')
  for (const key of ['workSettings', 'profileLinks']) {
    if (Object.hasOwn(value, key) && (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key]))) throw new Error('가족 설정 형식이 올바르지 않아요.')
  }
  return summary
}
