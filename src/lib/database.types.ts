/**
 * Hand-written Supabase Database type mirroring supabase/migrations/*.
 *
 * Keep this in sync with the SQL migrations. It can be regenerated with:
 *   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          first_name: string
          last_name: string
          middle_name: string | null
          suffix: string | null
          school: string | null
          location: string | null
          teaching_levels: Database['public']['Enums']['teaching_level'][] | null
          preferred_locale: string
          avatar_color: string
          role: Database['public']['Enums']['app_role']
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          first_name?: string
          last_name?: string
          middle_name?: string | null
          suffix?: string | null
          school?: string | null
          location?: string | null
          teaching_levels?: Database['public']['Enums']['teaching_level'][] | null
          preferred_locale?: string
          avatar_color?: string
          role?: Database['public']['Enums']['app_role']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          first_name?: string
          last_name?: string
          middle_name?: string | null
          suffix?: string | null
          school?: string | null
          location?: string | null
          teaching_levels?: Database['public']['Enums']['teaching_level'][] | null
          preferred_locale?: string
          avatar_color?: string
          role?: Database['public']['Enums']['app_role']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      allowed_email_domains: {
        Row: {
          domain: string
          created_at: string
        }
        Insert: {
          domain: string
          created_at?: string
        }
        Update: {
          domain?: string
          created_at?: string
        }
        Relationships: []
      }
      domain_requests: {
        Row: {
          id: string
          name: string
          school: string
          domain: string
          message: string | null
          ip: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          school: string
          domain: string
          message?: string | null
          ip?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          school?: string
          domain?: string
          message?: string | null
          ip?: string | null
          created_at?: string
        }
        Relationships: []
      }
      academic_periods: {
        Row: {
          id: string
          owner_id: string
          school_year: string
          semester_name: string
          status: Database['public']['Enums']['academic_period_status']
          starts_on: string | null
          ends_on: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          school_year: string
          semester_name: string
          status?: Database['public']['Enums']['academic_period_status']
          starts_on?: string | null
          ends_on?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          school_year?: string
          semester_name?: string
          status?: Database['public']['Enums']['academic_period_status']
          starts_on?: string | null
          ends_on?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'academic_periods_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      classrooms: {
        Row: {
          id: string
          owner_id: string
          course_name: string
          course_code: string
          subject_code: string
          description: string
          school_level: Database['public']['Enums']['teaching_level'] | null
          academic_year: string
          term_name: string
          schedule: string
          room: string
          grading_template: string
          year: string
          block: string
          academic_period_id: string | null
          cohort_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          course_name: string
          course_code: string
          subject_code?: string
          description?: string
          school_level?: Database['public']['Enums']['teaching_level'] | null
          academic_year?: string
          term_name?: string
          schedule?: string
          room?: string
          grading_template?: string
          year: string
          block: string
          academic_period_id?: string | null
          cohort_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          course_name?: string
          course_code?: string
          subject_code?: string
          description?: string
          school_level?: Database['public']['Enums']['teaching_level'] | null
          academic_year?: string
          term_name?: string
          schedule?: string
          room?: string
          grading_template?: string
          year?: string
          block?: string
          academic_period_id?: string | null
          cohort_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classrooms_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classrooms_academic_period_id_fkey'
            columns: ['academic_period_id']
            isOneToOne: false
            referencedRelation: 'academic_periods'
            referencedColumns: ['id']
          },
        ]
      }
      course_subjects: {
        Row: {
          id: string
          classroom_id: string
          name: string
          course_code: string
          subject_code: string
          description: string
          kind: Database['public']['Enums']['course_subject_kind']
          schedule: string
          room: string
          grading_template: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          name: string
          course_code?: string
          subject_code?: string
          description?: string
          kind?: Database['public']['Enums']['course_subject_kind']
          schedule?: string
          room?: string
          grading_template?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          name?: string
          course_code?: string
          subject_code?: string
          description?: string
          kind?: Database['public']['Enums']['course_subject_kind']
          schedule?: string
          room?: string
          grading_template?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_subjects_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
        ]
      }
      students: {
        Row: {
          id: string
          classroom_id: string
          student_no: string
          last_name: string
          first_name: string
          middle_initial: string
          student_email: string | null
          guardian_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          student_no: string
          last_name: string
          first_name: string
          middle_initial?: string
          student_email?: string | null
          guardian_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          student_no?: string
          last_name?: string
          first_name?: string
          middle_initial?: string
          student_email?: string | null
          guardian_email?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'students_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
        ]
      }
      subject_meeting_slots: {
        Row: {
          id: string
          course_subject_id: string
          weekday: number
          starts_at: string
          ends_at: string
          modality: Database['public']['Enums']['class_modality']
          location_label: string
          created_at: string
        }
        Insert: {
          id?: string
          course_subject_id: string
          weekday: number
          starts_at: string
          ends_at: string
          modality?: Database['public']['Enums']['class_modality']
          location_label?: string
          created_at?: string
        }
        Update: {
          id?: string
          course_subject_id?: string
          weekday?: number
          starts_at?: string
          ends_at?: string
          modality?: Database['public']['Enums']['class_modality']
          location_label?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subject_meeting_slots_course_subject_id_fkey'
            columns: ['course_subject_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id']
          },
        ]
      }
      calendar_events: {
        Row: {
          id: string
          owner_id: string
          academic_period_id: string | null
          classroom_id: string | null
          course_subject_id: string | null
          kind: Database['public']['Enums']['calendar_event_kind']
          visibility: Database['public']['Enums']['calendar_event_visibility']
          title: string
          notes: string
          starts_at: string
          ends_at: string | null
          all_day: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          academic_period_id?: string | null
          classroom_id?: string | null
          course_subject_id?: string | null
          kind?: Database['public']['Enums']['calendar_event_kind']
          visibility?: Database['public']['Enums']['calendar_event_visibility']
          title: string
          notes?: string
          starts_at: string
          ends_at?: string | null
          all_day?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          academic_period_id?: string | null
          classroom_id?: string | null
          course_subject_id?: string | null
          kind?: Database['public']['Enums']['calendar_event_kind']
          visibility?: Database['public']['Enums']['calendar_event_visibility']
          title?: string
          notes?: string
          starts_at?: string
          ends_at?: string | null
          all_day?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_events_academic_period_id_fkey'
            columns: ['academic_period_id']
            isOneToOne: false
            referencedRelation: 'academic_periods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_course_subject_id_fkey'
            columns: ['course_subject_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id']
          },
        ]
      }
      grading_periods: {
        Row: {
          id: string
          classroom_id: string
          course_subject_id: string
          name: string
          weight: number
          position: number
        }
        Insert: {
          id?: string
          classroom_id: string
          course_subject_id: string
          name: string
          weight?: number
          position?: number
        }
        Update: {
          id?: string
          classroom_id?: string
          course_subject_id?: string
          name?: string
          weight?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: 'grading_periods_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'grading_periods_course_subject_id_fkey'
            columns: ['course_subject_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'grading_periods_subject_classroom_fkey'
            columns: ['course_subject_id', 'classroom_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id', 'classroom_id']
          },
        ]
      }
      grade_components: {
        Row: {
          id: string
          classroom_id: string
          course_subject_id: string
          name: string
          weight: number
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          course_subject_id: string
          name: string
          weight: number
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          course_subject_id?: string
          name?: string
          weight?: number
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'grade_components_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'grade_components_course_subject_id_fkey'
            columns: ['course_subject_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'grade_components_subject_classroom_fkey'
            columns: ['course_subject_id', 'classroom_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id', 'classroom_id']
          },
        ]
      }
      activity_categories: {
        Row: {
          id: string
          classroom_id: string
          course_subject_id: string
          component: Database['public']['Enums']['grade_component']
          grading_period_id: string | null
          grade_component_id: string | null
          position: number
          name: string
          weight: number
        }
        Insert: {
          id?: string
          classroom_id: string
          course_subject_id: string
          component: Database['public']['Enums']['grade_component']
          grading_period_id?: string | null
          grade_component_id?: string | null
          position?: number
          name: string
          weight: number
        }
        Update: {
          id?: string
          classroom_id?: string
          course_subject_id?: string
          component?: Database['public']['Enums']['grade_component']
          grading_period_id?: string | null
          grade_component_id?: string | null
          position?: number
          name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: 'activity_categories_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_categories_course_subject_id_fkey'
            columns: ['course_subject_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_categories_subject_classroom_fkey'
            columns: ['course_subject_id', 'classroom_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id', 'classroom_id']
          },
          {
            foreignKeyName: 'activity_categories_grading_period_id_fkey'
            columns: ['grading_period_id']
            isOneToOne: false
            referencedRelation: 'grading_periods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_categories_grade_component_id_fkey'
            columns: ['grade_component_id']
            isOneToOne: false
            referencedRelation: 'grade_components'
            referencedColumns: ['id']
          },
        ]
      }
      activities: {
        Row: {
          id: string
          grading_period_id: string
          category_id: string
          name: string
          max_score: number
          date: string | null
          position: number
        }
        Insert: {
          id?: string
          grading_period_id: string
          category_id: string
          name: string
          max_score: number
          date?: string | null
          position?: number
        }
        Update: {
          id?: string
          grading_period_id?: string
          category_id?: string
          name?: string
          max_score?: number
          date?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: 'activities_grading_period_id_fkey'
            columns: ['grading_period_id']
            isOneToOne: false
            referencedRelation: 'grading_periods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'activity_categories'
            referencedColumns: ['id']
          },
        ]
      }
      scores: {
        Row: {
          activity_id: string
          student_id: string
          score: number | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          student_id: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          student_id?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'scores_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'scores_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
      class_sessions: {
        Row: {
          id: string
          classroom_id: string
          course_subject_id: string
          session_date: string
          title: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          course_subject_id: string
          session_date: string
          title?: string
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          course_subject_id?: string
          session_date?: string
          title?: string
          notes?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'class_sessions_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_sessions_course_subject_id_fkey'
            columns: ['course_subject_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_sessions_subject_classroom_fkey'
            columns: ['course_subject_id', 'classroom_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id', 'classroom_id']
          },
        ]
      }
      attendance_records: {
        Row: {
          session_id: string
          student_id: string
          status: Database['public']['Enums']['attendance_status']
          remarks: string
          updated_at: string
        }
        Insert: {
          session_id: string
          student_id: string
          status?: Database['public']['Enums']['attendance_status']
          remarks?: string
          updated_at?: string
        }
        Update: {
          session_id?: string
          student_id?: string
          status?: Database['public']['Enums']['attendance_status']
          remarks?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'attendance_records_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'class_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_records_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
        ]
      }
      teaching_modules: {
        Row: {
          id: string
          owner_id: string
          classroom_id: string | null
          kind: Database['public']['Enums']['module_kind']
          title: string
          description: string
          storage_path: string
          file_size: number
          mime_type: string
          tags: string[]
          folder: string
          grading_period_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          classroom_id?: string | null
          kind: Database['public']['Enums']['module_kind']
          title: string
          description?: string
          storage_path: string
          file_size: number
          mime_type: string
          tags?: string[]
          folder?: string
          grading_period_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          classroom_id?: string | null
          kind?: Database['public']['Enums']['module_kind']
          title?: string
          description?: string
          storage_path?: string
          file_size?: number
          mime_type?: string
          tags?: string[]
          folder?: string
          grading_period_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teaching_modules_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teaching_modules_classroom_id_fkey'
            columns: ['classroom_id']
            isOneToOne: false
            referencedRelation: 'classrooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teaching_modules_grading_period_id_fkey'
            columns: ['grading_period_id']
            isOneToOne: false
            referencedRelation: 'grading_periods'
            referencedColumns: ['id']
          },
        ]
      }
      course_subject_modules: {
        Row: {
          course_subject_id: string
          module_id: string
          imported_at: string
        }
        Insert: {
          course_subject_id: string
          module_id: string
          imported_at?: string
        }
        Update: {
          course_subject_id?: string
          module_id?: string
          imported_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_subject_modules_course_subject_id_fkey'
            columns: ['course_subject_id']
            isOneToOne: false
            referencedRelation: 'course_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_subject_modules_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'teaching_modules'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          target_table: string
          target_id: string
          detail: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          target_table: string
          target_id: string
          detail?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          target_table?: string
          target_id?: string
          detail?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_class_roster: {
        Row: {
          classroom_id: string | null
          owner_id: string | null
          course_name: string | null
          course_code: string | null
          student_id: string | null
          student_no: string | null
          last_name: string | null
          first_name: string | null
          middle_initial: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      owns_classroom: {
        Args: { cid: string }
        Returns: boolean
      }
      submit_domain_request: {
        Args: {
          p_name: string
          p_school: string
          p_domain: string
          p_message?: string
        }
        Returns: undefined
      }
      adopt_legacy_classroom: {
        Args: { p_classroom_id: string }
        Returns: string
      }
      module_storage_usage: {
        Args: Record<PropertyKey, never>
        Returns: { used_bytes: number; quota_bytes: number }[]
      }
      module_storage_quota_allows: {
        Args: { p_name: string; p_metadata: Json; p_existing_name?: string | null }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'teacher'
      academic_period_status: 'active' | 'archived'
      course_subject_kind: 'lecture' | 'laboratory' | 'other'
      class_modality: 'face_to_face' | 'online' | 'hybrid'
      calendar_event_kind: 'event' | 'holiday' | 'note'
      calendar_event_visibility: 'private' | 'organization'
      teaching_level: 'preschool' | 'elementary' | 'high_school' | 'college'
      grade_component: 'lecture' | 'laboratory'
      attendance_status: 'present' | 'absent' | 'late' | 'excused'
      module_kind:
        'lesson_plan' | 'activity_story' | 'resource' | 'syllabus' | 'teaching_material'
    }
    CompositeTypes: Record<PropertyKey, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
