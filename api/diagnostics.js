import { authorizeEditorial, privateJson } from '../server/editorialAuth.js';
import { getTranslationDiagnostics } from '../server/translationDiagnostics.js';

let cached;
export async function GET(request) {
  const auth = await authorizeEditorial(request);
  if (auth.status !== 200) return privateJson({ error: auth.error, code: auth.code }, auth.status);
  // Cache curto somente no servidor. A autorização é conferida em toda consulta.
  if (!cached || Date.now() - cached.time > 45000) {
    cached = { time: Date.now(), value: { checked_at: new Date().toISOString(), translation: await getTranslationDiagnostics() } };
  }
  return privateJson(cached.value);
}
