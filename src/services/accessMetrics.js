import { useEffect, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function localDateInput(date = new Date()) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  return `${values.year}-${values.month}-${values.day}`;
}

function nextCalendarDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

export function buildDailyAccessSeries(startDate, endDate, rows = []) {
  const countsByDate = new Map(rows.map((row) => [row.access_date, Number(row.access_count) || 0]));
  const series = [];

  for (let day = startDate; day <= endDate; day = nextCalendarDate(day)) {
    series.push({ access_date: day, access_count: countsByDate.get(day) ?? 0 });
  }

  return series;
}

export function usePublicAccessTracking(route) {
  const lastTrackedPath = useRef(null);

  useEffect(() => {
    const path = route.split('?')[0] || '/';
    if (!isSupabaseConfigured || path === '/admin' || lastTrackedPath.current === path) return;

    lastTrackedPath.current = path;
    const specimenSlug = path.match(/^\/fosseis\/([^/]+)$/)?.[1] ?? null;

    // A função no banco apenas incrementa contadores diários. Nenhuma
    // informação individual de visitante é enviada ou registrada.
    void supabase.rpc('record_public_access', { p_specimen_slug: specimenSlug });
  }, [route]);
}

export async function getAccessMetrics({ startDate, endDate, specimenId = null }) {
  if (!isSupabaseConfigured) {
    return { periodTotal: 0, todayTotal: 0, series: buildDailyAccessSeries(startDate, endDate), error: 'not-configured' };
  }

  const { data, error } = await supabase.rpc('get_access_metrics', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_specimen_id: specimenId || null,
  });

  if (error) {
    return { periodTotal: 0, todayTotal: 0, series: buildDailyAccessSeries(startDate, endDate), error: error.message };
  }

  const rows = Array.isArray(data?.series) ? data.series : [];
  return {
    periodTotal: rows.reduce((total, row) => total + (Number(row.access_count) || 0), 0),
    todayTotal: Number(data?.today_total) || 0,
    series: buildDailyAccessSeries(startDate, endDate, rows),
    error: null,
  };
}
