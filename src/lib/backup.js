const COLLECTIONS = [
  ['profiles', '구성원'],
  ['events', '일정'],
  ['tasks', '할 일'],
  ['shifts', '근무표'],
  ['childSchedules', '자녀 일정'],
  ['childProfiles', '자녀 정보'],
  ['schedulePeriods', '학기·방학'],
  ['anniversaries', '기념일'],
  ['scheduleExceptions', '반복 예외'],
]

export const inspectBackup = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('백업 파일의 형식이 올바르지 않습니다.')
  const present = COLLECTIONS.filter(([key]) => Object.hasOwn(value, key))
  if (!present.length) throw new Error('Family Scheduler 데이터가 들어 있지 않습니다.')
  const invalid = present.find(([key]) => !Array.isArray(value[key]))
  if (invalid) throw new Error(`${invalid[1]} 데이터가 올바른 배열 형식이 아닙니다.`)
  if (value.profiles?.some((profile) => !profile || typeof profile !== 'object' || typeof profile.id !== 'string')) {
    throw new Error('구성원 데이터에 올바르지 않은 항목이 있습니다.')
  }
  return {
    schemaVersion: Number(value.schemaVersion) || 1,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
    counts: COLLECTIONS.map(([key, label]) => ({ key, label, count: Array.isArray(value[key]) ? value[key].length : 0 })),
  }
}
