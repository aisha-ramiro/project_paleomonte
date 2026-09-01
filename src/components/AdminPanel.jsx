import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Cropper from 'react-easy-crop';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAccessMetrics, localDateInput } from '../services/accessMetrics';

const rolesThatCanAccessAdmin = ['admin', 'operator'];
const rolesThatCanManageContent = ['admin', 'operator'];
const rolesThatCanPublish = ['admin', 'operator'];
const roleLabels = {
  admin: 'Administrador',
  operator: 'Operador',
};

const emptySpecimen = {
  museum_code: '', scientific_name: '', common_name: '', slug: '', summary: '', description: '',
  geological_period: '', geological_era: '', geological_age: '', geological_formation: '',
  discovery_location: '', discovery_year: '', discovered_by: '', latitude: '', longitude: '',
  specimen_type: '', diet: '', length_meters: '', additional_info: '', is_featured: false,
  status: 'draft',
};

const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const catalogImageAspect = 4 / 3;

async function functionErrorMessage(invokeError, data, fallback = 'Não foi possível concluir esta ação.') {
  if (data?.error) return data.error;
  try {
    const response = invokeError?.context;
    if (response?.clone) {
      const payload = await response.clone().json();
      if (payload?.error) return payload.error;
    }
  } catch {
    // A mensagem padrão abaixo é usada quando a resposta não contém JSON.
  }
  return invokeError?.message || fallback;
}

function AdminBrand() {
  return <a className="admin-brand" href="#/" aria-label="Voltar à página inicial"><span>☼</span><strong>Paleo<br/>Monte</strong></a>;
}

function useAdminSession() {
  const [state, setState] = useState({ loading: true, session: null, roles: [], error: null });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ loading: false, session: null, roles: [], error: null });
      return undefined;
    }

    let active = true;
    const hydrate = async (session) => {
      if (!session) {
        if (active) setState({ loading: false, session: null, roles: [], error: null });
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (active) {
        setState({
          loading: false,
          session,
          roles: data?.map(({ role }) => role) ?? [],
          error: error?.message ?? null,
        });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => hydrate(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => hydrate(session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordSetupUrl = () => `${window.location.origin}/definir-senha`;

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    setLoading(true);
    const { error: signInError } = recoveryMode
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: passwordSetupUrl() })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError(recoveryMode ? `Não foi possível enviar o e-mail: ${signInError.message}` : 'Não foi possível entrar. Confira seu e-mail e senha.'); return; }
    if (recoveryMode) setMessage('Se este e-mail tiver acesso, enviaremos um link para criar ou redefinir a senha.');
  };

  const changeMode = () => { setRecoveryMode((current) => !current); setError(''); setMessage(''); };
  return <main className="admin-login"><div className="login-card"><AdminBrand/><p className="eyebrow">Área restrita</p><h1>{recoveryMode ? 'Criar ou redefinir senha' : 'Acesse o painel'}</h1><p>{recoveryMode ? 'Informe o e-mail do convite. Você receberá um link seguro para definir sua senha.' : 'Use as credenciais fornecidas pela administração do PaleoMonte.'}</p><form onSubmit={submit} className="admin-form"><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email"/></label>{!recoveryMode && <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password"/></label>}{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}<button className="button green" disabled={loading}>{loading ? 'Aguarde...' : recoveryMode ? 'Enviar link de acesso' : 'Entrar'}</button></form><button className="login-text-action" type="button" onClick={changeMode}>{recoveryMode ? 'Já tenho senha' : 'Primeiro acesso ou esqueceu a senha?'}</button><a href="#/">← Voltar ao site</a></div></main>;
}

function AdminSetPassword({ session, loadingSession }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (password.length < 8) { setError('Use uma senha com pelo menos 8 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { requires_password_setup: false } });
    setSaving(false);
    if (updateError) { setError('Não foi possível salvar a senha. Abra novamente o link recebido por e-mail.'); return; }
    setSuccess(true);
    window.setTimeout(() => { window.location.assign(`${window.location.origin}/#/admin`); }, 800);
  };

  if (loadingSession) return <main className="admin-login"><div className="login-card"><AdminBrand/><p>Validando seu link de acesso...</p></div></main>;
  if (!session) return <main className="admin-login"><div className="login-card"><AdminBrand/><p className="eyebrow">Link indisponível</p><h1>Não foi possível validar o acesso</h1><p>Este link pode ter expirado ou já ter sido usado. Solicite um novo convite ou use a opção de criar ou redefinir senha.</p><a className="button green" href="#/admin">Ir para o acesso</a></div></main>;
  return <main className="admin-login"><div className="login-card"><AdminBrand/><p className="eyebrow">Primeiro acesso</p><h1>Defina sua senha</h1><p>Você está configurando o acesso de <b>{session.user.email}</b> ao painel PaleoMonte.</p><form onSubmit={submit} className="admin-form"><label>Nova senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" autoComplete="new-password"/></label><label>Confirmar nova senha<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength="8" autoComplete="new-password"/></label>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status">Senha criada. Redirecionando para o painel...</p>}<button className="button green" disabled={saving || success}>{saving ? 'Salvando...' : 'Salvar senha e entrar'}</button></form></div></main>;
}

function AdminSetup() {
  return <main className="admin-login"><div className="login-card"><AdminBrand/><p className="eyebrow">Configuração necessária</p><h1>Supabase ainda não está disponível</h1><p>Crie o arquivo <code>.env.local</code> com a URL do projeto e a chave Publishable antes de acessar o painel.</p><a className="button green" href="#/">Voltar ao site</a></div></main>;
}

