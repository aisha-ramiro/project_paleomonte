import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const rolesThatCanAccessAdmin = ['admin', 'curator', 'editor', 'contributor'];
const rolesThatCanManageContent = ['admin', 'curator', 'editor'];
const rolesThatCanPublish = ['admin', 'curator'];
const roleLabels = {
  admin: 'Administrador',
  curator: 'Curadoria',
  editor: 'Editor',
  contributor: 'Colaborador',
  viewer: 'Visitante',
};

const emptySpecimen = {
  scientific_name: '', common_name: '', slug: '', summary: '', description: '',
  geological_period: '', geological_era: '', discovery_location: '',
  specimen_type: '', diet: '', length_meters: '', status: 'draft',
};

const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError('Não foi possível entrar. Confira seu e-mail e senha.');
  };

  return <main className="admin-login"><div className="login-card"><AdminBrand/><p className="eyebrow">Área restrita</p><h1>Acesse o painel</h1><p>Use as credenciais fornecidas pela administração do PaleoMonte.</p><form onSubmit={submit} className="admin-form"><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email"/></label><label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button green" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button></form><a href="#/">← Voltar ao site</a></div></main>;
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

function AdminDashboard({ roles, setActive }) {
  const [summary, setSummary] = useState({ loading: true, specimens: null, categories: null, media: null, qrCodes: null });
  const canManage = roles.some((role) => rolesThatCanManageContent.includes(role));

  useEffect(() => {
    let active = true;
    const count = (table) => supabase.from(table).select('*', { count: 'exact', head: true });
    Promise.all([count('specimens'), count('categories'), count('media'), canManage ? count('qr_codes') : Promise.resolve({ count: null })])
      .then(([specimens, categories, media, qrCodes]) => {
        if (active) setSummary({ loading: false, specimens: specimens.count, categories: categories.count, media: media.count, qrCodes: qrCodes.count });
      });
    return () => { active = false; };
  }, [canManage]);

  return <><div className="metrics"><StatCard label="Espécies cadastradas" value={summary.loading ? '…' : summary.specimens} note="Registros no banco"/><StatCard label="Categorias" value={summary.loading ? '…' : summary.categories} note="Organização do acervo"/><StatCard label="Mídias" value={summary.loading ? '…' : summary.media} note="Fotos, áudios e documentos"/><StatCard label="QR Codes" value={summary.loading ? '…' : summary.qrCodes} note={canManage ? 'Códigos registrados' : 'Acesso de curadoria'}/></div><div className="admin-welcome"><div><p className="eyebrow">Banco preparado</p><h2>O acervo começa quando você estiver pronto.</h2><p>Não há conteúdo científico fictício no banco. Use o painel para inserir rascunhos e publicar somente após validação institucional.</p></div><button className="button green" onClick={() => setActive('Espécies')}>＋ Cadastrar espécie</button></div></>;
}

function SectionMessage({ title, children }) {
  return <div className="admin-empty"><span>▧</span><h2>{title}</h2><p>{children}</p></div>;
}

async function uploadSpecimenFile({ specimenId, file, kind, altText, transcript, userId, approve }) {
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
    purpose: kind === 'image' ? 'cover' : 'audio_description',
  });
  if (linkError) throw linkError;
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

