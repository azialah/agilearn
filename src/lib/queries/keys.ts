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

  students: {
    byClassroom: (classroomId: string) =>
      ['students', 'byClassroom', classroomId] as const,
  },

  grades: {
    structure: (classroomId: string) => ['grades', 'structure', classroomId] as const,
    byClassroom: (classroomId: string) => ['grades', 'scores', classroomId] as const,
  },

  attendance: {
    sessions: (classroomId: string) => ['attendance', 'sessions', classroomId] as const,
    records: (sessionId: string) => ['attendance', 'records', sessionId] as const,
  },

  modules: {
    all: ['modules', 'list'] as const,
    detail: (id: string) => ['modules', 'detail', id] as const,
  },
} as const
