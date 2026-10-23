export const specimenStatuses = {
  draft: 'Rascunho', in_review: 'Em revisão', published: 'Publicado', archived: 'Arquivado',
};

export const emptySpecimen = {
  museum_code: '', scientific_name: '', common_name: '', slug: '', summary: '', description: '',
  geological_period: '', geological_era: '', geological_age: '', geological_formation: '',
  discovery_location: '', discovery_year: '', discovered_by: '', latitude: '', longitude: '',
  specimen_type: '', diet: '', length_meters: '', additional_info: '', is_featured: false, status: 'draft',
};

export const slugify = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function normalizeSpecimen(specimen = {}) {
  return Object.fromEntries(Object.entries(emptySpecimen).map(([key, fallback]) => [key, specimen[key] ?? fallback]));
}

export function specimenPayload(form, canPublish) {
  const normalized = normalizeSpecimen(form);
  const numbers = ['discovery_year', 'latitude', 'longitude', 'length_meters'];
  const payload = Object.fromEntries(Object.keys(emptySpecimen).map((key) => {
    const value = normalized[key];
    if (key === 'is_featured') return [key, Boolean(value)];
    if (numbers.includes(key)) return [key, String(value).trim() === '' ? null : Number(value)];
    return [key, String(value).trim() || null];
  }));
  payload.slug ||= slugify(payload.scientific_name);
  payload.status = canPublish ? normalized.status : 'draft';
  if (!payload.scientific_name || !payload.slug) throw new Error('Informe o nome científico e a URL da espécie.');
  if (!Object.hasOwn(specimenStatuses, payload.status)) throw new Error('Selecione um status válido.');
  if (numbers.some((key) => payload[key] !== null && !Number.isFinite(payload[key]))) throw new Error('Confira os campos numéricos do cadastro.');
  return payload;
}

// Consulta os vínculos atuais para incluir fotos antigas e recém-enviadas.
// Fotos arquivadas não são aprovadas novamente pela publicação da espécie.
export async function approvePendingSpecimenImages(client, specimenId, userId) {
  const { data, error } = await client.from('specimen_media').select('media(id, type, status, alt_text)').eq('specimen_id', specimenId);
  if (error) throw error;
  const pending = (data ?? []).map((item) => item.media).filter((media) => media?.type === 'image' && media.status === 'pending');
  if (pending.some((media) => !media.alt_text?.trim())) throw new Error('Preencha a descrição acessível de todas as fotos pendentes antes de publicar. Abra Editar para completar as descrições.');
  if (!pending.length) return;
  const ids = [...new Set(pending.map((media) => media.id))];
  const { data: approved, error: approvalError } = await client.from('media').update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() }).in('id', ids).eq('status', 'pending').select('id');
  if (approvalError) throw approvalError;
  if (approved?.length !== ids.length) throw new Error('Algumas fotos não puderam ser aprovadas. Atualize o cadastro e tente novamente.');
}

export async function changeSpecimenStatus(client, specimenId, status) {
  if (!Object.hasOwn(specimenStatuses, status)) throw new Error('Selecione um status válido.');
  if (status === 'published') {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new Error('Sua sessão expirou. Entre novamente para publicar.');
    await approvePendingSpecimenImages(client, specimenId, user.id);
  }
  const { data, error } = await client.from('specimens').update({ status }).eq('id', specimenId).select('id, status').single();
  if (error) throw error;
  return data;
}
