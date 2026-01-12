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
        }
        Insert: {
          address?: string | null
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
        }
        Update: {
          address?: string | null
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
          slug: string
          start_date: string | null
          target_days: number
          title_en: string
          title_th: string
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
          slug: string
          start_date?: string | null
          target_days?: number
          title_en: string
          title_th: string
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
          slug?: string
          start_date?: string | null
          target_days?: number
          title_en?: string
          title_th?: string
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
          district: string | null
          full_name: string | null
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
          district?: string | null
          full_name?: string | null
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
          district?: string | null
          full_name?: string | null
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
      survey_views: {
        Row: {
          created_at: string
          id: string
          survey_id: string
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          survey_id: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          survey_id?: string
          updated_at?: string
          view_count?: number
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
          completed: boolean | null
          completed_at: string | null
          id: string
          progress: number | null
          quest_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          progress?: number | null
          quest_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
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
    }
    Functions: {
      generate_order_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_survey_view: { Args: { p_survey_id: string }; Returns: number }
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
