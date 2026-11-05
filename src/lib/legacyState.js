import { MEMBER_COLORS, migrateMemberProfiles } from './colors.js'
import { load as loadValue, hasLegacyLocalData as hasStoredLegacyData, loadWithoutLegacySeeds as loadWithoutSeeds, loadRecoveredCollection as loadRecovered, mergeUnique } from './persistence.js'

const LEGACY_PROFILES = [
  { id: 'david', name: '아빠', type: 'adult', relation: '아빠', initials: '아', color: MEMBER_COLORS[0].color, tone: MEMBER_COLORS[0].tone, active: true },
  { id: 'emma', name: '엄마', type: 'adult', relation: '엄마', initials: '엄', color: MEMBER_COLORS[1].color, tone: MEMBER_COLORS[1].tone, active: true },
  { id: 'leo', name: '초롱', type: 'child', relation: '자녀', initials: '초', color: MEMBER_COLORS[2].color, tone: MEMBER_COLORS[2].tone, active: true },
  { id: 'mia', name: '연두', type: 'child', relation: '자녀', initials: '연', color: MEMBER_COLORS[3].color, tone: MEMBER_COLORS[3].tone, active: true },
]
export const DEFAULT_SHIFT_TYPES = [
  { id: 'day', code: 'D', label: '주간 근무', start: '06:30', end: '15:30', color: 'sage', icon: 'sun' },
  { id: 'evening', code: 'E', label: '오후 근무', start: '13:30', end: '22:30', color: 'blue', icon: 'sunset' },
  { id: 'night', code: 'N', label: '야간 근무', start: '22:00', end: '08:00', color: 'navy', icon: 'moon' },
  { id: 'off', code: 'OFF', label: '휴무', start: '', end: '', color: 'lavender', icon: 'calendar' },
]

export const DATA_RECOVERY_VERSION = 2
const RECOVERED_SHIFTS = []
const RECOVERED_ANNIVERSARIES = []

const defaultEvents = []
const defaultChildSchedules = []
const defaultSchedulePeriods = []
const defaultAnniversaries = []
const defaultTasks = []
const defaultShifts = []
const defaultScheduleExceptions = []
export const emptyChildProfile = (member) => ({
  member,
  school: '',
  grade: '',
  classNumber: '',
  studentNumber: '',
  teacherName: '',
  teacherPhone: '',
})

const LEGACY_EVENT_IDS = new Set([1, 4, 6, 7])
const LEGACY_TASK_IDS = new Set([1, 2, 3, 4, 5, 6, 7])
const LEGACY_CHILD_SCHEDULE_IDS = new Set([
  'leo-term-soccer', 'leo-term-piano', 'mia-term-art', 'leo-vacation-swim', 'mia-vacation-art',
])
const LEGACY_PERIOD_IDS = new Set(['term-first-2026', 'vacation-summer-2026', 'term-second-2026'])

const LEGACY_STORAGE_KEYS = [
  'family-scheduler-events', 'family-scheduler-tasks', 'family-scheduler-shifts',
  'family-scheduler-child-schedules-v1', 'family-scheduler-child-profiles-v1',
  'family-scheduler-periods-v1', 'family-scheduler-anniversaries-v1',
]

const defaultWorkSettingsFor = (profiles, shifts = []) => {
  const profileIds = new Set(profiles.map((profile) => profile.id))
  const shiftMemberIds = [...new Set(shifts.map((shift) => shift.member).filter((id) => profileIds.has(id)))]
  const workerIds = shiftMemberIds.length ? shiftMemberIds : profileIds.has('emma') ? ['emma'] : []
  return { enabled: workerIds.length > 0, workerIds, shiftTypes: DEFAULT_SHIFT_TYPES }
}

