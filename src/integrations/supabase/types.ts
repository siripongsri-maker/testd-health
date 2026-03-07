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
      admin_requests: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_daily_summary: {
        Row: {
          created_at: string
          date: string
          id: string
          total_pageviews: number
          total_visitors: number
          unique_sessions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          total_pageviews?: number
          total_visitors?: number
          unique_sessions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          total_pageviews?: number
          total_visitors?: number
          unique_sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          page_path: string
          referrer: string | null
          session_duration_seconds: number | null
          session_ended_at: string | null
          session_id: string | null
          session_started_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          page_path: string
          referrer?: string | null
          session_duration_seconds?: number | null
          session_ended_at?: string | null
          session_id?: string | null
          session_started_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          page_path?: string
          referrer?: string | null
          session_duration_seconds?: number | null
          session_ended_at?: string | null
          session_id?: string | null
          session_started_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_feature_flags: {
        Row: {
          enabled: boolean
          flag_key: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          flag_key: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          flag_key?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_release_controls: {
        Row: {
          build_time: string | null
          created_at: string
          hard_update_min_version: string | null
          id: string
          is_hard_update: boolean
          latest_version: string
          message_en: string | null
          message_th: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          build_time?: string | null
          created_at?: string
          hard_update_min_version?: string | null
          id?: string
          is_hard_update?: boolean
          latest_version?: string
          message_en?: string | null
          message_th?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          build_time?: string | null
          created_at?: string
          hard_update_min_version?: string | null
          id?: string
          is_hard_update?: boolean
          latest_version?: string
          message_en?: string | null
          message_th?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      appointment_logs: {
        Row: {
          action: string
          appointment_id: string
          created_at: string
          details: string | null
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          appointment_id: string
          created_at?: string
          details?: string | null
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          appointment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          service_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          service_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "booking_services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          arrived_at: string | null
          attended_by: string | null
          auto_checked_out_at: string | null
          branch_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_out_at: string | null
          completed_at: string | null
          contact_email: string | null
          contact_line: string | null
          contact_phone: string | null
          created_at: string
          duration_minutes: number | null
          feedback: string | null
          guest_access_created_at: string | null
          guest_access_expires_at: string | null
          guest_access_hash: string | null
          id: string
          notes: string | null
          rating: number | null
          referral_code: string | null
          service_id: string | null
          source: string
          staff_notes: string | null
          start_time: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointment_date: string
          arrived_at?: string | null
          attended_by?: string | null
          auto_checked_out_at?: string | null
          branch_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_out_at?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_line?: string | null
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number | null
          feedback?: string | null
          guest_access_created_at?: string | null
          guest_access_expires_at?: string | null
          guest_access_hash?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          referral_code?: string | null
          service_id?: string | null
          source?: string
          staff_notes?: string | null
          start_time: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointment_date?: string
          arrived_at?: string | null
          attended_by?: string | null
          auto_checked_out_at?: string | null
          branch_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_out_at?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_line?: string | null
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number | null
          feedback?: string | null
          guest_access_created_at?: string | null
          guest_access_expires_at?: string | null
          guest_access_hash?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          referral_code?: string | null
          service_id?: string | null
          source?: string
          staff_notes?: string | null
          start_time?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "booking_services"
            referencedColumns: ["id"]
          },
        ]
      }
      article_comments: {
        Row: {
          article_id: string
          author_name: string | null
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          content_en: string | null
          content_th: string | null
          cover_url: string | null
          created_at: string | null
          excerpt_en: string | null
          excerpt_th: string | null
          id: string
          like_count: number | null
          published_at: string | null
          rejection_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          title_en: string
          title_th: string
          updated_at: string | null
          video_url: string | null
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content_en?: string | null
          content_th?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt_en?: string | null
          excerpt_th?: string | null
          id?: string
          like_count?: number | null
          published_at?: string | null
          rejection_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          title_en: string
          title_th: string
          updated_at?: string | null
          video_url?: string | null
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content_en?: string | null
          content_th?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt_en?: string | null
          excerpt_th?: string | null
          id?: string
          like_count?: number | null
          published_at?: string | null
          rejection_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          title_en?: string
          title_th?: string
          updated_at?: string | null
          video_url?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description_en: string | null
          description_th: string | null
          display_order: number
          icon: string
          id: string
          name_en: string
          name_th: string
          slug: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          icon?: string
          id?: string
          name_en: string
          name_th: string
          slug: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          icon?: string
          id?: string
          name_en?: string
          name_th?: string
          slug?: string
        }
        Relationships: []
      }
      booking_attributions: {
        Row: {
          attribution_type: string | null
          booking_id: string | null
          created_at: string
          id: string
          invite_id: string | null
          is_test_mode: boolean
          session_id: string | null
          visitor_session_id: string | null
        }
        Insert: {
          attribution_type?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          invite_id?: string | null
          is_test_mode?: boolean
          session_id?: string | null
          visitor_session_id?: string | null
        }
        Update: {
          attribution_type?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          invite_id?: string | null
          is_test_mode?: boolean
          session_id?: string | null
          visitor_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_attributions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "partner_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_blackouts: {
        Row: {
          applies_to_branch_ids: string[] | null
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          is_all_day: boolean
          reason: string | null
          scope: string
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          applies_to_branch_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          is_all_day?: boolean
          reason?: string | null
          scope?: string
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          applies_to_branch_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          is_all_day?: boolean
          reason?: string | null
          scope?: string
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_branches: {
        Row: {
          address_en: string | null
          address_th: string | null
          close_time: string
          counselor_count: number
          created_at: string
          google_maps_url: string | null
          google_photo_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          name_en: string
          name_th: string
          open_days: number[]
          open_time: string
          phone: string | null
          slot_duration_minutes: number
          slug: string
          updated_at: string
        }
        Insert: {
          address_en?: string | null
          address_th?: string | null
          close_time?: string
          counselor_count?: number
          created_at?: string
          google_maps_url?: string | null
          google_photo_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_th: string
          open_days?: number[]
          open_time?: string
          phone?: string | null
          slot_duration_minutes?: number
          slug: string
          updated_at?: string
        }
        Update: {
          address_en?: string | null
          address_th?: string | null
          close_time?: string
          counselor_count?: number
          created_at?: string
          google_maps_url?: string | null
          google_photo_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_th?: string
          open_days?: number[]
          open_time?: string
          phone?: string | null
          slot_duration_minutes?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_rate_logs: {
        Row: {
          action: string
          actor_type: string
          branch_id: string | null
          contact_phone_hash: string | null
          created_at: string
          id: string
          meta: Json | null
          reason_code: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_type?: string
          branch_id?: string | null
          contact_phone_hash?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          reason_code?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          branch_id?: string | null
          contact_phone_hash?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          reason_code?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_rate_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          created_at: string
          description_en: string | null
          description_th: string | null
          display_order: number
          external_price_url: string | null
          icon: string
          id: string
          is_active: boolean
          is_free_global_fund: boolean
          is_free_pep_thai: boolean
          is_free_thai: boolean
          name_en: string
          name_th: string
          slug: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          external_price_url?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_free_global_fund?: boolean
          is_free_pep_thai?: boolean
          is_free_thai?: boolean
          name_en: string
          name_th: string
          slug: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          external_price_url?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_free_global_fund?: boolean
          is_free_pep_thai?: boolean
          is_free_thai?: boolean
          name_en?: string
          name_th?: string
          slug?: string
        }
        Relationships: []
      }
      branch_working_hours: {
        Row: {
          branch_id: string
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string
          slot_minutes: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string
          slot_minutes?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string
          slot_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_working_hours_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          nickname: string
          room_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          nickname: string
          room_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          nickname?: string
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          description_en: string
          description_th: string
          icon: string
          id: string
          is_active: boolean | null
          name_en: string
          name_th: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description_en: string
          description_th: string
          icon: string
          id?: string
          is_active?: boolean | null
          name_en: string
          name_th: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description_en?: string
          description_th?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_th?: string
          slug?: string
        }
        Relationships: []
      }
      consultation_forms: {
        Row: {
          created_at: string | null
          id: string
          prevention_use: string | null
          questions: string[] | null
          recent_testing: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          prevention_use?: string | null
          questions?: string[] | null
          recent_testing?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          prevention_use?: string | null
          questions?: string[] | null
          recent_testing?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      export_audit_logs: {
        Row: {
          batch_id: string | null
          export_type: string
          exported_at: string
          filters: Json | null
          id: string
          is_full_export: boolean
          row_count: number | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          export_type: string
          exported_at?: string
          filters?: Json | null
          id?: string
          is_full_export?: boolean
          row_count?: number | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          export_type?: string
          exported_at?: string
          filters?: Json | null
          id?: string
          is_full_export?: boolean
          row_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_audit_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "selftest_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_lookup_attempts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_hint: string | null
          referral_code: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_hint?: string | null
          referral_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_hint?: string | null
          referral_code?: string | null
        }
        Relationships: []
      }
      hall_of_fame: {
        Row: {
          avatar_url: string | null
          captured_at: string
          category: string
          display_name: string | null
          id: string
          score: number
          season_key: string
          season_label: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          captured_at?: string
          category?: string
          display_name?: string | null
          id?: string
          score?: number
          season_key: string
          season_label: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          captured_at?: string
          category?: string
          display_name?: string | null
          id?: string
          score?: number
          season_key?: string
          season_label?: string
          user_id?: string
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          pep_history: Json | null
          prep_history: Json | null
          side_effects: Json | null
          testing_history: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          pep_history?: Json | null
          prep_history?: Json | null
          side_effects?: Json | null
          testing_history?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          pep_history?: Json | null
          prep_history?: Json | null
          side_effects?: Json | null
          testing_history?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hiv_self_test_checks: {
        Row: {
          artifact_risk: string | null
          confidence: number
          control_line_present: boolean | null
          created_at: string
          id: string
          image_path: string
          outcome: string
          reasoning_short: string | null
          test_line_present: boolean | null
          test_line_strength: string | null
          user_id: string | null
          user_marked_wrong: boolean | null
          user_note: string | null
        }
        Insert: {
          artifact_risk?: string | null
          confidence: number
          control_line_present?: boolean | null
          created_at?: string
          id?: string
          image_path: string
          outcome: string
          reasoning_short?: string | null
          test_line_present?: boolean | null
          test_line_strength?: string | null
          user_id?: string | null
          user_marked_wrong?: boolean | null
          user_note?: string | null
        }
        Update: {
          artifact_risk?: string | null
          confidence?: number
          control_line_present?: boolean | null
          created_at?: string
          id?: string
          image_path?: string
          outcome?: string
          reasoning_short?: string | null
          test_line_present?: boolean | null
          test_line_strength?: string | null
          user_id?: string | null
          user_marked_wrong?: boolean | null
          user_note?: string | null
        }
        Relationships: []
      }
      hiv_selftest_requests: {
        Row: {
          abuse_checked_at: string | null
          abuse_flag: boolean | null
          abuse_reason: string | null
          abuse_score: number | null
          address: string | null
          address_fp: string | null
          assigned_branch: string | null
          callback_phone: string | null
          created_at: string
          days_since_risk: number | null
          full_name: string | null
          id: string
          last_risk_date: string | null
          line_id: string | null
          name_address_fp: string | null
          name_fp: string | null
          phone: string | null
          pii_id: string | null
          postal_code: string | null
          province: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          result_photo_url: string | null
          staff_notes: string | null
          status: string
          test_result: string | null
          thai_id: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string
          wants_callback: boolean | null
        }
        Insert: {
          abuse_checked_at?: string | null
          abuse_flag?: boolean | null
          abuse_reason?: string | null
          abuse_score?: number | null
          address?: string | null
          address_fp?: string | null
          assigned_branch?: string | null
          callback_phone?: string | null
          created_at?: string
          days_since_risk?: number | null
          full_name?: string | null
          id?: string
          last_risk_date?: string | null
          line_id?: string | null
          name_address_fp?: string | null
          name_fp?: string | null
          phone?: string | null
          pii_id?: string | null
          postal_code?: string | null
          province?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          result_photo_url?: string | null
          staff_notes?: string | null
          status?: string
          test_result?: string | null
          thai_id?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          wants_callback?: boolean | null
        }
        Update: {
          abuse_checked_at?: string | null
          abuse_flag?: boolean | null
          abuse_reason?: string | null
          abuse_score?: number | null
          address?: string | null
          address_fp?: string | null
          assigned_branch?: string | null
          callback_phone?: string | null
          created_at?: string
          days_since_risk?: number | null
          full_name?: string | null
          id?: string
          last_risk_date?: string | null
          line_id?: string | null
          name_address_fp?: string | null
          name_fp?: string | null
          phone?: string | null
          pii_id?: string | null
          postal_code?: string | null
          province?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          result_photo_url?: string | null
          staff_notes?: string | null
          status?: string
          test_result?: string | null
          thai_id?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          wants_callback?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hiv_selftest_requests_pii_id_fkey"
            columns: ["pii_id"]
            isOneToOne: false
            referencedRelation: "selftest_pii"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_rewards: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          reward_description: string
          reward_image_url: string | null
          reward_title: string
          season_end_at: string | null
          status_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          reward_description?: string
          reward_image_url?: string | null
          reward_title: string
          season_end_at?: string | null
          status_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          reward_description?: string
          reward_image_url?: string | null
          reward_title?: string
          season_end_at?: string | null
          status_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kit_order_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_description: string | null
          event_type: string
          id: string
          is_admin_event: boolean | null
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_description?: string | null
          event_type: string
          id?: string
          is_admin_event?: boolean | null
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_description?: string | null
          event_type?: string
          id?: string
          is_admin_event?: boolean | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "kit_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_orders: {
        Row: {
          created_at: string
          created_by: string | null
          delivered_at: string | null
          display_name: string
          id: string
          internal_notes: string | null
          last_updated_by: string | null
          order_code: string
          order_type: string
          out_for_delivery_at: string | null
          packed_at: string | null
          received_at: string | null
          recipient_address: string
          recipient_name: string | null
          recipient_phone: string | null
          shipped_at: string | null
          shipping_carrier: string | null
          status: Database["public"]["Enums"]["kit_order_status"]
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          display_name?: string
          id?: string
          internal_notes?: string | null
          last_updated_by?: string | null
          order_code: string
          order_type?: string
          out_for_delivery_at?: string | null
          packed_at?: string | null
          received_at?: string | null
          recipient_address: string
          recipient_name?: string | null
          recipient_phone?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["kit_order_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          display_name?: string
          id?: string
          internal_notes?: string | null
          last_updated_by?: string | null
          order_code?: string
          order_type?: string
          out_for_delivery_at?: string | null
          packed_at?: string | null
          received_at?: string | null
          recipient_address?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["kit_order_status"]
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          captured_at: string
          display_name: string | null
          id: string
          level: number
          rank: number | null
          season_key: string
          streak: number
          user_id: string
          xp: number
        }
        Insert: {
          captured_at?: string
          display_name?: string | null
          id?: string
          level?: number
          rank?: number | null
          season_key: string
          streak?: number
          user_id: string
          xp?: number
        }
        Update: {
          captured_at?: string
          display_name?: string | null
          id?: string
          level?: number
          rank?: number | null
          season_key?: string
          streak?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      medication_checkins: {
        Row: {
          created_at: string
          date: string
          id: string
          medicine_id: string | null
          scheduled_time: string | null
          status: string
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          medicine_id?: string | null
          scheduled_time?: string | null
          status?: string
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          medicine_id?: string | null
          scheduled_time?: string | null
          status?: string
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_checkins_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "user_medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          appointment_id: string | null
          created_at: string
          email_masked: string | null
          id: string
          notification_type: string
          status: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          email_masked?: string | null
          id?: string
          notification_type: string
          status?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          email_masked?: string | null
          id?: string
          notification_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          dismissed: boolean | null
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          dismissed?: boolean | null
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          dismissed?: boolean | null
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          notification_type: string
          recipient_user_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          notification_type?: string
          recipient_user_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      partner_invite_abuse_flags: {
        Row: {
          abuse_type: string
          admin_note: string | null
          created_at: string
          evidence: Json
          id: string
          invite_id: string | null
          phone_hash: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          severity: string
          status: string
          user_id: string | null
          visitor_session_id: string | null
        }
        Insert: {
          abuse_type: string
          admin_note?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          invite_id?: string | null
          phone_hash?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          severity?: string
          status?: string
          user_id?: string | null
          visitor_session_id?: string | null
        }
        Update: {
          abuse_type?: string
          admin_note?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          invite_id?: string | null
          phone_hash?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          severity?: string
          status?: string
          user_id?: string | null
          visitor_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invite_abuse_flags_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "partner_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invite_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          invite_id: string
          is_test_mode: boolean
          visitor_session_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          invite_id: string
          is_test_mode?: boolean
          visitor_session_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          invite_id?: string
          is_test_mode?: boolean
          visitor_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invite_events_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "partner_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invite_relays: {
        Row: {
          block_reason: string | null
          created_at: string
          id: string
          invite_id: string
          is_test_mode: boolean
          metadata: Json
          provider: string | null
          provider_message_id: string | null
          recipient_hash: string
          relay_status: string
          relay_type: string
          updated_at: string
        }
        Insert: {
          block_reason?: string | null
          created_at?: string
          id?: string
          invite_id: string
          is_test_mode?: boolean
          metadata?: Json
          provider?: string | null
          provider_message_id?: string | null
          recipient_hash: string
          relay_status?: string
          relay_type: string
          updated_at?: string
        }
        Update: {
          block_reason?: string | null
          created_at?: string
          id?: string
          invite_id?: string
          is_test_mode?: boolean
          metadata?: Json
          provider?: string | null
          provider_message_id?: string | null
          recipient_hash?: string
          relay_status?: string
          relay_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invite_relays_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "partner_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invite_responses: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          response_state: string
          updated_at: string
          visitor_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          response_state: string
          updated_at?: string
          visitor_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          response_state?: string
          updated_at?: string
          visitor_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invite_responses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "partner_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invite_visits: {
        Row: {
          id: string
          invite_id: string
          referrer: string | null
          user_agent: string | null
          visited_at: string
          visitor_session_id: string
        }
        Insert: {
          id?: string
          invite_id: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_session_id: string
        }
        Update: {
          id?: string
          invite_id?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invite_visits_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "partner_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          invite_type: string
          is_active: boolean
          is_test_mode: boolean
          max_opens: number | null
          revoked_at: string | null
          status: string | null
          tone: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          invite_type?: string
          is_active?: boolean
          is_test_mode?: boolean
          max_opens?: number | null
          revoked_at?: string | null
          status?: string | null
          tone?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          invite_type?: string
          is_active?: boolean
          is_test_mode?: boolean
          max_opens?: number | null
          revoked_at?: string | null
          status?: string | null
          tone?: string
        }
        Relationships: []
      }
      partner_test_session_participants: {
        Row: {
          id: string
          joined_at: string
          participant_session_id: string
          session_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          participant_session_id: string
          session_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          participant_session_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_test_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "partner_test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_test_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          host_invite_id: string
          id: string
          is_test_mode: boolean
          max_participants: number
          pair_booking_count: number | null
          session_code: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          host_invite_id: string
          id?: string
          is_test_mode?: boolean
          max_participants?: number
          pair_booking_count?: number | null
          session_code: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          host_invite_id?: string
          id?: string
          is_test_mode?: boolean
          max_participants?: number
          pair_booking_count?: number | null
          session_code?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_test_sessions_host_invite_id_fkey"
            columns: ["host_invite_id"]
            isOneToOne: false
            referencedRelation: "partner_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      product_image_cache: {
        Row: {
          cached_at: string
          expires_at: string
          id: string
          image_url: string
          product_id: string
          shopee_link: string
        }
        Insert: {
          cached_at?: string
          expires_at?: string
          id?: string
          image_url: string
          product_id: string
          shopee_link: string
        }
        Update: {
          cached_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          product_id?: string
          shopee_link?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          created_at: string | null
          display_name: string | null
          id: string
          language: string | null
          last_check_in: string | null
          level: number | null
          mode: string | null
          pep_start_date: string | null
          prep_start_date: string | null
          prep_stop_date: string | null
          reminder_time: string | null
          streak: number | null
          theme: string | null
          trust_tier: string
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          created_at?: string | null
          display_name?: string | null
          id: string
          language?: string | null
          last_check_in?: string | null
          level?: number | null
          mode?: string | null
          pep_start_date?: string | null
          prep_start_date?: string | null
          prep_stop_date?: string | null
          reminder_time?: string | null
          streak?: number | null
          theme?: string | null
          trust_tier?: string
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          language?: string | null
          last_check_in?: string | null
          level?: number | null
          mode?: string | null
          pep_start_date?: string | null
          prep_start_date?: string | null
          prep_stop_date?: string | null
          reminder_time?: string | null
          streak?: number | null
          theme?: string | null
          trust_tier?: string
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quests: {
        Row: {
          badge_id: string
          created_at: string | null
          description_en: string
          description_th: string
          end_date: string | null
          id: string
          is_active: boolean | null
          quest_type: string
          reward_xp: number
          slug: string
          start_date: string | null
          target_count: number
          target_days: number
          title_en: string
          title_th: string
          trigger_type: string | null
        }
        Insert: {
          badge_id: string
          created_at?: string | null
          description_en: string
          description_th: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          quest_type: string
          reward_xp?: number
          slug: string
          start_date?: string | null
          target_count?: number
          target_days?: number
          title_en: string
          title_th: string
          trigger_type?: string | null
        }
        Update: {
          badge_id?: string
          created_at?: string | null
          description_en?: string
          description_th?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          quest_type?: string
          reward_xp?: number
          slug?: string
          start_date?: string | null
          target_count?: number
          target_days?: number
          title_en?: string
          title_th?: string
          trigger_type?: string | null
        }
        Relationships: []
      }
      release_control_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      risk_assessment_questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          options: Json
          question_en: string
          question_th: string
          recommended_services: string[]
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json
          question_en: string
          question_th: string
          recommended_services?: string[]
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json
          question_en?: string
          question_th?: string
          recommended_services?: string[]
        }
        Relationships: []
      }
      self_care_reminders: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          last_reminded_at: string | null
          reminder_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_reminded_at?: string | null
          reminder_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_reminded_at?: string | null
          reminder_type?: string
          user_id?: string
        }
        Relationships: []
      }
      selftest_abuse_logs: {
        Row: {
          action: string
          actor: string
          created_at: string | null
          id: string
          reason: string | null
          request_id: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          request_id: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selftest_abuse_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hiv_selftest_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      selftest_import_batches: {
        Row: {
          branch: string
          duplicate_rows: number
          error_rows: number
          filename: string
          id: string
          inserted_rows: number
          is_dry_run: boolean
          notes: string | null
          skipped_rows: number
          source_type: string
          status: string
          total_rows: number
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          branch: string
          duplicate_rows?: number
          error_rows?: number
          filename: string
          id?: string
          inserted_rows?: number
          is_dry_run?: boolean
          notes?: string | null
          skipped_rows?: number
          source_type?: string
          status?: string
          total_rows?: number
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          branch?: string
          duplicate_rows?: number
          error_rows?: number
          filename?: string
          id?: string
          inserted_rows?: number
          is_dry_run?: boolean
          notes?: string | null
          skipped_rows?: number
          source_type?: string
          status?: string
          total_rows?: number
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      selftest_import_rows: {
        Row: {
          batch_id: string
          error_message: string | null
          external_ref: string | null
          id: string
          outcome: string
          row_number: number
        }
        Insert: {
          batch_id: string
          error_message?: string | null
          external_ref?: string | null
          id?: string
          outcome?: string
          row_number: number
        }
        Update: {
          batch_id?: string
          error_message?: string | null
          external_ref?: string | null
          id?: string
          outcome?: string
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "selftest_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "selftest_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      selftest_pii: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          district: string | null
          full_name: string | null
          gender: string | null
          id: string
          line_id: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          subdistrict: string | null
          thai_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          line_id?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          subdistrict?: string | null
          thai_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          line_id?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          subdistrict?: string | null
          thai_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_credit_balances: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_credit_packages: {
        Row: {
          created_at: string
          credits: number
          description_en: string | null
          description_th: string | null
          display_order: number
          id: string
          is_active: boolean
          name_en: string
          name_th: string
          package_key: string
          price_thb: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name_en: string
          name_th: string
          package_key: string
          price_thb: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name_en?: string
          name_th?: string
          package_key?: string
          price_thb?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_credit_purchases: {
        Row: {
          amount_thb: number | null
          created_at: string
          credits: number
          id: string
          package_id: string | null
          package_key: string
          payment_provider: string | null
          payment_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_thb?: number | null
          created_at?: string
          credits: number
          id?: string
          package_id?: string | null
          package_key: string
          payment_provider?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_thb?: number | null
          created_at?: string
          credits?: number
          id?: string
          package_id?: string | null
          package_key?: string
          payment_provider?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_credit_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "sms_credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          metadata: Json
          relay_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          metadata?: Json
          relay_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          metadata?: Json
          relay_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_branch_assignments: {
        Row: {
          branch: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_th: string
          role: string
          staff_role: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_th: string
          role?: string
          staff_role?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_th?: string
          role?: string
          staff_role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer_options: Json | null
          answer_rating: number | null
          answer_text: string | null
          created_at: string
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_options?: Json | null
          answer_rating?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_options?: Json | null
          answer_rating?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_completions: {
        Row: {
          completed_at: string
          id: string
          session_id: string | null
          survey_id: string
          user_id: string | null
          xp_awarded: number
        }
        Insert: {
          completed_at?: string
          id?: string
          session_id?: string | null
          survey_id: string
          user_id?: string | null
          xp_awarded?: number
        }
        Update: {
          completed_at?: string
          id?: string
          session_id?: string | null
          survey_id?: string
          user_id?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_completions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_required: boolean | null
          options: Json | null
          question_text_en: string
          question_text_th: string
          question_type: string
          rating_label_max_en: string | null
          rating_label_max_th: string | null
          rating_label_min_en: string | null
          rating_label_min_th: string | null
          rating_max: number | null
          rating_min: number | null
          skip_condition: Json | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_text_en: string
          question_text_th: string
          question_type: string
          rating_label_max_en?: string | null
          rating_label_max_th?: string | null
          rating_label_min_en?: string | null
          rating_label_min_th?: string | null
          rating_max?: number | null
          rating_min?: number | null
          skip_condition?: Json | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_text_en?: string
          question_text_th?: string
          question_type?: string
          rating_label_max_en?: string | null
          rating_label_max_th?: string | null
          rating_label_min_en?: string | null
          rating_label_min_th?: string | null
          rating_max?: number | null
          rating_min?: number | null
          skip_condition?: Json | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completed_at: string | null
          consent_given: boolean | null
          consent_given_at: string | null
          created_at: string
          id: string
          is_anonymous: boolean | null
          session_id: string | null
          survey_id: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          session_id?: string | null
          survey_id: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          session_id?: string | null
          survey_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          allow_anonymous: boolean | null
          completion_count: number
          consent_text_en: string | null
          consent_text_th: string | null
          created_at: string
          created_by: string | null
          description_en: string | null
          description_th: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          is_hot: boolean
          is_native: boolean | null
          is_new: boolean
          max_responses: number | null
          rejection_feedback: string | null
          require_consent: boolean | null
          starts_at: string | null
          status: string
          submitted_at: string | null
          title_en: string
          title_th: string
          updated_at: string
          url: string
          view_count: number
          xp_reward: number
        }
        Insert: {
          allow_anonymous?: boolean | null
          completion_count?: number
          consent_text_en?: string | null
          consent_text_th?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_th?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_hot?: boolean
          is_native?: boolean | null
          is_new?: boolean
          max_responses?: number | null
          rejection_feedback?: string | null
          require_consent?: boolean | null
          starts_at?: string | null
          status?: string
          submitted_at?: string | null
          title_en: string
          title_th: string
          updated_at?: string
          url: string
          view_count?: number
          xp_reward?: number
        }
        Update: {
          allow_anonymous?: boolean | null
          completion_count?: number
          consent_text_en?: string | null
          consent_text_th?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_th?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_hot?: boolean
          is_native?: boolean | null
          is_new?: boolean
          max_responses?: number | null
          rejection_feedback?: string | null
          require_consent?: boolean | null
          starts_at?: string | null
          status?: string
          submitted_at?: string | null
          title_en?: string
          title_th?: string
          updated_at?: string
          url?: string
          view_count?: number
          xp_reward?: number
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string
          hash: string
          id: string
          is_locked: boolean
          key: string
          namespace: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hash: string
          id?: string
          is_locked?: boolean
          key: string
          namespace?: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hash?: string
          id?: string
          is_locked?: boolean
          key?: string
          namespace?: string
          source_lang?: string
          source_text?: string
          target_lang?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string | null
          id: string
          tag: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      user_medicines: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_personal_info: {
        Row: {
          created_at: string
          currently_on_art: boolean | null
          currently_on_pep: boolean | null
          currently_on_prep: boolean | null
          date_of_birth: string | null
          ever_tested_hiv: boolean | null
          gender: string | null
          has_multiple_partners: boolean | null
          id: string
          last_hiv_test_date: string | null
          last_hiv_test_result: string | null
          line_id: string | null
          partner_hiv_status: string | null
          phone: string | null
          prevention_preference: string | null
          profile_completed: boolean | null
          province: string | null
          sexual_orientation: string | null
          updated_at: string
          user_id: string
          uses_condoms_regularly: boolean | null
          uses_injection_drugs: boolean | null
        }
        Insert: {
          created_at?: string
          currently_on_art?: boolean | null
          currently_on_pep?: boolean | null
          currently_on_prep?: boolean | null
          date_of_birth?: string | null
          ever_tested_hiv?: boolean | null
          gender?: string | null
          has_multiple_partners?: boolean | null
          id?: string
          last_hiv_test_date?: string | null
          last_hiv_test_result?: string | null
          line_id?: string | null
          partner_hiv_status?: string | null
          phone?: string | null
          prevention_preference?: string | null
          profile_completed?: boolean | null
          province?: string | null
          sexual_orientation?: string | null
          updated_at?: string
          user_id: string
          uses_condoms_regularly?: boolean | null
          uses_injection_drugs?: boolean | null
        }
        Update: {
          created_at?: string
          currently_on_art?: boolean | null
          currently_on_pep?: boolean | null
          currently_on_prep?: boolean | null
          date_of_birth?: string | null
          ever_tested_hiv?: boolean | null
          gender?: string | null
          has_multiple_partners?: boolean | null
          id?: string
          last_hiv_test_date?: string | null
          last_hiv_test_result?: string | null
          line_id?: string | null
          partner_hiv_status?: string | null
          phone?: string | null
          prevention_preference?: string | null
          profile_completed?: boolean | null
          province?: string | null
          sexual_orientation?: string | null
          updated_at?: string
          user_id?: string
          uses_condoms_regularly?: boolean | null
          uses_injection_drugs?: boolean | null
        }
        Relationships: []
      }
      user_quests: {
        Row: {
          claimed_at: string | null
          completed: boolean | null
          completed_at: string | null
          id: string
          last_reset_at: string | null
          progress: number | null
          quest_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          last_reset_at?: string | null
          progress?: number | null
          quest_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          last_reset_at?: string | null
          progress?: number | null
          quest_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      hall_of_fame_public: {
        Row: {
          avatar_url: string | null
          captured_at: string | null
          category: string | null
          display_name: string | null
          id: string | null
          score: number | null
          season_key: string | null
          season_label: string | null
        }
        Insert: {
          avatar_url?: string | null
          captured_at?: string | null
          category?: string | null
          display_name?: string | null
          id?: string | null
          score?: number | null
          season_key?: string | null
          season_label?: string | null
        }
        Update: {
          avatar_url?: string | null
          captured_at?: string | null
          category?: string | null
          display_name?: string | null
          id?: string | null
          score?: number | null
          season_key?: string | null
          season_label?: string | null
        }
        Relationships: []
      }
      kit_order_tracking: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          display_name: string | null
          order_code: string | null
          out_for_delivery_at: string | null
          packed_at: string | null
          received_at: string | null
          shipped_at: string | null
          shipping_carrier: string | null
          status: Database["public"]["Enums"]["kit_order_status"] | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          display_name?: string | null
          order_code?: string | null
          out_for_delivery_at?: string | null
          packed_at?: string | null
          received_at?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["kit_order_status"] | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          display_name?: string | null
          order_code?: string | null
          out_for_delivery_at?: string | null
          packed_at?: string | null
          received_at?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["kit_order_status"] | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leaderboard_profiles: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          display_name: string | null
          id: string | null
          level: number | null
          streak: number | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          display_name?: string | null
          id?: string | null
          level?: number | null
          streak?: number | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          display_name?: string | null
          id?: string | null
          level?: number | null
          streak?: number | null
          xp?: number | null
        }
        Relationships: []
      }
      public_article_comments: {
        Row: {
          article_id: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          article_id?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          article_id?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_site_stats: {
        Row: {
          registered_user_pageviews: number | null
          total_pageviews: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      selftest_statistics: {
        Row: {
          age_range: string | null
          count: number | null
          gender: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_staff_note: {
        Args: { p_appointment_id: string; p_note: string }
        Returns: undefined
      }
      admin_grant_sms_credits: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: number
      }
      assign_staff_to_appointment: {
        Args: { p_appointment_id: string; p_staff_profile_id: string }
        Returns: undefined
      }
      auto_checkout_stale_appointments: {
        Args: { p_threshold_hours?: number }
        Returns: number
      }
      award_xp_to_user: {
        Args: { target_user_id: string; xp_amount: number }
        Returns: undefined
      }
      check_booking_rate_limit: {
        Args: {
          p_branch_id: string
          p_contact_phone: string
          p_is_staff?: boolean
          p_session_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      check_slot_available: {
        Args: { p_branch_id: string; p_date: string; p_time: string }
        Returns: boolean
      }
      claim_anonymous_appointments: {
        Args: { p_email: string; p_user_id: string }
        Returns: number
      }
      complete_sms_purchase: {
        Args: { p_payment_reference?: string; p_purchase_id: string }
        Returns: Json
      }
      complete_survey: {
        Args: { p_session_id?: string; p_survey_id: string }
        Returns: number
      }
      complete_walkin_service: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      count_booked_slots: {
        Args: { p_branch_id: string; p_date: string; p_time: string }
        Returns: number
      }
      create_anonymous_appointment: {
        Args: {
          p_appointment_date: string
          p_branch_id: string
          p_contact_email?: string
          p_contact_line?: string
          p_contact_phone?: string
          p_notes?: string
          p_service_ids: string[]
          p_start_time: string
        }
        Returns: Json
      }
      create_appointment_atomic: {
        Args: {
          p_appointment_date: string
          p_branch_id: string
          p_contact_email?: string
          p_contact_line?: string
          p_contact_phone?: string
          p_notes?: string
          p_services: string[]
          p_start_time: string
          p_user_id?: string
        }
        Returns: Json
      }
      create_partner_invite:
        | { Args: { p_invite_type: string; p_tone: string }; Returns: Json }
        | {
            Args: {
              p_invite_type: string
              p_is_test_mode?: boolean
              p_tone: string
            }
            Returns: Json
          }
      create_partner_sms_relay: {
        Args: {
          p_invite_id: string
          p_is_test_mode?: boolean
          p_phone_hash: string
        }
        Returns: string
      }
      create_sms_purchase: { Args: { p_package_key: string }; Returns: Json }
      create_walkin_appointment: {
        Args: { p_branch_id: string; p_notes?: string }
        Returns: Json
      }
      current_staff_profile: {
        Args: never
        Returns: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_th: string
          role: string
          staff_role: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "staff_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      deduct_sms_credit: {
        Args: { p_relay_id?: string; p_user_id: string }
        Returns: number
      }
      generate_guest_access_token: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      generate_order_code: { Args: never; Returns: string }
      get_admin_partner_invite_report:
        | {
            Args: { p_end_date?: string; p_start_date?: string }
            Returns: {
              accepted_count: number
              booked_count: number
              booking_cta: number
              bookings_completed: number
              completed_count: number
              created_at: string
              expires_at: string
              invite_id: string
              invite_type: string
              is_active: boolean
              kit_cta: number
              opens: number
              pair_booking_count: number
              pair_status: string
              plans_to_test_count: number
              selftest_requests: number
              sessions_joined: number
              status: string
              timer_completed: number
              tone: string
            }[]
          }
        | {
            Args: {
              p_end_date?: string
              p_include_test_mode?: boolean
              p_start_date?: string
            }
            Returns: {
              abuse_flag_count: number
              accepted_count: number
              booked_count: number
              booking_cta: number
              bookings_completed: number
              completed_count: number
              created_at: string
              expires_at: string
              invite_id: string
              invite_type: string
              inviter_trust_tier: string
              is_active: boolean
              is_test_mode: boolean
              kit_cta: number
              opens: number
              pair_booking_count: number
              pair_status: string
              plans_to_test_count: number
              selftest_requests: number
              sessions_joined: number
              sms_blocked: number
              sms_failed: number
              sms_sent: number
              status: string
              timer_completed: number
              tone: string
            }[]
          }
      get_appointment_density: {
        Args: { p_branch_id?: string; p_end_date: string; p_start_date: string }
        Returns: {
          appointment_date: string
          cancelled_count: number
          completed_count: number
          new_count: number
          returning_count: number
          total_count: number
        }[]
      }
      get_article_like_count: {
        Args: { p_article_id: string }
        Returns: number
      }
      get_available_slots: {
        Args: { p_branch_id: string; p_date: string }
        Returns: {
          blackout_title: string
          booked_count: number
          capacity: number
          closure_reason: string
          closure_title: string
          day_is_closed: boolean
          dbg_blackout_id: string
          dbg_slot_end: string
          dbg_slot_start: string
          is_available: boolean
          slot_time: string
        }[]
      }
      get_available_slots_dbg: {
        Args: { p_branch_id: string; p_date: string; p_debug?: boolean }
        Returns: {
          blackout_title: string
          booked_count: number
          capacity: number
          closure_reason: string
          closure_title: string
          day_is_closed: boolean
          dbg_blackout_id: string
          dbg_slot_end: string
          dbg_slot_start: string
          is_available: boolean
          slot_time: string
        }[]
      }
      get_branch_today_board: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: Json
      }
      get_guest_appointments_by_token: {
        Args: { p_token: string }
        Returns: {
          appointment_date: string
          appointment_id: string
          branch_name_en: string
          branch_name_th: string
          branch_slug: string
          created_at: string
          referral_code: string
          services_summary: string
          start_time: string
          status: string
        }[]
      }
      get_partner_invite_stats: {
        Args: never
        Returns: {
          accepted_count: number
          active_invites: number
          adjusted_impact_score: number
          booked_count: number
          booking_cta: number
          booking_started_count: number
          bookings_completed: number
          completed_count: number
          conversion_rate: number
          expired_invites: number
          invites_created: number
          invites_opened: number
          kit_cta: number
          pair_completed: number
          plans_to_test_count: number
          raw_impact_score: number
          selftest_requests: number
          sessions_joined: number
          suspicious_events_count: number
          timer_completed: number
          unique_opens: number
        }[]
      }
      get_public_site_stats: {
        Args: never
        Returns: {
          registered_user_pageviews: number
          total_pageviews: number
          total_sessions: number
        }[]
      }
      get_returning_flags: {
        Args: { p_appointment_ids: string[] }
        Returns: {
          appointment_id: string
          is_returning: boolean
        }[]
      }
      get_selftest_duplicate_counts: {
        Args: { p_request_id: string }
        Returns: Json
      }
      get_selftest_statistics: {
        Args: never
        Returns: {
          age_stats: Json
          gender_stats: Json
          total_count: number
        }[]
      }
      get_site_stats: {
        Args: never
        Returns: {
          total_members: number
          total_page_views: number
        }[]
      }
      get_sms_credit_balance: { Args: never; Returns: number }
      get_walkin_pressure: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: Json
      }
      guest_lookup_appointment: {
        Args: { p_email: string; p_referral_code: string }
        Returns: {
          appointment_date: string
          appointment_id: string
          branch_name_en: string
          branch_name_th: string
          branch_slug: string
          created_at: string
          referral_code: string
          services_summary: string
          start_time: string
          status: string
        }[]
      }
      guest_self_checkin: { Args: { p_referral_code: string }; Returns: Json }
      guest_self_checkout: {
        Args: {
          p_feedback?: string
          p_rating?: number
          p_referral_code: string
        }
        Returns: Json
      }
      guest_universal_lookup: {
        Args: { p_identifier: string }
        Returns: {
          appointment_date: string
          appointment_id: string
          branch_name_en: string
          branch_name_th: string
          branch_slug: string
          created_at: string
          referral_code: string
          services_summary: string
          start_time: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_survey_view: { Args: { p_survey_id: string }; Returns: number }
      is_booking_branch_admin: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      is_booking_staff: { Args: { p_branch_id: string }; Returns: boolean }
      is_booking_super_admin: { Args: never; Returns: boolean }
      is_branch_staff: {
        Args: { _branch: string; _user_id: string }
        Returns: boolean
      }
      is_branch_staff_for_request: {
        Args: { _pii_id: string; _user_id: string }
        Returns: boolean
      }
      join_partner_session: {
        Args: { p_participant_sid: string; p_session_code: string }
        Returns: Json
      }
      lookup_appointment_by_code: {
        Args: { p_contact_email: string; p_referral_code: string }
        Returns: {
          appointment_date: string
          branch_id: string
          contact_email: string
          created_at: string
          id: string
          referral_code: string
          start_time: string
          status: string
        }[]
      }
      mark_no_show_expired: { Args: { p_branch_id?: string }; Returns: number }
      normalize_text_for_fp: { Args: { input: string }; Returns: string }
      record_partner_invite_event: {
        Args: {
          p_code: string
          p_event_type: string
          p_visitor_session_id: string
        }
        Returns: undefined
      }
      refund_sms_credit: {
        Args: { p_reason?: string; p_relay_id?: string; p_user_id: string }
        Returns: number
      }
      revoke_partner_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      self_checkin_appointment: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      self_checkout_appointment: {
        Args: {
          p_appointment_id: string
          p_confirm_code: string
          p_feedback?: string
          p_rating?: number
        }
        Returns: undefined
      }
      start_walkin_service: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      update_abuse_flag_status: {
        Args: { p_flag_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      update_appointment_status: {
        Args: {
          p_appointment_id: string
          p_new_status: string
          p_reason?: string
        }
        Returns: undefined
      }
      update_user_trust_tier: {
        Args: { p_trust_tier: string; p_user_id: string }
        Returns: undefined
      }
      upsert_partner_invite_response: {
        Args: {
          p_code: string
          p_response_state: string
          p_visitor_session_id: string
        }
        Returns: string
      }
      user_liked_article: { Args: { p_article_id: string }; Returns: boolean }
      validate_thai_id: { Args: { thai_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      article_status: "draft" | "pending_review" | "published" | "archived"
      kit_order_status:
        | "requested"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered_unconfirmed"
        | "received_confirmed"
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
      app_role: ["admin", "moderator", "user"],
      article_status: ["draft", "pending_review", "published", "archived"],
      kit_order_status: [
        "requested",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered_unconfirmed",
        "received_confirmed",
      ],
    },
  },
} as const
