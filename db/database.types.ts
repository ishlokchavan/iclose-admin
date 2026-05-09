/**
 * Database types stub — reflects the Phase 2 schema.
 * Full auto-generation in Phase 7 via:
 *   npx supabase gen types typescript --project-id gqnftdkgqfowjhmrpgth > db/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: 'super_admin' | 'content_manager' | 'agent_manager' | 'agent' | 'auditor'
          status: 'active' | 'inactive' | 'suspended'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      agents: {
        Row: {
          id: string
          profile_id: string | null
          full_name: string
          phone_encrypted: string | null
          email_encrypted: string | null
          anonymous_id: string
          is_licensed_agent: boolean
          deal_volume: '0-1' | '1-3' | '3-5' | '5-10' | '10+' | null
          application_status: 'applied' | 'contacted' | 'qualified' | 'approved' | 'active' | 'rejected' | 'inactive'
          source: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          ip_hash: string | null
          user_agent: string | null
          kyc_status: 'not_started' | 'pending' | 'verified' | 'rejected'
          kyc_documents_encrypted: string | null
          payout_details_encrypted: string | null
          assigned_to: string | null
          notes: string | null
          applied_at: string
          contacted_at: string | null
          qualified_at: string | null
          approved_at: string | null
          rejected_at: string | null
          last_active_at: string | null
          total_commission_earned: string
          total_commission_paid: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['agents']['Row']> & { full_name: string }
        Update: Partial<Database['public']['Tables']['agents']['Row']>
      }
      deals: {
        Row: {
          id: string
          agent_id: string
          property_ref: string
          buyer_anonymous_id: string
          amount: string
          commission_rate: string
          commission_amount: string
          status: 'pending' | 'signed' | 'paid' | 'cancelled'
          signed_at: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['deals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['deals']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity: string
          entity_id: string | null
          before_json: Json | null
          after_json: Json | null
          ip: string | null
          ua: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      auth_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      role: 'super_admin' | 'content_manager' | 'agent_manager' | 'agent' | 'auditor'
      profile_status: 'active' | 'inactive' | 'suspended'
      application_status: 'applied' | 'contacted' | 'qualified' | 'approved' | 'active' | 'rejected' | 'inactive'
      deal_status: 'pending' | 'signed' | 'paid' | 'cancelled'
      advance_status: 'requested' | 'approved' | 'disbursed' | 'rejected'
      kyc_status: 'not_started' | 'pending' | 'verified' | 'rejected'
      deal_volume: '0-1' | '1-3' | '3-5' | '5-10' | '10+'
    }
  }
}
