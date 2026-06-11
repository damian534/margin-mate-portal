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
      broker_email_settings: {
        Row: {
          auto_suppress_bounces: boolean
          broker_id: string
          claude_default_prompt: string | null
          claude_webhook_enabled: boolean
          claude_webhook_secret: string | null
          claude_webhook_url: string | null
          created_at: string
          milestone_bcc_email: string | null
          updated_at: string
          zapier_new_lead_webhook_url: string | null
        }
        Insert: {
          auto_suppress_bounces?: boolean
          broker_id: string
          claude_default_prompt?: string | null
          claude_webhook_enabled?: boolean
          claude_webhook_secret?: string | null
          claude_webhook_url?: string | null
          created_at?: string
          milestone_bcc_email?: string | null
          updated_at?: string
          zapier_new_lead_webhook_url?: string | null
        }
        Update: {
          auto_suppress_bounces?: boolean
          broker_id?: string
          claude_default_prompt?: string | null
          claude_webhook_enabled?: boolean
          claude_webhook_secret?: string | null
          claude_webhook_url?: string | null
          created_at?: string
          milestone_bcc_email?: string | null
          updated_at?: string
          zapier_new_lead_webhook_url?: string | null
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
      company_notes: {
        Row: {
          author_id: string | null
          broker_id: string
          company_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          broker_id: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          broker_id?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_reminders: {
        Row: {
          broker_id: string
          company_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          company_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          company_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          broker_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          metric: string
          name: string
          prize: string
          prize_amount: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          metric?: string
          name: string
          prize: string
          prize_amount?: number | null
          start_date: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          metric?: string
          name?: string
          prize?: string
          prize_amount?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          audience_tags: string[]
          co_applicant_contact_id: string | null
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          email_opt_out: boolean
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          audience_tags?: string[]
          co_applicant_contact_id?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_opt_out?: boolean
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          audience_tags?: string[]
          co_applicant_contact_id?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_opt_out?: boolean
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_co_applicant_contact_id_fkey"
            columns: ["co_applicant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reminder_sends: {
        Row: {
          day_offset: number
          error: string | null
          id: string
          lead_id: string
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          sent_at: string
        }
        Insert: {
          day_offset: number
          error?: string | null
          id?: string
          lead_id: string
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string
        }
        Update: {
          day_offset?: number
          error?: string | null
          id?: string
          lead_id?: string
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string
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
          is_mir: boolean
          lead_id: string
          mir_batch_id: string | null
          mir_requested_at: string | null
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
          is_mir?: boolean
          lead_id: string
          mir_batch_id?: string | null
          mir_requested_at?: string | null
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
          is_mir?: boolean
          lead_id?: string
          mir_batch_id?: string | null
          mir_requested_at?: string | null
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
      email_campaign_sends: {
        Row: {
          broker_id: string
          campaign_id: string
          created_at: string
          error: string | null
          id: string
          recipient_email: string
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string
          resend_id: string | null
          sent_at: string | null
          status: string
          unsubscribe_token: string | null
        }
        Insert: {
          broker_id: string
          campaign_id: string
          created_at?: string
          error?: string | null
          id?: string
          recipient_email: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribe_token?: string | null
        }
        Update: {
          broker_id?: string
          campaign_id?: string
          created_at?: string
          error?: string | null
          id?: string
          recipient_email?: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribe_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_sources: string[]
          audience_tags: string[]
          body_html: string
          broker_id: string
          created_at: string
          created_by: string
          failed_count: number
          from_email: string | null
          from_name: string | null
          id: string
          name: string
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          audience_sources?: string[]
          audience_tags?: string[]
          body_html?: string
          broker_id: string
          created_at?: string
          created_by: string
          failed_count?: number
          from_email?: string | null
          from_name?: string | null
          id?: string
          name: string
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          audience_sources?: string[]
          audience_tags?: string[]
          body_html?: string
          broker_id?: string
          created_at?: string
          created_by?: string
          failed_count?: number
          from_email?: string | null
          from_name?: string | null
          id?: string
          name?: string
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          broker_id: string
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          metadata: Json | null
          occurred_at: string
          recipient_email: string
          send_id: string | null
          user_agent: string | null
        }
        Insert: {
          broker_id: string
          campaign_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          metadata?: Json | null
          occurred_at?: string
          recipient_email: string
          send_id?: string | null
          user_agent?: string | null
        }
        Update: {
          broker_id?: string
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          metadata?: Json | null
          occurred_at?: string
          recipient_email?: string
          send_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_campaign_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          broker_id: string
          created_at: string
          email: string
          id: string
          notes: string | null
          reason: string
          source_campaign_id: string | null
        }
        Insert: {
          broker_id: string
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          reason: string
          source_campaign_id?: string | null
        }
        Update: {
          broker_id?: string
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          reason?: string
          source_campaign_id?: string | null
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
          company_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          max_uses: number | null
          profile_id: string | null
          target_role: string | null
          used_count: number
        }
        Insert: {
          broker_id: string
          code: string
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          profile_id?: string | null
          target_role?: string | null
          used_count?: number
        }
        Update: {
          broker_id?: string
          code?: string
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          profile_id?: string | null
          target_role?: string | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      lead_finance_extensions: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          message: string | null
          previous_due_date: string | null
          proposed_new_date: string | null
          recipient_contact_id: string | null
          recipient_email: string
          recipient_name: string | null
          recipient_role: string | null
          requested_by: string | null
          requested_days: number
          resend_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          message?: string | null
          previous_due_date?: string | null
          proposed_new_date?: string | null
          recipient_contact_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          recipient_role?: string | null
          requested_by?: string | null
          requested_days: number
          resend_id?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          message?: string | null
          previous_due_date?: string | null
          proposed_new_date?: string | null
          recipient_contact_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          recipient_role?: string | null
          requested_by?: string | null
          requested_days?: number
          resend_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      lead_pre_approval_conditions: {
        Row: {
          completed: boolean
          created_at: string
          display_order: number
          id: string
          label: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          display_order?: number
          id?: string
          label: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_pre_approval_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          lead_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          lead_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          lead_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      lead_professional_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          role: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          role?: string
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
          approved_date: string | null
          assigned_to: string | null
          broker_id: string | null
          co_applicant_contact_id: string | null
          co_applicant_contact_id_2: string | null
          co_applicant_contact_id_3: string | null
          company_commission: number | null
          company_commission_paid: boolean | null
          company_commission_type: string | null
          created_at: string
          custom_fields: Json | null
          doc_reminders_paused: boolean
          email: string | null
          estimated_settlement_date: string | null
          excluded_from_competition: boolean
          finance_due_date: string | null
          first_name: string
          id: string
          last_name: string
          lead_sort_order: number | null
          loan_amount: number | null
          loan_purpose: string | null
          lodged_date: string | null
          opportunity_name: string | null
          original_broker_id: string | null
          phone: string | null
          portal_mode: string
          pre_approval_expiry_date: string | null
          pre_approval_ftc: number | null
          pre_approval_loan_amount: number | null
          pre_approval_purchase_price: number | null
          referral_partner_id: string | null
          referred_by_contact_id: string | null
          referrer_commission: number | null
          referrer_commission_paid: boolean | null
          referrer_commission_type: string | null
          settled_date: string | null
          source: string | null
          source_contact_id: string | null
          status: string
          subject_to_finance: boolean
          updated_at: string
          wip_sort_order: number | null
          wip_status: string | null
        }
        Insert: {
          approved_date?: string | null
          assigned_to?: string | null
          broker_id?: string | null
          co_applicant_contact_id?: string | null
          co_applicant_contact_id_2?: string | null
          co_applicant_contact_id_3?: string | null
          company_commission?: number | null
          company_commission_paid?: boolean | null
          company_commission_type?: string | null
          created_at?: string
          custom_fields?: Json | null
          doc_reminders_paused?: boolean
          email?: string | null
          estimated_settlement_date?: string | null
          excluded_from_competition?: boolean
          finance_due_date?: string | null
          first_name: string
          id?: string
          last_name: string
          lead_sort_order?: number | null
          loan_amount?: number | null
          loan_purpose?: string | null
          lodged_date?: string | null
          opportunity_name?: string | null
          original_broker_id?: string | null
          phone?: string | null
          portal_mode?: string
          pre_approval_expiry_date?: string | null
          pre_approval_ftc?: number | null
          pre_approval_loan_amount?: number | null
          pre_approval_purchase_price?: number | null
          referral_partner_id?: string | null
          referred_by_contact_id?: string | null
          referrer_commission?: number | null
          referrer_commission_paid?: boolean | null
          referrer_commission_type?: string | null
          settled_date?: string | null
          source?: string | null
          source_contact_id?: string | null
          status?: string
          subject_to_finance?: boolean
          updated_at?: string
          wip_sort_order?: number | null
          wip_status?: string | null
        }
        Update: {
          approved_date?: string | null
          assigned_to?: string | null
          broker_id?: string | null
          co_applicant_contact_id?: string | null
          co_applicant_contact_id_2?: string | null
          co_applicant_contact_id_3?: string | null
          company_commission?: number | null
          company_commission_paid?: boolean | null
          company_commission_type?: string | null
          created_at?: string
          custom_fields?: Json | null
          doc_reminders_paused?: boolean
          email?: string | null
          estimated_settlement_date?: string | null
          excluded_from_competition?: boolean
          finance_due_date?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lead_sort_order?: number | null
          loan_amount?: number | null
          loan_purpose?: string | null
          lodged_date?: string | null
          opportunity_name?: string | null
          original_broker_id?: string | null
          phone?: string | null
          portal_mode?: string
          pre_approval_expiry_date?: string | null
          pre_approval_ftc?: number | null
          pre_approval_loan_amount?: number | null
          pre_approval_purchase_price?: number | null
          referral_partner_id?: string | null
          referred_by_contact_id?: string | null
          referrer_commission?: number | null
          referrer_commission_paid?: boolean | null
          referrer_commission_type?: string | null
          settled_date?: string | null
          source?: string | null
          source_contact_id?: string | null
          status?: string
          subject_to_finance?: boolean
          updated_at?: string
          wip_sort_order?: number | null
          wip_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_co_applicant_contact_id_fkey"
            columns: ["co_applicant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lenders: {
        Row: {
          app_pack_esign: string | null
          bdm_email: string | null
          bdm_name: string | null
          bdm_phone: string | null
          broker_code: string | null
          broker_id: string
          created_at: string
          deals_in_progress: string | null
          discharge_email: string | null
          display_order: number
          fastrefi_eligibility: string | null
          id: string
          is_accredited: boolean
          is_active: boolean
          login_id: string | null
          login_password: string | null
          mortgage_docs_esign: string | null
          name: string
          notes: string | null
          progress_payments: string | null
          settlement_conditions: string | null
          supporting_docs_email: string | null
          updated_at: string
        }
        Insert: {
          app_pack_esign?: string | null
          bdm_email?: string | null
          bdm_name?: string | null
          bdm_phone?: string | null
          broker_code?: string | null
          broker_id: string
          created_at?: string
          deals_in_progress?: string | null
          discharge_email?: string | null
          display_order?: number
          fastrefi_eligibility?: string | null
          id?: string
          is_accredited?: boolean
          is_active?: boolean
          login_id?: string | null
          login_password?: string | null
          mortgage_docs_esign?: string | null
          name: string
          notes?: string | null
          progress_payments?: string | null
          settlement_conditions?: string | null
          supporting_docs_email?: string | null
          updated_at?: string
        }
        Update: {
          app_pack_esign?: string | null
          bdm_email?: string | null
          bdm_name?: string | null
          bdm_phone?: string | null
          broker_code?: string | null
          broker_id?: string
          created_at?: string
          deals_in_progress?: string | null
          discharge_email?: string | null
          display_order?: number
          fastrefi_eligibility?: string | null
          id?: string
          is_accredited?: boolean
          is_active?: boolean
          login_id?: string | null
          login_password?: string | null
          mortgage_docs_esign?: string | null
          name?: string
          notes?: string | null
          progress_payments?: string | null
          settlement_conditions?: string | null
          supporting_docs_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loan_splits: {
        Row: {
          amount: number | null
          application_id: string | null
          created_at: string
          display_order: number
          id: string
          lead_id: string
          lender: string | null
          loan_purpose: string | null
          security_address: string | null
          settled: boolean
          settled_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          application_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          lead_id: string
          lender?: string | null
          loan_purpose?: string | null
          security_address?: string | null
          settled?: boolean
          settled_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          application_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          lead_id?: string
          lender?: string | null
          loan_purpose?: string | null
          security_address?: string | null
          settled?: boolean
          settled_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meeting_notes: {
        Row: {
          broker_id: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          meeting_date: string
          summary_markdown: string | null
          summary_status: string
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          meeting_date?: string
          summary_markdown?: string | null
          summary_status?: string
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          meeting_date?: string
          summary_markdown?: string | null
          summary_status?: string
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      milestone_email_templates: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          body: string
          broker_id: string
          created_at: string
          enabled: boolean
          id: string
          is_custom: boolean
          label: string | null
          milestone: string
          subject: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          broker_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          is_custom?: boolean
          label?: string | null
          milestone: string
          subject?: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          broker_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          is_custom?: boolean
          label?: string | null
          milestone?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      mir_requests: {
        Row: {
          created_at: string
          document_count: number
          from_email: string
          from_name: string | null
          id: string
          lead_id: string
          lender: string | null
          message: string | null
          recipient_emails: string[]
          requested_at: string
          requested_by: string | null
        }
        Insert: {
          created_at?: string
          document_count?: number
          from_email: string
          from_name?: string | null
          id?: string
          lead_id: string
          lender?: string | null
          message?: string | null
          recipient_emails?: string[]
          requested_at?: string
          requested_by?: string | null
        }
        Update: {
          created_at?: string
          document_count?: number
          from_email?: string
          from_name?: string | null
          id?: string
          lead_id?: string
          lender?: string | null
          message?: string | null
          recipient_emails?: string[]
          requested_at?: string
          requested_by?: string | null
        }
        Relationships: []
      }
      note_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          lead_id: string
          mime_type: string | null
          note_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          lead_id: string
          mime_type?: string | null
          note_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          lead_id?: string
          mime_type?: string | null
          note_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          lead_id: string
          notify_partner: boolean | null
          pinned: boolean
          task_id: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          lead_id: string
          notify_partner?: boolean | null
          pinned?: boolean
          task_id?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          notify_partner?: boolean | null
          pinned?: boolean
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
          audience_tags: string[]
          broker_id: string | null
          broker_notes: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          custom_fields: Json | null
          date_of_birth: string | null
          email: string | null
          email_opt_out: boolean
          email_signature: string | null
          email_signature_image_url: string | null
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
          audience_tags?: string[]
          broker_id?: string | null
          broker_notes?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          email_opt_out?: boolean
          email_signature?: string | null
          email_signature_image_url?: string | null
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
          audience_tags?: string[]
          broker_id?: string | null
          broker_notes?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          email_opt_out?: boolean
          email_signature?: string | null
          email_signature_image_url?: string | null
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
      task_templates: {
        Row: {
          broker_id: string
          checklist_items: Json
          created_at: string
          display_order: number
          due_in_days: number | null
          id: string
          name: string
          task_title: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          checklist_items?: Json
          created_at?: string
          display_order?: number
          due_in_days?: number | null
          id?: string
          name: string
          task_title: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          checklist_items?: Json
          created_at?: string
          display_order?: number
          due_in_days?: number | null
          id?: string
          name?: string
          task_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          checklist_items: Json
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: number | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          checklist_items?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: number | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          checklist_items?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: number | null
          sort_order?: number | null
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
      wip_statuses: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _audit_actor: { Args: never; Returns: string }
      accept_lead_referral: {
        Args: { _referral_id: string }
        Returns: undefined
      }
      can_view_referrer_profile_for_referred_lead: {
        Args: {
          _profile_id: string
          _profile_user_id: string
          _viewer_id: string
        }
        Returns: boolean
      }
      decline_lead_referral: {
        Args: { _referral_id: string }
        Returns: undefined
      }
      get_director_company_id: { Args: { _user_id: string }; Returns: string }
      get_invite_preview: {
        Args: { _code: string }
        Returns: {
          company_id: string
          company_name: string
          email: string
          full_name: string
          is_valid: boolean
          target_role: string
        }[]
      }
      get_my_broker_id: { Args: { _user_id: string }; Returns: string }
      get_or_create_company_invite_code: {
        Args: { _company_id: string }
        Returns: {
          code: string
          id: string
          used_count: number
        }[]
      }
      get_user_tenant_broker_id: { Args: { _user_id: string }; Returns: string }
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
      validate_invite_code: {
        Args: { _code: string }
        Returns: {
          is_valid: boolean
          target_role: string
        }[]
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
