export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          export_path: string | null;
          export_requested: boolean;
          id: string;
          requested_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          export_path?: string | null;
          export_requested?: boolean;
          id?: string;
          requested_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          export_path?: string | null;
          export_requested?: boolean;
          id?: string;
          requested_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_deletion_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          seq: number;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          seq?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          seq?: never;
        };
        Relationships: [];
      };
      booking_events: {
        Row: {
          actor: string | null;
          booking_id: string;
          created_at: string;
          from_status: Database['public']['Enums']['booking_status'] | null;
          id: string;
          payload: NonNullable<Json>;
          seq: number;
          to_status: Database['public']['Enums']['booking_status'] | null;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          actor?: string | null;
          booking_id: string;
          created_at?: string;
          from_status?: Database['public']['Enums']['booking_status'] | null;
          id?: string;
          payload?: NonNullable<Json>;
          seq?: never;
          to_status?: Database['public']['Enums']['booking_status'] | null;
          type: string;
        };
        Update: {
          actor?: string | null;
          booking_id?: string;
          created_at?: string;
          from_status?: Database['public']['Enums']['booking_status'] | null;
          id?: string;
          payload?: NonNullable<Json>;
          seq?: never;
          to_status?: Database['public']['Enums']['booking_status'] | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_events_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          calendar_event_id: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          class_session_id: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          idempotency_key: string;
          starts_at: string;
          status: Database['public']['Enums']['booking_status'];
          subscription_id: string;
          updated_at: string;
          user_id: string;
          venue_id: string;
          waitlist_position: number | null;
        };
        ComputedFields: never;
        Insert: {
          calendar_event_id?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          class_session_id?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          idempotency_key: string;
          starts_at: string;
          status?: Database['public']['Enums']['booking_status'];
          subscription_id: string;
          updated_at?: string;
          user_id: string;
          venue_id: string;
          waitlist_position?: number | null;
        };
        Update: {
          calendar_event_id?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          class_session_id?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          idempotency_key?: string;
          starts_at?: string;
          status?: Database['public']['Enums']['booking_status'];
          subscription_id?: string;
          updated_at?: string;
          user_id?: string;
          venue_id?: string;
          waitlist_position?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_class_session_id_fkey';
            columns: ['class_session_id'];
            isOneToOne: false;
            referencedRelation: 'class_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      checkin_attempts: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          jti: string | null;
          result_code: string;
          staff_user_id: string | null;
          user_id: string | null;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          jti?: string | null;
          result_code: string;
          staff_user_id?: string | null;
          user_id?: string | null;
          venue_id: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          jti?: string | null;
          result_code?: string;
          staff_user_id?: string | null;
          user_id?: string | null;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkin_attempts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_attempts_staff_user_id_fkey';
            columns: ['staff_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_attempts_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      class_sessions: {
        Row: {
          booked_count: number;
          capacity: number;
          created_at: string;
          ends_at: string;
          id: string;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
          template_id: string;
          trainer_id: string | null;
          updated_at: string;
          venue_id: string;
          waitlist_count: number;
        };
        ComputedFields: never;
        Insert: {
          booked_count?: number;
          capacity: number;
          created_at?: string;
          ends_at: string;
          id?: string;
          starts_at: string;
          status?: Database['public']['Enums']['session_status'];
          template_id: string;
          trainer_id?: string | null;
          updated_at?: string;
          venue_id: string;
          waitlist_count?: number;
        };
        Update: {
          booked_count?: number;
          capacity?: number;
          created_at?: string;
          ends_at?: string;
          id?: string;
          starts_at?: string;
          status?: Database['public']['Enums']['session_status'];
          template_id?: string;
          trainer_id?: string | null;
          updated_at?: string;
          venue_id?: string;
          waitlist_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'class_sessions_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'class_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_sessions_trainer_id_fkey';
            columns: ['trainer_id'];
            isOneToOne: false;
            referencedRelation: 'trainers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_sessions_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      class_templates: {
        Row: {
          active: boolean;
          capacity: number;
          created_at: string;
          description: NonNullable<Json>;
          duration_min: number;
          id: string;
          level: Database['public']['Enums']['class_level'];
          name: NonNullable<Json>;
          trainer_id: string | null;
          updated_at: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          capacity: number;
          created_at?: string;
          description?: NonNullable<Json>;
          duration_min: number;
          id?: string;
          level?: Database['public']['Enums']['class_level'];
          name: NonNullable<Json>;
          trainer_id?: string | null;
          updated_at?: string;
          venue_id: string;
        };
        Update: {
          active?: boolean;
          capacity?: number;
          created_at?: string;
          description?: NonNullable<Json>;
          duration_min?: number;
          id?: string;
          level?: Database['public']['Enums']['class_level'];
          name?: NonNullable<Json>;
          trainer_id?: string | null;
          updated_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_templates_trainer_id_fkey';
            columns: ['trainer_id'];
            isOneToOne: false;
            referencedRelation: 'trainers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_templates_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      consents: {
        Row: {
          at: string;
          granted: boolean;
          id: string;
          kind: Database['public']['Enums']['consent_kind'];
          user_id: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          at?: string;
          granted: boolean;
          id?: string;
          kind: Database['public']['Enums']['consent_kind'];
          user_id: string;
          version: string;
        };
        Update: {
          at?: string;
          granted?: boolean;
          id?: string;
          kind?: Database['public']['Enums']['consent_kind'];
          user_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'consents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      devices: {
        Row: {
          app_version: string | null;
          created_at: string;
          device_name: string | null;
          id: string;
          last_seen_at: string;
          platform: Database['public']['Enums']['device_platform'];
          push_token: string | null;
          revoked_at: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform: Database['public']['Enums']['device_platform'];
          push_token?: string | null;
          revoked_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform?: Database['public']['Enums']['device_platform'];
          push_token?: string | null;
          revoked_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          user_id: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
          venue_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      feature_flags: {
        Row: {
          audience: NonNullable<Json>;
          created_at: string;
          description: string | null;
          enabled: boolean;
          key: string;
          payload: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          audience?: NonNullable<Json>;
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          key: string;
          payload?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          audience?: NonNullable<Json>;
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          key?: string;
          payload?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          bookings: boolean;
          created_at: string;
          marketing: boolean;
          quiet_hours: Json | null;
          reminders: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bookings?: boolean;
          created_at?: string;
          marketing?: boolean;
          quiet_hours?: Json | null;
          reminders?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bookings?: boolean;
          created_at?: string;
          marketing?: boolean;
          quiet_hours?: Json | null;
          reminders?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: NonNullable<Json>;
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          kind: string;
          read_at: string | null;
          sent_at: string | null;
          title: NonNullable<Json>;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: NonNullable<Json>;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          kind: string;
          read_at?: string | null;
          sent_at?: string | null;
          title: NonNullable<Json>;
          user_id: string;
        };
        Update: {
          body?: NonNullable<Json>;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          kind?: string;
          read_at?: string | null;
          sent_at?: string | null;
          title?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          from_status: Database['public']['Enums']['payment_status'] | null;
          id: string;
          payment_id: string;
          raw: NonNullable<Json>;
          seq: number;
          source: Database['public']['Enums']['payment_event_source'];
          to_status: Database['public']['Enums']['payment_status'];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          from_status?: Database['public']['Enums']['payment_status'] | null;
          id?: string;
          payment_id: string;
          raw?: NonNullable<Json>;
          seq?: never;
          source: Database['public']['Enums']['payment_event_source'];
          to_status: Database['public']['Enums']['payment_status'];
        };
        Update: {
          created_at?: string;
          from_status?: Database['public']['Enums']['payment_status'] | null;
          id?: string;
          payment_id?: string;
          raw?: NonNullable<Json>;
          seq?: never;
          source?: Database['public']['Enums']['payment_event_source'];
          to_status?: Database['public']['Enums']['payment_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'payment_events_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_methods: {
        Row: {
          created_at: string;
          expiry: string | null;
          id: string;
          is_default: boolean;
          masked_pan: string;
          provider: Database['public']['Enums']['payment_provider'];
          provider_token: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expiry?: string | null;
          id?: string;
          is_default?: boolean;
          masked_pan: string;
          provider: Database['public']['Enums']['payment_provider'];
          provider_token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expiry?: string | null;
          id?: string;
          is_default?: boolean;
          masked_pan?: string;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount_uzs: number;
          created_at: string;
          fiscal_receipt: Json | null;
          id: string;
          idempotency_key: string;
          metadata: NonNullable<Json>;
          paid_at: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          provider_txn_id: string | null;
          receipt_url: string | null;
          status: Database['public']['Enums']['payment_status'];
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_uzs: number;
          created_at?: string;
          fiscal_receipt?: Json | null;
          id?: string;
          idempotency_key: string;
          metadata?: NonNullable<Json>;
          paid_at?: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          provider_txn_id?: string | null;
          receipt_url?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_uzs?: number;
          created_at?: string;
          fiscal_receipt?: Json | null;
          id?: string;
          idempotency_key?: string;
          metadata?: NonNullable<Json>;
          paid_at?: string | null;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_txn_id?: string | null;
          receipt_url?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payouts: {
        Row: {
          amount_uzs: number;
          created_at: string;
          id: string;
          paid_at: string | null;
          period_end: string;
          period_start: string;
          status: Database['public']['Enums']['payout_status'];
          updated_at: string;
          venue_id: string;
          visits_count: number;
        };
        ComputedFields: never;
        Insert: {
          amount_uzs?: number;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          period_end: string;
          period_start: string;
          status?: Database['public']['Enums']['payout_status'];
          updated_at?: string;
          venue_id: string;
          visits_count?: number;
        };
        Update: {
          amount_uzs?: number;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          period_end?: string;
          period_start?: string;
          status?: Database['public']['Enums']['payout_status'];
          updated_at?: string;
          venue_id?: string;
          visits_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'payouts_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      penalties: {
        Row: {
          created_at: string;
          ends_at: string;
          id: string;
          kind: Database['public']['Enums']['penalty_kind'];
          source_booking_ids: string[];
          starts_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_at: string;
          id?: string;
          kind: Database['public']['Enums']['penalty_kind'];
          source_booking_ids?: string[];
          starts_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['penalty_kind'];
          source_booking_ids?: string[];
          starts_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'penalties_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          active: boolean;
          code: Database['public']['Enums']['plan_code'];
          created_at: string;
          id: string;
          max_venue_tier: number;
          name: NonNullable<Json>;
          per_venue_monthly_cap: number;
          perks: NonNullable<Json>;
          price_uzs: number;
          sort: number;
          updated_at: string;
          visits_per_month: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          code: Database['public']['Enums']['plan_code'];
          created_at?: string;
          id?: string;
          max_venue_tier: number;
          name: NonNullable<Json>;
          per_venue_monthly_cap: number;
          perks?: NonNullable<Json>;
          price_uzs: number;
          sort?: number;
          updated_at?: string;
          visits_per_month: number;
        };
        Update: {
          active?: boolean;
          code?: Database['public']['Enums']['plan_code'];
          created_at?: string;
          id?: string;
          max_venue_tier?: number;
          name?: NonNullable<Json>;
          per_venue_monthly_cap?: number;
          perks?: NonNullable<Json>;
          price_uzs?: number;
          sort?: number;
          updated_at?: string;
          visits_per_month?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          biometric_lock: boolean;
          birth_date: string | null;
          created_at: string;
          deleted_at: string | null;
          full_name: string | null;
          gender: Database['public']['Enums']['gender'] | null;
          id: string;
          locale: Database['public']['Enums']['app_locale'];
          marketing_consent_at: string | null;
          phone_e164: string | null;
          privacy_accepted_at: string | null;
          terms_accepted_at: string | null;
          theme: Database['public']['Enums']['app_theme'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          biometric_lock?: boolean;
          birth_date?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string | null;
          gender?: Database['public']['Enums']['gender'] | null;
          id: string;
          locale?: Database['public']['Enums']['app_locale'];
          marketing_consent_at?: string | null;
          phone_e164?: string | null;
          privacy_accepted_at?: string | null;
          terms_accepted_at?: string | null;
          theme?: Database['public']['Enums']['app_theme'];
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          biometric_lock?: boolean;
          birth_date?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string | null;
          gender?: Database['public']['Enums']['gender'] | null;
          id?: string;
          locale?: Database['public']['Enums']['app_locale'];
          marketing_consent_at?: string | null;
          phone_e164?: string | null;
          privacy_accepted_at?: string | null;
          terms_accepted_at?: string | null;
          theme?: Database['public']['Enums']['app_theme'];
          updated_at?: string;
        };
        Relationships: [];
      };
      qr_tokens: {
        Row: {
          device_id: string | null;
          expires_at: string;
          issued_at: string;
          jti: string;
          used_at: string | null;
          used_venue_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          device_id?: string | null;
          expires_at: string;
          issued_at?: string;
          jti: string;
          used_at?: string | null;
          used_venue_id?: string | null;
          user_id: string;
        };
        Update: {
          device_id?: string | null;
          expires_at?: string;
          issued_at?: string;
          jti?: string;
          used_at?: string | null;
          used_venue_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'qr_tokens_device_id_fkey';
            columns: ['device_id'];
            isOneToOne: false;
            referencedRelation: 'devices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'qr_tokens_used_venue_id_fkey';
            columns: ['used_venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'qr_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      review_reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          resolution: string | null;
          resolved_at: string | null;
          review_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          resolution?: string | null;
          resolved_at?: string | null;
          review_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          review_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'review_reports_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          created_at: string;
          id: string;
          rating: number;
          status: Database['public']['Enums']['review_status'];
          text: string | null;
          updated_at: string;
          user_id: string;
          venue_id: string;
          visit_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          rating: number;
          status?: Database['public']['Enums']['review_status'];
          text?: string | null;
          updated_at?: string;
          user_id: string;
          venue_id: string;
          visit_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          rating?: number;
          status?: Database['public']['Enums']['review_status'];
          text?: string | null;
          updated_at?: string;
          user_id?: string;
          venue_id?: string;
          visit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: true;
            referencedRelation: 'visits';
            referencedColumns: ['id'];
          },
        ];
      };
      sms_send_log: {
        Row: {
          created_at: string;
          id: string;
          ip: unknown;
          phone_e164: string;
          provider: string;
          provider_msg_id: string | null;
          purpose: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          ip?: unknown;
          phone_e164: string;
          provider: string;
          provider_msg_id?: string | null;
          purpose: string;
          status: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip?: unknown;
          phone_e164?: string;
          provider?: string;
          provider_msg_id?: string | null;
          purpose?: string;
          status?: string;
        };
        Relationships: [];
      };
      subscription_events: {
        Row: {
          actor: string | null;
          created_at: string;
          id: string;
          payload: NonNullable<Json>;
          seq: number;
          subscription_id: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          actor?: string | null;
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          seq?: never;
          subscription_id: string;
          type: string;
        };
        Update: {
          actor?: string | null;
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          seq?: never;
          subscription_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_events_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_freezes: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          starts_at: string;
          subscription_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          starts_at: string;
          subscription_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          starts_at?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_freezes_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          auto_renew: boolean;
          cancel_at: string | null;
          created_at: string;
          frozen_until: string | null;
          id: string;
          period_end: string;
          period_start: string;
          plan_id: string;
          scheduled_plan_id: string | null;
          status: Database['public']['Enums']['subscription_status'];
          updated_at: string;
          user_id: string;
          visits_used: number;
        };
        ComputedFields: never;
        Insert: {
          auto_renew?: boolean;
          cancel_at?: string | null;
          created_at?: string;
          frozen_until?: string | null;
          id?: string;
          period_end: string;
          period_start: string;
          plan_id: string;
          scheduled_plan_id?: string | null;
          status?: Database['public']['Enums']['subscription_status'];
          updated_at?: string;
          user_id: string;
          visits_used?: number;
        };
        Update: {
          auto_renew?: boolean;
          cancel_at?: string | null;
          created_at?: string;
          frozen_until?: string | null;
          id?: string;
          period_end?: string;
          period_start?: string;
          plan_id?: string;
          scheduled_plan_id?: string | null;
          status?: Database['public']['Enums']['subscription_status'];
          updated_at?: string;
          user_id?: string;
          visits_used?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_scheduled_plan_id_fkey';
            columns: ['scheduled_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      trainers: {
        Row: {
          active: boolean;
          bio: NonNullable<Json>;
          created_at: string;
          id: string;
          name: string;
          photo_path: string | null;
          specialties: string[];
          updated_at: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          bio?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          name: string;
          photo_path?: string | null;
          specialties?: string[];
          updated_at?: string;
          venue_id: string;
        };
        Update: {
          active?: boolean;
          bio?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          name?: string;
          photo_path?: string | null;
          specialties?: string[];
          updated_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trainers_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          role: Database['public']['Enums']['user_role'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          role: Database['public']['Enums']['user_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database['public']['Enums']['user_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      venue_categories: {
        Row: {
          created_at: string;
          icon: string;
          id: string;
          name: NonNullable<Json>;
          slug: string;
          sort: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          icon: string;
          id?: string;
          name: NonNullable<Json>;
          slug: string;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          icon?: string;
          id?: string;
          name?: NonNullable<Json>;
          slug?: string;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      venue_hours: {
        Row: {
          closes: string;
          id: string;
          opens: string;
          venue_id: string;
          weekday: number;
          women_only: boolean;
        };
        ComputedFields: never;
        Insert: {
          closes: string;
          id?: string;
          opens: string;
          venue_id: string;
          weekday: number;
          women_only?: boolean;
        };
        Update: {
          closes?: string;
          id?: string;
          opens?: string;
          venue_id?: string;
          weekday?: number;
          women_only?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'venue_hours_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      venue_photos: {
        Row: {
          blurhash: string | null;
          created_at: string;
          id: string;
          path: string;
          sort: number;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          blurhash?: string | null;
          created_at?: string;
          id?: string;
          path: string;
          sort?: number;
          venue_id: string;
        };
        Update: {
          blurhash?: string | null;
          created_at?: string;
          id?: string;
          path?: string;
          sort?: number;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'venue_photos_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      venue_staff: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          role: Database['public']['Enums']['venue_staff_role'];
          updated_at: string;
          user_id: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          role?: Database['public']['Enums']['venue_staff_role'];
          updated_at?: string;
          user_id: string;
          venue_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          role?: Database['public']['Enums']['venue_staff_role'];
          updated_at?: string;
          user_id?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'venue_staff_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'venue_staff_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      venues: {
        Row: {
          address: NonNullable<Json>;
          amenities: string[];
          cancellation_window_min: number;
          category_id: string;
          created_at: string;
          description: NonNullable<Json>;
          district: string | null;
          id: string;
          lat: number;
          lng: number;
          name: NonNullable<Json>;
          phone: string | null;
          price_tier: number;
          rating_avg: number;
          rating_count: number;
          slug: string;
          status: Database['public']['Enums']['venue_status'];
          tier: number;
          tz: string;
          updated_at: string;
          website: string | null;
          women_only_hours: Json | null;
        };
        ComputedFields: never;
        Insert: {
          address: NonNullable<Json>;
          amenities?: string[];
          cancellation_window_min?: number;
          category_id: string;
          created_at?: string;
          description?: NonNullable<Json>;
          district?: string | null;
          id?: string;
          lat: number;
          lng: number;
          name: NonNullable<Json>;
          phone?: string | null;
          price_tier?: number;
          rating_avg?: number;
          rating_count?: number;
          slug: string;
          status?: Database['public']['Enums']['venue_status'];
          tier?: number;
          tz?: string;
          updated_at?: string;
          website?: string | null;
          women_only_hours?: Json | null;
        };
        Update: {
          address?: NonNullable<Json>;
          amenities?: string[];
          cancellation_window_min?: number;
          category_id?: string;
          created_at?: string;
          description?: NonNullable<Json>;
          district?: string | null;
          id?: string;
          lat?: number;
          lng?: number;
          name?: NonNullable<Json>;
          phone?: string | null;
          price_tier?: number;
          rating_avg?: number;
          rating_count?: number;
          slug?: string;
          status?: Database['public']['Enums']['venue_status'];
          tier?: number;
          tz?: string;
          updated_at?: string;
          website?: string | null;
          women_only_hours?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'venues_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'venue_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      visits: {
        Row: {
          booking_id: string | null;
          checked_in_at: string;
          created_at: string;
          id: string;
          manual_reason: string | null;
          method: Database['public']['Enums']['visit_method'];
          qr_jti: string | null;
          staff_user_id: string | null;
          subscription_id: string;
          user_id: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          checked_in_at?: string;
          created_at?: string;
          id?: string;
          manual_reason?: string | null;
          method: Database['public']['Enums']['visit_method'];
          qr_jti?: string | null;
          staff_user_id?: string | null;
          subscription_id: string;
          user_id: string;
          venue_id: string;
        };
        Update: {
          booking_id?: string | null;
          checked_in_at?: string;
          created_at?: string;
          id?: string;
          manual_reason?: string | null;
          method?: Database['public']['Enums']['visit_method'];
          qr_jti?: string | null;
          staff_user_id?: string | null;
          subscription_id?: string;
          user_id?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'visits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_qr_jti_fkey';
            columns: ['qr_jti'];
            isOneToOne: true;
            referencedRelation: 'qr_tokens';
            referencedColumns: ['jti'];
          },
          {
            foreignKeyName: 'visits_staff_user_id_fkey';
            columns: ['staff_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      webhook_inbox: {
        Row: {
          external_id: string;
          id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          processing_error: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          received_at: string;
        };
        ComputedFields: never;
        Insert: {
          external_id: string;
          id?: string;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          processing_error?: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          received_at?: string;
        };
        Update: {
          external_id?: string;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          processing_error?: string | null;
          provider?: Database['public']['Enums']['payment_provider'];
          received_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      app_role: { Args: Record<PropertyKey, never>; Returns: string[] };
      current_user_id: { Args: Record<PropertyKey, never>; Returns: string };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      ensure_updated_at_triggers: { Args: Record<PropertyKey, never>; Returns: undefined };
      has_role: { Args: { p_role: string }; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_venue_owner: { Args: { p_venue_id: string }; Returns: boolean };
      is_venue_staff: { Args: { p_venue_id: string }; Returns: boolean };
      jsonb_i18n_valid: { Args: { p_value: Json }; Returns: boolean };
      rpc_nearby_venues: {
        Args: {
          p_category?: string;
          p_lat: number;
          p_limit?: number;
          p_lng: number;
          p_open_now?: boolean;
          p_radius_m?: number;
        };
        Returns: {
          address: Json;
          amenities: string[];
          cancellation_window_min: number;
          category_id: string;
          category_slug: string;
          description: Json;
          distance_m: number;
          district: string;
          id: string;
          lat: number;
          lng: number;
          name: Json;
          phone: string;
          price_tier: number;
          rating_avg: number;
          rating_count: number;
          slug: string;
          status: Database['public']['Enums']['venue_status'];
          tier: number;
          tz: string;
          website: string;
          women_only_hours: Json;
        }[];
      };
      rpc_venue_is_open: { Args: { p_at?: string; p_venue_id: string }; Returns: boolean };
      sms_rate_limit_check: {
        Args: { p_ip?: string; p_now?: string; p_phone_e164: string; p_purpose?: string };
        Returns: Json;
      };
      venue_is_active: { Args: { p_venue_id: string }; Returns: boolean };
    };
    Enums: {
      app_locale: 'ru' | 'uz' | 'en';
      app_theme: 'system' | 'light' | 'dark';
      booking_status:
        'confirmed' | 'waitlisted' | 'cancelled' | 'checked_in' | 'no_show' | 'expired';
      class_level: 'any' | 'beginner' | 'intermediate' | 'advanced';
      consent_kind: 'terms' | 'privacy' | 'marketing';
      device_platform: 'ios' | 'android' | 'web';
      gender: 'female' | 'male';
      payment_event_source: 'client' | 'webhook' | 'admin' | 'system';
      payment_provider: 'payme' | 'click' | 'uzum' | 'mock';
      payment_status: 'created' | 'pending' | 'paid' | 'failed' | 'refunded' | 'disputed';
      payout_status: 'draft' | 'approved' | 'paid';
      penalty_kind: 'no_show_block';
      plan_code: 'basic' | 'standard' | 'premium';
      review_status: 'published' | 'hidden' | 'under_review';
      session_status: 'scheduled' | 'cancelled' | 'completed';
      subscription_status:
        'pending_payment' | 'active' | 'past_due' | 'frozen' | 'cancelled' | 'expired';
      user_role: 'member' | 'partner' | 'admin';
      venue_staff_role: 'owner' | 'staff';
      venue_status: 'draft' | 'active' | 'paused' | 'archived';
      visit_method: 'qr' | 'manual';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_locale: ['ru', 'uz', 'en'],
      app_theme: ['system', 'light', 'dark'],
      booking_status: ['confirmed', 'waitlisted', 'cancelled', 'checked_in', 'no_show', 'expired'],
      class_level: ['any', 'beginner', 'intermediate', 'advanced'],
      consent_kind: ['terms', 'privacy', 'marketing'],
      device_platform: ['ios', 'android', 'web'],
      gender: ['female', 'male'],
      payment_event_source: ['client', 'webhook', 'admin', 'system'],
      payment_provider: ['payme', 'click', 'uzum', 'mock'],
      payment_status: ['created', 'pending', 'paid', 'failed', 'refunded', 'disputed'],
      payout_status: ['draft', 'approved', 'paid'],
      penalty_kind: ['no_show_block'],
      plan_code: ['basic', 'standard', 'premium'],
      review_status: ['published', 'hidden', 'under_review'],
      session_status: ['scheduled', 'cancelled', 'completed'],
      subscription_status: [
        'pending_payment',
        'active',
        'past_due',
        'frozen',
        'cancelled',
        'expired',
      ],
      user_role: ['member', 'partner', 'admin'],
      venue_staff_role: ['owner', 'staff'],
      venue_status: ['draft', 'active', 'paused', 'archived'],
      visit_method: ['qr', 'manual'],
    },
  },
} as const;