function AdminAccessDenied({ session, roles, onSignOut }) {
  return <main className="admin-login"><div className="login-card"><AdminBrand/><p className="eyebrow">Acesso limitado</p><h1>Sem permissão administrativa</h1><p>O usuário <b>{session.user.email}</b> está autenticado, mas não possui um papel editorial.</p><p>Peça a um administrador para atribuir um dos papéis permitidos no Supabase.</p><div className="role-list">Papéis atuais: {roles.length ? roles.map((role) => roleLabels[role] ?? role).join(', ') : 'nenhum'}</div><button className="button green" onClick={onSignOut}>Sair</button></div></main>;
}

function StatCard({ label, value, note }) {
  return <article><span>{label}</span><b>{value ?? '—'}</b><small>{note}</small></article>;
}

function formatShortDate(date) {
  if (!date) return '—';
  const value = new Date(`${date}T12:00:00`);
  return Number.isNaN(value.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(value);
}

function formatAccessCount(value) {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

function AccessLineChart({ startDate, endDate, series, periodTotal, loading, error, specimenName }) {
  const chartSeries = series.length ? series : [{ access_date: startDate, access_count: 0 }, { access_date: endDate, access_count: 0 }];
  const maxValue = Math.max(...chartSeries.map((item) => item.access_count), 1);
  const hasRecords = chartSeries.some((item) => item.access_count > 0);
  const pointFor = (item, index) => {
    const x = chartSeries.length === 1 ? 301 : 32 + (532 * index) / (chartSeries.length - 1);
    const y = 144 - ((item.access_count / maxValue) * 104);
    return { x, y };
  };
  const points = chartSeries.map((item, index) => {
    const point = pointFor(item, index);
    return `${point.x},${point.y}`;
  }).join(' ');
  const message = loading
    ? 'Carregando acessos...'
    : error
      ? 'Aplique a migration de acessos no Supabase para iniciar a coleta.'
      : !hasRecords
        ? 'Sem acessos registrados para este filtro.'
        : null;
  const ariaLabel = `Gráfico de linha com ${formatAccessCount(periodTotal)} acessos ${specimenName ? `da espécie ${specimenName}` : 'do site'} no período selecionado.`;

  return <div className="access-chart"><div className="access-chart-heading"><div><p className="eyebrow">{specimenName ? 'Espécie selecionada' : 'Acessos no período'}</p><h2>{specimenName ? specimenName : 'Evolução dos acessos'}</h2></div><span>{loading ? '…' : `${formatAccessCount(periodTotal)} acessos`}</span></div><div className="chart-frame"><svg viewBox="0 0 600 170" role="img" aria-label={ariaLabel}><line x1="32" x2="570" y1="24" y2="24"/><line x1="32" x2="570" y1="64" y2="64"/><line x1="32" x2="570" y1="104" y2="104"/><line x1="32" x2="570" y1="144" y2="144"/><polyline points={points} fill="none"/>{chartSeries.map((item, index) => { const point = pointFor(item, index); return <circle cx={point.x} cy={point.y} r={index === 0 || index === chartSeries.length - 1 ? '3' : '1.7'} key={item.access_date}/>; })}</svg><div className="chart-labels"><span>{formatShortDate(startDate)}</span><span>{formatShortDate(endDate)}</span></div>{message && <p>{message}</p>}</div></div>;
}

function AdminDashboard({ roles }) {
  const [summary, setSummary] = useState({ loading: true, specimens: null, categories: null, media: null, qrCodes: null });
  const [accessMetrics, setAccessMetrics] = useState({ loading: true, periodTotal: 0, todayTotal: 0, series: [], error: null });
  const [trackedSpecimens, setTrackedSpecimens] = useState([]);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState('');
  const currentDate = new Date();
  const [startDate, setStartDate] = useState(() => `${localDateInput().slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(localDateInput);
  const canManage = roles.some((role) => rolesThatCanManageContent.includes(role));
  const selectedSpecimen = trackedSpecimens.find((specimen) => specimen.id === selectedSpecimenId);

  useEffect(() => {
    let active = true;
    const count = (table) => supabase.from(table).select('*', { count: 'exact', head: true });
    Promise.all([count('specimens'), count('categories'), count('media'), canManage ? count('qr_codes') : Promise.resolve({ count: null })])
      .then(([specimens, categories, media, qrCodes]) => {
        if (active) setSummary({ loading: false, specimens: specimens.count, categories: categories.count, media: media.count, qrCodes: qrCodes.count });
      });
    return () => { active = false; };
  }, [canManage]);

  useEffect(() => {
    let active = true;
    supabase.from('specimens').select('id, scientific_name').order('scientific_name').then(({ data }) => {
      if (active) setTrackedSpecimens(data ?? []);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadMetrics = () => {
      if (!active) return;
      setAccessMetrics((current) => ({ ...current, loading: true }));
      getAccessMetrics({ startDate, endDate, specimenId: selectedSpecimenId || null }).then((metrics) => {
        if (active) setAccessMetrics({ loading: false, ...metrics });
      }).catch(() => {
        if (active) setAccessMetrics({ loading: false, periodTotal: 0, todayTotal: 0, series: [], error: 'unavailable' });
      });
    };

    loadMetrics();
    window.addEventListener('focus', loadMetrics);
    return () => {
      active = false;
      window.removeEventListener('focus', loadMetrics);
    };
  }, [startDate, endDate, selectedSpecimenId]);

  return <><div className="metrics"><StatCard label="Espécies cadastradas" value={summary.loading ? '…' : summary.specimens} note="Registros no banco"/><StatCard label="Categorias" value={summary.loading ? '…' : summary.categories} note="Organização do acervo"/><StatCard label="Mídias" value={summary.loading ? '…' : summary.media} note="Fotos, áudios e documentos"/><StatCard label="QR Codes" value={summary.loading ? '…' : summary.qrCodes} note={canManage ? 'Códigos registrados' : 'Acesso de curadoria'}/></div><section className="access-dashboard"><div className="access-dashboard-head"><div><p className="eyebrow">Acompanhamento do site</p><h2>Acessos</h2></div><div className="date-filter"><label>Visualizar<select value={selectedSpecimenId} onChange={(event) => setSelectedSpecimenId(event.target.value)} aria-label="Selecionar espécie para visualizar acessos"><option value="">Todos — site geral e espécies</option>{trackedSpecimens.map((specimen) => <option value={specimen.id} key={specimen.id}>{specimen.scientific_name}</option>)}</select></label><label>De<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)}/></label><label>Até<input type="date" value={endDate} min={startDate} max={localDateInput(currentDate)} onChange={(event) => setEndDate(event.target.value)}/></label></div></div><div className="access-dashboard-body"><div className="access-summary"><article><span>{selectedSpecimen ? 'Acessos da espécie' : 'Acessos no período'}</span><b>{accessMetrics.loading ? '…' : formatAccessCount(accessMetrics.periodTotal)}</b><small>{formatShortDate(startDate)} a {formatShortDate(endDate)}</small></article><article><span>Acessos hoje</span><b>{accessMetrics.loading ? '…' : formatAccessCount(accessMetrics.todayTotal)}</b><small>{formatShortDate(localDateInput(currentDate))}</small></article><p>{accessMetrics.error ? 'A coleta começará após aplicar a migration de acessos no Supabase.' : selectedSpecimen ? `Contadores diários de ${selectedSpecimen.scientific_name}, sem registrar informações individuais de visitantes.` : 'Contadores diários agregados, sem registrar informações individuais de visitantes.'}</p></div><AccessLineChart startDate={startDate} endDate={endDate} series={accessMetrics.series} periodTotal={accessMetrics.periodTotal} loading={accessMetrics.loading} error={accessMetrics.error} specimenName={selectedSpecimen?.scientific_name}/></div></section></>;
}

function SectionMessage({ title, children }) {
  return <div className="admin-empty"><span>▧</span><h2>{title}</h2><p>{children}</p></div>;
}

async function uploadSpecimenFile({ specimenId, file, kind, altText, transcript, userId, approve, purpose, displayOrder = 0 }) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `specimens/${specimenId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('museum-media').upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data: media, error: mediaError } = await supabase.from('media').insert({
    storage_path: storagePath,
    type: kind,
    mime_type: file.type,
    size_bytes: file.size,
    alt_text: altText || null,
    transcript: transcript || null,
    status: approve ? 'approved' : 'pending',
    created_by: userId,
    approved_by: approve ? userId : null,
    approved_at: approve ? new Date().toISOString() : null,
  }).select().single();
  if (mediaError) throw mediaError;

  const { error: linkError } = await supabase.from('specimen_media').insert({
    specimen_id: specimenId,
    media_id: media.id,
    purpose: kind === 'image' ? purpose : 'audio_description',
    display_order: displayOrder,
  });
  if (linkError) throw linkError;
}

async function deleteExistingSpecimenImage({ specimenId, draft }) {
  const { error: unlinkError } = await supabase
    .from('specimen_media')
    .delete()
    .eq('specimen_id', specimenId)
    .eq('media_id', draft.mediaId);
  if (unlinkError) throw unlinkError;

  const { count, error: usageError } = await supabase
    .from('specimen_media')
    .select('*', { count: 'exact', head: true })
    .eq('media_id', draft.mediaId);
  if (usageError) throw usageError;
  if ((count ?? 0) > 0) return;

  const { error: storageError } = await supabase.storage.from(draft.storageBucket).remove([draft.storagePath]);
  if (storageError) throw storageError;
  const { error: mediaError } = await supabase.from('media').delete().eq('id', draft.mediaId);
  if (mediaError) throw mediaError;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function centeredCrop(image) {
  const imageAspect = image.width / image.height;
  if (imageAspect > catalogImageAspect) {
    const height = image.height;
    const width = height * catalogImageAspect;
    return { x: (image.width - width) / 2, y: 0, width, height };
  }
  const width = image.width;
  const height = width / catalogImageAspect;
  return { x: 0, y: (image.height - height) / 2, width, height };
}

async function createCatalogImage(draft) {
  const image = await loadImage(draft.previewUrl);
  const crop = draft.croppedAreaPixels ?? centeredCrop(image);
  const outputWidth = Math.min(1600, Math.round(crop.width));
  const outputHeight = Math.round(outputWidth / catalogImageAspect);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);

  const outputType = draft.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Não foi possível preparar a imagem.')), outputType, .92));
  const baseName = draft.file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '-');
  const extension = outputType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${baseName}-catalogo.${extension}`, { type: outputType });
}

function ImageCropEditor({ draft, onChange }) {
  const onCropComplete = (_croppedArea, croppedAreaPixels) => onChange({ croppedAreaPixels });

  return <div className="image-crop-editor">
    <div className="crop-canvas"><Cropper image={draft.previewUrl} crop={draft.crop} zoom={draft.zoom} aspect={catalogImageAspect} minZoom={1} maxZoom={3} onCropChange={(crop) => onChange({ crop })} onZoomChange={(zoom) => onChange({ zoom })} onCropComplete={onCropComplete} showGrid={false}/></div>
    <div className="crop-controls"><label>Zoom da imagem<input type="range" min="1" max="3" step="0.05" value={draft.zoom} onChange={(event) => onChange({ zoom: Number(event.target.value) })}/></label><p>Arraste a foto dentro da moldura para escolher o enquadramento. A área exibida equivale à imagem do catálogo.</p></div>
  </div>;
}

async function createQrCode({ specimenId, slug, userId }) {
  const encodedUrl = `${window.location.origin}/#/fosseis/${slug}`;
  const dataUrl = await QRCode.toDataURL(encodedUrl, {
    width: 768,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0d4234', light: '#fffdf8' },
  });
  const imageBlob = await (await fetch(dataUrl)).blob();
  const imagePath = `qrcodes/${slug}-${Date.now()}.png`;
  const { error: uploadError } = await supabase.storage.from('museum-media').upload(imagePath, imageBlob, { contentType: 'image/png', upsert: false });
  if (uploadError) throw uploadError;

  const { data: existing, error: existingError } = await supabase.from('qr_codes').select('id, version').eq('specimen_id', specimenId).maybeSingle();
  if (existingError) throw existingError;
  const payload = { public_path: `/fosseis/${slug}`, image_path: imagePath, status: 'active', generated_by: userId, generated_at: new Date().toISOString() };
  const { error: saveError } = existing
    ? await supabase.from('qr_codes').update({ ...payload, version: existing.version + 1 }).eq('id', existing.id)
    : await supabase.from('qr_codes').insert({ ...payload, specimen_id: specimenId });
  if (saveError) throw saveError;
}

function getQrCode(specimen) {
  if (Array.isArray(specimen?.qr_codes)) return specimen.qr_codes.find((code) => code.status === 'active') ?? specimen.qr_codes[0] ?? null;
  return specimen?.qr_codes ?? null;
}

function escapePrintHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function PrintQrCodeButton({ specimen, onError }) {
  const qrCode = getQrCode(specimen);

  const print = async () => {
    if (!qrCode?.image_path) {
      onError('Esta espécie ainda não possui um QR Code. Abra “Editar”, marque a geração do QR Code e salve o cadastro.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=720,height=860');
    if (!printWindow) {
      onError('O navegador bloqueou a janela de impressão. Permita pop-ups para este endereço e tente novamente.');
      return;
    }

    printWindow.document.write('<!doctype html><html lang="pt-BR"><head><title>Preparando QR Code</title></head><body><p>Preparando o QR Code para impressão…</p></body></html>');
    printWindow.document.close();

    const { data, error } = await supabase.storage.from('museum-media').createSignedUrl(qrCode.image_path, 300);
    if (error || !data?.signedUrl) {
      printWindow.close();
      onError(`Não foi possível abrir o QR Code para impressão: ${error?.message ?? 'arquivo não encontrado'}.`);
      return;
    }

    const scientificName = escapePrintHtml(specimen.scientific_name);
    const commonName = escapePrintHtml(specimen.common_name || '');
    const destination = escapePrintHtml(`${window.location.origin}/#${qrCode.public_path}`);
    const imageUrl = escapePrintHtml(data.signedUrl);
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR Code — ${scientificName}</title><style>body{margin:0;padding:38px;font-family:Arial,sans-serif;color:#15231e;text-align:center}main{max-width:520px;margin:auto;border:1px solid #ded8cd;border-radius:12px;padding:30px}h1{font-size:24px;margin:0 0 7px}p{font-size:14px;line-height:1.5}img{width:min(100%,420px);height:auto;margin:20px auto;display:block}.url{font-size:11px;overflow-wrap:anywhere;color:#4f5b55}@media print{body{padding:0}main{border:0}}</style></head><body><main><p>Museu de Paleontologia de Monte Alto - SP</p><h1>${scientificName}</h1>${commonName ? `<p>${commonName}</p>` : ''}<img src="${imageUrl}" alt="QR Code para ${scientificName}"><p class="url">Destino: ${destination}</p></main><script>window.addEventListener('load', function () { window.setTimeout(function () { window.print(); }, 250); });<\/script></body></html>`);
    printWindow.document.close();
  };

  return <button className="text-button" onClick={print}>Imprimir QR Code</button>;
}

function SpecimenForm({ specimen, roles, onSaved, onCancel }) {
  const [form, setForm] = useState(specimen ? {
    ...emptySpecimen,
    ...specimen,
    length_meters: specimen.length_meters ?? '',
    discovery_year: specimen.discovery_year ?? '',
    latitude: specimen.latitude ?? '',
    longitude: specimen.longitude ?? '',
  } : emptySpecimen);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(specimen?.specimen_categories?.find((item) => item.is_primary)?.category_id ?? specimen?.specimen_categories?.[0]?.category_id ?? '');
  const [imageDrafts, setImageDrafts] = useState([]);
  const [removedExistingImages, setRemovedExistingImages] = useState([]);
  const [activeImageId, setActiveImageId] = useState(null);
  const [generateQr, setGenerateQr] = useState(!specimen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canPublish = roles.some((role) => rolesThatCanPublish.includes(role));
  const canManage = roles.some((role) => rolesThatCanManageContent.includes(role));
  const hasExistingCover = imageDrafts.some((draft) => draft.existing && draft.isCover);
  const activeImage = imageDrafts.find((draft) => draft.id === activeImageId) ?? imageDrafts[0] ?? null;
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateImage = (id, changes) => setImageDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...changes } : draft));
  const selectCover = (id) => setImageDrafts((current) => current.map((draft) => ({ ...draft, isCover: draft.id === id })));
  const removeImage = (id) => {
    const removed = imageDrafts.find((draft) => draft.id === id);
    if (!removed) return;
    if (removed.existing) setRemovedExistingImages((images) => [...images, removed]);
    else URL.revokeObjectURL(removed.previewUrl);
    setImageDrafts((current) => {
      const next = current.filter((draft) => draft.id !== id);
      if (removed.isCover && next.length) next[0] = { ...next[0], isCover: true };
      if (activeImageId === id) setActiveImageId(next[0]?.id ?? null);
      return next;
    });
  };
  const addImages = (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const firstNewImageId = crypto.randomUUID();
    setImageDrafts((current) => {
      const shouldSelectCover = !hasExistingCover && !current.some((draft) => draft.isCover);
      const drafts = files.map((file, index) => ({ id: index === 0 ? firstNewImageId : crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), altText: '', crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, isCover: shouldSelectCover && index === 0 }));
      return [...current, ...drafts];
    });
    setActiveImageId(firstNewImageId);
    event.target.value = '';
  };

  useEffect(() => { supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name').then(({ data }) => setCategories(data ?? [])); }, []);

  useEffect(() => {
    let active = true;
    const loadExistingImages = async () => {
      const relations = (specimen?.specimen_media ?? []).filter((relation) => relation.media?.type === 'image' && relation.media.storage_path);
      if (!relations.length) return;
      const images = await Promise.all(relations.map(async (relation) => {
        const { data } = await supabase.storage.from(relation.media.storage_bucket).createSignedUrl(relation.media.storage_path, 3600);
        return {
          id: `existing-${relation.media.id}`,
          existing: true,
          mediaId: relation.media.id,
          storageBucket: relation.media.storage_bucket,
          storagePath: relation.media.storage_path,
          previewUrl: data?.signedUrl ?? '',
          altText: relation.media.alt_text ?? '',
          isCover: relation.purpose === 'cover',
          displayOrder: relation.display_order ?? 0,
        };
      }));
      if (!active) return;
      const validImages = images.filter((image) => image.previewUrl);
      if (validImages.length && !validImages.some((image) => image.isCover)) validImages[0].isCover = true;
      setImageDrafts(validImages.sort((first, second) => first.displayOrder - second.displayOrder));
      setActiveImageId(validImages[0]?.id ?? null);
    };
    void loadExistingImages();
    return () => { active = false; };
  }, [specimen]);

  const submit = async (event) => {
    event.preventDefault();
    if (canManage && !categoryId) { setError('Selecione uma categoria para a espécie.'); return; }
    if (imageDrafts.some((draft) => !draft.altText.trim()) && canPublish && form.status === 'published') { setError('Informe a descrição de cada imagem antes de publicar a espécie.'); return; }
    setSaving(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { museum_code: form.museum_code.trim() || null, scientific_name: form.scientific_name.trim(), common_name: form.common_name.trim() || null, slug: form.slug || slugify(form.scientific_name), summary: form.summary.trim() || null, description: form.description.trim() || null, geological_period: form.geological_period.trim() || null, geological_era: form.geological_era.trim() || null, geological_age: form.geological_age.trim() || null, geological_formation: form.geological_formation.trim() || null, discovery_location: form.discovery_location.trim() || null, discovery_year: form.discovery_year === '' ? null : Number(form.discovery_year), discovered_by: form.discovered_by.trim() || null, latitude: form.latitude === '' ? null : Number(form.latitude), longitude: form.longitude === '' ? null : Number(form.longitude), specimen_type: form.specimen_type.trim() || null, diet: form.diet.trim() || null, length_meters: form.length_meters === '' ? null : Number(form.length_meters), additional_info: form.additional_info.trim() || null, is_featured: Boolean(form.is_featured), status: canPublish ? form.status : 'draft' };
    const query = specimen ? supabase.from('specimens').update(payload).eq('id', specimen.id).select().single() : supabase.from('specimens').insert({ ...payload, created_by: user.id }).select().single();
    const { data, error: saveError } = await query;
    if (saveError) { setSaving(false); setError(saveError.message); return; }
    const warnings = [];
    if (canManage) {
      const { error: clearCategoryError } = await supabase.from('specimen_categories').delete().eq('specimen_id', data.id);
      if (clearCategoryError) warnings.push(`categoria: ${clearCategoryError.message}`);
      else {
        const { error: categoryError } = await supabase.from('specimen_categories').insert({ specimen_id: data.id, category_id: categoryId, is_primary: true });
        if (categoryError) warnings.push(`categoria: ${categoryError.message}`);
      }
    }
    const approveMedia = canPublish && form.status === 'published';
    const chosenCover = imageDrafts.find((draft) => draft.isCover);
    for (const [index, draft] of removedExistingImages.entries()) {
      try {
        await deleteExistingSpecimenImage({ specimenId: data.id, draft });
      } catch (mediaError) { warnings.push(`remoção da imagem ${index + 1}: ${mediaError.message}`); }
    }
    if (chosenCover) {
      const { error: coverError } = await supabase.from('specimen_media').update({ purpose: 'gallery' }).eq('specimen_id', data.id).eq('purpose', 'cover');
      if (coverError) warnings.push(`imagem de capa: ${coverError.message}`);
      else if (chosenCover.existing) {
        const { error: selectedCoverError } = await supabase.from('specimen_media').update({ purpose: 'cover' }).eq('specimen_id', data.id).eq('media_id', chosenCover.mediaId);
        if (selectedCoverError) warnings.push(`imagem de capa: ${selectedCoverError.message}`);
      }
    }
    for (const [index, draft] of imageDrafts.filter((draft) => !draft.existing).entries()) {
      try {
        const catalogImage = await createCatalogImage(draft);
        const displayOrder = imageDrafts.findIndex((image) => image.id === draft.id);
        await uploadSpecimenFile({ specimenId: data.id, file: catalogImage, kind: 'image', altText: draft.altText.trim(), userId: user.id, approve: approveMedia, purpose: draft.isCover ? 'cover' : 'gallery', displayOrder: displayOrder < 0 ? index : displayOrder });
      } catch (mediaError) { warnings.push(`imagem ${index + 1}: ${mediaError.message}`); }
    }
    if (generateQr && canManage) { try { await createQrCode({ specimenId: data.id, slug: payload.slug, userId: user.id }); } catch (qrError) { warnings.push(`QR Code: ${qrError.message}`); } }
    setSaving(false);
    onSaved(data, warnings);
  };

  const currentQrCode = getQrCode(specimen);
  return <form className="admin-form specimen-form" onSubmit={submit}>
    <div className="form-heading"><div><p className="eyebrow">{specimen ? 'Edição completa' : 'Novo registro'}</p><h2>{specimen ? 'Editar espécie' : 'Cadastrar espécie'}</h2></div><button type="button" className="text-button" onClick={onCancel}>Cancelar</button></div>
    <div className="form-grid"><label>Código do museu<input value={form.museum_code} onChange={(event) => update('museum_code', event.target.value)}/></label><label>Nome científico *<input value={form.scientific_name} onChange={(event) => { update('scientific_name', event.target.value); if (!specimen) update('slug', slugify(event.target.value)); }} required/></label><label>Nome popular<input value={form.common_name} onChange={(event) => update('common_name', event.target.value)}/></label><label>Slug / URL *<input value={form.slug} onChange={(event) => update('slug', slugify(event.target.value))} required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label>{canManage && <label>Categoria *<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="">Selecione uma categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}<label>Tipo<input value={form.specimen_type} onChange={(event) => update('specimen_type', event.target.value)}/></label><label>Período geológico<input value={form.geological_period} onChange={(event) => update('geological_period', event.target.value)}/></label><label>Era geológica<input value={form.geological_era} onChange={(event) => update('geological_era', event.target.value)}/></label><label>Idade geológica<input value={form.geological_age} onChange={(event) => update('geological_age', event.target.value)}/></label><label>Formação geológica<input value={form.geological_formation} onChange={(event) => update('geological_formation', event.target.value)}/></label><label>Local da descoberta<input value={form.discovery_location} onChange={(event) => update('discovery_location', event.target.value)}/></label><label>Ano da descoberta<input type="number" min="0" max="2100" step="1" value={form.discovery_year} onChange={(event) => update('discovery_year', event.target.value)}/></label><label>Descoberto por<input value={form.discovered_by} onChange={(event) => update('discovered_by', event.target.value)}/></label><label>Latitude<input type="number" min="-90" max="90" step="0.000001" value={form.latitude} onChange={(event) => update('latitude', event.target.value)}/></label><label>Longitude<input type="number" min="-180" max="180" step="0.000001" value={form.longitude} onChange={(event) => update('longitude', event.target.value)}/></label><label>Dieta<input value={form.diet} onChange={(event) => update('diet', event.target.value)}/></label><label>Comprimento (metros)<input type="number" min="0" step="0.01" value={form.length_meters} onChange={(event) => update('length_meters', event.target.value)}/></label>{canPublish && <label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Rascunho</option><option value="in_review">Em revisão</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>}<label className="check-label"><input type="checkbox" checked={form.is_featured} onChange={(event) => update('is_featured', event.target.checked)}/> Destacar na página inicial</label><label className="full">Resumo<input value={form.summary} onChange={(event) => update('summary', event.target.value)} maxLength="280"/></label><label className="full">Descrição<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="6"/></label><label className="full">Informações adicionais<textarea value={form.additional_info} onChange={(event) => update('additional_info', event.target.value)} rows="4"/></label></div>
    <fieldset className="asset-fieldset"><legend>Fotos da espécie</legend><p>Selecione quantas fotos desejar. Ajuste cada foto nova dentro da moldura antes de salvar: o enquadramento 4:3 será exatamente o usado no catálogo.</p><label className="upload-label">Adicionar fotos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages}/></label>{imageDrafts.length > 0 && <div className="image-workspace"><div className="image-draft-list">{imageDrafts.map((draft, index) => <article className={draft.id === activeImage?.id ? 'active' : ''} key={draft.id}><button type="button" onClick={() => setActiveImageId(draft.id)}><img src={draft.previewUrl} alt=""/><span>Foto {index + 1}{draft.isCover ? ' · Capa' : ''}{draft.existing ? ' · Salva' : ''}</span></button><button type="button" className="image-draft-remove" onClick={() => removeImage(draft.id)} aria-label={`Remover foto ${index + 1}`}>×</button></article>)}</div>{activeImage && (activeImage.existing ? <div className="image-editing existing-image-editing"><h3>Foto {imageDrafts.findIndex((draft) => draft.id === activeImage.id) + 1} já salva</h3><img src={activeImage.previewUrl} alt={activeImage.altText || 'Foto cadastrada da espécie'}/><p>Esta foto já está no catálogo. Você pode removê-la ou marcá-la como capa. Para alterar o enquadramento, remova-a e envie uma nova versão.</p><label className="check-label"><input type="checkbox" checked={activeImage.isCover} onChange={() => selectCover(activeImage.id)}/> Usar como imagem de capa no catálogo</label></div> : <div className="image-editing"><h3>Enquadrar foto {imageDrafts.findIndex((draft) => draft.id === activeImage.id) + 1}</h3><ImageCropEditor draft={activeImage} onChange={(changes) => updateImage(activeImage.id, changes)}/><label>Descrição acessível desta foto *<textarea rows="3" value={activeImage.altText} onChange={(event) => updateImage(activeImage.id, { altText: event.target.value })} placeholder="Descreva o que aparece nesta imagem."/></label><label className="check-label"><input type="checkbox" checked={activeImage.isCover} onChange={() => selectCover(activeImage.id)}/> Usar como imagem de capa no catálogo</label></div>)}</div>}<p className="helper-text">As fotos salvas aparecem aqui para consulta, definição de capa ou exclusão. A primeira foto nova é escolhida como capa automaticamente apenas quando não houver uma capa selecionada.</p></fieldset>
    {canManage && <fieldset className="asset-fieldset qr-fieldset"><legend>QR Code</legend>{currentQrCode?.image_path && <p>Há um QR Code ativo (versão {currentQrCode.version}). Depois de salvar, use “Imprimir QR Code” na listagem de espécies para visualizar, imprimir ou salvar em PDF.</p>}<label className="check-label"><input type="checkbox" checked={generateQr} onChange={(event) => setGenerateQr(event.target.checked)}/> Gerar ou atualizar o QR Code desta espécie agora</label><p>Enquanto o projeto estiver local, o código apontará para a rota local. Ele deverá ser regenerado ao publicar o domínio definitivo.</p></fieldset>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="button green" disabled={saving}>{saving ? 'Salvando cadastro...' : 'Salvar espécie, fotos e QR Code'}</button></div>
  </form>;
}

function SpeciesManager({ roles, onCatalogChanged }) {
  const [specimens, setSpecimens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const canDelete = roles.some((role) => rolesThatCanPublish.includes(role));

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.from('specimens').select('*, specimen_categories(category_id, is_primary), specimen_media(purpose, display_order, media(id, storage_bucket, storage_path, type, alt_text, status)), qr_codes(id, image_path, public_path, status, version)').order('updated_at', { ascending: false });
    setLoading(false);
    if (loadError) { setError(loadError.message); return; }
    setSpecimens(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (specimen) => {
    if (!window.confirm(`Excluir “${specimen.scientific_name}”? Esta ação não pode ser desfeita.`)) return;
    const { error: removeError } = await supabase.from('specimens').delete().eq('id', specimen.id);
    if (removeError) { setError(removeError.message); return; }
    onCatalogChanged?.();
    load();
  };

  if (editing) return <SpecimenForm specimen={editing === 'new' ? null : editing} roles={roles} onCancel={() => setEditing(null)} onSaved={(_data, warnings) => { setEditing(null); setNotice(warnings.length ? `Espécie salva, mas houve pendência em: ${warnings.join(' | ')}` : 'Espécie, categoria, mídias e QR Code salvos.'); onCatalogChanged?.(); load(); }}/>;
  return <section className="admin-section"><div className="section-toolbar"><div><p className="eyebrow">Catálogo administrativo</p><h2>Espécies</h2></div><button className="button green" onClick={() => setEditing('new')}>＋ Nova espécie</button></div>{notice && <p className="form-success">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}{loading ? <SectionMessage title="Carregando espécies">Consultando os registros do catálogo.</SectionMessage> : specimens.length === 0 ? <SectionMessage title="Nenhuma espécie cadastrada">Quando receber o conteúdo validado pelo museu, cadastre o primeiro registro aqui.</SectionMessage> : <div className="data-table"><table><thead><tr><th>Espécie</th><th>Período</th><th>Status</th><th>Atualização</th><th/></tr></thead><tbody>{specimens.map((specimen) => <tr key={specimen.id}><td><b>{specimen.scientific_name}</b><small>{specimen.common_name || specimen.slug}</small></td><td>{specimen.geological_period || '—'}</td><td><span className={`status ${specimen.status}`}>{specimen.status}</span></td><td>{new Intl.DateTimeFormat('pt-BR').format(new Date(specimen.updated_at))}</td><td><button className="text-button" onClick={() => setEditing(specimen)}>Editar</button><PrintQrCodeButton specimen={specimen} onError={(message) => { setNotice(''); setError(message); }}/>{canDelete && <button className="text-button danger" onClick={() => remove(specimen)}>Excluir</button>}</td></tr>)}</tbody></table></div>}</section>;
}

function CategoriesManager() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => { const { data, error: loadError } = await supabase.from('categories').select('*').order('name'); if (loadError) setError(loadError.message); else setCategories(data ?? []); };
  useEffect(() => { load(); }, []);
  const reset = () => { setForm({ name: '', slug: '', description: '' }); setEditingId(null); setError(''); };
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSaving(true);
    const payload = { name: form.name.trim(), slug: form.slug || slugify(form.name), description: form.description.trim() || null };
    const query = editingId
      ? supabase.from('categories').update(payload).eq('id', editingId)
      : supabase.from('categories').insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user.id });
    const { error: saveError } = await query;
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    reset(); load();
  };
  const edit = (category) => { setEditingId(category.id); setForm({ name: category.name, slug: category.slug, description: category.description || '' }); };
  const remove = async (category) => { if (!window.confirm(`Excluir a categoria “${category.name}”?`)) return; setError(''); const { error: deleteError } = await supabase.from('categories').delete().eq('id', category.id); if (deleteError) { setError(deleteError.message); return; } if (editingId === category.id) reset(); load(); };
  return <section className="admin-section"><div className="section-toolbar"><div><p className="eyebrow">Estrutura do acervo</p><h2>Categorias</h2></div></div><div className="manager-split"><form className="admin-form compact-form" onSubmit={submit}><h3>{editingId ? 'Editar categoria' : 'Nova categoria'}</h3><label>Nome *<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: editingId ? current.slug : slugify(event.target.value) }))} required/></label><label>Slug *<input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} required/></label><label>Descrição<textarea rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}/></label><div className="form-actions"><button className="button green" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar categoria'}</button>{editingId && <button type="button" className="text-button" onClick={reset}>Cancelar</button>}</div></form><div className="category-list"><h3>Categorias cadastradas</h3>{categories.length === 0 ? <p>Nenhuma categoria cadastrada.</p> : categories.map((category) => <article key={category.id}><b>{category.name}</b><span>{category.slug}</span><p>{category.description || 'Sem descrição.'}</p><div><button className="text-button" onClick={() => edit(category)}>Editar</button><button className="text-button danger" onClick={() => remove(category)}>Excluir</button></div></article>)}</div></div>{error && <p className="form-error" role="alert">{error}</p>}</section>;
}