function SpecimenForm({ specimen, roles, onSaved, onCancel }) {
  const [form, setForm] = useState(specimen ? { ...emptySpecimen, ...specimen, length_meters: specimen.length_meters ?? '' } : emptySpecimen);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(specimen?.specimen_categories?.find((item) => item.is_primary)?.category_id ?? specimen?.specimen_categories?.[0]?.category_id ?? '');
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [altText, setAltText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [generateQr, setGenerateQr] = useState(!specimen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canPublish = roles.some((role) => rolesThatCanPublish.includes(role));
  const canManage = roles.some((role) => rolesThatCanManageContent.includes(role));
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => { supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name').then(({ data }) => setCategories(data ?? [])); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (canManage && !categoryId) { setError('Selecione uma categoria para a espécie.'); return; }
    if (imageFile && canPublish && form.status === 'published' && !altText.trim()) { setError('Informe o texto alternativo antes de publicar uma imagem.'); return; }
    if (audioFile && canPublish && form.status === 'published' && !transcript.trim()) { setError('Informe a transcrição antes de publicar um áudio.'); return; }
    setSaving(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { scientific_name: form.scientific_name.trim(), common_name: form.common_name.trim() || null, slug: form.slug || slugify(form.scientific_name), summary: form.summary.trim() || null, description: form.description.trim() || null, geological_period: form.geological_period.trim() || null, geological_era: form.geological_era.trim() || null, discovery_location: form.discovery_location.trim() || null, specimen_type: form.specimen_type.trim() || null, diet: form.diet.trim() || null, length_meters: form.length_meters === '' ? null : Number(form.length_meters), status: canPublish ? form.status : 'draft' };
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
    if (imageFile) { try { await uploadSpecimenFile({ specimenId: data.id, file: imageFile, kind: 'image', altText: altText.trim(), userId: user.id, approve: approveMedia }); } catch (mediaError) { warnings.push(`imagem: ${mediaError.message}`); } }
    if (audioFile) { try { await uploadSpecimenFile({ specimenId: data.id, file: audioFile, kind: 'audio', transcript: transcript.trim(), userId: user.id, approve: approveMedia }); } catch (mediaError) { warnings.push(`áudio: ${mediaError.message}`); } }
    if (generateQr && canManage) { try { await createQrCode({ specimenId: data.id, slug: payload.slug, userId: user.id }); } catch (qrError) { warnings.push(`QR Code: ${qrError.message}`); } }
    setSaving(false);
    onSaved(data, warnings);
  };

  return <form className="admin-form specimen-form" onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">{specimen ? 'Edição completa' : 'Novo registro'}</p><h2>{specimen ? 'Editar espécie' : 'Cadastrar espécie'}</h2></div><button type="button" className="text-button" onClick={onCancel}>Cancelar</button></div><div className="form-grid"><label>Nome científico *<input value={form.scientific_name} onChange={(event) => { update('scientific_name', event.target.value); if (!specimen) update('slug', slugify(event.target.value)); }} required/></label><label>Nome popular<input value={form.common_name} onChange={(event) => update('common_name', event.target.value)}/></label><label>Slug / URL *<input value={form.slug} onChange={(event) => update('slug', slugify(event.target.value))} required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label>{canManage && <label>Categoria *<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="">Selecione uma categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}<label>Tipo<input value={form.specimen_type} onChange={(event) => update('specimen_type', event.target.value)}/></label><label>Período geológico<input value={form.geological_period} onChange={(event) => update('geological_period', event.target.value)}/></label><label>Era geológica<input value={form.geological_era} onChange={(event) => update('geological_era', event.target.value)}/></label><label>Local da descoberta<input value={form.discovery_location} onChange={(event) => update('discovery_location', event.target.value)}/></label><label>Dieta<input value={form.diet} onChange={(event) => update('diet', event.target.value)}/></label><label>Comprimento (metros)<input type="number" min="0" step="0.01" value={form.length_meters} onChange={(event) => update('length_meters', event.target.value)}/></label>{canPublish && <label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Rascunho</option><option value="in_review">Em revisão</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>}<label className="full">Resumo<input value={form.summary} onChange={(event) => update('summary', event.target.value)} maxLength="280"/></label><label className="full">Descrição<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="6"/></label></div><fieldset className="asset-fieldset"><legend>Mídias da espécie</legend><p>Inclua a imagem de capa e, se houver, o áudio de descrição no mesmo cadastro.</p><div className="form-grid"><label>Imagem de capa<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}/></label><label>Texto alternativo da imagem<textarea rows="3" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Descreva a imagem para leitores de tela."/></label><label>Áudio de descrição<input type="file" accept="audio/mpeg,audio/ogg,audio/wav" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}/></label><label>Transcrição do áudio<textarea rows="3" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Obrigatória antes da aprovação do áudio."/></label></div></fieldset>{canManage && <fieldset className="asset-fieldset qr-fieldset"><legend>QR Code</legend><label className="check-label"><input type="checkbox" checked={generateQr} onChange={(event) => setGenerateQr(event.target.checked)}/> Gerar ou atualizar o QR Code desta espécie agora</label><p>Enquanto o projeto estiver local, o código apontará para a rota local. Ele deverá ser regenerado ao publicar o domínio definitivo.</p></fieldset>}{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button className="button green" disabled={saving}>{saving ? 'Salvando cadastro...' : 'Salvar espécie, mídia e QR Code'}</button></div></form>;
}

function SpeciesManager({ roles }) {
  const [specimens, setSpecimens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const canDelete = roles.some((role) => rolesThatCanPublish.includes(role));

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.from('specimens').select('id, scientific_name, common_name, slug, status, updated_at, geological_period, specimen_categories(category_id, is_primary)').order('updated_at', { ascending: false });
    setLoading(false);
    if (loadError) { setError(loadError.message); return; }
    setSpecimens(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (specimen) => {
    if (!window.confirm(`Excluir “${specimen.scientific_name}”? Esta ação não pode ser desfeita.`)) return;
    const { error: removeError } = await supabase.from('specimens').delete().eq('id', specimen.id);
    if (removeError) { setError(removeError.message); return; }
    load();
  };

  if (editing) return <SpecimenForm specimen={editing === 'new' ? null : editing} roles={roles} onCancel={() => setEditing(null)} onSaved={(_data, warnings) => { setEditing(null); setNotice(warnings.length ? `Espécie salva, mas houve pendência em: ${warnings.join(' | ')}` : 'Espécie, categoria, mídias e QR Code salvos.'); load(); }}/>;
  return <section className="admin-section"><div className="section-toolbar"><div><p className="eyebrow">Catálogo administrativo</p><h2>Espécies</h2></div><button className="button green" onClick={() => setEditing('new')}>＋ Nova espécie</button></div>{notice && <p className="form-success">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}{loading ? <SectionMessage title="Carregando espécies">Consultando os registros do catálogo.</SectionMessage> : specimens.length === 0 ? <SectionMessage title="Nenhuma espécie cadastrada">Quando receber o conteúdo validado pelo museu, cadastre o primeiro registro aqui.</SectionMessage> : <div className="data-table"><table><thead><tr><th>Espécie</th><th>Período</th><th>Status</th><th>Atualização</th><th/></tr></thead><tbody>{specimens.map((specimen) => <tr key={specimen.id}><td><b>{specimen.scientific_name}</b><small>{specimen.common_name || specimen.slug}</small></td><td>{specimen.geological_period || '—'}</td><td><span className={`status ${specimen.status}`}>{specimen.status}</span></td><td>{new Intl.DateTimeFormat('pt-BR').format(new Date(specimen.updated_at))}</td><td><button className="text-button" onClick={() => setEditing(specimen)}>Editar</button>{canDelete && <button className="text-button danger" onClick={() => remove(specimen)}>Excluir</button>}</td></tr>)}</tbody></table></div>}</section>;
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

function UsersManager() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
    setLoading(false);
    if (invokeError || data?.error) { setError(data?.error || invokeError.message); return; }
    setUsers(data.users ?? []);
  };
  useEffect(() => { load(); }, []);
  const invite = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setInviting(true);
    const { data, error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'invite_admin', email } });
    setInviting(false);
    if (invokeError || data?.error) { setError(data?.error || invokeError.message); return; }
    setMessage(data.message || 'Convite enviado.'); setEmail(''); load();
  };
  return <section className="admin-section"><div className="section-toolbar"><div><p className="eyebrow">Acesso ao sistema</p><h2>Administradores</h2></div></div><div className="manager-split"><form className="admin-form compact-form" onSubmit={invite}><h3>Convidar administrador</h3><p className="helper-text">A pessoa receberá um convite por e-mail e terá acesso administrativo após criar a senha.</p><label>E-mail *<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nome@exemplo.com"/></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success">{message}</p>}<button className="button green" disabled={inviting}>{inviting ? 'Enviando...' : 'Enviar convite'}</button></form><div className="category-list users-list"><h3>Usuários cadastrados</h3>{loading ? <p>Carregando usuários...</p> : users.length === 0 ? <p>Nenhum usuário encontrado.</p> : users.map((user) => <article key={user.id}><b>{user.email}</b><span>{new Intl.DateTimeFormat('pt-BR').format(new Date(user.created_at))}</span><p>{user.roles.length ? user.roles.map((role) => roleLabels[role] ?? role).join(', ') : 'Sem papel atribuído'}</p></article>)}</div></div></section>;
}

