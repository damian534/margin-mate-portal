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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      broker_activity: {
        Row: {
          activity_date: string
          broker_id: string
          created_at: string
          id: string
          meetings_booked: number
          meetings_held: number
          outbound_calls: number
          referral_meetings_booked: number
          updated_at: string
        }
        Insert: {
          activity_date?: string
          broker_id: string
          created_at?: string
          id?: string
          meetings_booked?: number
          meetings_held?: number
          outbound_calls?: number
          referral_meetings_booked?: number
          updated_at?: string
        }
        Update: {
          activity_date?: string
          broker_id?: string
          created_at?: string
          id?: string
          meetings_booked?: number
          meetings_held?: number
          outbound_calls?: number
          referral_meetings_booked?: number
          updated_at?: string
        }
        Relationships: []
      }
      broker_activity_targets: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          meetings_target_week: number
          outbound_calls_target_week: number
          referral_meetings_target_week: number
          updated_at: string
          week_number: number
          year: number
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          meetings_target_week?: number
          outbound_calls_target_week?: number
          referral_meetings_target_week?: number
          updated_at?: string
          week_number: number
          year: number
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          meetings_target_week?: number
          outbound_calls_target_week?: number
          referral_meetings_target_week?: number
          updated_at?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
      client_portal_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_send_error: string | null
          last_send_mode: string | null
          last_sent_at: string | null
          lead_id: string
          portal_mode: string
          send_count: number
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_send_error?: string | null
          last_send_mode?: string | null
          last_sent_at?: string | null
          lead_id: string
          portal_mode?: string
          send_count?: number
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_send_error?: string | null
          last_send_mode?: string | null
          last_sent_at?: string | null
          lead_id?: string
          portal_mode?: string
          send_count?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          applicant_id: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          lead_id: string
          name: string
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section: string | null
          status: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          applicant_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          lead_id: string
          name: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          applicant_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          lead_id?: string
          name?: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          broker_id: string
          created_at: string
          display_order: number
          id: string
          is_default: boolean
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fact_find_responses: {
        Row: {
          completed: boolean
          created_at: string
          data: Json
          id: string
          lead_id: string
          section: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          data?: Json
          id?: string
          lead_id: string
          section: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          data?: Json
          id?: string
          lead_id?: string
          section?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_find_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          broker_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          max_uses: number | null
          target_role: string | null
          used_count: number
        }
        Insert: {
          broker_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          target_role?: string | null
          used_count?: number
        }
        Update: {
          broker_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          target_role?: string | null
          used_count?: number
        }
        Relationships: []
      }
      lead_applicants: {
        Row: {
          created_at: string
          display_order: number
          email: string | null
          employment_type: string | null
          id: string
          lead_id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          email?: string | null
          employment_type?: string | null
          id?: string
          lead_id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          email?: string | null
          employment_type?: string | null
          id?: string
          lead_id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_referrals: {
        Row: {
          created_at: string
          from_broker_id: string
          id: string
          lead_id: string
          message: string | null
          responded_at: string | null
          status: string
          to_broker_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_broker_id: string
          id?: string
          lead_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
          to_broker_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_broker_id?: string
          id?: string
          lead_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          to_broker_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_default: boolean
          label: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean
          label: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean
          label?: string
          name?: string
        }
        Relationships: []
      }
      lead_statuses: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          label: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          label: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          broker_id: string | null
          company_commission: number | null
          company_commission_paid: boolean | null
          company_commission_type: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          loan_amount: number | null
          loan_purpose: string | null
          original_broker_id: string | null
          phone: string | null
          portal_mode: string
          referral_partner_id: string | null
          referrer_commission: number | null
          referrer_commission_paid: boolean | null
          referrer_commission_type: string | null
          source: string | null
          source_contact_id: string | null
          status: string
          updated_at: string
          wip_status: string | null
        }
        Insert: {
          broker_id?: string | null
          company_commission?: number | null
          company_commission_paid?: boolean | null
          company_commission_type?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          loan_amount?: number | null
          loan_purpose?: string | null
          original_broker_id?: string | null
          phone?: string | null
          portal_mode?: string
          referral_partner_id?: string | null
          referrer_commission?: number | null
          referrer_commission_paid?: boolean | null
          referrer_commission_type?: string | null
          source?: string | null
          source_contact_id?: string | null
          status?: string
          updated_at?: string
          wip_status?: string | null
        }
        Update: {
          broker_id?: string | null
          company_commission?: number | null
          company_commission_paid?: boolean | null
          company_commission_type?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          loan_amount?: number | null
          loan_purpose?: string | null
          original_broker_id?: string | null
          phone?: string | null
          portal_mode?: string
          referral_partner_id?: string | null
          referrer_commission?: number | null
          referrer_commission_paid?: boolean | null
          referrer_commission_type?: string | null
          source?: string | null
          source_contact_id?: string | null
          status?: string
          updated_at?: string
          wip_status?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          lead_id: string
          notify_partner: boolean | null
          task_id: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          lead_id: string
          notify_partner?: boolean | null
          task_id?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          notify_partner?: boolean | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          broker_id: string | null
          broker_notes: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          custom_fields: Json | null
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          interests: string | null
          is_director: boolean
          license_number: string | null
          phone: string | null
          spouse_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          broker_id?: string | null
          broker_notes?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interests?: string | null
          is_director?: boolean
          license_number?: string | null
          phone?: string | null
          spouse_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          broker_id?: string | null
          broker_notes?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          interests?: string | null
          is_director?: boolean
          license_number?: string | null
          phone?: string | null
          spouse_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_targets: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          target_amount: number
          target_month: number | null
          target_period: string
          target_year: number
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          target_amount?: number
          target_month?: number | null
          target_period?: string
          target_year: number
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          target_amount?: number
          target_month?: number | null
          target_period?: string
          target_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          aggregator_split: number | null
          application_type: string | null
          broker_id: string
          client_name: string
          commission_earned: number | null
          contact_name: string | null
          created_at: string
          discharge_completed: boolean | null
          id: string
          lead_source: string | null
          lender: string | null
          lending_assistant_id: string | null
          loan_amount: number
          net_to_broker: number | null
          notes: string | null
          pre_settlement_check_completed: boolean | null
          security_address: string | null
          settlement_date: string
          status: string
          trail_value: number | null
          updated_at: string
          upfront_commission: number | null
        }
        Insert: {
          aggregator_split?: number | null
          application_type?: string | null
          broker_id: string
          client_name: string
          commission_earned?: number | null
          contact_name?: string | null
          created_at?: string
          discharge_completed?: boolean | null
          id?: string
          lead_source?: string | null
          lender?: string | null
          lending_assistant_id?: string | null
          loan_amount?: number
          net_to_broker?: number | null
          notes?: string | null
          pre_settlement_check_completed?: boolean | null
          security_address?: string | null
          settlement_date: string
          status?: string
          trail_value?: number | null
          updated_at?: string
          upfront_commission?: number | null
        }
        Update: {
          aggregator_split?: number | null
          application_type?: string | null
          broker_id?: string
          client_name?: string
          commission_earned?: number | null
          contact_name?: string | null
          created_at?: string
          discharge_completed?: boolean | null
          id?: string
          lead_source?: string | null
          lender?: string | null
          lending_assistant_id?: string | null
          loan_amount?: number
          net_to_broker?: number | null
          notes?: string | null
          pre_settlement_check_completed?: boolean | null
          security_address?: string | null
          settlement_date?: string
          status?: string
          trail_value?: number | null
          updated_at?: string
          upfront_commission?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_scenarios: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          outputs: Json
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          outputs?: Json
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          outputs?: Json
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_visibility: {
        Row: {
          is_enabled: boolean
          tool_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          is_enabled?: boolean
          tool_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          is_enabled?: boolean
          tool_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_lead_referral: {
        Args: { _referral_id: string }
        Returns: undefined
      }
      decline_lead_referral: {
        Args: { _referral_id: string }
        Returns: undefined
      }
      get_director_company_id: { Args: { _user_id: string }; Returns: string }
      get_my_broker_id: { Args: { _user_id: string }; Returns: string }
      has_any_super_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_broker_or_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_referral_access: {
        Args: { _lead_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "broker" | "referral_partner" | "super_admin" | "broker_staff"
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
      app_role: ["broker", "referral_partner", "super_admin", "broker_staff"],
    },
  },
} as const
