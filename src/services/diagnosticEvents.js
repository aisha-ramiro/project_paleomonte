import { classifyFailure, diagnosticCodes, diagnosticSources } from './diagnosticModel.js';

const storageKey = 'paleomonte-diagnostics-v1';
const changeEvent = 'paleomonte-diagnostics-change';
let memoryEvents = [];
let transport;
let flushing = false;
let lastFlush = 0;
let installed = false;
let storageUnavailable = false;

export function readLocalDiagnosticEvents() {
  if (storageUnavailable) return memoryEvents;
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value.filter((event) => diagnosticSources[event.source] && diagnosticCodes[event.code]).slice(0, 40) : [];
  } catch { return memoryEvents; }
}

function writeEvents(events) {
  memoryEvents = events.slice(0, 40);
  try { window.localStorage.setItem(storageKey, JSON.stringify(memoryEvents)); } catch { storageUnavailable = true; }
  window.dispatchEvent(new Event(changeEvent));
}

export function subscribeDiagnosticEvents(callback) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener(changeEvent, callback); window.removeEventListener('storage', callback); };
}

export function recordDiagnosticEvent(source, code, status = null) {
  if (!diagnosticSources[source] || !diagnosticCodes[code]) return;
  const events = readLocalDiagnosticEvents();
  const previous = events.find((event) => event.source === source && event.code === code);
  const now = new Date().toISOString();
  // Agrupa repetições rápidas sem guardar texto, URL, credenciais ou dados do cadastro.
  if (previous && new Date(now) - new Date(previous.last_seen) < 10000) return;
  writeEvents([{ source, code, http_status: Number(status) || null, first_seen: previous?.first_seen ?? now, last_seen: now, occurrences: (previous?.occurrences ?? 0) + 1, acknowledged_at: null }, ...events.filter((event) => event !== previous)]);
  void flushDiagnosticEvents();
}

export function acknowledgeLocalDiagnosticEvent(source, code, lastSeen) {
  writeEvents(readLocalDiagnosticEvents().map((event) => event.source === source && event.code === code && event.last_seen === lastSeen ? { ...event, acknowledged_at: new Date().toISOString(), synced_at: event.last_seen } : event));
}

export function configureDiagnosticTransport(send) { transport = send; }

export async function flushDiagnosticEvents() {
  if (!transport || flushing || Date.now() - lastFlush < 60000 || !navigator.onLine) return;
  const pending = readLocalDiagnosticEvents().filter((event) => event.synced_at !== event.last_seen && !event.acknowledged_at).slice(0, 5);
  if (!pending.length) return;
  flushing = true;
  lastFlush = Date.now();
  try {
    for (const event of pending) {
      if (!(await transport(event))) break;
      writeEvents(readLocalDiagnosticEvents().map((item) => item.source === event.source && item.code === event.code && item.last_seen === event.last_seen ? { ...item, synced_at: item.last_seen } : item));
    }
  } catch { /* Falhas da própria coleta não geram novos eventos em sequência. */ }
  finally { flushing = false; }
}

function sourceForUrl(input) {
  const path = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, window.location.origin).pathname;
  if (/diagnostic/.test(path)) return null;
  if (path.includes('/api/translate')) return 'translation';
  if (path.includes('/storage/')) return 'storage';
  if (path.includes('/functions/v1/admin-users')) return 'users';
  if (/access_metrics|record_public_access/.test(path)) return 'access';
  if (path.includes('/auth/')) return 'auth';
  if (path.includes('/rest/v1/')) return 'database';
  return null;
}

export async function diagnosticFetch(input, init) {
  const source = sourceForUrl(input);
  try {
    const response = await fetch(input, init);
    if (source && !response.ok) {
      const payload = await response.clone().json().catch(() => ({}));
      recordDiagnosticEvent(source, classifyFailure(response.status, payload.code), response.status);
    }
    return response;
  } catch (error) {
    if (source && error.name !== 'AbortError' && error.name !== 'TimeoutError') recordDiagnosticEvent(source, 'network');
    throw error;
  }
}

export function installRuntimeDiagnostics() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (event) => {
    if (event.error) recordDiagnosticEvent('interface', 'runtime_error');
    else if (event.target instanceof HTMLImageElement) recordDiagnosticEvent('storage', 'request_failed');
    else if (event.target instanceof HTMLScriptElement) recordDiagnosticEvent('interface', 'runtime_error');
    else if (event.target instanceof HTMLLinkElement) recordDiagnosticEvent('interface', 'request_failed');
  }, true);
  window.addEventListener('unhandledrejection', () => recordDiagnosticEvent('interface', 'runtime_error'));
}
