import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import heroImage from './assets/museum-hero.png';
import { AdminPanel } from './components/AdminPanel';
import { usePublicAccessTracking } from './services/accessMetrics';
import { usePublicCatalog } from './services/publicCatalog';

const navItems = [['Início', '#/'], ['Catálogo', '#/catalogo'], ['Sobre o museu', '#/sobre'], ['Acessibilidade', '#/acessibilidade']];

function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }
function navigate(path) { window.location.hash = path; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function useRoute() { const [route, setRoute] = useState(window.location.hash.slice(1) || '/'); useEffect(() => { const change = () => setRoute(window.location.hash.slice(1) || '/'); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []); return route; }

function Brand({ inverse = false }) {
  return <a className={`brand ${inverse ? 'inverse' : ''}`} href="#/" aria-label="PaleoMonte, início"><span className="brand-mark">☼</span><span><strong>Museu de<br/>Paleontologia</strong><small>Prof. Antonio Celso de Arruda Campos</small></span></a>;
}

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="shell header-inner"><Brand/><button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Abrir menu">☰</button><nav className={open ? 'open' : ''}>{navItems.map(([name, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{name}</a>)}<a className="login-link" href="#/admin"><Icon>♙</Icon> Acessar</a></nav></div></header>;
}

function Footer() { return <footer className="footer"><div className="shell footer-grid"><Brand inverse/><section><h4>Links úteis</h4><a href="#/catalogo">Catálogo</a><a href="#/sobre">Sobre o Museu</a><a href="#/acessibilidade">Acessibilidade</a></section><section><h4>Acessibilidade</h4><a href="#/acessibilidade">Aumentar fonte <b>A+</b></a><a href="#/acessibilidade">Diminuir fonte <b>A−</b></a><a href="#/acessibilidade">Alto contraste</a></section><section><h4>Siga-nos</h4><div className="socials"><span>f</span><span>◎</span></div></section></div><div className="mosaic"/></footer>; }

function SearchBox({ value, onChange, compact = false }) { return <label className={`search-box ${compact ? 'compact' : ''}`}><input value={value} onChange={e => onChange(e.target.value)} placeholder="Buscar fósseis, espécies, períodos..." aria-label="Buscar no catálogo"/><Icon>⌕</Icon></label>; }

function FossilCard({ item, small = false }) { const image = item.image || heroImage; const category = item.category || 'Acervo'; return <a className={`fossil-card ${small ? 'small' : ''}`} href={`#/fosseis/${item.slug}`}><div className="fossil-photo"><img src={image} alt={item.imageAlt || `Imagem temporária de ${item.name}`} /></div><div className="card-copy"><span className={`pill ${category.toLowerCase().replaceAll(' ', '-')}`}>{category}</span><h3>{item.name}</h3><p>{item.period}</p><span className="card-arrow">→</span></div></a>; }

function Feature({ symbol, title, children }) { return <article className="feature"><div className="feature-symbol">{symbol}</div><h3>{title}</h3><p>{children}</p></article>; }

function Home({ specimens, loading }) { const [query, setQuery] = useState(''); const goSearch = e => { e.preventDefault(); navigate(`/catalogo?q=${encodeURIComponent(query)}`); }; return <><section className="hero"><img src={heroImage} alt="Imagem ilustrativa temporária de um esqueleto de dinossauro em exposição no museu"/><div className="hero-shade"/><div className="shell hero-content"><p className="eyebrow">Museu de Paleontologia</p><h1>Descubra a<br/>história da vida<br/>que já existiu</h1><p>Explore o acervo paleontológico de Monte Alto através de informações, imagens e recursos de acessibilidade.</p><form onSubmit={goSearch}><SearchBox value={query} onChange={setQuery}/></form><a className="button gold" href="#/catalogo">Explorar catálogo</a></div></section><section className="features shell"><Feature symbol="⌘" title="Escaneie o QR Code">Encontre o código ao lado do fóssil na exposição.</Feature><Feature symbol="▤" title="Acesse as informações">Leia sobre a espécie, descubra curiosidades.</Feature><Feature symbol="◖))" title="Ouça a descrição">Recurso de áudio para tornar o conteúdo acessível.</Feature><Feature symbol="♣" title="Conheça nosso acervo">Navegue pelo catálogo completo do museu.</Feature></section><section className="shell highlights"><div className="section-heading"><div><p className="eyebrow">Acervo em destaque</p><h2>Histórias preservadas no tempo</h2></div><a href="#/catalogo">Ver catálogo completo →</a></div>{loading ? <div className="empty">Carregando espécies publicadas...</div> : specimens.length ? <div className="cards-grid featured">{specimens.slice(0,4).map(item => <FossilCard key={item.id} item={item}/>)}</div> : <div className="empty">O acervo está sendo preparado para publicação.</div>}</section><section className="visit-cta"><div className="shell"><div><p className="eyebrow">Uma experiência para todos</p><h2>O passado ganha novas formas de ser descoberto.</h2></div><a className="button light" href="#/sobre">Conheça o museu</a></div></section></>; }

function Catalog({ specimens, loading, error }) { const route = useRoute(); const fromUrl = new URLSearchParams(route.split('?')[1] || '').get('q') || ''; const [query, setQuery] = useState(fromUrl); const [category, setCategory] = useState('Todos'); const [period, setPeriod] = useState('Todos'); const items = useMemo(() => specimens.filter(s => `${s.name} ${s.category} ${s.period}`.toLowerCase().includes(query.toLowerCase()) && (category === 'Todos' || s.category === category) && (period === 'Todos' || s.period === period)), [specimens, query, category, period]); return <main className="shell page"><div className="crumb">Início <b>›</b> Catálogo</div><div className="catalog-heading"><div><p className="eyebrow">Explore o acervo</p><h1>Catálogo</h1></div><span>{loading ? 'Carregando...' : `${items.length} itens encontrados`}</span></div><div className="catalog-controls"><SearchBox value={query} onChange={setQuery}/><select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filtrar por categoria"><option>Todos</option>{[...new Set(specimens.map(s => s.category))].map(x => <option key={x}>{x}</option>)}</select><select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Filtrar por período"><option>Todos</option>{[...new Set(specimens.map(s => s.period))].map(x => <option key={x}>{x}</option>)}</select></div><div className="filter-note"><Icon>☷</Icon> Filtros aplicados automaticamente ao catálogo</div>{loading ? <div className="empty">Carregando espécies publicadas...</div> : <><div className="cards-grid catalog-grid">{items.map(item => <FossilCard key={item.id} item={item}/>)}</div>{items.length === 0 && <div className="empty">{error || 'Nenhum fóssil publicado foi encontrado.'}</div>}</>}</main>; }

function narrationValue(value) {
  return value === null || value === undefined || String(value).trim() === '' ? 'Não informado' : String(value).trim();
}

function specimenNarration(specimen) {
  return [
    `Nome científico. ${narrationValue(specimen.name)}.`,
    `Nome popular. ${narrationValue(specimen.commonName)}.`,
    `Período geológico. ${narrationValue(specimen.period)}.`,
    `Local da descoberta. ${narrationValue(specimen.location)}.`,
    `Descrição. ${narrationValue(specimen.description)}`,
    `Tipo. ${narrationValue(specimen.type)}.`,
    `Comprimento. ${narrationValue(specimen.length)}.`,
    `Dieta. ${narrationValue(specimen.diet)}.`,
    `Era geológica. ${narrationValue(specimen.era)}.`,
  ].join(' ');
}

function AudioPlayer({ text }) {
  const [status, setStatus] = useState('idle');
  const utteranceRef = useRef(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => () => {
    utteranceRef.current = null;
    if (supported) window.speechSynthesis.cancel();
  }, [supported, text]);

  const play = () => {
    if (!supported || !text) return;
    const synth = window.speechSynthesis;

    if (status === 'speaking') {
      synth.pause();
      setStatus('paused');
      return;
    }

    if (status === 'paused') {
      synth.resume();
      setStatus('speaking');
      return;
    }

    utteranceRef.current = null;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;
    const voices = synth.getVoices();
    const portugueseVoice = voices.find((voice) => voice.lang.toLowerCase() === 'pt-br')
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('pt'));
    if (portugueseVoice) utterance.voice = portugueseVoice;
    utteranceRef.current = utterance;
    utterance.onstart = () => {
      if (utteranceRef.current === utterance) setStatus('speaking');
    };
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setStatus('idle');
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setStatus('error');
      }
    };
    synth.speak(utterance);
    setStatus('speaking');
  };

  const label = !supported
    ? 'Leitura em voz alta não disponível neste navegador'
    : status === 'speaking'
      ? 'Pausar leitura'
      : status === 'paused'
        ? 'Continuar leitura'
        : 'Ouvir descrição';
  const textLabel = !supported
    ? 'Leitura não disponível neste navegador'
    : status === 'speaking'
      ? 'Lendo informações da espécie'
      : status === 'paused'
        ? 'Leitura pausada'
        : status === 'error'
          ? 'Não foi possível iniciar a leitura'
          : 'Ouvir descrição';

  return <div className="audio"><button onClick={play} disabled={!supported || !text} aria-label={label}>{status === 'speaking' ? 'Ⅱ' : '▶'}</button><span aria-live="polite">{textLabel}</span><div className="audio-line" aria-hidden="true"><i className={status === 'speaking' ? 'playing' : ''}/></div><small>{supported ? 'Leitura nativa em português' : 'Sem suporte de voz'}</small></div>;
}

