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
      branch_queue_settings: {
        Row: {
          active_steps: string[]
          branch_id: string
          counselor_room_count: number
          created_at: string
          id: string
          payment_enabled: boolean
          queue_prefix: string
          tv_display_name: string | null
          updated_at: string
        }
        Insert: {
          active_steps?: string[]
          branch_id: string
          counselor_room_count?: number
          created_at?: string
          id?: string
          payment_enabled?: boolean
          queue_prefix?: string
          tv_display_name?: string | null
          updated_at?: string
        }
        Update: {
          active_steps?: string[]
          branch_id?: string
          counselor_room_count?: number
          created_at?: string
          id?: string
          payment_enabled?: boolean
          queue_prefix?: string
          tv_display_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_queue_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
        ]
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
      chat_canned_responses: {
        Row: {
          category: string
          content_en: string
          content_th: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          title_en: string
          title_th: string
          updated_at: string
        }
        Insert: {
          category?: string
          content_en: string
          content_th: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title_en: string
          title_th: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_en?: string
          content_th?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title_en?: string
          title_th?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_internal_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note_text: string
          thread_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note_text: string
          thread_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note_text?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_internal_notes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_chat_threads"
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
      client_visit_flow_steps: {
        Row: {
          assigned_staff_id: string | null
          branch_id: string
          called_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          entered_at: string
          id: string
          queue_code: string | null
          queue_number: number | null
          room_number: number | null
          route_note: string | null
          routed_to_step_code: string | null
          started_at: string | null
          step_code: string
          step_status: string
          updated_at: string
          updated_by: string | null
          visit_id: string
        }
        Insert: {
          assigned_staff_id?: string | null
          branch_id: string
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          entered_at?: string
          id?: string
          queue_code?: string | null
          queue_number?: number | null
          room_number?: number | null
          route_note?: string | null
          routed_to_step_code?: string | null
          started_at?: string | null
          step_code: string
          step_status?: string
          updated_at?: string
          updated_by?: string | null
          visit_id: string
        }
        Update: {
          assigned_staff_id?: string | null
          branch_id?: string
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          entered_at?: string
          id?: string
          queue_code?: string | null
          queue_number?: number | null
          room_number?: number | null
          route_note?: string | null
          routed_to_step_code?: string | null
          started_at?: string | null
          step_code?: string
          step_status?: string
          updated_at?: string
          updated_by?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_visit_flow_steps_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_visit_flow_steps_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "client_visit_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      client_visit_flows: {
        Row: {
          appointment_id: string | null
          branch_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_status: string
          current_step: string
          id: string
          is_cancelled: boolean
          is_completed: boolean
          updated_at: string
          updated_by: string | null
          visit_code: string
          visit_date: string
          visit_number: number
        }
        Insert: {
          appointment_id?: string | null
          branch_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          current_step?: string
          id?: string
          is_cancelled?: boolean
          is_completed?: boolean
          updated_at?: string
          updated_by?: string | null
          visit_code: string
          visit_date?: string
          visit_number: number
        }
        Update: {
          appointment_id?: string | null
          branch_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          current_step?: string
          id?: string
          is_cancelled?: boolean
          is_completed?: boolean
          updated_at?: string
          updated_by?: string | null
          visit_code?: string
          visit_date?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_visit_flows_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_visit_flows_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_encounters: {
        Row: {
          anonymous_token: string | null
          branch_id: string | null
          clinical_notes: string | null
          created_at: string | null
          distress_level: string | null
          encounter_date: string
          encounter_type: string
          follow_up_date: string | null
          follow_up_needed: boolean | null
          id: string
          mental_health_screened: boolean | null
          outcome: string | null
          pathway_id: string | null
          referral_accepted: boolean | null
          referral_destination: string | null
          service_event_id: string | null
          staff_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          branch_id?: string | null
          clinical_notes?: string | null
          created_at?: string | null
          distress_level?: string | null
          encounter_date?: string
          encounter_type: string
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          id?: string
          mental_health_screened?: boolean | null
          outcome?: string | null
          pathway_id?: string | null
          referral_accepted?: boolean | null
          referral_destination?: string | null
          service_event_id?: string | null
          staff_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          branch_id?: string | null
          clinical_notes?: string | null
          created_at?: string | null
          distress_level?: string | null
          encounter_date?: string
          encounter_type?: string
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          id?: string
          mental_health_screened?: boolean | null
          outcome?: string | null
          pathway_id?: string | null
          referral_accepted?: boolean | null
          referral_destination?: string | null
          service_event_id?: string | null
          staff_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_encounters_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_encounters_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "service_pathways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_encounters_service_event_id_fkey"
            columns: ["service_event_id"]
            isOneToOne: false
            referencedRelation: "service_events"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_link_audit: {
        Row: {
          action_taken: string
          component: string
          created_at: string
          id: string
          original_link: string
        }
        Insert: {
          action_taken?: string
          component: string
          created_at?: string
          id?: string
          original_link: string
        }
        Update: {
          action_taken?: string
          component?: string
          created_at?: string
          id?: string
          original_link?: string
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          clinic_address: string | null
          clinic_hours: string | null
          clinic_key: string
          clinic_name: string
          clinic_phone: string
          id: string
          internal_booking_path: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          clinic_address?: string | null
          clinic_hours?: string | null
          clinic_key: string
          clinic_name?: string
          clinic_phone?: string
          id?: string
          internal_booking_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          clinic_address?: string | null
          clinic_hours?: string | null
          clinic_key?: string
          clinic_name?: string
          clinic_phone?: string
          id?: string
          internal_booking_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      community_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          is_completed: boolean
          metric_type: string
          month: string
          reward_ticket: number
          reward_xp: number
          target_value: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          metric_type?: string
          month: string
          reward_ticket?: number
          reward_xp?: number
          target_value?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          metric_type?: string
          month?: string
          reward_ticket?: number
          reward_xp?: number
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          anonymous_token: string | null
          consent_type: string
          created_at: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_hint: string | null
          revoked_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          consent_type: string
          created_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_hint?: string | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          consent_type?: string
          created_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_hint?: string | null
          revoked_at?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      data_quality_flags: {
        Row: {
          created_at: string | null
          description: string | null
          flag_type: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          source_id: string | null
          source_table: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flag_type: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_id?: string | null
          source_table: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flag_type?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_id?: string | null
          source_table?: string
          status?: string | null
        }
        Relationships: []
      }
      direct_chat_messages: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean
          message_text: string
          sender_id: string
          sender_role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_text: string
          sender_id: string
          sender_role?: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_text?: string
          sender_id?: string
          sender_role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_chat_read_states: {
        Row: {
          id: string
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_chat_read_states_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_chat_threads: {
        Row: {
          assigned_to: string | null
          created_at: string
          first_response_at: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          last_user_message_at: string | null
          priority: string
          sla_deadline_at: string | null
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_user_message_at?: string | null
          priority?: string
          sla_deadline_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_user_message_at?: string | null
          priority?: string
          sla_deadline_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dissemination_logs: {
        Row: {
          audience: string | null
          channel: string | null
          created_at: string | null
          dissemination_date: string
          feedback: string | null
          id: string
          knowledge_product_id: string | null
          reach_count: number | null
        }
        Insert: {
          audience?: string | null
          channel?: string | null
          created_at?: string | null
          dissemination_date?: string
          feedback?: string | null
          id?: string
          knowledge_product_id?: string | null
          reach_count?: number | null
        }
        Update: {
          audience?: string | null
          channel?: string | null
          created_at?: string | null
          dissemination_date?: string
          feedback?: string | null
          id?: string
          knowledge_product_id?: string | null
          reach_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dissemination_logs_knowledge_product_id_fkey"
            columns: ["knowledge_product_id"]
            isOneToOne: false
            referencedRelation: "knowledge_products"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_meetings: {
        Row: {
          agenda: string | null
          attachments: Json | null
          attendee_names: string[] | null
          created_at: string | null
          created_by: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_type: string | null
          minutes: string | null
          outcomes: string | null
          partner_org_ids: string[] | null
          title_en: string | null
          title_th: string | null
          updated_at: string | null
        }
        Insert: {
          agenda?: string | null
          attachments?: Json | null
          attendee_names?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_type?: string | null
          minutes?: string | null
          outcomes?: string | null
          partner_org_ids?: string[] | null
          title_en?: string | null
          title_th?: string | null
          updated_at?: string | null
        }
        Update: {
          agenda?: string | null
          attachments?: Json | null
          attendee_names?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_type?: string | null
          minutes?: string | null
          outcomes?: string | null
          partner_org_ids?: string[] | null
          title_en?: string | null
          title_th?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluation_matrix_rows: {
        Row: {
          baseline: string | null
          created_at: string | null
          data_collection_method: string | null
          data_source: string | null
          display_order: number | null
          evaluation_question_id: string | null
          frequency: string | null
          id: string
          indicator: string | null
          responsible: string | null
          target: string | null
        }
        Insert: {
          baseline?: string | null
          created_at?: string | null
          data_collection_method?: string | null
          data_source?: string | null
          display_order?: number | null
          evaluation_question_id?: string | null
          frequency?: string | null
          id?: string
          indicator?: string | null
          responsible?: string | null
          target?: string | null
        }
        Update: {
          baseline?: string | null
          created_at?: string | null
          data_collection_method?: string | null
          data_source?: string | null
          display_order?: number | null
          evaluation_question_id?: string | null
          frequency?: string | null
          id?: string
          indicator?: string | null
          responsible?: string | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_matrix_rows_evaluation_question_id_fkey"
            columns: ["evaluation_question_id"]
            isOneToOne: false
            referencedRelation: "evaluation_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_questions: {
        Row: {
          created_at: string | null
          data_sources: string | null
          display_order: number | null
          id: string
          methodology: string | null
          question_text: string
          question_type: string | null
          responsible: string | null
          result_area: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_sources?: string | null
          display_order?: number | null
          id?: string
          methodology?: string | null
          question_text: string
          question_type?: string | null
          responsible?: string | null
          result_area?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_sources?: string | null
          display_order?: number | null
          id?: string
          methodology?: string | null
          question_text?: string
          question_type?: string | null
          responsible?: string | null
          result_area?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluation_risks: {
        Row: {
          created_at: string | null
          id: string
          impact: string | null
          likelihood: string | null
          mitigation: string | null
          risk_category: string | null
          risk_description: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation?: string | null
          risk_category?: string | null
          risk_description: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation?: string | null
          risk_category?: string | null
          risk_description?: string
          status?: string | null
          updated_at?: string | null
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
      followup_events: {
        Row: {
          anonymous_token: string | null
          completed_at: string | null
          created_at: string | null
          followup_type: string
          id: string
          notes: string | null
          pathway_id: string | null
          response_data: Json | null
          scheduled_at: string
          source_id: string | null
          source_type: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          completed_at?: string | null
          created_at?: string | null
          followup_type: string
          id?: string
          notes?: string | null
          pathway_id?: string | null
          response_data?: Json | null
          scheduled_at: string
          source_id?: string | null
          source_type: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          completed_at?: string | null
          created_at?: string | null
          followup_type?: string
          id?: string
          notes?: string | null
          pathway_id?: string | null
          response_data?: Json | null
          scheduled_at?: string
          source_id?: string | null
          source_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_events_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "service_pathways"
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
      hr_ai_conversations: {
        Row: {
          created_at: string
          id: string
          message_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      hr_call_events: {
        Row: {
          callback_request_id: string | null
          created_at: string
          event_type: string
          id: string
          notes: string | null
          provider_name: string | null
          status: string
        }
        Insert: {
          callback_request_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          provider_name?: string | null
          status?: string
        }
        Update: {
          callback_request_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          provider_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_call_events_callback_request_id_fkey"
            columns: ["callback_request_id"]
            isOneToOne: false
            referencedRelation: "hr_callback_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_callback_requests: {
        Row: {
          anonymous_token: string | null
          callback_reason: string | null
          callback_status: string
          consent_to_call: boolean
          created_at: string
          escalation_level: string | null
          id: string
          phone_number: string | null
          preferred_language: string | null
          preferred_time: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          callback_reason?: string | null
          callback_status?: string
          consent_to_call?: boolean
          created_at?: string
          escalation_level?: string | null
          id?: string
          phone_number?: string | null
          preferred_language?: string | null
          preferred_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          callback_reason?: string | null
          callback_status?: string
          consent_to_call?: boolean
          created_at?: string
          escalation_level?: string | null
          id?: string
          phone_number?: string | null
          preferred_language?: string | null
          preferred_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hr_checkins: {
        Row: {
          anonymous_token: string | null
          checkin_date: string
          created_at: string
          id: string
          mood: number
          sleep: number
          stress: number
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          checkin_date?: string
          created_at?: string
          id?: string
          mood: number
          sleep: number
          stress: number
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          checkin_date?: string
          created_at?: string
          id?: string
          mood?: number
          sleep?: number
          stress?: number
          user_id?: string | null
        }
        Relationships: []
      }
      hr_content_drafts: {
        Row: {
          ai_summary_en: string | null
          ai_summary_th: string | null
          approved_at: string | null
          approved_by: string | null
          authority_confidence_score: number | null
          citation_placeholders: Json | null
          content_type: string
          created_at: string
          emergency_signs_en: Json | null
          emergency_signs_th: Json | null
          faq_items_en: Json | null
          faq_items_th: Json | null
          generated_at: string
          generated_by: string | null
          harm_reduction_tips_en: Json | null
          harm_reduction_tips_th: Json | null
          id: string
          interaction_id: string | null
          meta_description_en: string | null
          meta_description_th: string | null
          possible_effects_en: Json | null
          possible_effects_th: Json | null
          previous_version_id: string | null
          published_at: string | null
          quality_flags: Json | null
          quick_facts_en: Json | null
          quick_facts_th: Json | null
          recommended_source_types: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_note: string | null
          seo_title_en: string | null
          seo_title_th: string | null
          slug: string
          status: string
          substance_a_slug: string
          substance_b_slug: string
          summary_en: string | null
          summary_th: string | null
          title_en: string | null
          title_th: string | null
          updated_at: string
          validation_passed: boolean | null
          version: number
          warning_signs_en: Json | null
          warning_signs_th: Json | null
          why_risky_en: string | null
          why_risky_th: string | null
        }
        Insert: {
          ai_summary_en?: string | null
          ai_summary_th?: string | null
          approved_at?: string | null
          approved_by?: string | null
          authority_confidence_score?: number | null
          citation_placeholders?: Json | null
          content_type?: string
          created_at?: string
          emergency_signs_en?: Json | null
          emergency_signs_th?: Json | null
          faq_items_en?: Json | null
          faq_items_th?: Json | null
          generated_at?: string
          generated_by?: string | null
          harm_reduction_tips_en?: Json | null
          harm_reduction_tips_th?: Json | null
          id?: string
          interaction_id?: string | null
          meta_description_en?: string | null
          meta_description_th?: string | null
          possible_effects_en?: Json | null
          possible_effects_th?: Json | null
          previous_version_id?: string | null
          published_at?: string | null
          quality_flags?: Json | null
          quick_facts_en?: Json | null
          quick_facts_th?: Json | null
          recommended_source_types?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_note?: string | null
          seo_title_en?: string | null
          seo_title_th?: string | null
          slug: string
          status?: string
          substance_a_slug: string
          substance_b_slug: string
          summary_en?: string | null
          summary_th?: string | null
          title_en?: string | null
          title_th?: string | null
          updated_at?: string
          validation_passed?: boolean | null
          version?: number
          warning_signs_en?: Json | null
          warning_signs_th?: Json | null
          why_risky_en?: string | null
          why_risky_th?: string | null
        }
        Update: {
          ai_summary_en?: string | null
          ai_summary_th?: string | null
          approved_at?: string | null
          approved_by?: string | null
          authority_confidence_score?: number | null
          citation_placeholders?: Json | null
          content_type?: string
          created_at?: string
          emergency_signs_en?: Json | null
          emergency_signs_th?: Json | null
          faq_items_en?: Json | null
          faq_items_th?: Json | null
          generated_at?: string
          generated_by?: string | null
          harm_reduction_tips_en?: Json | null
          harm_reduction_tips_th?: Json | null
          id?: string
          interaction_id?: string | null
          meta_description_en?: string | null
          meta_description_th?: string | null
          possible_effects_en?: Json | null
          possible_effects_th?: Json | null
          previous_version_id?: string | null
          published_at?: string | null
          quality_flags?: Json | null
          quick_facts_en?: Json | null
          quick_facts_th?: Json | null
          recommended_source_types?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_note?: string | null
          seo_title_en?: string | null
          seo_title_th?: string | null
          slug?: string
          status?: string
          substance_a_slug?: string
          substance_b_slug?: string
          summary_en?: string | null
          summary_th?: string | null
          title_en?: string | null
          title_th?: string | null
          updated_at?: string
          validation_passed?: boolean | null
          version?: number
          warning_signs_en?: Json | null
          warning_signs_th?: Json | null
          why_risky_en?: string | null
          why_risky_th?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_content_drafts_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "hr_substance_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_content_drafts_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "hr_content_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_distress_alerts: {
        Row: {
          action_taken: string | null
          created_at: string
          id: string
          trigger_type: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          id?: string
          trigger_type: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          id?: string
          trigger_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hr_dose_logs: {
        Row: {
          created_at: string
          dose_time: string
          id: string
          substance: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dose_time: string
          id?: string
          substance: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dose_time?: string
          id?: string
          substance?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hr_entity_source_links: {
        Row: {
          citation_note: string | null
          entity_id: string
          id: string
          source_id: string
        }
        Insert: {
          citation_note?: string | null
          entity_id: string
          id?: string
          source_id: string
        }
        Update: {
          citation_note?: string | null
          entity_id?: string
          id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_entity_source_links_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "hr_knowledge_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_entity_source_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "hr_knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_followups: {
        Row: {
          completed_at: string | null
          created_at: string | null
          due_at: string | null
          followup_type: string
          id: string
          notes: string | null
          referral_id: string | null
          screening_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          followup_type: string
          id?: string
          notes?: string | null
          referral_id?: string | null
          screening_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          followup_type?: string
          id?: string
          notes?: string | null
          referral_id?: string | null
          screening_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_followups_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "hr_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_followups_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "hr_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_harm_history: {
        Row: {
          blackout: boolean | null
          crash: boolean | null
          created_at: string | null
          id: string
          injury: boolean | null
          notes: string | null
          overdose: boolean | null
          panic: boolean | null
          screening_id: string
        }
        Insert: {
          blackout?: boolean | null
          crash?: boolean | null
          created_at?: string | null
          id?: string
          injury?: boolean | null
          notes?: string | null
          overdose?: boolean | null
          panic?: boolean | null
          screening_id: string
        }
        Update: {
          blackout?: boolean | null
          crash?: boolean | null
          created_at?: string | null
          id?: string
          injury?: boolean | null
          notes?: string | null
          overdose?: boolean | null
          panic?: boolean | null
          screening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_harm_history_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "hr_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_knowledge_entities: {
        Row: {
          created_at: string
          entity_type: Database["public"]["Enums"]["kg_entity_type"]
          id: string
          name_en: string
          name_th: string
          slug: string
          source_id: string | null
          source_table: string | null
          status: string
          summary_en: string | null
          summary_th: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: Database["public"]["Enums"]["kg_entity_type"]
          id?: string
          name_en: string
          name_th: string
          slug: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          summary_en?: string | null
          summary_th?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: Database["public"]["Enums"]["kg_entity_type"]
          id?: string
          name_en?: string
          name_th?: string
          slug?: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          summary_en?: string | null
          summary_th?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hr_knowledge_progress: {
        Row: {
          anonymous_token: string | null
          completed: boolean | null
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          score: number | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          completed?: boolean | null
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          score?: number | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          completed?: boolean | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      hr_knowledge_relations: {
        Row: {
          created_at: string
          from_entity_id: string
          id: string
          notes: string | null
          relation_type: Database["public"]["Enums"]["kg_relation_type"]
          strength: number | null
          to_entity_id: string
        }
        Insert: {
          created_at?: string
          from_entity_id: string
          id?: string
          notes?: string | null
          relation_type: Database["public"]["Enums"]["kg_relation_type"]
          strength?: number | null
          to_entity_id: string
        }
        Update: {
          created_at?: string
          from_entity_id?: string
          id?: string
          notes?: string | null
          relation_type?: Database["public"]["Enums"]["kg_relation_type"]
          strength?: number | null
          to_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_knowledge_relations_from_entity_id_fkey"
            columns: ["from_entity_id"]
            isOneToOne: false
            referencedRelation: "hr_knowledge_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_knowledge_relations_to_entity_id_fkey"
            columns: ["to_entity_id"]
            isOneToOne: false
            referencedRelation: "hr_knowledge_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_knowledge_sources: {
        Row: {
          authority_score: number | null
          created_at: string
          id: string
          publisher: string | null
          source_type: string | null
          title: string
          url: string | null
        }
        Insert: {
          authority_score?: number | null
          created_at?: string
          id?: string
          publisher?: string | null
          source_type?: string | null
          title: string
          url?: string | null
        }
        Update: {
          authority_score?: number | null
          created_at?: string
          id?: string
          publisher?: string | null
          source_type?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      hr_language_dictionary: {
        Row: {
          category: string | null
          created_at: string
          id: string
          notes: string | null
          term_original: string
          term_recommended: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          term_original: string
          term_recommended: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          term_original?: string
          term_recommended?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_mental_health: {
        Row: {
          anxiety_level: number | null
          created_at: string | null
          depression_level: number | null
          id: string
          loneliness_level: number | null
          notes: string | null
          screening_id: string
          sleep_issues_level: number | null
        }
        Insert: {
          anxiety_level?: number | null
          created_at?: string | null
          depression_level?: number | null
          id?: string
          loneliness_level?: number | null
          notes?: string | null
          screening_id: string
          sleep_issues_level?: number | null
        }
        Update: {
          anxiety_level?: number | null
          created_at?: string | null
          depression_level?: number | null
          id?: string
          loneliness_level?: number | null
          notes?: string | null
          screening_id?: string
          sleep_issues_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_mental_health_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "hr_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_nudge_events: {
        Row: {
          action: string
          created_at: string
          id: string
          nudge_type: string
          user_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          nudge_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          nudge_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hr_page_reference_links: {
        Row: {
          citation_note: string | null
          created_at: string
          display_order: number
          id: string
          page_id: string | null
          page_slug: string
          page_type: string
          reference_id: string
          section_key: string | null
        }
        Insert: {
          citation_note?: string | null
          created_at?: string
          display_order?: number
          id?: string
          page_id?: string | null
          page_slug: string
          page_type: string
          reference_id: string
          section_key?: string | null
        }
        Update: {
          citation_note?: string | null
          created_at?: string
          display_order?: number
          id?: string
          page_id?: string | null
          page_slug?: string
          page_type?: string
          reference_id?: string
          section_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_page_reference_links_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "hr_references"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_peer_posts: {
        Row: {
          admin_note: string | null
          anonymous_token: string
          content: string
          created_at: string
          id: string
          is_approved: boolean
          is_flagged: boolean
        }
        Insert: {
          admin_note?: string | null
          anonymous_token: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_flagged?: boolean
        }
        Update: {
          admin_note?: string | null
          anonymous_token?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_flagged?: boolean
        }
        Relationships: []
      }
      hr_peer_replies: {
        Row: {
          anonymous_token: string
          content: string
          created_at: string
          id: string
          is_approved: boolean
          is_flagged: boolean
          post_id: string
        }
        Insert: {
          anonymous_token: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_flagged?: boolean
          post_id: string
        }
        Update: {
          anonymous_token?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_flagged?: boolean
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_peer_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "hr_peer_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_plan_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_enabled: boolean
          label_en: string
          label_th: string
          plan_id: string
          status: string
          trigger_time: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label_en: string
          label_th: string
          plan_id: string
          status?: string
          trigger_time?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          label_en?: string
          label_th?: string
          plan_id?: string
          status?: string
          trigger_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_plan_actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hr_user_safety_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_references: {
        Row: {
          access_date: string | null
          authors: string | null
          citation_full: string | null
          citation_short: string
          created_at: string
          credibility_level: string
          id: string
          is_active: boolean
          language: string | null
          organization: string
          publisher: string | null
          region: string | null
          source_type: string
          title: string
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          access_date?: string | null
          authors?: string | null
          citation_full?: string | null
          citation_short: string
          created_at?: string
          credibility_level?: string
          id?: string
          is_active?: boolean
          language?: string | null
          organization: string
          publisher?: string | null
          region?: string | null
          source_type?: string
          title: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          access_date?: string | null
          authors?: string | null
          citation_full?: string | null
          citation_short?: string
          created_at?: string
          credibility_level?: string
          id?: string
          is_active?: boolean
          language?: string | null
          organization?: string
          publisher?: string | null
          region?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      hr_referral_events: {
        Row: {
          anonymous_token: string | null
          created_at: string
          id: string
          referral_target: string
          referral_type: string
          source_context: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          created_at?: string
          id?: string
          referral_target?: string
          referral_type: string
          source_context?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          created_at?: string
          id?: string
          referral_target?: string
          referral_type?: string
          source_context?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hr_referrals: {
        Row: {
          anonymous_token: string | null
          assigned_to: string | null
          completed_at: string | null
          contact_method: string | null
          contact_value: string | null
          created_at: string | null
          id: string
          notes: string | null
          priority: string | null
          referral_type: string
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          referral_type: string
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          referral_type?: string
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hr_reminders: {
        Row: {
          anonymous_token: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          plan_id: string | null
          recurrence_interval: string | null
          reminder_type: string
          scheduled_at: string
          title: string
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          plan_id?: string | null
          recurrence_interval?: string | null
          reminder_type: string
          scheduled_at: string
          title: string
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          plan_id?: string | null
          recurrence_interval?: string | null
          reminder_type?: string
          scheduled_at?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_reminders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hr_safer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_safer_plans: {
        Row: {
          anonymous_token: string | null
          checklist: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          plan_date: string | null
          plan_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          checklist?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_date?: string | null
          plan_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          checklist?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_date?: string | null
          plan_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hr_safety_alert_events: {
        Row: {
          alert_type: string
          anonymous_token: string | null
          created_at: string
          id: string
          plan_id: string | null
          response_action: string | null
          severity: string
          triggered_at: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          anonymous_token?: string | null
          created_at?: string
          id?: string
          plan_id?: string | null
          response_action?: string | null
          severity?: string
          triggered_at?: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          anonymous_token?: string | null
          created_at?: string
          id?: string
          plan_id?: string | null
          response_action?: string | null
          severity?: string
          triggered_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_safety_alert_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hr_user_safety_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_safety_scenarios: {
        Row: {
          created_at: string
          description_en: string | null
          description_th: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean
          slug: string
          title_en: string
          title_th: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          slug: string
          title_en: string
          title_th: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          slug?: string
          title_en?: string
          title_th?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_screenings: {
        Row: {
          anonymous_token: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          recommendations: Json | null
          risk_level: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          recommendations?: Json | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          recommendations?: Json | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hr_sexual_health: {
        Row: {
          condom_use: string | null
          created_at: string | null
          id: string
          last_hiv_test: string | null
          notes: string | null
          prep_use: string | null
          screening_id: string
          sti_history: boolean | null
        }
        Insert: {
          condom_use?: string | null
          created_at?: string | null
          id?: string
          last_hiv_test?: string | null
          notes?: string | null
          prep_use?: string | null
          screening_id: string
          sti_history?: boolean | null
        }
        Update: {
          condom_use?: string | null
          created_at?: string | null
          id?: string
          last_hiv_test?: string | null
          notes?: string | null
          prep_use?: string | null
          screening_id?: string
          sti_history?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_sexual_health_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "hr_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_substance_interactions: {
        Row: {
          created_at: string
          description_en: string | null
          description_th: string | null
          emergency_signs_en: string[] | null
          emergency_signs_th: string[] | null
          harm_reduction_tips_en: string[] | null
          harm_reduction_tips_th: string[] | null
          id: string
          interaction_type: string | null
          is_priority: boolean | null
          possible_effects_en: string[] | null
          possible_effects_th: string[] | null
          risk_level: string
          substance_a_id: string
          substance_b_id: string
          summary_en: string | null
          summary_th: string | null
          updated_at: string | null
          warning_signs_en: string[] | null
          warning_signs_th: string[] | null
          why_risky_en: string | null
          why_risky_th: string | null
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          emergency_signs_en?: string[] | null
          emergency_signs_th?: string[] | null
          harm_reduction_tips_en?: string[] | null
          harm_reduction_tips_th?: string[] | null
          id?: string
          interaction_type?: string | null
          is_priority?: boolean | null
          possible_effects_en?: string[] | null
          possible_effects_th?: string[] | null
          risk_level?: string
          substance_a_id: string
          substance_b_id: string
          summary_en?: string | null
          summary_th?: string | null
          updated_at?: string | null
          warning_signs_en?: string[] | null
          warning_signs_th?: string[] | null
          why_risky_en?: string | null
          why_risky_th?: string | null
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          emergency_signs_en?: string[] | null
          emergency_signs_th?: string[] | null
          harm_reduction_tips_en?: string[] | null
          harm_reduction_tips_th?: string[] | null
          id?: string
          interaction_type?: string | null
          is_priority?: boolean | null
          possible_effects_en?: string[] | null
          possible_effects_th?: string[] | null
          risk_level?: string
          substance_a_id?: string
          substance_b_id?: string
          summary_en?: string | null
          summary_th?: string | null
          updated_at?: string | null
          warning_signs_en?: string[] | null
          warning_signs_th?: string[] | null
          why_risky_en?: string | null
          why_risky_th?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_substance_interactions_substance_a_id_fkey"
            columns: ["substance_a_id"]
            isOneToOne: false
            referencedRelation: "hr_substances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_substance_interactions_substance_b_id_fkey"
            columns: ["substance_b_id"]
            isOneToOne: false
            referencedRelation: "hr_substances"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_substance_use: {
        Row: {
          created_at: string | null
          frequency: string | null
          id: string
          injection_use: boolean | null
          mixing: boolean | null
          notes: string | null
          screening_id: string
          slam_use: boolean | null
          substances: string[] | null
        }
        Insert: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          injection_use?: boolean | null
          mixing?: boolean | null
          notes?: string | null
          screening_id: string
          slam_use?: boolean | null
          substances?: string[] | null
        }
        Update: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          injection_use?: boolean | null
          mixing?: boolean | null
          notes?: string | null
          screening_id?: string
          slam_use?: boolean | null
          substances?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_substance_use_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "hr_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_substances: {
        Row: {
          addiction_risk: number
          category_en: string
          category_th: string
          created_at: string
          display_order: number
          duration_timeline: Json | null
          emergency_signs_en: string[] | null
          emergency_signs_th: string[] | null
          harm_reduction_tips_en: string[] | null
          harm_reduction_tips_th: string[] | null
          heart_risk: number
          icon: string
          id: string
          is_active: boolean
          long_effects_en: string[] | null
          long_effects_th: string[] | null
          mental_health_risk: number
          mid_effects_en: string[] | null
          mid_effects_th: string[] | null
          name_en: string
          name_th: string
          overview_en: string | null
          overview_th: string | null
          routes_of_use: Json | null
          short_effects_en: string[] | null
          short_effects_th: string[] | null
          slug: string
          updated_at: string
          withdrawal_en: string[] | null
          withdrawal_th: string[] | null
        }
        Insert: {
          addiction_risk?: number
          category_en?: string
          category_th?: string
          created_at?: string
          display_order?: number
          duration_timeline?: Json | null
          emergency_signs_en?: string[] | null
          emergency_signs_th?: string[] | null
          harm_reduction_tips_en?: string[] | null
          harm_reduction_tips_th?: string[] | null
          heart_risk?: number
          icon?: string
          id?: string
          is_active?: boolean
          long_effects_en?: string[] | null
          long_effects_th?: string[] | null
          mental_health_risk?: number
          mid_effects_en?: string[] | null
          mid_effects_th?: string[] | null
          name_en: string
          name_th: string
          overview_en?: string | null
          overview_th?: string | null
          routes_of_use?: Json | null
          short_effects_en?: string[] | null
          short_effects_th?: string[] | null
          slug: string
          updated_at?: string
          withdrawal_en?: string[] | null
          withdrawal_th?: string[] | null
        }
        Update: {
          addiction_risk?: number
          category_en?: string
          category_th?: string
          created_at?: string
          display_order?: number
          duration_timeline?: Json | null
          emergency_signs_en?: string[] | null
          emergency_signs_th?: string[] | null
          harm_reduction_tips_en?: string[] | null
          harm_reduction_tips_th?: string[] | null
          heart_risk?: number
          icon?: string
          id?: string
          is_active?: boolean
          long_effects_en?: string[] | null
          long_effects_th?: string[] | null
          mental_health_risk?: number
          mid_effects_en?: string[] | null
          mid_effects_th?: string[] | null
          name_en?: string
          name_th?: string
          overview_en?: string | null
          overview_th?: string | null
          routes_of_use?: Json | null
          short_effects_en?: string[] | null
          short_effects_th?: string[] | null
          slug?: string
          updated_at?: string
          withdrawal_en?: string[] | null
          withdrawal_th?: string[] | null
        }
        Relationships: []
      }
      hr_user_profile: {
        Row: {
          age_range: string | null
          anonymous_token: string | null
          consent_profile_use: boolean | null
          created_at: string
          gender_identity: string | null
          id: string
          is_msm: boolean | null
          is_msw: boolean | null
          sexual_behavior_category: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age_range?: string | null
          anonymous_token?: string | null
          consent_profile_use?: boolean | null
          created_at?: string
          gender_identity?: string | null
          id?: string
          is_msm?: boolean | null
          is_msw?: boolean | null
          sexual_behavior_category?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age_range?: string | null
          anonymous_token?: string | null
          consent_profile_use?: boolean | null
          created_at?: string
          gender_identity?: string | null
          id?: string
          is_msm?: boolean | null
          is_msw?: boolean | null
          sexual_behavior_category?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hr_user_profiles: {
        Row: {
          anonymous_token: string | null
          consent_given: boolean | null
          consent_given_at: string | null
          created_at: string | null
          id: string
          nickname: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string | null
          id?: string
          nickname?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string | null
          id?: string
          nickname?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hr_user_safety_plans: {
        Row: {
          alcohol_involved: boolean | null
          anonymous_token: string | null
          buddy_enabled: boolean | null
          created_at: string
          dose_timer_enabled: boolean | null
          emergency_shortcuts_enabled: boolean | null
          hydration_enabled: boolean | null
          id: string
          recovery_check_enabled: boolean | null
          saved_plan_json: Json | null
          scenario_id: string | null
          sex_related: boolean | null
          status: string
          substances_selected: string[] | null
          swing_referral_enabled: boolean | null
          updated_at: string
          user_id: string | null
          using_alone: boolean | null
        }
        Insert: {
          alcohol_involved?: boolean | null
          anonymous_token?: string | null
          buddy_enabled?: boolean | null
          created_at?: string
          dose_timer_enabled?: boolean | null
          emergency_shortcuts_enabled?: boolean | null
          hydration_enabled?: boolean | null
          id?: string
          recovery_check_enabled?: boolean | null
          saved_plan_json?: Json | null
          scenario_id?: string | null
          sex_related?: boolean | null
          status?: string
          substances_selected?: string[] | null
          swing_referral_enabled?: boolean | null
          updated_at?: string
          user_id?: string | null
          using_alone?: boolean | null
        }
        Update: {
          alcohol_involved?: boolean | null
          anonymous_token?: string | null
          buddy_enabled?: boolean | null
          created_at?: string
          dose_timer_enabled?: boolean | null
          emergency_shortcuts_enabled?: boolean | null
          hydration_enabled?: boolean | null
          id?: string
          recovery_check_enabled?: boolean | null
          saved_plan_json?: Json | null
          scenario_id?: string | null
          sex_related?: boolean | null
          status?: string
          substances_selected?: string[] | null
          swing_referral_enabled?: boolean | null
          updated_at?: string
          user_id?: string | null
          using_alone?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_user_safety_plans_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "hr_safety_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_voice_integration_settings: {
        Row: {
          escalation_rules_json: Json | null
          id: string
          inbound_supported: boolean
          is_enabled: boolean
          outbound_supported: boolean
          provider_name: string
          updated_at: string
        }
        Insert: {
          escalation_rules_json?: Json | null
          id?: string
          inbound_supported?: boolean
          is_enabled?: boolean
          outbound_supported?: boolean
          provider_name?: string
          updated_at?: string
        }
        Update: {
          escalation_rules_json?: Json | null
          id?: string
          inbound_supported?: boolean
          is_enabled?: boolean
          outbound_supported?: boolean
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      indicator_definitions: {
        Row: {
          baseline_date: string | null
          baseline_value: number | null
          calculation_method: string | null
          collection_frequency: string | null
          created_at: string | null
          data_source: string | null
          direction: string | null
          disaggregation: string[] | null
          display_order: number | null
          id: string
          indicator_code: string
          indicator_name_en: string
          indicator_name_th: string
          is_active: boolean | null
          result_area: string | null
          result_level: string
          target_date: string | null
          target_value: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          baseline_date?: string | null
          baseline_value?: number | null
          calculation_method?: string | null
          collection_frequency?: string | null
          created_at?: string | null
          data_source?: string | null
          direction?: string | null
          disaggregation?: string[] | null
          display_order?: number | null
          id?: string
          indicator_code: string
          indicator_name_en: string
          indicator_name_th: string
          is_active?: boolean | null
          result_area?: string | null
          result_level: string
          target_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          baseline_date?: string | null
          baseline_value?: number | null
          calculation_method?: string | null
          collection_frequency?: string | null
          created_at?: string | null
          data_source?: string | null
          direction?: string | null
          disaggregation?: string[] | null
          display_order?: number | null
          id?: string
          indicator_code?: string
          indicator_name_en?: string
          indicator_name_th?: string
          is_active?: boolean | null
          result_area?: string | null
          result_level?: string
          target_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      indicator_results: {
        Row: {
          created_at: string | null
          data_quality_flag: string | null
          disaggregation_key: string | null
          entered_by: string | null
          id: string
          indicator_id: string
          notes: string | null
          period_label: string | null
          reporting_period_id: string | null
          updated_at: string | null
          value: number
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          data_quality_flag?: string | null
          disaggregation_key?: string | null
          entered_by?: string | null
          id?: string
          indicator_id: string
          notes?: string | null
          period_label?: string | null
          reporting_period_id?: string | null
          updated_at?: string | null
          value: number
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          data_quality_flag?: string | null
          disaggregation_key?: string | null
          entered_by?: string | null
          id?: string
          indicator_id?: string
          notes?: string | null
          period_label?: string | null
          reporting_period_id?: string | null
          updated_at?: string | null
          value?: number
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_results_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicator_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_results_reporting_period_id_fkey"
            columns: ["reporting_period_id"]
            isOneToOne: false
            referencedRelation: "reporting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_contributors: {
        Row: {
          contribution_type: string | null
          created_at: string
          date_end: string | null
          date_start: string | null
          full_name: string
          id: string
          is_ip_owner: boolean
          ownership_notes: string | null
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contribution_type?: string | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          full_name: string
          id?: string
          is_ip_owner?: boolean
          ownership_notes?: string | null
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contribution_type?: string | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          full_name?: string
          id?: string
          is_ip_owner?: boolean
          ownership_notes?: string | null
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ip_document_sections: {
        Row: {
          content: Json | null
          id: string
          section_key: string
          status: string
          title_en: string
          title_th: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json | null
          id?: string
          section_key: string
          status?: string
          title_en: string
          title_th?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json | null
          id?: string
          section_key?: string
          status?: string
          title_en?: string
          title_th?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ip_evidence: {
        Row: {
          category: string
          created_at: string
          description: string | null
          document_date: string | null
          file_url: string | null
          id: string
          proof_relevance: string | null
          related_module: string | null
          tags: string[] | null
          title: string
          updated_by: string | null
          version: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          document_date?: string | null
          file_url?: string | null
          id?: string
          proof_relevance?: string | null
          related_module?: string | null
          tags?: string[] | null
          title: string
          updated_by?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          document_date?: string | null
          file_url?: string | null
          id?: string
          proof_relevance?: string | null
          related_module?: string | null
          tags?: string[] | null
          title?: string
          updated_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      ip_export_logs: {
        Row: {
          doc_version: string | null
          export_type: string
          exported_at: string
          exported_by: string | null
          id: string
          notes: string | null
          system_version: string | null
        }
        Insert: {
          doc_version?: string | null
          export_type: string
          exported_at?: string
          exported_by?: string | null
          id?: string
          notes?: string | null
          system_version?: string | null
        }
        Update: {
          doc_version?: string | null
          export_type?: string
          exported_at?: string
          exported_by?: string | null
          id?: string
          notes?: string | null
          system_version?: string | null
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
      knowledge_products: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_url: string | null
          id: string
          product_type: string
          published_at: string | null
          status: string | null
          tags: string[] | null
          target_audience: string | null
          title_en: string
          title_th: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          product_type: string
          published_at?: string | null
          status?: string | null
          tags?: string[] | null
          target_audience?: string | null
          title_en: string
          title_th: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          product_type?: string
          published_at?: string | null
          status?: string | null
          tags?: string[] | null
          target_audience?: string | null
          title_en?: string
          title_th?: string
          updated_at?: string | null
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
      meeting_actions: {
        Row: {
          action_text: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          meeting_id: string
          status: string | null
        }
        Insert: {
          action_text: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          meeting_id: string
          status?: string | null
        }
        Update: {
          action_text?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_actions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "engagement_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      mel_referrals: {
        Row: {
          anonymous_token: string | null
          completion_date: string | null
          created_at: string | null
          from_context: string | null
          id: string
          outcome_notes: string | null
          pathway_id: string | null
          referral_date: string
          referral_status: string | null
          service_event_id: string | null
          to_organization: string | null
          to_service: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          completion_date?: string | null
          created_at?: string | null
          from_context?: string | null
          id?: string
          outcome_notes?: string | null
          pathway_id?: string | null
          referral_date?: string
          referral_status?: string | null
          service_event_id?: string | null
          to_organization?: string | null
          to_service?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          completion_date?: string | null
          created_at?: string | null
          from_context?: string | null
          id?: string
          outcome_notes?: string | null
          pathway_id?: string | null
          referral_date?: string
          referral_status?: string | null
          service_event_id?: string | null
          to_organization?: string | null
          to_service?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mel_referrals_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "referral_pathways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mel_referrals_service_event_id_fkey"
            columns: ["service_event_id"]
            isOneToOne: false
            referencedRelation: "service_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mel_timeline_items: {
        Row: {
          activity_name: string
          activity_type: string | null
          created_at: string | null
          display_order: number | null
          end_date: string | null
          id: string
          notes: string | null
          responsible: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          activity_name: string
          activity_type?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_name?: string
          activity_type?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          responsible?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      outreach_channels: {
        Row: {
          channel_name: string
          channel_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string | null
        }
        Insert: {
          channel_name: string
          channel_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
        }
        Update: {
          channel_name?: string
          channel_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string | null
        }
        Relationships: []
      }
      outreach_contacts: {
        Row: {
          backlink_status: string | null
          backlink_url: string | null
          campaign_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_role: string | null
          country: string | null
          created_at: string
          created_by: string | null
          date_contacted: string | null
          date_link_live: string | null
          date_responded: string | null
          id: string
          notes: string | null
          organization_name: string
          organization_type: string
          outreach_status: string
          priority: string | null
          region: string | null
          target_asset: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          backlink_status?: string | null
          backlink_url?: string | null
          campaign_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_contacted?: string | null
          date_link_live?: string | null
          date_responded?: string | null
          id?: string
          notes?: string | null
          organization_name: string
          organization_type?: string
          outreach_status?: string
          priority?: string | null
          region?: string | null
          target_asset?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          backlink_status?: string | null
          backlink_url?: string | null
          campaign_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_role?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_contacted?: string | null
          date_link_live?: string | null
          date_responded?: string | null
          id?: string
          notes?: string | null
          organization_name?: string
          organization_type?: string
          outreach_status?: string
          priority?: string | null
          region?: string | null
          target_asset?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      outreach_events: {
        Row: {
          branch_id: string | null
          campaign_code: string | null
          condoms_distributed: number | null
          created_at: string | null
          event_date: string
          event_type: string
          hiv_tests_done: number | null
          id: string
          location_name: string | null
          location_type: string | null
          lube_distributed: number | null
          materials_distributed: number | null
          meta: Json | null
          notes: string | null
          people_reached: number | null
          referrals_made: number | null
          staff_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          campaign_code?: string | null
          condoms_distributed?: number | null
          created_at?: string | null
          event_date?: string
          event_type: string
          hiv_tests_done?: number | null
          id?: string
          location_name?: string | null
          location_type?: string | null
          lube_distributed?: number | null
          materials_distributed?: number | null
          meta?: Json | null
          notes?: string | null
          people_reached?: number | null
          referrals_made?: number | null
          staff_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          campaign_code?: string | null
          condoms_distributed?: number | null
          created_at?: string | null
          event_date?: string
          event_type?: string
          hiv_tests_done?: number | null
          id?: string
          location_name?: string | null
          location_type?: string | null
          lube_distributed?: number | null
          materials_distributed?: number | null
          meta?: Json | null
          notes?: string | null
          people_reached?: number | null
          referrals_made?: number | null
          staff_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
        ]
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
      partner_organizations: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          mou_date: string | null
          mou_signed: boolean | null
          name_en: string
          name_th: string
          notes: string | null
          org_type: string | null
          partnership_status: string | null
          services_provided: string[] | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          mou_date?: string | null
          mou_signed?: boolean | null
          name_en: string
          name_th: string
          notes?: string | null
          org_type?: string | null
          partnership_status?: string | null
          services_provided?: string[] | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          mou_date?: string | null
          mou_signed?: boolean | null
          name_en?: string
          name_th?: string
          notes?: string | null
          org_type?: string | null
          partnership_status?: string | null
          services_provided?: string[] | null
          updated_at?: string | null
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
      policy_evidence_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          evidence_date: string
          evidence_type: string
          id: string
          impact_level: string | null
          meeting_id: string | null
          source_file_url: string | null
          source_url: string | null
          title_en: string | null
          title_th: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          evidence_date?: string
          evidence_type: string
          id?: string
          impact_level?: string | null
          meeting_id?: string | null
          source_file_url?: string | null
          source_url?: string | null
          title_en?: string | null
          title_th?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          evidence_date?: string
          evidence_type?: string
          id?: string
          impact_level?: string | null
          meeting_id?: string | null
          source_file_url?: string | null
          source_url?: string | null
          title_en?: string | null
          title_th?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_evidence_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "engagement_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_match_results: {
        Row: {
          answers: Json | null
          avatar_type: string | null
          compatible_type: string | null
          created_at: string | null
          dating_behavior: string | null
          id: string
          partner_preference: string | null
          photo_url: string | null
          result_type: string
          score: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          avatar_type?: string | null
          compatible_type?: string | null
          created_at?: string | null
          dating_behavior?: string | null
          id?: string
          partner_preference?: string | null
          photo_url?: string | null
          result_type: string
          score?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          avatar_type?: string | null
          compatible_type?: string | null
          created_at?: string | null
          dating_behavior?: string | null
          id?: string
          partner_preference?: string | null
          photo_url?: string | null
          result_type?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
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
          consent_mel_data: boolean | null
          created_at: string | null
          display_name: string | null
          enrollment_date: string | null
          id: string
          is_active_participant: boolean | null
          language: string | null
          last_check_in: string | null
          level: number | null
          mode: string | null
          participant_code: string | null
          pep_start_date: string | null
          population_group: string | null
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
          consent_mel_data?: boolean | null
          created_at?: string | null
          display_name?: string | null
          enrollment_date?: string | null
          id: string
          is_active_participant?: boolean | null
          language?: string | null
          last_check_in?: string | null
          level?: number | null
          mode?: string | null
          participant_code?: string | null
          pep_start_date?: string | null
          population_group?: string | null
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
          consent_mel_data?: boolean | null
          created_at?: string | null
          display_name?: string | null
          enrollment_date?: string | null
          id?: string
          is_active_participant?: boolean | null
          language?: string | null
          last_check_in?: string | null
          level?: number | null
          mode?: string | null
          participant_code?: string | null
          pep_start_date?: string | null
          population_group?: string | null
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
      referral_pathways: {
        Row: {
          created_at: string | null
          from_service: string
          id: string
          is_active: boolean | null
          is_internal: boolean | null
          pathway_name_en: string | null
          pathway_name_th: string | null
          to_branch_id: string | null
          to_organization: string | null
          to_service: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_service: string
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          pathway_name_en?: string | null
          pathway_name_th?: string | null
          to_branch_id?: string | null
          to_organization?: string | null
          to_service: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_service?: string
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          pathway_name_en?: string | null
          pathway_name_th?: string | null
          to_branch_id?: string | null
          to_organization?: string | null
          to_service?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_pathways_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
        ]
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
      reporting_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          period_label: string
          period_type: string
          start_date: string
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          period_label: string
          period_type: string
          start_date: string
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          period_label?: string
          period_type?: string
          start_date?: string
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
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
      service_events: {
        Row: {
          anonymous_token: string | null
          appointment_id: string | null
          branch_id: string | null
          clinic_referral_needed: boolean | null
          counseling_needed: boolean | null
          created_at: string | null
          description_en: string | null
          description_th: string | null
          event_type: string
          followup_due_date: string | null
          id: string
          is_first_visit: boolean | null
          mental_health_referral_needed: boolean | null
          meta: Json | null
          outcome: string | null
          pathway_id: string | null
          population_group: string | null
          screening_context: string | null
          service_category: string | null
          service_date: string
          service_status: string | null
          service_subtype: string | null
          staff_id: string | null
          updated_at: string | null
          urgency_level: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          appointment_id?: string | null
          branch_id?: string | null
          clinic_referral_needed?: boolean | null
          counseling_needed?: boolean | null
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          event_type: string
          followup_due_date?: string | null
          id?: string
          is_first_visit?: boolean | null
          mental_health_referral_needed?: boolean | null
          meta?: Json | null
          outcome?: string | null
          pathway_id?: string | null
          population_group?: string | null
          screening_context?: string | null
          service_category?: string | null
          service_date?: string
          service_status?: string | null
          service_subtype?: string | null
          staff_id?: string | null
          updated_at?: string | null
          urgency_level?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          appointment_id?: string | null
          branch_id?: string | null
          clinic_referral_needed?: boolean | null
          counseling_needed?: boolean | null
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          event_type?: string
          followup_due_date?: string | null
          id?: string
          is_first_visit?: boolean | null
          mental_health_referral_needed?: boolean | null
          meta?: Json | null
          outcome?: string | null
          pathway_id?: string | null
          population_group?: string | null
          screening_context?: string | null
          service_category?: string | null
          service_date?: string
          service_status?: string | null
          service_subtype?: string | null
          staff_id?: string | null
          updated_at?: string | null
          urgency_level?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_events_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "service_pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pathways: {
        Row: {
          anonymous_token: string | null
          created_at: string | null
          entry_point: string
          followup_due_date: string | null
          id: string
          intake_age_range: string | null
          intake_context: string | null
          intake_gender: string | null
          intake_urgency: string | null
          preferred_support_channel: string | null
          reason_for_visit: string[] | null
          recommendation_accepted: string[] | null
          recommendation_shown: string[] | null
          screening_completed: boolean | null
          screening_distress_level: string | null
          service_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_token?: string | null
          created_at?: string | null
          entry_point?: string
          followup_due_date?: string | null
          id?: string
          intake_age_range?: string | null
          intake_context?: string | null
          intake_gender?: string | null
          intake_urgency?: string | null
          preferred_support_channel?: string | null
          reason_for_visit?: string[] | null
          recommendation_accepted?: string[] | null
          recommendation_shown?: string[] | null
          screening_completed?: boolean | null
          screening_distress_level?: string | null
          service_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_token?: string | null
          created_at?: string | null
          entry_point?: string
          followup_due_date?: string | null
          id?: string
          intake_age_range?: string | null
          intake_context?: string | null
          intake_gender?: string | null
          intake_urgency?: string | null
          preferred_support_channel?: string | null
          reason_for_visit?: string[] | null
          recommendation_accepted?: string[] | null
          recommendation_shown?: string[] | null
          screening_completed?: boolean | null
          screening_distress_level?: string | null
          service_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      situational_analysis_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          item_type: string
          population_focus: string | null
          source_description: string | null
          summary: string | null
          tags: string[] | null
          title_en: string | null
          title_th: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          item_type: string
          population_focus?: string | null
          source_description?: string | null
          summary?: string | null
          tags?: string[] | null
          title_en?: string | null
          title_th?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          item_type?: string
          population_focus?: string | null
          source_description?: string | null
          summary?: string | null
          tags?: string[] | null
          title_en?: string | null
          title_th?: string | null
          updated_at?: string | null
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
      support_groups: {
        Row: {
          created_at: string | null
          facilitator_ids: string[] | null
          group_name_en: string
          group_name_th: string
          group_type: string | null
          id: string
          is_active: boolean | null
          target_population: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          facilitator_ids?: string[] | null
          group_name_en: string
          group_name_th: string
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          target_population?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          facilitator_ids?: string[] | null
          group_name_en?: string
          group_name_th?: string
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          target_population?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_session_attendance: {
        Row: {
          created_at: string | null
          feedback_rating: number | null
          feedback_text: string | null
          id: string
          participant_id: string | null
          participant_name: string | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_rating?: number | null
          feedback_text?: string | null
          id?: string
          participant_id?: string | null
          participant_name?: string | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          feedback_rating?: number | null
          feedback_text?: string | null
          id?: string
          participant_id?: string | null
          participant_name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          branch_id: string | null
          community_dialogue_notes: string | null
          created_at: string | null
          facilitator_ids: string[] | null
          group_id: string | null
          id: string
          location: string | null
          session_date: string
          session_title_en: string | null
          session_title_th: string | null
          status: string | null
          topics_covered: string[] | null
          total_participants: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          community_dialogue_notes?: string | null
          created_at?: string | null
          facilitator_ids?: string[] | null
          group_id?: string | null
          id?: string
          location?: string | null
          session_date: string
          session_title_en?: string | null
          session_title_th?: string | null
          status?: string | null
          topics_covered?: string[] | null
          total_participants?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          community_dialogue_notes?: string | null
          created_at?: string | null
          facilitator_ids?: string[] | null
          group_id?: string | null
          id?: string
          location?: string | null
          session_date?: string
          session_title_en?: string | null
          session_title_th?: string | null
          status?: string | null
          topics_covered?: string[] | null
          total_participants?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "support_groups"
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
      training_attendance: {
        Row: {
          certificate_issued: boolean | null
          created_at: string | null
          feedback: string | null
          id: string
          organization: string | null
          participant_id: string | null
          participant_name: string | null
          post_test_score: number | null
          pre_test_score: number | null
          role: string | null
          session_id: string
        }
        Insert: {
          certificate_issued?: boolean | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          organization?: string | null
          participant_id?: string | null
          participant_name?: string | null
          post_test_score?: number | null
          pre_test_score?: number | null
          role?: string | null
          session_id: string
        }
        Update: {
          certificate_issued?: boolean | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          organization?: string | null
          participant_id?: string | null
          participant_name?: string | null
          post_test_score?: number | null
          pre_test_score?: number | null
          role?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_curricula: {
        Row: {
          created_at: string | null
          description_en: string | null
          description_th: string | null
          duration_hours: number | null
          id: string
          is_active: boolean | null
          modules: Json | null
          target_audience: string | null
          title_en: string
          title_th: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          modules?: Json | null
          target_audience?: string | null
          title_en: string
          title_th: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          modules?: Json | null
          target_audience?: string | null
          title_en?: string
          title_th?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          branch_id: string | null
          created_at: string | null
          curriculum_id: string | null
          id: string
          location: string | null
          notes: string | null
          session_date: string
          session_title_en: string | null
          session_title_th: string | null
          status: string | null
          total_participants: number | null
          trainer_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          curriculum_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          session_date: string
          session_title_en?: string | null
          session_title_th?: string | null
          status?: string | null
          total_participants?: number | null
          trainer_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          curriculum_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          session_date?: string
          session_title_en?: string | null
          session_title_th?: string | null
          status?: string | null
          total_participants?: number | null
          trainer_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "training_curricula"
            referencedColumns: ["id"]
          },
        ]
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
      queue_tv_display: {
        Row: {
          branch_id: string | null
          called_at: string | null
          current_status: string | null
          current_step: string | null
          queue_code: string | null
          room_number: number | null
          step_code: string | null
          step_id: string | null
          step_status: string | null
          visit_code: string | null
          visit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_visit_flow_steps_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "booking_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_visit_flow_steps_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "client_visit_flows"
            referencedColumns: ["id"]
          },
        ]
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
      generate_visit_queue_number: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: number
      }
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
        Args: { p_branch_id: string; p_date: string }
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
      get_hr_demographic_stats: {
        Args: never
        Returns: {
          age_stats: Json
          behavior_stats: Json
          gender_stats: Json
          msm_count: number
          msw_count: number
          total_profiles: number
        }[]
      }
      get_milestone_completed_count: {
        Args: { p_month: string }
        Returns: number
      }
      get_or_create_chat_thread: {
        Args: { p_subject?: string; p_user_id: string }
        Returns: string
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
      register_queue_visit: {
        Args: { p_appointment_id?: string; p_branch_id: string }
        Returns: Json
      }
      revoke_partner_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      route_visit_step: {
        Args: {
          p_action: string
          p_current_step_id: string
          p_next_step?: string
          p_room_number?: number
          p_route_note?: string
          p_visit_id: string
        }
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
      send_chat_message: {
        Args: { p_message: string; p_thread_id: string }
        Returns: string
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
      app_role: "admin" | "moderator" | "user" | "me_analyst"
      article_status: "draft" | "pending_review" | "published" | "archived"
      kg_entity_type:
        | "substance"
        | "substance_category"
        | "interaction_pair"
        | "risk"
        | "symptom"
        | "withdrawal_symptom"
        | "short_term_effect"
        | "long_term_effect"
        | "mental_health_effect"
        | "sexual_health_concern"
        | "prevention_action"
        | "emergency_sign"
        | "support_service"
        | "educational_topic"
        | "faq"
      kg_relation_type:
        | "causes"
        | "increases_risk_of"
        | "interacts_with"
        | "may_lead_to"
        | "linked_to"
        | "supports"
        | "treated_by"
        | "prevented_by"
        | "related_to"
        | "contraindicated_with"
        | "category_of"
        | "has_symptom"
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
      app_role: ["admin", "moderator", "user", "me_analyst"],
      article_status: ["draft", "pending_review", "published", "archived"],
      kg_entity_type: [
        "substance",
        "substance_category",
        "interaction_pair",
        "risk",
        "symptom",
        "withdrawal_symptom",
        "short_term_effect",
        "long_term_effect",
        "mental_health_effect",
        "sexual_health_concern",
        "prevention_action",
        "emergency_sign",
        "support_service",
        "educational_topic",
        "faq",
      ],
      kg_relation_type: [
        "causes",
        "increases_risk_of",
        "interacts_with",
        "may_lead_to",
        "linked_to",
        "supports",
        "treated_by",
        "prevented_by",
        "related_to",
        "contraindicated_with",
        "category_of",
        "has_symptom",
      ],
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
