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
      hiv_selftest_requests: {
        Row: {
          address: string | null
          assigned_branch: string | null
          callback_phone: string | null
          created_at: string
          days_since_risk: number | null
          full_name: string | null
          id: string
          last_risk_date: string | null
          line_id: string | null
          phone: string | null
          pii_id: string | null
          postal_code: string | null
          province: string | null
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
          address?: string | null
          assigned_branch?: string | null
          callback_phone?: string | null
          created_at?: string
          days_since_risk?: number | null
          full_name?: string | null
          id?: string
          last_risk_date?: string | null
          line_id?: string | null
          phone?: string | null
          pii_id?: string | null
          postal_code?: string | null
          province?: string | null
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
          address?: string | null
          assigned_branch?: string | null
          callback_phone?: string | null
          created_at?: string
          days_since_risk?: number | null
          full_name?: string | null
          id?: string
          last_risk_date?: string | null
          line_id?: string | null
          phone?: string | null
          pii_id?: string | null
          postal_code?: string | null
          province?: string | null
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
          id: string
          is_active: boolean
          is_hot: boolean
          is_native: boolean | null
          is_new: boolean
          rejection_feedback: string | null
          require_consent: boolean | null
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
          id?: string
          is_active?: boolean
          is_hot?: boolean
          is_native?: boolean | null
          is_new?: boolean
          rejection_feedback?: string | null
          require_consent?: boolean | null
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
          id?: string
          is_active?: boolean
          is_hot?: boolean
          is_native?: boolean | null
          is_new?: boolean
          rejection_feedback?: string | null
          require_consent?: boolean | null
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
      complete_survey: {
        Args: { p_session_id?: string; p_survey_id: string }
        Returns: number
      }
      generate_order_code: { Args: never; Returns: string }
      get_article_like_count: {
        Args: { p_article_id: string }
        Returns: number
      }
      get_public_site_stats: {
        Args: never
        Returns: {
          registered_user_pageviews: number
          total_pageviews: number
          total_sessions: number
        }[]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_survey_view: { Args: { p_survey_id: string }; Returns: number }
      is_branch_staff: {
        Args: { _branch: string; _user_id: string }
        Returns: boolean
      }
      is_branch_staff_for_request: {
        Args: { _pii_id: string; _user_id: string }
        Returns: boolean
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
