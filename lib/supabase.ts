import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://roimbcfpjyqhtzlyspbb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Standard Supabase client instance for client & server components.
 * If NEXT_PUBLIC_SUPABASE_ANON_KEY is not yet populated in .env.local,
 * calls will gracefully notify or fall back until configured.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'placeholder-anon-key');

