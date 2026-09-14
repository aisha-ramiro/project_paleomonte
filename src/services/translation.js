import { supabase } from '../lib/supabase';

export async function translateSpecimen(record, targetLanguage = 'EN-US') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Faça login novamente para gerar a tradução.');

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ record, targetLanguage }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Não foi possível gerar a tradução.');
  return payload.translation;
}