function UsersManager({ session }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operator');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
    setLoading(false);
    if (invokeError || data?.error) { setError(await functionErrorMessage(invokeError, data)); return; }
    setUsers(data.users ?? []);
  };
  useEffect(() => { load(); }, []);
  const invite = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setInviting(true);
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'invite_user', email, role } });
    setInviting(false);
    if (invokeError || data?.error) { setError(await functionErrorMessage(invokeError, data)); return; }
    setMessage(data.message || 'Convite enviado.'); setEmail(''); setRole('operator'); load();
  };
  const updateRole = async (userId, nextRole) => {
    setError(''); setMessage(''); setBusyUserId(userId);
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'change_role', user_id: userId, role: nextRole } });
    setBusyUserId('');
    if (invokeError || data?.error) { setError(await functionErrorMessage(invokeError, data)); return; }
    setMessage(data.message || 'Nível de acesso atualizado.'); load();
  };
  const removeUser = async (user) => {
    if (!window.confirm(`Excluir o acesso de ${user.email}? A conta será removida permanentemente.`)) return;
    setError(''); setMessage(''); setBusyUserId(user.id);
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'delete_user', user_id: user.id } });
    setBusyUserId('');
    if (invokeError || data?.error) { setError(await functionErrorMessage(invokeError, data)); return; }
    setMessage(data.message || 'Usuário excluído.'); load();
  };
  return <section className="admin-section"><div className="section-toolbar"><div><p className="eyebrow">Acesso ao sistema</p><h2>Usuários e níveis</h2></div></div><div className="manager-split"><form className="admin-form compact-form" onSubmit={invite}><h3>Convidar usuário</h3><p className="helper-text">A pessoa receberá um convite por e-mail e terá acesso ao painel após criar a senha. Somente administradores podem gerenciar usuários.</p><label>E-mail *<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nome@exemplo.com"/></label><label>Nível de acesso *<select value={role} onChange={(event) => setRole(event.target.value)}><option value="operator">Operador</option><option value="admin">Administrador</option></select></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success">{message}</p>}<button className="button green" disabled={inviting}>{inviting ? 'Enviando...' : 'Enviar convite'}</button></form><div className="category-list users-list"><h3>Usuários cadastrados</h3>{loading ? <p>Carregando usuários...</p> : users.length === 0 ? <p>Nenhum usuário encontrado.</p> : users.map((user) => { const currentRole = user.roles[0] || 'operator'; const isCurrentUser = user.id === session.user.id; const isBusy = busyUserId === user.id; return <article key={user.id}><b>{user.email}</b><span>{new Intl.DateTimeFormat('pt-BR').format(new Date(user.created_at))}{isCurrentUser ? ' · Você' : ''}</span><label className="user-role-control">Nível de acesso<select value={currentRole} disabled={isCurrentUser || isBusy} onChange={(event) => updateRole(user.id, event.target.value)}><option value="operator">Operador</option><option value="admin">Administrador</option></select></label>{user.roles.length === 0 && <p>Sem nível atribuído. Escolha um nível para liberar o painel.</p>}<div><button className="text-button danger" disabled={isCurrentUser || isBusy} onClick={() => removeUser(user)}>{isBusy ? 'Aguarde...' : 'Excluir usuário'}</button></div></article>; })}</div></div>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success">{message}</p>}</section>;
}

