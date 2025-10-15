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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      commissions: {
        Row: {
          commission_amount: number
          commission_email: string
          commission_rate: number
          created_at: string
          id: string
          order_id: string
          order_total: number
          updated_at: string
          vendor_id: string
          vendor_name: string
        }
        Insert: {
          commission_amount: number
          commission_email: string
          commission_rate?: number
          created_at?: string
          id?: string
          order_id: string
          order_total: number
          updated_at?: string
          vendor_id: string
          vendor_name: string
        }
        Update: {
          commission_amount?: number
          commission_email?: string
          commission_rate?: number
          created_at?: string
          id?: string
          order_id?: string
          order_total?: number
          updated_at?: string
          vendor_id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          order_id: string | null
          seller_id: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          order_id?: string | null
          seller_id: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          order_id?: string | null
          seller_id?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          address: string
          city: string
          created_at: string
          days: string[]
          google_place_id: string | null
          google_rating: number | null
          google_rating_count: number | null
          hours: string | null
          id: number
          last_rating_update: string | null
          name: string
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          days?: string[]
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          hours?: string | null
          id?: number
          last_rating_update?: string | null
          name: string
          state: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          days?: string[]
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          hours?: string | null
          id?: number
          last_rating_update?: string | null
          name?: string
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_description: string | null
          product_image: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_description?: string | null
          product_image?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_description?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          email: string
          estimated_delivery_date: string | null
          id: string
          ship_from_city: string | null
          ship_from_state: string | null
          ship_to_city: string | null
          ship_to_state: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total_amount: number
          tracking_carrier: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
          vendor_id: string
          vendor_name: string
        }
        Insert: {
          created_at?: string
          email: string
          estimated_delivery_date?: string | null
          id?: string
          ship_from_city?: string | null
          ship_from_state?: string | null
          ship_to_city?: string | null
          ship_to_state?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_amount: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id: string
          vendor_name: string
        }
        Update: {
          created_at?: string
          email?: string
          estimated_delivery_date?: string | null
          id?: string
          ship_from_city?: string | null
          ship_from_state?: string | null
          ship_to_city?: string | null
          ship_to_state?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_amount?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          apple_pay_email: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last_four: string | null
          cardholder_name: string | null
          created_at: string
          id: string
          is_default: boolean
          payment_type: Database["public"]["Enums"]["payment_type"]
          paypal_email: string | null
          user_id: string
        }
        Insert: {
          apple_pay_email?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          cardholder_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          payment_type?: Database["public"]["Enums"]["payment_type"]
          paypal_email?: string | null
          user_id: string
        }
        Update: {
          apple_pay_email?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          cardholder_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          payment_type?: Database["public"]["Enums"]["payment_type"]
          paypal_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          zipcode: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          zipcode?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          photos: string[] | null
          product_id: string | null
          product_image: string | null
          product_name: string | null
          rating: number | null
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          description: string | null
          google_rating: number | null
          google_rating_count: number | null
          id: string
          latitude: number | null
          longitude: number | null
          market_address: string | null
          market_days: string[] | null
          market_hours: Json | null
          primary_specialty: string | null
          products: Json | null
          search_term: string | null
          selected_market: string | null
          selected_markets: Json | null
          status: string | null
          store_name: string
          updated_at: string
          user_id: string
          vacation_mode: boolean | null
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          market_address?: string | null
          market_days?: string[] | null
          market_hours?: Json | null
          primary_specialty?: string | null
          products?: Json | null
          search_term?: string | null
          selected_market?: string | null
          selected_markets?: Json | null
          status?: string | null
          store_name: string
          updated_at?: string
          user_id: string
          vacation_mode?: boolean | null
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          market_address?: string | null
          market_days?: string[] | null
          market_hours?: Json | null
          primary_specialty?: string | null
          products?: Json | null
          search_term?: string | null
          selected_market?: string | null
          selected_markets?: Json | null
          status?: string | null
          store_name?: string
          updated_at?: string
          user_id?: string
          vacation_mode?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string
          full_name: string | null
          id: string
          is_default: boolean
          phone: string | null
          postal_code: string
          state: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          postal_code: string
          state: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          postal_code?: string
          state?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      payment_type: "card" | "paypal" | "apple_pay"
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
      payment_type: ["card", "paypal", "apple_pay"],
    },
  },
} as const
