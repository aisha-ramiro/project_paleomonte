import { createClient } from '@supabase/supabase-js';
import { configureDiagnosticTransport, diagnosticFetch } from '../services/diagnosticEvents';

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
      global: { fetch: diagnosticFetch },
    })
  : null;

configureDiagnosticTransport(async (event) => {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const { error } = await supabase.rpc('record_diagnostic_event', {
    p_source: event.source, p_code: event.code, p_http_status: event.http_status,
  }).abortSignal(AbortSignal.timeout(6000));
  return !error;
});

/**
 * Registra uma abertura pública sem guardar dados que identifiquem a pessoa.
 * `keepalive` permite que o envio termine mesmo se a pessoa trocar de página
 * ou fechar a aba logo depois de abrir o site.
 */
export function recordPublicAccess(specimenSlug = null) {
  if (!isSupabaseConfigured) return Promise.resolve();

  return diagnosticFetch(`${supabaseUrl}/rest/v1/rpc/record_public_access`, {
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
