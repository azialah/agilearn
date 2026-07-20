import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from '@/lib/database.types'

// Row aliases
export type Profile = Tables<'profiles'>
export type Classroom = Tables<'classrooms'>
export type Student = Tables<'students'>
export type GradingPeriod = Tables<'grading_periods'>
export type ActivityCategory = Tables<'activity_categories'>
export type Activity = Tables<'activities'>
export type Score = Tables<'scores'>
export type ClassSession = Tables<'class_sessions'>
export type AttendanceRecord = Tables<'attendance_records'>
export type TeachingModule = Tables<'teaching_modules'>
export type AllowedDomain = Tables<'allowed_email_domains'>
export type DomainRequest = Tables<'domain_requests'>
export type ClassRosterRow = Database['public']['Views']['v_class_roster']['Row']

// Insert aliases
export type ProfileInsert = TablesInsert<'profiles'>
export type ClassroomInsert = TablesInsert<'classrooms'>
export type StudentInsert = TablesInsert<'students'>
export type GradingPeriodInsert = TablesInsert<'grading_periods'>
export type ActivityCategoryInsert = TablesInsert<'activity_categories'>
export type ActivityInsert = TablesInsert<'activities'>
export type ScoreInsert = TablesInsert<'scores'>
export type ClassSessionInsert = TablesInsert<'class_sessions'>
export type AttendanceRecordInsert = TablesInsert<'attendance_records'>
export type TeachingModuleInsert = TablesInsert<'teaching_modules'>

// Update aliases
export type ProfileUpdate = TablesUpdate<'profiles'>
export type ClassroomUpdate = TablesUpdate<'classrooms'>
export type StudentUpdate = TablesUpdate<'students'>
export type GradingPeriodUpdate = TablesUpdate<'grading_periods'>
export type ActivityCategoryUpdate = TablesUpdate<'activity_categories'>
export type ActivityUpdate = TablesUpdate<'activities'>
export type ScoreUpdate = TablesUpdate<'scores'>
export type ClassSessionUpdate = TablesUpdate<'class_sessions'>
export type AttendanceRecordUpdate = TablesUpdate<'attendance_records'>
export type TeachingModuleUpdate = TablesUpdate<'teaching_modules'>

// Enum aliases
export type AppRole = Enums<'app_role'>
export type TeachingLevel = Enums<'teaching_level'>
export type GradeComponent = Enums<'grade_component'>
export type AttendanceStatus = Enums<'attendance_status'>
export type ModuleKind = Enums<'module_kind'>

// Convenience composites
export type ClassroomWithCount = Classroom & { student_count: number }

export function studentFullName(
  student: Pick<Student, 'last_name' | 'first_name' | 'middle_initial'>,
): string {
  const mi = student.middle_initial ? ` ${student.middle_initial}.` : ''
  return `${student.last_name}, ${student.first_name}${mi}`
}

/** Compose a profile's display name from its structured parts. */
export function composeFullName(parts: {
  firstName: string
  lastName: string
  middleName?: string | null
  suffix?: string | null
}): string {
  const name = [parts.firstName, parts.middleName, parts.lastName]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ')
  const suffix = parts.suffix?.trim()
  return suffix ? `${name}, ${suffix}` : name
}
