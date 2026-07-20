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
          id: string
          name: string
          weight: number
        }
        Insert: {
          classroom_id: string
          component: Database["public"]["Enums"]["grade_component"]
          id?: string
          name: string
          weight: number
        }
        Update: {
          classroom_id?: string
          component?: Database["public"]["Enums"]["grade_component"]
          id?: string
          name?: string
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
      class_sessions: {
        Row: {
          classroom_id: string
          created_at: string
          id: string
          notes: string
          session_date: string
          title: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          id?: string
          notes?: string
          session_date: string
          title?: string
        }
        Update: {
          classroom_id?: string
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
        ]
      }
      classrooms: {
        Row: {
          block: string
          course_code: string
          course_name: string
          created_at: string
          id: string
          laboratory_weight: number
          lecture_weight: number
          owner_id: string
          updated_at: string
          year: string
        }
        Insert: {
          block?: string
          course_code: string
          course_name: string
          created_at?: string
          id?: string
          laboratory_weight?: number
          lecture_weight?: number
          owner_id: string
          updated_at?: string
          year?: string
        }
        Update: {
          block?: string
          course_code?: string
          course_name?: string
          created_at?: string
          id?: string
          laboratory_weight?: number
          lecture_weight?: number
          owner_id?: string
          updated_at?: string
          year?: string
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
      grading_periods: {
        Row: {
          classroom_id: string
          id: string
          name: string
          position: number
          weight: number
        }
        Insert: {
          classroom_id: string
          id?: string
          name: string
          position?: number
          weight?: number
        }
        Update: {
          classroom_id?: string
          id?: string
          name?: string
          position?: number
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
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
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
          id: string
          last_name: string
          middle_initial: string
          student_no: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          middle_initial?: string
          student_no: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_initial?: string
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
      teaching_modules: {
        Row: {
          classroom_id: string | null
          created_at: string
          description: string
          file_size: number
          id: string
          kind: Database["public"]["Enums"]["module_kind"]
          mime_type: string
          owner_id: string
          storage_path: string
          title: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          description?: string
          file_size: number
          id?: string
          kind: Database["public"]["Enums"]["module_kind"]
          mime_type: string
          owner_id: string
          storage_path: string
          title: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          description?: string
          file_size?: number
          id?: string
          kind?: Database["public"]["Enums"]["module_kind"]
          mime_type?: string
          owner_id?: string
          storage_path?: string
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
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      owns_classroom: { Args: { cid: string }; Returns: boolean }
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
      app_role: "admin" | "teacher"
      attendance_status: "present" | "absent" | "late" | "excused"
      grade_component: "lecture" | "laboratory"
      module_kind: "lesson_plan" | "activity_story" | "resource"
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
      app_role: ["admin", "teacher"],
      attendance_status: ["present", "absent", "late", "excused"],
      grade_component: ["lecture", "laboratory"],
      module_kind: ["lesson_plan", "activity_story", "resource"],
      teaching_level: ["preschool", "elementary", "high_school", "college"],
    },
  },
} as const
