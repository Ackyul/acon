import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const aconUrl = process.env.ACON_SUPABASE_URL;
const aconKey = process.env.ACON_SUPABASE_SERVICE_ROLE_KEY;

const aourumUrl = process.env.AOURUM_SUPABASE_URL;
const aourumKey = process.env.AOURUM_SUPABASE_ANON_KEY;

if (!aconUrl || !aconKey) {
  console.warn('Warning: ACON_SUPABASE_URL or ACON_SUPABASE_SERVICE_ROLE_KEY is missing in env.');
}

if (!aourumUrl || !aourumKey) {
  console.warn('Warning: AOURUM_SUPABASE_URL or AOURUM_SUPABASE_ANON_KEY is missing in env.');
}

// Cliente para la base de datos propia de Acon (Lectura/Escritura con service role key)
export const aconSupabase = createClient(aconUrl || '', aconKey || '');

// Cliente para la base de datos externa de Aourum (Lectura con anon key)
export const aourumSupabase = createClient(aourumUrl || '', aourumKey || '');
