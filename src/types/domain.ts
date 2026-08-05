import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from '@/lib/database.types'

// Row aliases
export type Profile = Tables<'profiles'>
export type AcademicPeriod = Tables<'academic_periods'>
export type Classroom = Tables<'classrooms'>
export type ClassroomTemplate = Tables<'classroom_templates'>
export type CourseSubject = Tables<'course_subjects'>
export type SubjectMeetingSlot = Tables<'subject_meeting_slots'>
export type CalendarEvent = Tables<'calendar_events'>
export type Student = Tables<'students'>
export type GradingPeriod = Tables<'grading_periods'>
export type GradeComponentRecord = Tables<'grade_components'>
export type SubjectGradeCombination = Tables<'subject_grade_combinations'>
export type SubjectGradeCombinationItem = Tables<'subject_grade_combination_items'>
export type ActivityCategory = Tables<'activity_categories'>
export type Activity = Tables<'activities'>
export type Score = Tables<'scores'>
export type ClassSession = Tables<'class_sessions'>
export type AttendanceRecord = Tables<'attendance_records'>
export type TeachingModule = Tables<'teaching_modules'>
export type AllowedDomain = Tables<'allowed_email_domains'>
export type DomainRequest = Tables<'domain_requests'>
export type AuditLog = Tables<'audit_log'>
export type AppNotification = Tables<'notifications'>
export type ClassRosterRow = Database['public']['Views']['v_class_roster']['Row']

// Insert aliases
export type ProfileInsert = TablesInsert<'profiles'>
export type AcademicPeriodInsert = TablesInsert<'academic_periods'>
export type ClassroomInsert = TablesInsert<'classrooms'>
export type ClassroomTemplateInsert = TablesInsert<'classroom_templates'>
export type CourseSubjectInsert = TablesInsert<'course_subjects'>
export type SubjectMeetingSlotInsert = TablesInsert<'subject_meeting_slots'>
export type CalendarEventInsert = TablesInsert<'calendar_events'>
export type StudentInsert = TablesInsert<'students'>
export type GradingPeriodInsert = TablesInsert<'grading_periods'>
export type GradeComponentInsert = TablesInsert<'grade_components'>
export type SubjectGradeCombinationInsert = TablesInsert<'subject_grade_combinations'>
export type SubjectGradeCombinationItemInsert =
  TablesInsert<'subject_grade_combination_items'>
export type ActivityCategoryInsert = TablesInsert<'activity_categories'>
export type ActivityInsert = TablesInsert<'activities'>
export type ScoreInsert = TablesInsert<'scores'>
export type ClassSessionInsert = TablesInsert<'class_sessions'>
export type AttendanceRecordInsert = TablesInsert<'attendance_records'>
export type TeachingModuleInsert = TablesInsert<'teaching_modules'>

// Update aliases
export type ProfileUpdate = TablesUpdate<'profiles'>
export type AcademicPeriodUpdate = TablesUpdate<'academic_periods'>
export type ClassroomUpdate = TablesUpdate<'classrooms'>
export type CourseSubjectUpdate = TablesUpdate<'course_subjects'>
export type SubjectMeetingSlotUpdate = TablesUpdate<'subject_meeting_slots'>
export type CalendarEventUpdate = TablesUpdate<'calendar_events'>
export type StudentUpdate = TablesUpdate<'students'>
export type GradingPeriodUpdate = TablesUpdate<'grading_periods'>
export type GradeComponentUpdate = TablesUpdate<'grade_components'>
export type SubjectGradeCombinationUpdate = TablesUpdate<'subject_grade_combinations'>
export type SubjectGradeCombinationItemUpdate =
  TablesUpdate<'subject_grade_combination_items'>
export type ActivityCategoryUpdate = TablesUpdate<'activity_categories'>
export type ActivityUpdate = TablesUpdate<'activities'>
export type ScoreUpdate = TablesUpdate<'scores'>
export type ClassSessionUpdate = TablesUpdate<'class_sessions'>
export type AttendanceRecordUpdate = TablesUpdate<'attendance_records'>
export type TeachingModuleUpdate = TablesUpdate<'teaching_modules'>

// Enum aliases
export type AppRole = Enums<'app_role'>
export type AcademicPeriodStatus = Enums<'academic_period_status'>
export type CourseSubjectKind = Enums<'course_subject_kind'>
export type CourseSubjectSession = Enums<'course_subject_session'>
export type ClassModality = Enums<'class_modality'>
export type CalendarEventKind = Enums<'calendar_event_kind'>
export type CalendarEventVisibility = Enums<'calendar_event_visibility'>
export type TeachingLevel = Enums<'teaching_level'>
export type GradeComponent = Enums<'grade_component'>
export type AttendanceStatus = Enums<'attendance_status'>
export type ModuleKind = Enums<'module_kind'>
export type GradingTemplate =
  'basic_education' | 'senior_high' | 'higher_education' | 'custom'

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
