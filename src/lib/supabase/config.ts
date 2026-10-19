export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sem as variáveis de ambiente, o app funciona em modo demonstração (dados no navegador). */
export const isCloud = Boolean(SUPABASE_URL && SUPABASE_KEY);