function AdminShell({ session, roles, onSignOut }) {
  const [active, setActive] = useState('Painel');
  const canManage = roles.some((role) => rolesThatCanManageContent.includes(role));
  const canPublish = roles.some((role) => rolesThatCanPublish.includes(role));
  const labels = ['Painel', 'Espécies', ...(canManage ? ['Categorias'] : []), ...(roles.includes('admin') ? ['Usuários'] : []), 'Configurações'];
  const primaryRole = ['admin', 'curator', 'editor', 'contributor', 'viewer'].find((role) => roles.includes(role));
  let content = <AdminDashboard roles={roles} setActive={setActive}/>;
  if (active === 'Espécies') content = <SpeciesManager roles={roles}/>;
  if (active === 'Categorias') content = <CategoriesManager/>;
  if (active === 'Usuários') content = <UsersManager/>;
  if (active === 'Configurações') content = <SectionMessage title="Configurações">As configurações institucionais, domínio público e e-mails administrativos serão centralizados aqui.</SectionMessage>;
  return <main className="admin"><aside className="admin-side"><AdminBrand/>{labels.map((label) => <button className={active === label ? 'active' : ''} onClick={() => setActive(label)} key={label}><span>{label === 'Painel' ? '⌂' : '▧'}</span>{label}</button>)}<button className="admin-exit" onClick={onSignOut}><span>↪</span>Sair</button></aside><section className="admin-main"><div className="admin-top"><div><p className="eyebrow">Área administrativa</p><h1>{active}</h1></div><div className="admin-user"><i>{session.user.email?.slice(0, 2).toUpperCase()}</i><span>{session.user.email}<small>{roleLabels[primaryRole] ?? 'Equipe'}</small></span></div></div>{content}{canPublish && <p className="publication-note">Publicações devem conter informações e mídias validadas pelo Museu de Paleontologia.</p>}</section></main>;
}

export function AdminPanel() {
  const { loading, session, roles, error } = useAdminSession();
  const signOut = async () => { await supabase.auth.signOut(); window.location.hash = '/'; };
  if (!isSupabaseConfigured) return <AdminSetup/>;
  if (loading) return <main className="admin-login"><div className="login-card"><AdminBrand/><p>Verificando acesso...</p></div></main>;
  if (!session) return <AdminLogin/>;
  if (error || !roles.some((role) => rolesThatCanAccessAdmin.includes(role))) return <AdminAccessDenied session={session} roles={roles} onSignOut={signOut}/>;
  return <AdminShell session={session} roles={roles} onSignOut={signOut}/>;
}
