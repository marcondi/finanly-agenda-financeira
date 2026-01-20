import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE
 * As chaves são lidas das variáveis de ambiente injetadas pelo Vite.
 * Crie um arquivo .env na raiz do projeto com as suas chaves.
 * Ex:
 * VITE_SUPABASE_URL=https://seu-projeto.supabase.co
 * VITE_SUPABASE_ANON_KEY=sua-chave-anon
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;


// Verificação de segurança: Chaves anon do Supabase são sempre JWTs (começam com eyJ)
export const isSupabaseConfigured = 
  supabaseUrl && supabaseUrl.includes('supabase.co') && 
  supabaseAnonKey && supabaseAnonKey.startsWith('eyJ');

// Inicializa o cliente, mas apenas se as chaves estiverem presentes
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : {} as any; // Fornece um objeto vazio para evitar erros quando não configurado