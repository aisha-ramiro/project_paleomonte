function primaryCategory(row) {
  const relation = row.specimen_categories?.find((item) => item.is_primary) ?? row.specimen_categories?.[0];
  return relation?.categories?.name ?? 'Acervo';
}

export function mapSpecimen(row, urls) {
  const media = (row.specimen_media ?? [])
    .map((relation) => ({ ...relation, ...relation.media, url: urls.get(relation.media?.id) ?? null }))
    .filter((item) => item.status === 'approved')
    .sort((first, second) => first.display_order - second.display_order);
  const cover = media.find((item) => item.purpose === 'cover' && item.type === 'image' && item.url) ?? media.find((item) => item.type === 'image' && item.url);

  return {
    id: row.id,
    slug: row.slug,
    name: row.scientific_name,
    validatedAt: row.validated_at,
    isFeatured: row.is_featured === true,
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


export function featuredSpecimens(specimens) {
  return specimens.filter((item) => item.isFeatured === true).slice(0, 4);
}