function SpecimenPage({ specimen, loading }) {
  const [selectedImageId, setSelectedImageId] = useState(null);
  useEffect(() => setSelectedImageId(null), [specimen?.id]);
  if (loading) return <main className="shell page"><div className="empty">Carregando espécie...</div></main>;
  if (!specimen) return <main className="shell page"><h1>Espécime não encontrado</h1><a className="button green" href="#/catalogo">Voltar ao catálogo</a></main>;

  const imageMedia = specimen.media.filter((item) => item.type === 'image' && item.url);
  const selectedImage = imageMedia.find((media) => media.id === selectedImageId) ?? imageMedia.find((media) => media.purpose === 'cover') ?? imageMedia[0] ?? null;
  const image = selectedImage?.url || specimen.image || heroImage;
  const narration = specimenNarration(specimen);

  return <main className="shell page specimen">
    <div className="crumb">Início <b>›</b> Catálogo <b>›</b> {specimen.name}</div>
    <a className="back-link" href="#/catalogo">← Voltar ao catálogo</a>
    <div className="specimen-head"><div><p className={`pill ${specimen.category.toLowerCase().replaceAll(' ', '-')}`}>{specimen.category}</p><h1>{specimen.name}</h1>{specimen.commonName && <p className="latin">{specimen.commonName}</p>}<p><b>Período:</b> {specimen.period} <span className="dot">•</span> <b>Local de descoberta:</b> {specimen.location}</p></div><button className="save-button" aria-label="Salvar espécie">♡</button></div>
    <div className="detail-photo"><img src={image} alt={selectedImage?.alt_text || specimen.imageAlt || `Imagem temporária de ${specimen.name}`}/></div>
    {imageMedia.length > 1 && <div className="thumbs">{imageMedia.map((media) => <button className={media.id === selectedImage?.id ? 'selected' : ''} key={media.id} onClick={() => setSelectedImageId(media.id)} aria-label={`Ver ${media.alt_text || 'foto da espécie'}`}><img src={media.url} alt=""/></button>)}</div>}
    <section className="about-specimen"><h2>Sobre a espécie</h2><p>{specimen.description}</p></section>
    <div className="fact-grid"><div><Icon>♧</Icon><b>Tipo</b><span>{specimen.type}</span></div><div><Icon>⌁</Icon><b>Comprimento</b><span>{specimen.length}</span></div><div><Icon>◉</Icon><b>Dieta</b><span>{specimen.diet}</span></div><div><Icon>✥</Icon><b>Era geológica</b><span>{specimen.era || 'Não informado'}</span></div></div>
    <section className="listen"><h2>Ouça a descrição</h2><p>Aperte play para ouvir as informações desta espécie em português.</p><AudioPlayer text={narration}/></section>
  </main>;
}

