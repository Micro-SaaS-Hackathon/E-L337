import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabaseClient] Missing Supabase environment variables. Fill them in .env.local');
}

export function createClientComponentClient() {
  return createBrowserClient(
    supabaseUrl || 'http://localhost',
    supabaseAnonKey || 'public-anon-key'
  );
}

export const supabase = createClientComponentClient();
