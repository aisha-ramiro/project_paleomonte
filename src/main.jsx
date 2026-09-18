import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./dark-mode.css";
import heroImage from "./assets/museum-hero-anuratitan-warm.png";
import museumLogo from "./assets/museum-logo.png";
import { AdminPanel } from "./components/AdminPanel";
import { usePublicAccessTracking } from "./services/accessMetrics";
import { usePublicCatalog } from "./services/publicCatalog";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { copy, languages, localizeSpecimen } from "./i18n";

function Icon({ children }) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}
function navigate(path) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  useEffect(() => {
    const change = () => setRoute(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}

function Brand({ inverse = false }) {
  return (
    <a
      className={`brand ${inverse ? "inverse" : ""}`}
      href="#/"
      aria-label="PaleoMonte, início"
    >
      <img
        className="brand-logo"
        src={museumLogo}
        alt="Museu de Paleontologia Prof. Antonio Celso de Arruda Campos"
      />
    </a>
  );
}

function LanguageSwitcher({ language, onChange, className = "" }) {
  return <div className={`language-switcher ${className}`} aria-label="Language selector">
    {Object.entries(languages).map(([code, item]) => <button type="button" className={language === code ? "active" : ""} onClick={() => onChange(code)} aria-label={item.label} aria-pressed={language === code} key={code}>{item.flag}</button>)}
  </div>;
}

function Header({ language, onLanguageChange }) {
  const [open, setOpen] = useState(false);
  const navItems = [[copy[language].nav.home, "#/"], [copy[language].nav.catalog, "#/catalogo"], [copy[language].nav.about, "#/sobre"], [copy[language].nav.accessibility, "#/acessibilidade"]];
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <nav className={open ? "open" : ""}>
          {navItems.map(([name, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {name}
            </a>
          ))}
        </nav>
        <LanguageSwitcher language={language} onChange={onLanguageChange} className="header-language" />
      </div>
    </header>
  );
}

function Footer({ language, textScale, onIncreaseText, onDecreaseText }) {
  const text = copy[language].footer;
  const nav = copy[language].nav;
  const percentage = Math.round(textScale * 100);
  const canIncrease = textScale < MAX_TEXT_SCALE;
  const canDecrease = textScale > MIN_TEXT_SCALE;
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <Brand inverse />

        <section>
          <h4>{text.links}</h4>
          <a href="#/catalogo">{nav.catalog}</a>
          <a href="#/sobre">{nav.about}</a>
          <a href="#/acessibilidade">{nav.accessibility}</a>
        </section>

        <section>
          <h4>{text.accessibility}</h4>
          <div className="footer-text-controls" role="group" aria-label={text.accessibility}>
            <button
              type="button"
              onClick={onIncreaseText}
              disabled={!canIncrease}
              aria-label={`${text.increase}: ${percentage}%`}
            >
              {text.increase} <b>A+</b>
            </button>
            <button
              type="button"
              onClick={onDecreaseText}
              disabled={!canDecrease}
              aria-label={`${text.decrease}: ${percentage}%`}
            >
              {text.decrease} <b>A−</b>
            </button>
            <span className="sr-only" aria-live="polite">{percentage}%</span>
          </div>
          <a href="#/acessibilidade">{text.contrast}</a>
        </section>

        <section>
          <h4>{text.follow}</h4>
          <div className="socials">
            <a
              href="https://www.facebook.com/museumpma/?locale=pt_BR"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <span>
                <FaFacebookF />
              </span>
            </a>

            <a
              href="https://www.instagram.com/mpaleoma/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <span>
                <FaInstagram />
              </span>
            </a>
          </div>
        </section>

        <a
          className="footer-admin-link"
          href="#/admin"
          aria-label="Painel Administrativo"
          title="Painel Administrativo"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 3h-1.3a3 3 0 0 0-5.4 0H8a3 3 0 0 0-3 3v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a3 3 0 0 0-3-3Zm-4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm4 15H8v-1.5h8V18Zm0-4H8v-1.5h8V14Zm0-4H8V8.5h8V10Z" />
          </svg>
        </a>
      </div>

      <div className="mosaic" />
    </footer>
  );
}

function SearchBox({ value, onChange, placeholder, compact = false }) {
  return (
    <label className={`search-box ${compact ? "compact" : ""}`}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <Icon>⌕</Icon>
    </label>
  );
}

function FossilCard({ item, small = false, language = 'pt' }) {
  const image = item.image || heroImage;
  const category = item.category || copy[language].specimen.categoryFallback;
  return (
    <a
      className={`fossil-card ${small ? "small" : ""}`}
      href={`#/fosseis/${item.slug}`}
    >
      <div className="fossil-photo">
        <img
          src={image}
          alt={item.imageAlt || `${copy[language].specimen.imageAlt} ${item.name}`}
        />
      </div>
      <div className="card-copy">
        <span className={`pill ${category.toLowerCase().replaceAll(" ", "-")}`}>
          {category}
        </span>
        <h3>{item.name}</h3>
        <p>{item.period || "—"}</p>
        <span className="card-arrow">→</span>
      </div>
    </a>
  );
}

function Feature({ symbol, title, children }) {
  return (
    <article className="feature">
      <div className="feature-symbol">{symbol}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

function Home({ specimens, loading, language }) {
  const [query, setQuery] = useState("");
  const text = copy[language].home;
  const catalogText = copy[language].catalog;
  const localizedSpecimens = specimens.map((item) => localizeSpecimen(item, language));
  const goSearch = (e) => {
    e.preventDefault();
    navigate(`/catalogo?q=${encodeURIComponent(query)}`);
  };
  return (
    <>
      <section className="hero">
        <img
          src={heroImage}
          alt={language === 'en' ? 'Museum fossil skeleton on display' : 'Esqueleto fóssil em exposição no museu'}
        />
        <div className="hero-shade" />
        <div className="shell hero-content">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title.map((line, index) => <span key={line}>{line}{index < text.title.length - 1 && <br/>}</span>)}</h1>
          <p>{text.text}</p>
          <form onSubmit={goSearch}>
            <SearchBox value={query} onChange={setQuery} placeholder={catalogText.search} />
          </form>
          <a className="button gold" href="#/catalogo">
            {text.explore}
          </a>
        </div>
      </section>
      <section className="features shell">
        {[["⌘", ...text.features[0]], ["▤", ...text.features[1]], ["◖))", ...text.features[2]], ["♣", ...text.features[3]]].map(([symbol, title, description]) => <Feature symbol={symbol} title={title} key={symbol}>{description}</Feature>)}
      </section>
      <section className="shell highlights">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{text.featuredEyebrow}</p>
            <h2>{text.featuredTitle}</h2>
          </div>
          <a href="#/catalogo">{text.allCatalog}</a>
        </div>
        {loading ? (
          <div className="empty">{catalogText.loading}</div>
        ) : localizedSpecimens.length ? (
          <div className="cards-grid featured">
            {localizedSpecimens.slice(0, 4).map((item) => (
              <FossilCard key={item.id} item={item} language={language} />
            ))}
          </div>
        ) : (
          <div className="empty">
            {catalogText.preparing}
          </div>
        )}
      </section>
      <section className="visit-cta">
        <div className="shell">
          <div>
            <p className="eyebrow">{text.experienceEyebrow}</p>
            <h2>{text.experienceTitle}</h2>
          </div>
          <a className="button light" href="#/sobre">
            {text.visit}
          </a>
        </div>
      </section>
    </>
  );
}

function Catalog({ specimens, loading, error, language }) {
  const route = useRoute();
  const text = copy[language].catalog;
  const localizedSpecimens = specimens.map((item) => localizeSpecimen(item, language));
  const fromUrl = new URLSearchParams(route.split("?")[1] || "").get("q") || "";
  const [query, setQuery] = useState(fromUrl);
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState("");
  const items = useMemo(
    () =>
      localizedSpecimens.filter(
        (s) =>
          `${s.name} ${s.category} ${s.period}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!category || s.category === category) &&
          (!period || s.period === period),
      ),
    [localizedSpecimens, query, category, period],
  );
  return (
    <main className="shell page">
      <div className="crumb">
        {text.crumb} <b>›</b> {text.title}
      </div>
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
        </div>
        <span>
          {loading ? text.loading : `${items.length} ${text.found}`}
        </span>
      </div>
      <div className="catalog-controls">
        <SearchBox value={query} onChange={setQuery} placeholder={text.search} />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={text.category}
        >
          <option value="">{text.all}</option>
          {[...new Set(localizedSpecimens.map((s) => s.category))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label={text.period}
        >
          <option value="">{text.all}</option>
          {[...new Set(localizedSpecimens.map((s) => s.period))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="filter-note">
        <Icon>☷</Icon> {text.filterNote}
      </div>
      {loading ? (
        <div className="empty">{text.loading}</div>
      ) : (
        <>
          <div className="cards-grid catalog-grid">
            {items.map((item) => (
              <FossilCard key={item.id} item={item} language={language} />
            ))}
          </div>
          {items.length === 0 && (
            <div className="empty">
              {error || text.empty}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function narrationValue(value, language) {
  return value === null || value === undefined || String(value).trim() === ""
    ? copy[language].specimen.noInfo
    : String(value).trim();
}

function specimenNarration(specimen, language) {
  const text = copy[language].specimen;
  return [
    `${text.scientificName}. ${narrationValue(specimen.name, language)}.`,
    `${text.commonName}. ${narrationValue(specimen.commonName, language)}.`,
    `${text.period} ${narrationValue(specimen.period, language)}.`,
    `${text.location} ${narrationValue(specimen.location, language)}.`,
    `${text.about}. ${narrationValue(specimen.description, language)}`,
    `${text.type}. ${narrationValue(specimen.type, language)}.`,
    `${text.length}. ${narrationValue(specimen.length, language)}.`,
    `${text.diet}. ${narrationValue(specimen.diet, language)}.`,
    `${text.era}. ${narrationValue(specimen.era, language)}.`,
  ].join(" ");
}

function AudioPlayer({ text, language }) {
  const labels = copy[language].specimen;
  const [status, setStatus] = useState("idle");
  const utteranceRef = useRef(null);
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  useEffect(
    () => () => {
      utteranceRef.current = null;
      if (supported) window.speechSynthesis.cancel();
    },
    [supported, text],
  );

  const play = () => {
    if (!supported || !text) return;
    const synth = window.speechSynthesis;

    if (status === "speaking") {
      synth.pause();
      setStatus("paused");
      return;
    }

    if (status === "paused") {
      synth.resume();
      setStatus("speaking");
      return;
    }

    utteranceRef.current = null;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languages[language].locale;
    utterance.rate = 0.95;
    const voices = synth.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === utterance.lang.toLowerCase()) ?? voices.find((item) => item.lang.toLowerCase().startsWith(language));
    if (voice) utterance.voice = voice;
    utteranceRef.current = utterance;
    utterance.onstart = () => {
      if (utteranceRef.current === utterance) setStatus("speaking");
    };
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setStatus("idle");
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setStatus("error");
      }
    };
    synth.speak(utterance);
    setStatus("speaking");
  };

  const label = !supported
    ? labels.listenUnavailable
    : status === "speaking"
      ? labels.pause
      : status === "paused"
        ? labels.continue
        : labels.play;
  const textLabel = !supported
    ? labels.listenUnavailable
    : status === "speaking"
      ? labels.listenSpeaking
    : status === "paused"
        ? labels.listenPaused
        : status === "error"
          ? labels.listenError
          : labels.listenIdle;

  return (
    <div className="audio">
      <button onClick={play} disabled={!supported || !text} aria-label={label}>
        {status === "speaking" ? "Ⅱ" : "▶"}
      </button>
      <span aria-live="polite">{textLabel}</span>
      <div className="audio-line" aria-hidden="true">
        <i className={status === "speaking" ? "playing" : ""} />
      </div>
      <small>
        {supported ? labels.nativeVoice : labels.listenUnavailable}
      </small>
    </div>
  );
}

function SpecimenPage({ specimen, loading, siteLanguage }) {
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [language, setLanguage] = useState('pt');
  useEffect(() => setSelectedImageId(null), [specimen?.id]);
  if (loading)
    return (
      <main className="shell page">
        <div className="empty">{copy[siteLanguage].specimen.loading}</div>
      </main>
    );
  if (!specimen)
    return (
      <main className="shell page">
        <h1>{copy[siteLanguage].specimen.notFound}</h1>
        <a className="button green" href="#/catalogo">
          {copy[siteLanguage].specimen.back}
        </a>
      </main>
    );

  const text = copy[language].specimen;
  const globalText = copy[siteLanguage].specimen;
  const localizedSpecimen = localizeSpecimen(specimen, language);
  const imageMedia = specimen.media.filter(
    (item) => item.type === "image" && item.url,
  );
  const selectedImage =
    imageMedia.find((media) => media.id === selectedImageId) ??
    imageMedia.find((media) => media.purpose === "cover") ??
    imageMedia[0] ??
    null;
  const image = selectedImage?.url || localizedSpecimen.image || heroImage;
  const narration = specimenNarration(localizedSpecimen, language);

  return (
    <main className="shell page specimen">
      <div className="crumb">
        {globalText.crumb} <b>›</b> {globalText.catalog} <b>›</b> {specimen.name}
      </div>
      <a className="back-link" href="#/catalogo">
        {globalText.back}
      </a>
      <div className="specimen-head">
        <div>
          <p
            className={`pill ${localizedSpecimen.category.toLowerCase().replaceAll(" ", "-")}`}
          >
            {localizedSpecimen.category}
          </p>
          <h1>{specimen.name}</h1>
          {localizedSpecimen.commonName && (
            <p className="latin">{localizedSpecimen.commonName}</p>
          )}
          <p>
            <b>{text.period}</b> {localizedSpecimen.period || text.noInfo} <span className="dot">•</span>{" "}
            <b>{text.location}</b> {localizedSpecimen.location || text.noInfo}
          </p>
        </div>
        <LanguageSwitcher language={language} onChange={setLanguage} className="specimen-language" />
      </div>
      <div className="detail-photo">
        <img
          src={image}
          alt={
            selectedImage?.alt_text ||
            localizedSpecimen.imageAlt ||
            `${text.imageAlt} ${specimen.name}`
          }
        />
      </div>
      {imageMedia.length > 1 && (
        <div className="thumbs">
          {imageMedia.map((media) => (
            <button
              className={media.id === selectedImage?.id ? "selected" : ""}
              key={media.id}
              onClick={() => setSelectedImageId(media.id)}
              aria-label={`${text.viewImage}: ${media.alt_text || text.imageAlt}`}
            >
              <img src={media.url} alt="" />
            </button>
          ))}
        </div>
      )}
      <section className="about-specimen">
        <h2>{text.about}</h2>
        <p>{localizedSpecimen.description}</p>
      </section>
      <div className="fact-grid">
        <div>
          <Icon>♧</Icon>
          <b>{text.type}</b>
          <span>{localizedSpecimen.type || text.noInfo}</span>
        </div>
        <div>
          <Icon>⌁</Icon>
          <b>{text.length}</b>
          <span>{localizedSpecimen.length || text.noInfo}</span>
        </div>
        <div>
          <Icon>◉</Icon>
          <b>{text.diet}</b>
          <span>{localizedSpecimen.diet || text.noInfo}</span>
        </div>
        <div>
          <Icon>✥</Icon>
          <b>{text.era}</b>
          <span>{localizedSpecimen.era || text.noInfo}</span>
        </div>
      </div>
      <section className="listen">
        <h2>{text.listen}</h2>
        <p>{text.listenHint}</p>
        <AudioPlayer text={narration} language={language} />
      </section>
    </main>
  );
}

function About({ language }) {
  const text = copy[language].about;
  return (
    <main className="page">
      <section className="about-hero">
        <div className="shell">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p>{text.text}</p>
        </div>
      </section>
      <section className="shell about-content">
        <div>
          <p className="eyebrow">{text.projectEyebrow}</p>
          <h2>{text.projectTitle}</h2>
          <p>{text.projectText}</p>
          <p>{text.projectText2}</p>
        </div>
        <aside>
          <span>⌘</span>
          <h3>{text.visitTitle}</h3>
          <p>{text.visitPlace}</p>
          <a className="button green" href="#/catalogo">
            {text.visit}
          </a>
        </aside>
      </section>
    </main>
  );
}

function Accessibility({ language, textScale, onIncreaseText, onDecreaseText, darkMode, onToggleDarkMode }) {
  const text = copy[language].accessibility;
  const percentage = Math.round(textScale * 100);
  return (
    <main className="shell page accessibility">
      <p className="eyebrow">{text.eyebrow}</p>
      <h1>{text.title}</h1>
      <p className="intro">{text.intro}</p>
      <div className="access-controls" role="group" aria-label={text.title}>
        <button type="button" onClick={onIncreaseText} disabled={textScale >= MAX_TEXT_SCALE}>
          <Icon>A+</Icon>{text.increase}
        </button>
        <button type="button" onClick={onDecreaseText} disabled={textScale <= MIN_TEXT_SCALE}>
          <Icon>A−</Icon>{text.decrease}
        </button>
        <span className="text-scale-status" aria-live="polite">{percentage}%</span>
        <div className="dark-mode-control">
          <span className="dark-mode-label"><Icon>◐</Icon>{text.darkMode}</span>
          <label className="switch">
            <input type="checkbox" checked={darkMode} onChange={onToggleDarkMode} aria-label={text.darkMode} />
            <span className="switch-slider" aria-hidden="true" />
          </label>
        </div>
      </div>
      <div className="access-grid">
        <article>
          <Icon>⌨</Icon>
          <h2>{text.cards[0][0]}</h2>
          <p>{text.cards[0][1]}</p>
        </article>
        <article>
          <Icon>◖))</Icon>
          <h2>{text.cards[1][0]}</h2>
          <p>{text.cards[1][1]}</p>
        </article>
        <article>
          <Icon>◉</Icon>
          <h2>{text.cards[2][0]}</h2>
          <p>{text.cards[2][1]}</p>
        </article>
      </div>
    </main>
  );
}

const TEXT_SCALE_STORAGE_KEY = "paleomonte-text-scale";
const DARK_MODE_STORAGE_KEY = "paleomonte-dark-mode";
const MIN_TEXT_SCALE = 0.9;
const MAX_TEXT_SCALE = 1.2;
const TEXT_SCALE_STEP = 0.1;

function readTextScale() {
  const savedScale = Number(window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
  return Number.isFinite(savedScale)
    ? Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, savedScale))
    : 1;
}

function readDarkMode() {
  return window.localStorage.getItem(DARK_MODE_STORAGE_KEY) === "true";
}

function App() {
  const route = useRoute();
  const [language, setLanguage] = useState(() => window.localStorage.getItem('paleomonte-language') || 'pt');
  const [textScale, setTextScale] = useState(readTextScale);
  const [darkMode, setDarkMode] = useState(readDarkMode);
  useEffect(() => window.localStorage.setItem('paleomonte-language', language), [language]);
  useEffect(() => {
    window.localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(textScale));
    document.documentElement.style.setProperty("--text-scale", String(textScale));
  }, [textScale]);
  useEffect(() => {
    window.localStorage.setItem(DARK_MODE_STORAGE_KEY, String(darkMode));
    document.documentElement.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);
  const increaseText = () => setTextScale((current) => Math.min(MAX_TEXT_SCALE, Number((current + TEXT_SCALE_STEP).toFixed(1))));
  const decreaseText = () => setTextScale((current) => Math.max(MIN_TEXT_SCALE, Number((current - TEXT_SCALE_STEP).toFixed(1))));
  const toggleDarkMode = () => setDarkMode((current) => !current);
  const passwordSetup =
    window.location.pathname.replace(/\/+$/, "") === "/definir-senha";
  usePublicAccessTracking(passwordSetup ? "/admin" : route);
  const { specimens, loading, error, reload } = usePublicCatalog();
  let content;
  if (passwordSetup)
    content = <AdminPanel onCatalogChanged={reload} passwordSetup />;
  else if (route.startsWith("/catalogo"))
    content = <Catalog specimens={specimens} loading={loading} error={error} language={language} />;
  else if (route.startsWith("/fosseis/"))
    content = (
      <SpecimenPage
        specimen={specimens.find((s) => route.includes(s.slug))}
        loading={loading}
        siteLanguage={language}
      />
    );
  else if (route === "/sobre") content = <About language={language} />;
  else if (route === "/acessibilidade") content = <Accessibility language={language} textScale={textScale} onIncreaseText={increaseText} onDecreaseText={decreaseText} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
  else if (route === "/admin")
    content = <AdminPanel onCatalogChanged={reload} />;
  else content = <Home specimens={specimens} loading={loading} language={language} />;
  const isAdmin = route === "/admin" || passwordSetup;
  return (
    <>
      {!isAdmin && <Header language={language} onLanguageChange={setLanguage} />}
      {content}
      {!isAdmin && <Footer language={language} textScale={textScale} onIncreaseText={increaseText} onDecreaseText={decreaseText} />}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
