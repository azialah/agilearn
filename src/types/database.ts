export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_periods: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          owner_id: string
          school_year: string
          semester_name: string
          starts_on: string | null
          status: Database["public"]["Enums"]["academic_period_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          owner_id: string
          school_year: string
          semester_name: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["academic_period_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          owner_id?: string
          school_year?: string
          semester_name?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["academic_period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_periods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          category_id: string
          date: string | null
          grading_period_id: string
          id: string
          max_score: number
          name: string
          position: number
        }
        Insert: {
          category_id: string
          date?: string | null
          grading_period_id: string
          id?: string
          max_score: number
          name: string
          position?: number
        }
        Update: {
          category_id?: string
          date?: string | null
          grading_period_id?: string
          id?: string
          max_score?: number
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_grading_period_id_fkey"
            columns: ["grading_period_id"]
            isOneToOne: false
            referencedRelation: "grading_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_categories: {
        Row: {
          classroom_id: string
          component: Database["public"]["Enums"]["grade_component"]
          course_subject_id: string
          grade_component_id: string | null
          grading_period_id: string | null
          id: string
          name: string
          position: number
          weight: number
        }
        Insert: {
          classroom_id: string
          component: Database["public"]["Enums"]["grade_component"]
          course_subject_id: string
          grade_component_id?: string | null
          grading_period_id?: string | null
          id?: string
          name: string
          position?: number
          weight: number
        }
        Update: {
          classroom_id?: string
          component?: Database["public"]["Enums"]["grade_component"]
          course_subject_id?: string
          grade_component_id?: string | null
          grading_period_id?: string | null
          id?: string
          name?: string
          position?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_categories_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_categories_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "activity_categories_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_categories_grade_component_id_fkey"
            columns: ["grade_component_id"]
            isOneToOne: false
            referencedRelation: "grade_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_categories_grading_period_id_fkey"
            columns: ["grading_period_id"]
            isOneToOne: false
            referencedRelation: "grading_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_categories_subject_classroom_fkey"
            columns: ["course_subject_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      allowed_email_domains: {
        Row: {
          created_at: string
          domain: string
        }
        Insert: {
          created_at?: string
          domain: string
        }
        Update: {
          created_at?: string
          domain?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          remarks: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          remarks?: string
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          remarks?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["student_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json | null
          id: string
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          target_id?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          academic_period_id: string | null
          all_day: boolean
          classroom_id: string | null
          course_subject_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["calendar_event_kind"]
          notes: string
          owner_id: string
          starts_at: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["calendar_event_visibility"]
        }
        Insert: {
          academic_period_id?: string | null
          all_day?: boolean
          classroom_id?: string | null
          course_subject_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["calendar_event_kind"]
          notes?: string
          owner_id: string
          starts_at: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["calendar_event_visibility"]
        }
        Update: {
          academic_period_id?: string | null
          all_day?: boolean
          classroom_id?: string | null
          course_subject_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["calendar_event_kind"]
          notes?: string
          owner_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["calendar_event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_academic_period_id_fkey"
            columns: ["academic_period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "calendar_events_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          classroom_id: string
          course_subject_id: string
          created_at: string
          id: string
          notes: string
          session_date: string
          title: string
        }
        Insert: {
          classroom_id: string
          course_subject_id: string
          created_at?: string
          id?: string
          notes?: string
          session_date: string
          title?: string
        }
        Update: {
          classroom_id?: string
          course_subject_id?: string
          created_at?: string
          id?: string
          notes?: string
          session_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "class_sessions_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_subject_classroom_fkey"
            columns: ["course_subject_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      classroom_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          academic_period_id: string | null
          academic_year: string
          block: string
          cohort_name: string
          color: string | null
          course_code: string
          course_name: string
          created_at: string
          description: string
          grading_template: string
          id: string
          owner_id: string
          room: string
          schedule: string
          school_level: Database["public"]["Enums"]["teaching_level"] | null
          subject_code: string
          term_name: string
          updated_at: string
          year: string
        }
        Insert: {
          academic_period_id?: string | null
          academic_year?: string
          block?: string
          cohort_name?: string
          color?: string | null
          course_code: string
          course_name: string
          created_at?: string
          description?: string
          grading_template?: string
          id?: string
          owner_id: string
          room?: string
          schedule?: string
          school_level?: Database["public"]["Enums"]["teaching_level"] | null
          subject_code?: string
          term_name?: string
          updated_at?: string
          year?: string
        }
        Update: {
          academic_period_id?: string | null
          academic_year?: string
          block?: string
          cohort_name?: string
          color?: string | null
          course_code?: string
          course_name?: string
          created_at?: string
          description?: string
          grading_template?: string
          id?: string
          owner_id?: string
          room?: string
          schedule?: string
          school_level?: Database["public"]["Enums"]["teaching_level"] | null
          subject_code?: string
          term_name?: string
          updated_at?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_academic_period_id_fkey"
            columns: ["academic_period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_subject_modules: {
        Row: {
          course_subject_id: string
          imported_at: string
          module_id: string
        }
        Insert: {
          course_subject_id: string
          imported_at?: string
          module_id: string
        }
        Update: {
          course_subject_id?: string
          imported_at?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_subject_modules_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_subject_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "teaching_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_subjects: {
        Row: {
          classroom_id: string
          course_code: string
          created_at: string
          description: string
          grading_template: string
          id: string
          kind: Database["public"]["Enums"]["course_subject_kind"]
          name: string
          position: number
          room: string
          schedule: string
          subject_code: string
          updated_at: string
        }
        Insert: {
          classroom_id: string
          course_code?: string
          created_at?: string
          description?: string
          grading_template?: string
          id?: string
          kind?: Database["public"]["Enums"]["course_subject_kind"]
          name: string
          position?: number
          room?: string
          schedule?: string
          subject_code?: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          course_code?: string
          created_at?: string
          description?: string
          grading_template?: string
          id?: string
          kind?: Database["public"]["Enums"]["course_subject_kind"]
          name?: string
          position?: number
          room?: string
          schedule?: string
          subject_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_subjects_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_subjects_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
        ]
      }
      domain_requests: {
        Row: {
          created_at: string
          domain: string
          id: string
          ip: string | null
          message: string | null
          name: string
          school: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          ip?: string | null
          message?: string | null
          name: string
          school: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          ip?: string | null
          message?: string | null
          name?: string
          school?: string
        }
        Relationships: []
      }
      grade_components: {
        Row: {
          classroom_id: string
          course_subject_id: string
          created_at: string
          id: string
          name: string
          position: number
          weight: number
        }
        Insert: {
          classroom_id: string
          course_subject_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          weight: number
        }
        Update: {
          classroom_id?: string
          course_subject_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_components_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_components_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "grade_components_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_components_subject_classroom_fkey"
            columns: ["course_subject_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      grading_periods: {
        Row: {
          classroom_id: string
          course_subject_id: string
          ends_on: string | null
          id: string
          name: string
          position: number
          starts_on: string | null
          weight: number
        }
        Insert: {
          classroom_id: string
          course_subject_id: string
          ends_on?: string | null
          id?: string
          name: string
          position?: number
          starts_on?: string | null
          weight?: number
        }
        Update: {
          classroom_id?: string
          course_subject_id?: string
          ends_on?: string | null
          id?: string
          name?: string
          position?: number
          starts_on?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grading_periods_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_periods_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "grading_periods_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_periods_subject_classroom_fkey"
            columns: ["course_subject_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      notifications: {
        Row: {
          classroom_id: string
          course_subject_id: string | null
          created_at: string
          dedupe_key: string
          id: string
          payload: Json
          read_at: string | null
          recipient_id: string
          resolved_at: string | null
          student_id: string
          type: string
          updated_at: string
        }
        Insert: {
          classroom_id: string
          course_subject_id?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_id: string
          resolved_at?: string | null
          student_id: string
          type: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          course_subject_id?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_id?: string
          resolved_at?: string | null
          student_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "notifications_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["student_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          full_name: string
          id: string
          last_name: string
          location: string | null
          middle_name: string | null
          preferred_locale: string
          role: Database["public"]["Enums"]["app_role"]
          school: string | null
          suffix: string | null
          teaching_levels:
            | Database["public"]["Enums"]["teaching_level"][]
            | null
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string
          full_name?: string
          id: string
          last_name?: string
          location?: string | null
          middle_name?: string | null
          preferred_locale?: string
          role?: Database["public"]["Enums"]["app_role"]
          school?: string | null
          suffix?: string | null
          teaching_levels?:
            | Database["public"]["Enums"]["teaching_level"][]
            | null
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          full_name?: string
          id?: string
          last_name?: string
          location?: string | null
          middle_name?: string | null
          preferred_locale?: string
          role?: Database["public"]["Enums"]["app_role"]
          school?: string | null
          suffix?: string | null
          teaching_levels?:
            | Database["public"]["Enums"]["teaching_level"][]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          activity_id: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_gradebook_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["student_id"]
          },
        ]
      }
      students: {
        Row: {
          classroom_id: string
          created_at: string
          first_name: string
          guardian_email: string | null
          id: string
          last_name: string
          middle_initial: string
          student_email: string | null
          student_no: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          first_name: string
          guardian_email?: string | null
          id?: string
          last_name: string
          middle_initial?: string
          student_email?: string | null
          student_no: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          first_name?: string
          guardian_email?: string | null
          id?: string
          last_name?: string
          middle_initial?: string
          student_email?: string | null
          student_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
        ]
      }
      subject_meeting_slots: {
        Row: {
          course_subject_id: string
          created_at: string
          ends_at: string
          id: string
          location_label: string
          modality: Database["public"]["Enums"]["class_modality"]
          starts_at: string
          weekday: number
        }
        Insert: {
          course_subject_id: string
          created_at?: string
          ends_at: string
          id?: string
          location_label?: string
          modality?: Database["public"]["Enums"]["class_modality"]
          starts_at: string
          weekday: number
        }
        Update: {
          course_subject_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          location_label?: string
          modality?: Database["public"]["Enums"]["class_modality"]
          starts_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "subject_meeting_slots_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_modules: {
        Row: {
          classroom_id: string | null
          created_at: string
          description: string
          file_size: number
          folder: string
          grading_period_id: string | null
          id: string
          kind: Database["public"]["Enums"]["module_kind"]
          mime_type: string
          owner_id: string
          storage_path: string
          tags: string[]
          title: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          description?: string
          file_size: number
          folder?: string
          grading_period_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["module_kind"]
          mime_type: string
          owner_id: string
          storage_path: string
          tags?: string[]
          title: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          description?: string
          file_size?: number
          folder?: string
          grading_period_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["module_kind"]
          mime_type?: string
          owner_id?: string
          storage_path?: string
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_modules_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_modules_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "teaching_modules_grading_period_id_fkey"
            columns: ["grading_period_id"]
            isOneToOne: false
            referencedRelation: "grading_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_modules_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_class_roster: {
        Row: {
          classroom_id: string | null
          course_code: string | null
          course_name: string | null
          first_name: string | null
          last_name: string | null
          middle_initial: string | null
          owner_id: string | null
          student_id: string | null
          student_no: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gradebook_activities: {
        Row: {
          category_id: string | null
          classroom_id: string | null
          course_subject_id: string | null
          date: string | null
          grading_period_id: string | null
          id: string | null
          max_score: number | null
          name: string | null
          position: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_grading_period_id_fkey"
            columns: ["grading_period_id"]
            isOneToOne: false
            referencedRelation: "grading_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_periods_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_periods_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "grading_periods_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_periods_subject_classroom_fkey"
            columns: ["course_subject_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id", "classroom_id"]
          },
        ]
      }
      v_gradebook_scores: {
        Row: {
          activity_id: string | null
          classroom_id: string | null
          course_subject_id: string | null
          score: number | null
          student_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_periods_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_periods_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "grading_periods_course_subject_id_fkey"
            columns: ["course_subject_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_periods_subject_classroom_fkey"
            columns: ["course_subject_id", "classroom_id"]
            isOneToOne: false
            referencedRelation: "course_subjects"
            referencedColumns: ["id", "classroom_id"]
          },
          {
            foreignKeyName: "scores_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_gradebook_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_class_roster"
            referencedColumns: ["student_id"]
          },
        ]
      }
    }
    Functions: {
      adopt_legacy_classroom: {
        Args: { p_classroom_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      module_storage_quota_allows: {
        Args: { p_existing_name?: string; p_metadata: Json; p_name: string }
        Returns: boolean
      }
      module_storage_usage: {
        Args: never
        Returns: {
          quota_bytes: number
          used_bytes: number
        }[]
      }
      owns_classroom: { Args: { cid: string }; Returns: boolean }
      reconcile_notification_incident: {
        Args: {
          p_active: boolean
          p_classroom_id: string
          p_course_subject_id: string
          p_payload?: Json
          p_student_id: string
          p_type: string
        }
        Returns: string
      }
      submit_domain_request: {
        Args: {
          p_domain: string
          p_message?: string
          p_name: string
          p_school: string
        }
        Returns: undefined
      }
    }
    Enums: {
      academic_period_status: "active" | "archived"
      app_role: "admin" | "teacher"
      attendance_status: "present" | "absent" | "late" | "excused"
      calendar_event_kind: "event" | "holiday" | "note"
      calendar_event_visibility: "private" | "organization"
      class_modality: "face_to_face" | "online" | "hybrid"
      course_subject_kind: "lecture" | "laboratory" | "other"
      grade_component: "lecture" | "laboratory"
      module_kind:
        | "lesson_plan"
        | "activity_story"
        | "resource"
        | "syllabus"
        | "teaching_material"
      teaching_level: "preschool" | "elementary" | "high_school" | "college"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      academic_period_status: ["active", "archived"],
      app_role: ["admin", "teacher"],
      attendance_status: ["present", "absent", "late", "excused"],
      calendar_event_kind: ["event", "holiday", "note"],
      calendar_event_visibility: ["private", "organization"],
      class_modality: ["face_to_face", "online", "hybrid"],
      course_subject_kind: ["lecture", "laboratory", "other"],
      grade_component: ["lecture", "laboratory"],
      module_kind: [
        "lesson_plan",
        "activity_story",
        "resource",
        "syllabus",
        "teaching_material",
      ],
      teaching_level: ["preschool", "elementary", "high_school", "college"],
    },
  },
} as const
