/**
 * Central TanStack Query key factory.
 *
 * Convention: every key is a tuple beginning with the entity name, optionally
 * followed by a scope ('list' | 'detail' | a relation name) and identifiers.
 * Always spread these into useQuery/useMutation so invalidation stays
 * predictable — e.g. `queryClient.invalidateQueries({ queryKey: keys.students.byClassroom(id) })`.
 */
export const keys = {
  session: ['session'] as const,

  profiles: {
    all: ['profiles', 'list'] as const,
    current: ['profiles', 'current'] as const,
    detail: (id: string) => ['profiles', 'detail', id] as const,
  },

  allowedDomains: ['allowed-email-domains'] as const,
  domainRequests: ['domain-requests'] as const,

  classrooms: {
    all: ['classrooms', 'list'] as const,
    detail: (id: string) => ['classrooms', 'detail', id] as const,
  },

  academicPeriods: {
    all: ['academic-periods', 'list'] as const,
    detail: (id: string) => ['academic-periods', 'detail', id] as const,
  },

  courseSubjects: {
    all: ['course-subjects', 'list'] as const,
    byClassroom: (classroomId: string) =>
      ['course-subjects', 'classroom', classroomId] as const,
    detail: (id: string) => ['course-subjects', 'detail', id] as const,
  },

  calendar: {
    slots: (subjectId: string) => ['calendar', 'slots', subjectId] as const,
    allSlots: ['calendar', 'slots', 'all'] as const,
    eventsBase: ['calendar', 'events'] as const,
    events: (from: string, to: string) => ['calendar', 'events', from, to] as const,
  },

  usage: ['usage', 'storage'] as const,

  notifications: {
    unread: ['notifications', 'unread'] as const,
  },

  students: {
    byClassroom: (classroomId: string) =>
      ['students', 'byClassroom', classroomId] as const,
  },

  grades: {
    structureBase: (classroomId: string) => ['grades', 'structure', classroomId] as const,
    structure: (classroomId: string, courseSubjectId: string = 'all') =>
      [...keys.grades.structureBase(classroomId), courseSubjectId] as const,
    byClassroom: (classroomId: string) => ['grades', 'scores', classroomId] as const,
  },

  attendance: {
    allSessions: ['attendance', 'sessions', 'all'] as const,
    sessionsBase: (classroomId: string) =>
      ['attendance', 'sessions', classroomId] as const,
    sessions: (classroomId: string, courseSubjectId: string = 'all') =>
      [...keys.attendance.sessionsBase(classroomId), courseSubjectId] as const,
    records: (sessionId: string) => ['attendance', 'records', sessionId] as const,
    session: (sessionId: string) => ['attendance', 'session', sessionId] as const,
  },

  modules: {
    all: ['modules', 'list'] as const,
    detail: (id: string) => ['modules', 'detail', id] as const,
    bySubject: (subjectId: string) => ['modules', 'subject', subjectId] as const,
  },

  auditLog: {
    list: (filters: { limit: number; actorId?: string; from?: string; to?: string }) =>
      ['audit-log', filters] as const,
  },
} as const
