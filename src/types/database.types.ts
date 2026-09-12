export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'ADMIN' | 'DELIVERY_PARTNER';

export type DeliveryStatus =
  | 'ASSIGNED'
  | 'ARRIVED_AT_RESTAURANT'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'RESTAURANT_ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      restaurants: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          address: string;
          city: string;
          state: string;
          postal_code: string;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          banner_url: string | null;
          cuisine_types: string[];
          is_active: boolean;
          is_accepting_orders: boolean;
          rating: number;
          total_reviews: number;
          delivery_time_min: number;
          delivery_time_max: number;
          minimum_order: number;
          delivery_fee: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          address: string;
          city?: string;
          state?: string;
          postal_code: string;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          cuisine_types?: string[];
          is_active?: boolean;
          is_accepting_orders?: boolean;
          rating?: number;
          total_reviews?: number;
          delivery_time_min?: number;
          delivery_time_max?: number;
          minimum_order?: number;
          delivery_fee?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          address?: string;
          city?: string;
          state?: string;
          postal_code?: string;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          cuisine_types?: string[];
          is_active?: boolean;
          is_accepting_orders?: boolean;
          rating?: number;
          total_reviews?: number;
          delivery_time_min?: number;
          delivery_time_max?: number;
          minimum_order?: number;
          delivery_fee?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      restaurant_staff: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      restaurant_hours: {
        Row: {
          id: string;
          restaurant_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_closed: boolean;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_closed?: boolean;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          is_closed?: boolean;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_veg: boolean;
          is_available: boolean;
          preparation_time_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_veg?: boolean;
          is_available?: boolean;
          preparation_time_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_veg?: boolean;
          is_available?: boolean;
          preparation_time_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          landmark: string | null;
          latitude: number | null;
          longitude: number | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state?: string;
          postal_code: string;
          landmark?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          landmark?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          restaurant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          restaurant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          menu_item_id: string;
          quantity: number;
          special_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          menu_item_id: string;
          quantity: number;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          menu_item_id?: string;
          quantity?: number;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          restaurant_id: string;
          delivery_address_id: string | null;
          delivery_address_snapshot: Json;
          status: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          coupon_id: string | null;
          customer_notes: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id: string;
          restaurant_id: string;
          delivery_address_id?: string | null;
          delivery_address_snapshot: Json;
          status?: OrderStatus;
          subtotal: number;
          delivery_fee?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount: number;
          coupon_id?: string | null;
          customer_notes?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_id?: string;
          restaurant_id?: string;
          delivery_address_id?: string | null;
          delivery_address_snapshot?: Json;
          status?: OrderStatus;
          subtotal?: number;
          delivery_fee?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          coupon_id?: string | null;
          customer_notes?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          unit_price: number;
          quantity: number;
          total_price: number;
          special_instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          unit_price: number;
          quantity: number;
          total_price: number;
          special_instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          item_name?: string;
          unit_price?: number;
          quantity?: number;
          total_price?: number;
          special_instructions?: string | null;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          amount: number;
          currency: string;
          status: PaymentStatus;
          error_code: string | null;
          error_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          error_code?: string | null;
          error_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          error_code?: string | null;
          error_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          discount_type: DiscountType;
          discount_value: number;
          min_order_amount: number;
          max_discount_amount: number | null;
          valid_from: string;
          valid_until: string;
          usage_limit: number | null;
          per_user_limit: number;
          times_used: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          discount_type?: DiscountType;
          discount_value: number;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          valid_from?: string;
          valid_until: string;
          usage_limit?: number | null;
          per_user_limit?: number;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          discount_type?: DiscountType;
          discount_value?: number;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          valid_from?: string;
          valid_until?: string;
          usage_limit?: number | null;
          per_user_limit?: number;
          times_used?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupon_usage: {
        Row: {
          id: string;
          coupon_id: string;
          user_id: string;
          order_id: string;
          discount_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          order_id: string;
          discount_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          user_id?: string;
          order_id?: string;
          discount_amount?: number;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          restaurant_id: string;
          customer_id: string;
          rating: number;
          comment: string | null;
          owner_reply: string | null;
          owner_replied_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          restaurant_id: string;
          customer_id: string;
          rating: number;
          comment?: string | null;
          owner_reply?: string | null;
          owner_replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          restaurant_id?: string;
          customer_id?: string;
          rating?: number;
          comment?: string | null;
          owner_reply?: string | null;
          owner_replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          order_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          order_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          order_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
        };
      };
      delivery_assignments: {
        Row: {
          id: string;
          order_id: string;
          driver_id: string | null;
          driver_name: string | null;
          driver_phone: string | null;
          vehicle_details: string | null;
          status: string;
          assigned_at: string;
          picked_up_at: string | null;
          delivered_at: string | null;
          current_latitude: number | null;
          current_longitude: number | null;
          heading: number | null;
          last_location_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          driver_id?: string | null;
          driver_name?: string | null;
          driver_phone?: string | null;
          vehicle_details?: string | null;
          status?: string;
          assigned_at?: string;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          heading?: number | null;
          last_location_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          driver_id?: string | null;
          driver_name?: string | null;
          driver_phone?: string | null;
          vehicle_details?: string | null;
          status?: string;
          assigned_at?: string;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          heading?: number | null;
          last_location_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      discount_type: DiscountType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type Restaurant = Tables<'restaurants'>;
export type MenuCategory = Tables<'menu_categories'>;
export type MenuItem = Tables<'menu_items'>;
export type Address = Tables<'addresses'>;
export type Cart = Tables<'carts'>;
export type CartItem = Tables<'cart_items'>;
export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type Payment = Tables<'payments'>;
export type Coupon = Tables<'coupons'>;
export type Review = Tables<'reviews'>;
export type Notification = Tables<'notifications'>;
export type DeliveryAssignment = Tables<'delivery_assignments'>;
