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
      classrooms: {
        Row: {
          id: string
          owner_id: string
          course_name: string
          course_code: string
          year: string
          block: string
          lecture_weight: number
          laboratory_weight: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          course_name: string
          course_code: string
          year: string
          block: string
          lecture_weight?: number
          laboratory_weight?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          course_name?: string
          course_code?: string
          year?: string
          block?: string
          lecture_weight?: number
          laboratory_weight?: number
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
          created_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          student_no: string
          last_name: string
          first_name: string
          middle_initial?: string
          created_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          student_no?: string
          last_name?: string
          first_name?: string
          middle_initial?: string
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
      grading_periods: {
        Row: {
          id: string
          classroom_id: string
          name: string
          weight: number
          position: number
        }
        Insert: {
          id?: string
          classroom_id: string
          name: string
          weight?: number
          position?: number
        }
        Update: {
          id?: string
          classroom_id?: string
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
        ]
      }
      activity_categories: {
        Row: {
          id: string
          classroom_id: string
          component: Database['public']['Enums']['grade_component']
          name: string
          weight: number
        }
        Insert: {
          id?: string
          classroom_id: string
          component: Database['public']['Enums']['grade_component']
          name: string
          weight: number
        }
        Update: {
          id?: string
          classroom_id?: string
          component?: Database['public']['Enums']['grade_component']
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
          session_date: string
          title: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          session_date: string
          title?: string
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
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
    }
    Enums: {
      app_role: 'admin' | 'teacher'
      teaching_level: 'preschool' | 'elementary' | 'high_school' | 'college'
      grade_component: 'lecture' | 'laboratory'
      attendance_status: 'present' | 'absent' | 'late' | 'excused'
      module_kind: 'lesson_plan' | 'activity_story' | 'resource'
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