function AdminShell({ session, roles, onSignOut, onCatalogChanged }) {
  const [active, setActive] = useState('Painel');
  const canManage = roles.some((role) => rolesThatCanManageContent.includes(role));
  const canPublish = roles.some((role) => rolesThatCanPublish.includes(role));
  const labels = ['Painel', 'Espécies', ...(canManage ? ['Categorias'] : []), ...(roles.includes('admin') ? ['Usuários'] : []), 'Configurações'];
  const primaryRole = ['admin', 'operator'].find((role) => roles.includes(role));
  let content = <AdminDashboard roles={roles}/>;
  if (active === 'Espécies') content = <SpeciesManager roles={roles} onCatalogChanged={onCatalogChanged}/>;
  if (active === 'Categorias') content = <CategoriesManager/>;
  if (active === 'Usuários') content = <UsersManager session={session}/>;
  if (active === 'Configurações') content = <SectionMessage title="Configurações">As configurações institucionais, domínio público e e-mails administrativos serão centralizados aqui.</SectionMessage>;
  return <main className="admin"><aside className="admin-side"><AdminBrand/>{labels.map((label) => <button className={active === label ? 'active' : ''} onClick={() => setActive(label)} key={label}><span>{label === 'Painel' ? '⌂' : '▧'}</span>{label}</button>)}<button className="admin-exit" onClick={onSignOut}><span>↪</span>Sair</button></aside><section className="admin-main"><div className="admin-top"><div><p className="eyebrow">Área administrativa</p><h1>{active}</h1></div><div className="admin-user"><i>{session.user.email?.slice(0, 2).toUpperCase()}</i><span>{session.user.email}<small>{roleLabels[primaryRole] ?? 'Equipe'}</small></span></div></div>{content}{canPublish && <p className="publication-note">Publicações devem conter informações e mídias validadas pelo Museu de Paleontologia.</p>}</section></main>;
}

export function AdminPanel({ onCatalogChanged, passwordSetup = false }) {
  const { loading, session, roles, error } = useAdminSession();
  const signOut = async () => { await supabase.auth.signOut(); window.location.hash = '/'; };
  if (!isSupabaseConfigured) return <AdminSetup/>;
  if (passwordSetup) return <AdminSetPassword session={session} loadingSession={loading}/>;
  if (loading) return <main className="admin-login"><div className="login-card"><AdminBrand/><p>Verificando acesso...</p></div></main>;
  if (session?.user?.user_metadata?.requires_password_setup) return <AdminSetPassword session={session} loadingSession={false}/>;
  if (!session) return <AdminLogin/>;
  if (error || !roles.some((role) => rolesThatCanAccessAdmin.includes(role))) return <AdminAccessDenied session={session} roles={roles} onSignOut={signOut}/>;
  return <AdminShell session={session} roles={roles} onSignOut={signOut} onCatalogChanged={onCatalogChanged}/>;
}
