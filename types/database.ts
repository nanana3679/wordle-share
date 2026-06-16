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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_anon_id: string
          resolved: boolean
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_anon_id: string
          resolved?: boolean
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_anon_id?: string
          resolved?: boolean
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          deck_id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          ip_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          anon_id: string
          created_at: string
          deck_id: string
          deleted: boolean
          hidden: boolean
          id: string
          nick: string
          pw_hash: string
          report_count: number
          text: string
          thread_date: string
        }
        Insert: {
          anon_id: string
          created_at?: string
          deck_id: string
          deleted?: boolean
          hidden?: boolean
          id?: string
          nick: string
          pw_hash: string
          report_count?: number
          text: string
          thread_date: string
        }
        Update: {
          anon_id?: string
          created_at?: string
          deck_id?: string
          deleted?: boolean
          hidden?: boolean
          id?: string
          nick?: string
          pw_hash?: string
          report_count?: number
          text?: string
          thread_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_runs: {
        Row: {
          anon_id: string
          attempts: Json
          created_at: string
          current_round: number
          date: string
          deck_id: string
          ended_reason: string | null
          score: number
          shuffle_order: string[]
          updated_at: string
          version: number
        }
        Insert: {
          anon_id: string
          attempts?: Json
          created_at?: string
          current_round?: number
          date: string
          deck_id: string
          ended_reason?: string | null
          score?: number
          shuffle_order: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          anon_id?: string
          attempts?: Json
          created_at?: string
          current_round?: number
          date?: string
          deck_id?: string
          ended_reason?: string | null
          score?: number
          shuffle_order?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_runs_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_rounds: {
        Row: {
          anon_id: string
          attempts: Json
          created_at: string
          date: string
          deck_id: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          anon_id: string
          attempts?: Json
          created_at?: string
          date: string
          deck_id: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          anon_id?: string
          attempts?: Json
          created_at?: string
          date?: string
          deck_id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_rounds_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_words: {
        Row: {
          active_word_ids: string[]
          date: string
          deck_id: string
          locked_at: string
          word_id: string
        }
        Insert: {
          active_word_ids: string[]
          date: string
          deck_id: string
          locked_at?: string
          word_id: string
        }
        Update: {
          active_word_ids?: string[]
          date?: string
          deck_id?: string
          locked_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_words_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string
          creator_id: string
          creator_nick: string
          creator_pw_hash: string
          hidden: boolean
          id: string
          image_url: string | null
          like_count: number
          name: string
          report_count: number
          script: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          creator_nick: string
          creator_pw_hash: string
          hidden?: boolean
          id?: string
          image_url?: string | null
          like_count?: number
          name: string
          report_count?: number
          script?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          creator_nick?: string
          creator_pw_hash?: string
          hidden?: boolean
          id?: string
          image_url?: string | null
          like_count?: number
          name?: string
          report_count?: number
          script?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      words: {
        Row: {
          active: boolean
          created_at: string
          deck_id: string
          id: string
          text: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deck_id: string
          id?: string
          text: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deck_id?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "words_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_deck_words_with_version: {
        Args: {
          p_deck_id: string
          p_deactivate_ids: string[]
          p_expected_version: number
          p_insert_texts: string[]
          p_reactivate_ids: string[]
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
