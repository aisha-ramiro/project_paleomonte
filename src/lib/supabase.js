import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente preparado para a integração com Supabase.
 * Enquanto as variáveis de ambiente não forem configuradas, a interface
 * continua usando os dados demonstrativos do protótipo.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/**
 * Registra uma abertura pública sem guardar dados que identifiquem a pessoa.
 * `keepalive` permite que o envio termine mesmo se a pessoa trocar de página
 * ou fechar a aba logo depois de abrir o site.
 */
export function recordPublicAccess(specimenSlug = null) {
  if (!isSupabaseConfigured) return Promise.resolve();

  return fetch(`${supabaseUrl}/rest/v1/rpc/record_public_access`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_specimen_slug: specimenSlug }),
    keepalive: true,
  });
}