function About() { return <main className="page"><section className="about-hero"><div className="shell"><p className="eyebrow">Monte Alto, São Paulo</p><h1>Um museu que preserva histórias da vida.</h1><p>O Museu de Paleontologia Prof. Antonio Celso de Arruda Campos guarda e compartilha um patrimônio que aproxima ciência, memória e comunidade.</p></div></section><section className="shell about-content"><div><p className="eyebrow">Sobre o projeto</p><h2>PaleoMonte</h2><p>Este protótipo apresenta uma proposta de catálogo digital acessível, pensado para acompanhar a visita ao museu e conectar cada fóssil a conteúdos compreensíveis.</p><p>A etapa atual usa textos e imagens ilustrativos. Todo o conteúdo científico publicado será validado institucionalmente.</p></div><aside><span>⌘</span><h3>Visite o museu</h3><p>Monte Alto — SP</p><a className="button green" href="#/catalogo">Conheça o acervo</a></aside></section></main>; }

function Accessibility() { const [big, setBig] = useState(false); return <main className={`shell page accessibility ${big ? 'big-text' : ''}`}><p className="eyebrow">Para todas as pessoas</p><h1>Acessibilidade</h1><p className="intro">O PaleoMonte foi projetado para oferecer uma navegação simples, legível e acolhedora durante a visita ao museu.</p><div className="access-controls"><button onClick={() => setBig(!big)}><Icon>A±</Icon>{big ? 'Tamanho padrão' : 'Aumentar texto'}</button><button onClick={() => document.body.classList.toggle('contrast')}><Icon>◐</Icon>Alto contraste</button></div><div className="access-grid"><article><Icon>⌨</Icon><h2>Navegação por teclado</h2><p>Todos os elementos interativos podem ser acessados pelo teclado.</p></article><article><Icon>◖))</Icon><h2>Conteúdo em áudio</h2><p>As espécies contam com controles para ouvir suas descrições.</p></article><article><Icon>◉</Icon><h2>Leitura clara</h2><p>Tipografia legível, contraste adequado e estrutura semântica.</p></article></div></main>; }

function App() { const route = useRoute(); usePublicAccessTracking(route); const { specimens, loading, error, reload } = usePublicCatalog(); let content; if (route.startsWith('/catalogo')) content = <Catalog specimens={specimens} loading={loading} error={error}/>; else if (route.startsWith('/fosseis/')) content = <SpecimenPage specimen={specimens.find(s => route.includes(s.slug))} loading={loading}/>; else if (route === '/sobre') content = <About/>; else if (route === '/acessibilidade') content = <Accessibility/>; else if (route === '/admin') content = <AdminPanel onCatalogChanged={reload}/>; else content = <Home specimens={specimens} loading={loading}/>; const isAdmin = route === '/admin'; return <>{!isAdmin && <Header/>}{content}{!isAdmin && <Footer/>}</>; }

createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);
