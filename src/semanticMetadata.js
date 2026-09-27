import { copy, languages, localizeSpecimen } from './i18n.js';

const SITE_NAME = 'PaleoMonte';
const SCHEMA_CONTEXT = 'https://schema.org';
const PAGE_SCHEMA_ID = 'paleomonte-page-jsonld';

function pageUrl(origin, route) {
  const path = route.split('?')[0];
  return path === '/' ? `${origin}/` : `${origin}/#${path}`;
}

export function buildPageMetadata({ route, specimen, loading, language, origin }) {
  const text = copy[language] ?? copy.pt;
  const locale = languages[language]?.locale ?? languages.pt.locale;
  const url = pageUrl(origin, route);
  let title = `${SITE_NAME} | Museu de Paleontologia`;
  let description = text.home.text;
  let type = 'WebPage';
  let mainEntity;

  if (route === '/admin' || route === '/definir-senha') {
    return { title: `Acesso | ${SITE_NAME}`, description: '', locale, schema: null };
  }

  if (route.startsWith('/catalogo')) {
    title = `${text.catalog.title} | ${SITE_NAME}`;
    type = 'CollectionPage';
  } else if (route.startsWith('/fosseis/')) {
    if (loading) {
      return { title, description, locale, schema: null };
    }
    if (!specimen) {
      return { title: `${text.specimen.notFound} | ${SITE_NAME}`, description: '', locale, schema: null };
    }
    title = `${specimen.name} | ${SITE_NAME}`;
    description = text.about.projectText2;

    // A publicação no catálogo não comprova, por si só, validação científica.
    if (specimen?.validatedAt) {
      const localized = localizeSpecimen(specimen, language);
      description = localized.summary || localized.description || description;
      mainEntity = {
        '@type': 'Taxon',
        name: specimen.name,
        ...(localized.commonName ? { alternateName: localized.commonName } : {}),
        ...(localized.description ? { description: localized.description } : {}),
      };
    }
  } else if (route === '/sobre') {
    title = `${text.nav.about} | ${SITE_NAME}`;
    description = text.about.text;
    type = 'AboutPage';
    mainEntity = {
      '@type': 'Museum',
      name: 'Museu de Paleontologia Prof. Antonio Celso de Arruda Campos',
      url: 'https://montealto.sp.gov.br/site/museudepaleontologia/',
    };
  } else if (route === '/acessibilidade') {
    title = `${text.nav.accessibility} | ${SITE_NAME}`;
    description = text.accessibility.intro;
  }

  return {
    title,
    description,
    locale,
    schema: {
      '@context': SCHEMA_CONTEXT,
      '@type': type,
      '@id': url,
      name: title,
      description,
      url,
      inLanguage: locale,
      isPartOf: { '@id': `${origin}/` },
      ...(mainEntity ? { mainEntity } : {}),
    },
  };
}

export function updatePageMetadata(options) {
  const { title, description, locale, schema } = buildPageMetadata(options);
  document.title = title;
  document.documentElement.lang = locale;

  const descriptionTag = document.querySelector('meta[name="description"]');
  const openGraphTitle = document.querySelector('meta[property="og:title"]');
  const openGraphDescription = document.querySelector('meta[property="og:description"]');
  descriptionTag?.setAttribute('content', description);
  openGraphTitle?.setAttribute('content', title);
  openGraphDescription?.setAttribute('content', description);

  let script = document.getElementById(PAGE_SCHEMA_ID);
  if (!schema) {
    script?.remove();
    return;
  }

  if (!script) {
    script = document.createElement('script');
    script.id = PAGE_SCHEMA_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
}