export const upgradeSharedState = (state) => {
  if (!state || typeof state !== 'object') return state
  const needsRecovery = Number(state.recoveryVersion || 0) < DATA_RECOVERY_VERSION
  const needsProfiles = Number(state.schemaVersion || 0) < 5 || !Array.isArray(state.profiles)
  const needsCalendarScopes = Number(state.schemaVersion || 0) < 6
  const needsMemberColors = Number(state.schemaVersion || 0) < 7
  if (!needsRecovery && !needsProfiles && !needsCalendarScopes && !needsMemberColors) return state
  const hasLegacyData = ['events', 'tasks', 'shifts', 'childSchedules', 'childProfiles', 'schedulePeriods', 'anniversaries']
    .some((key) => Array.isArray(state[key]) && state[key].length > 0)
  const sourceProfiles = Array.isArray(state.profiles) ? state.profiles : hasLegacyData ? LEGACY_PROFILES : []
  const profiles = needsMemberColors ? migrateMemberProfiles(sourceProfiles) : sourceProfiles
  return {
    ...state,
    schemaVersion: 7,
    recoveryVersion: DATA_RECOVERY_VERSION,
    profiles,
    workSettings: state.workSettings || defaultWorkSettingsFor(profiles, state.shifts),
    profileLinks: state.profileLinks && typeof state.profileLinks === 'object' ? state.profileLinks : {},
    events: normalizeEventCalendarScopes(Array.isArray(state.events) ? state.events : [], profiles),
    shifts: mergeUnique(Array.isArray(state.shifts) ? state.shifts : [], RECOVERED_SHIFTS, (item) => `${item.member}-${item.date}`),
    anniversaries: mergeUnique(Array.isArray(state.anniversaries) ? state.anniversaries : [], RECOVERED_ANNIVERSARIES, (item) => `${item.name}-${item.kind}-${item.calendarType}-${item.month}-${item.day}`),
  }
}

export const assignedMemberIds = (item, pluralKey = 'members', singularKey = 'member') => {
  const plural = Array.isArray(item?.[pluralKey]) ? item[pluralKey].filter(Boolean) : []
  return plural.length ? [...new Set(plural)] : item?.[singularKey] ? [item[singularKey]] : ['family']
}

const normalizeEventCalendarScopes = (events, profiles = []) => {
  const childIds = new Set(profiles.filter((profile) => profile.type === 'child').map((profile) => profile.id))
  return events.map((event) => {
    if (event.calendarScope === 'family' || event.calendarScope === 'children') return event
    const memberIds = assignedMemberIds(event)
    const belongsToChildren = childIds.size > 0 && memberIds.length > 0 && memberIds.every((memberId) => childIds.has(memberId))
    return { ...event, calendarScope: belongsToChildren ? 'children' : 'family' }
  })
}

export function loadLegacyState(storage = localStorage, { persistRecovery = true } = {}) {
  const load = (key, fallback) => loadValue(key, fallback, storage)
  const hasLegacyLocalData = (keys) => hasStoredLegacyData(keys, storage)
  const loadWithoutLegacySeeds = (key, fallback, ids) => loadWithoutSeeds(key, fallback, ids, storage)
  const loadRecoveredCollection = (...args) => loadRecovered(...args, storage, persistRecovery)
  const profiles = migrateMemberProfiles(load('family-scheduler-profiles-v1', hasLegacyLocalData(LEGACY_STORAGE_KEYS) ? LEGACY_PROFILES : []))
  const events = normalizeEventCalendarScopes(
    loadWithoutLegacySeeds('family-scheduler-events', defaultEvents, LEGACY_EVENT_IDS).map((event) => (
      event.member === 'mia' && event.title === '미아 생일' ? { ...event, title: '연두 생일' } : event
    )),
    profiles,
  )
  const tasks = loadWithoutLegacySeeds('family-scheduler-tasks', defaultTasks, LEGACY_TASK_IDS)
  const shifts = loadRecoveredCollection(
    'family-scheduler-shifts',
    defaultShifts,
    RECOVERED_SHIFTS,
    (item) => `${item.member}-${item.date}`,
    'family-scheduler-shifts-recovery-version',
    DATA_RECOVERY_VERSION,
  )
  const workSettings = load('family-scheduler-work-settings-v1', defaultWorkSettingsFor(profiles, shifts))
  const profileLinks = load('family-scheduler-profile-links-v1', {})
  const childSchedules = loadWithoutLegacySeeds('family-scheduler-child-schedules-v1', defaultChildSchedules, LEGACY_CHILD_SCHEDULE_IDS)
  const childProfiles = load('family-scheduler-child-profiles-v1', profiles.filter((profile) => profile.type === 'child').map((profile) => emptyChildProfile(profile.id)))
  const schedulePeriods = loadWithoutLegacySeeds('family-scheduler-periods-v1', defaultSchedulePeriods, LEGACY_PERIOD_IDS)
  const anniversaries = loadRecoveredCollection(
    'family-scheduler-anniversaries-v1',
    defaultAnniversaries,
    RECOVERED_ANNIVERSARIES,
    (item) => `${item.name}-${item.kind}-${item.calendarType}-${item.month}-${item.day}`,
    'family-scheduler-anniversaries-recovery-version',
    DATA_RECOVERY_VERSION,
  )
  const scheduleExceptions = load('family-scheduler-schedule-exceptions-v1', defaultScheduleExceptions)
  return { profiles, events, tasks, shifts, workSettings, profileLinks, childSchedules, childProfiles, schedulePeriods, anniversaries, scheduleExceptions }
}
