import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function primaryCategory(row) {
  const relation = row.specimen_categories?.find((item) => item.is_primary) ?? row.specimen_categories?.[0];
  return relation?.categories?.name ?? 'Acervo';
}

async function signedMediaUrls(rows) {
  const approvedMedia = rows.flatMap((row) => row.specimen_media ?? [])
    .map((relation) => relation.media)
    .filter((media) => media?.status === 'approved' && media.storage_path);

  const entries = await Promise.all(approvedMedia.map(async (media) => {
    const { data } = await supabase.storage.from(media.storage_bucket).createSignedUrl(media.storage_path, 3600);
    return [media.id, data?.signedUrl ?? null];
  }));

  return new Map(entries);
}

function mapSpecimen(row, urls) {
  const media = (row.specimen_media ?? [])
    .map((relation) => ({ ...relation, ...relation.media, url: urls.get(relation.media?.id) ?? null }))
    .filter((item) => item.status === 'approved')
    .sort((first, second) => first.display_order - second.display_order);
  const cover = media.find((item) => item.purpose === 'cover') ?? media.find((item) => item.type === 'image');

  return {
    id: row.id,
    slug: row.slug,
    name: row.scientific_name,
    commonName: row.common_name,
    category: primaryCategory(row),
    period: row.geological_period ?? '',
    era: row.geological_era,
    discoveryYear: row.discovery_year,
    discoveredBy: row.discovered_by,
    type: row.specimen_type ?? '',
    diet: row.diet ?? '',
    lengthMeters: row.length_meters,
    length: row.length_meters ? `${row.length_meters} metros` : '',
    location: row.discovery_location ?? '',
    description: row.description ?? row.summary ?? '',
    summary: row.summary,
    translations: Object.fromEntries(['en', 'es'].map((language) => [language, row.translations?.[language] ? {
      commonName: row.translations[language].commonName,
      category: row.translations[language].category,
      summary: row.translations[language].summary,
      description: row.translations[language].description,
      period: row.translations[language].period,
      era: row.translations[language].era,
      location: row.translations[language].location,
      discoveredBy: row.translations[language].discoveredBy,
      type: row.translations[language].type,
      diet: row.translations[language].diet,
      additionalInfo: row.translations[language].additionalInfo,
    } : {}])),
    image: cover?.url ?? null,
    imageAlt: cover?.alt_text || `Imagem do espécime ${row.scientific_name}`,
    media,
  };
}

export function usePublicCatalog() {
  const [state, setState] = useState({ loading: true, specimens: [], error: null });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const reload = useCallback(() => setRefreshVersion((current) => current + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ loading: false, specimens: [], error: 'A conexão com o catálogo não está configurada.' });
      return undefined;
    }

    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('specimens')
        .select(`
          id, scientific_name, common_name, slug, summary, description, translations,
          geological_period, geological_era, discovery_location, discovery_year, discovered_by, specimen_type, diet, length_meters,
          specimen_categories(is_primary, categories(name, slug)),
          specimen_media(purpose, display_order, media(id, storage_bucket, storage_path, type, status, alt_text))
        `)
        .eq('status', 'published')
        .order('scientific_name');

      if (error) {
        if (active) setState({ loading: false, specimens: [], error: error.message });
        return;
      }

      const urls = await signedMediaUrls(data ?? []);
      if (active) setState({ loading: false, specimens: (data ?? []).map((row) => mapSpecimen(row, urls)), error: null });
    };

    load();
    return () => { active = false; };
  }, [refreshVersion]);

  return { ...state, reload };
}
