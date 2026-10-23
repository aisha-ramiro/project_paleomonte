import { museumAbout } from './data/museumAbout.js';

export const languages = {
  pt: { label: 'Português', flag: '🇧🇷', locale: 'pt-BR' },
  en: { label: 'English', flag: '🇺🇸', locale: 'en-US' },
  es: { label: 'Español', flag: '🇪🇸', locale: 'es-ES' },
};

export const copy = {
  pt: {
    nav: { home: 'Início', catalog: 'Catálogo', about: 'Sobre o museu', accessibility: 'Acessibilidade' },
    footer: { links: 'Links úteis', accessibility: 'Acessibilidade', follow: 'Siga-nos', increase: 'Aumentar texto', decrease: 'Diminuir texto', contrast: 'Alto contraste' },
    home: {
      eyebrow: 'Museu de Paleontologia', title: ['Descubra a', 'história da vida', 'que já existiu'],
      text: 'Explore o acervo paleontológico de Monte Alto através de informações, imagens e recursos de acessibilidade.',
      explore: 'Explorar catálogo', featuredEyebrow: 'Acervo em destaque', featuredTitle: 'Histórias preservadas no tempo',
      allCatalog: 'Ver catálogo completo →', experienceEyebrow: 'Uma experiência para todos',
      experienceTitle: 'O passado ganha novas formas de ser descoberto.', visit: 'Conheça o museu',
      features: [
        ['Escaneie o QR Code', 'Encontre o código ao lado do fóssil na exposição.'],
        ['Acesse as informações', 'Leia sobre a espécie, descubra curiosidades.'],
        ['Ouça a descrição', 'Recurso de áudio para tornar o conteúdo acessível.'],
        ['Conheça nosso acervo', 'Navegue pelo catálogo completo do museu.'],
      ],
    },
    catalog: { crumb: 'Início', eyebrow: 'Explore o acervo', title: 'Catálogo', loading: 'Carregando...', found: 'itens encontrados', search: 'Buscar fósseis, espécies, períodos...', category: 'Filtrar por categoria', period: 'Filtrar por período', all: 'Todos', filterNote: 'Filtros aplicados automaticamente ao catálogo', empty: 'Nenhum fóssil publicado foi encontrado.', preparing: 'O acervo está sendo preparado para publicação.' },
    specimen: { crumb: 'Início', catalog: 'Catálogo', back: '← Voltar ao catálogo', loading: 'Carregando espécie...', notFound: 'Espécime não encontrado', viewImage: 'Ver foto da espécie', categoryFallback: 'Acervo', scientificName: 'Nome científico', commonName: 'Nome popular', period: 'Período:', location: 'Local de descoberta:', about: 'Sobre a espécie', type: 'Tipo', length: 'Comprimento', diet: 'Dieta', era: 'Era geológica', listen: 'Ouça a descrição', listenHint: 'Aperte play para ouvir as informações desta espécie em português.', listenUnavailable: 'Leitura não disponível neste navegador', listenIdle: 'Ouvir descrição', listenSpeaking: 'Lendo informações da espécie', listenPaused: 'Leitura pausada', listenError: 'Não foi possível iniciar a leitura', play: 'Ouvir descrição', pause: 'Pausar leitura', continue: 'Continuar leitura', nativeVoice: 'Leitura nativa em português', noInfo: 'Não informado', meters: 'metros', imageAlt: 'Imagem do espécime' },
    about: { ...museumAbout.pt, text: museumAbout.pt.intro, projectText2: museumAbout.pt.projectText },
    accessibility: { eyebrow: 'Para todas as pessoas', title: 'Acessibilidade', intro: 'O PaleoMonte foi projetado para oferecer uma navegação simples, legível e acolhedora durante a visita ao museu.', increase: 'Aumentar texto', decrease: 'Diminuir texto', normal: 'Tamanho padrão', contrast: 'Alto contraste', darkMode: 'Modo escuro', cards: [['Navegação por teclado', 'Todos os elementos interativos podem ser acessados pelo teclado.'], ['Conteúdo em áudio', 'As espécies contam com controles para ouvir suas descrições.'], ['Leitura clara', 'Tipografia legível, contraste adequado e estrutura semântica.']] },
  },
  en: {
    nav: { home: 'Home', catalog: 'Catalog', about: 'About the museum', accessibility: 'Accessibility' },
    footer: { links: 'Useful links', accessibility: 'Accessibility', follow: 'Follow us', increase: 'Increase text', decrease: 'Decrease text', contrast: 'High contrast' },
    home: {
      eyebrow: 'Paleontology Museum', title: ['Discover the', 'history of life', 'that once existed'],
      text: 'Explore Monte Alto’s paleontological collection through information, images, and accessibility resources.',
      explore: 'Explore catalog', featuredEyebrow: 'Collection highlights', featuredTitle: 'Stories preserved through time',
      allCatalog: 'View full catalog →', experienceEyebrow: 'An experience for everyone',
      experienceTitle: 'The past takes on new ways to be discovered.', visit: 'Discover the museum',
      features: [
        ['Scan the QR Code', 'Find the code next to the fossil in the exhibition.'],
        ['Access the information', 'Read about the species and discover curiosities.'],
        ['Listen to the description', 'An audio resource that makes the content more accessible.'],
        ['Explore our collection', 'Browse the complete museum collection.'],
      ],
    },
    catalog: { crumb: 'Home', eyebrow: 'Explore the collection', title: 'Catalog', loading: 'Loading...', found: 'items found', search: 'Search fossils, species, periods...', category: 'Filter by category', period: 'Filter by period', all: 'All', filterNote: 'Filters are applied automatically to the catalog', empty: 'No published fossil was found.', preparing: 'The collection is being prepared for publication.' },
    specimen: { crumb: 'Home', catalog: 'Catalog', back: '← Back to catalog', loading: 'Loading species...', notFound: 'Specimen not found', viewImage: 'View species photo', categoryFallback: 'Collection', scientificName: 'Scientific name', commonName: 'Common name', period: 'Period:', location: 'Discovery location:', about: 'About the species', type: 'Type', length: 'Length', diet: 'Diet', era: 'Geological era', listen: 'Listen to the description', listenHint: 'Press play to hear the information about this species in English.', listenUnavailable: 'Voice reading is not available in this browser', listenIdle: 'Listen to description', listenSpeaking: 'Reading species information', listenPaused: 'Reading paused', listenError: 'Unable to start reading', play: 'Listen to description', pause: 'Pause reading', continue: 'Continue reading', nativeVoice: 'Native English voice', noInfo: 'Not provided', meters: 'meters', imageAlt: 'Image of specimen' },
    about: { ...museumAbout.en, text: museumAbout.en.intro, projectText2: museumAbout.en.projectText },
    accessibility: { eyebrow: 'For everyone', title: 'Accessibility', intro: 'PaleoMonte was designed to provide simple, readable, welcoming navigation during a museum visit.', increase: 'Increase text', normal: 'Default text size', contrast: 'High contrast', darkMode: 'Dark mode', cards: [['Keyboard navigation', 'Every interactive element can be accessed with a keyboard.'], ['Audio content', 'Species include controls to listen to their descriptions.'], ['Clear reading', 'Legible type, suitable contrast, and semantic structure.']] },
  },
  es: {
    nav: { home: 'Inicio', catalog: 'Catálogo', about: 'Sobre el museo', accessibility: 'Accesibilidad' },
    footer: { links: 'Enlaces útiles', accessibility: 'Accesibilidad', follow: 'Síguenos', increase: 'Aumentar texto', decrease: 'Reducir texto', contrast: 'Alto contraste' },
    home: {
      eyebrow: 'Museo de Paleontología', title: ['Descubre la', 'historia de la vida', 'que ya existió'],
      text: 'Explora la colección paleontológica de Monte Alto a través de información, imágenes y recursos de accesibilidad.',
      explore: 'Explorar catálogo', featuredEyebrow: 'Colección destacada', featuredTitle: 'Historias preservadas en el tiempo',
      allCatalog: 'Ver catálogo completo →', experienceEyebrow: 'Una experiencia para todos',
      experienceTitle: 'El pasado encuentra nuevas formas de ser descubierto.', visit: 'Conoce el museo',
      features: [
        ['Escanea el código QR', 'Encuentra el código junto al fósil en la exposición.'],
        ['Accede a la información', 'Lee sobre la especie y descubre curiosidades.'],
        ['Escucha la descripción', 'Un recurso de audio que hace el contenido más accesible.'],
        ['Conoce nuestra colección', 'Explora el catálogo completo del museo.'],
      ],
    },
    catalog: { crumb: 'Inicio', eyebrow: 'Explora la colección', title: 'Catálogo', loading: 'Cargando...', found: 'elementos encontrados', search: 'Busca fósiles, especies o períodos...', category: 'Filtrar por categoría', period: 'Filtrar por período', all: 'Todos', filterNote: 'Los filtros se aplican automáticamente al catálogo', empty: 'No se encontró ningún fósil publicado.', preparing: 'La colección se está preparando para su publicación.' },
    specimen: { crumb: 'Inicio', catalog: 'Catálogo', back: '← Volver al catálogo', loading: 'Cargando especie...', notFound: 'Espécimen no encontrado', viewImage: 'Ver foto de la especie', categoryFallback: 'Colección', scientificName: 'Nombre científico', commonName: 'Nombre común', period: 'Período:', location: 'Lugar del descubrimiento:', about: 'Sobre la especie', type: 'Tipo', length: 'Longitud', diet: 'Dieta', era: 'Era geológica', listen: 'Escucha la descripción', listenHint: 'Pulsa reproducir para escuchar la información de esta especie en español.', listenUnavailable: 'La lectura por voz no está disponible en este navegador', listenIdle: 'Escuchar descripción', listenSpeaking: 'Leyendo información de la especie', listenPaused: 'Lectura en pausa', listenError: 'No se pudo iniciar la lectura', play: 'Escuchar descripción', pause: 'Pausar lectura', continue: 'Continuar lectura', nativeVoice: 'Voz nativa en español', noInfo: 'No informado', meters: 'metros', imageAlt: 'Imagen del espécimen' },
    about: { ...museumAbout.es, text: museumAbout.es.intro, projectText2: museumAbout.es.projectText },
    accessibility: { eyebrow: 'Para todas las personas', title: 'Accesibilidad', intro: 'PaleoMonte fue diseñado para ofrecer una navegación simple, legible y acogedora durante la visita al museo.', increase: 'Aumentar texto', normal: 'Tamaño predeterminado', contrast: 'Alto contraste', darkMode: 'Modo oscuro', cards: [['Navegación por teclado', 'Todos los elementos interactivos se pueden acceder con el teclado.'], ['Contenido de audio', 'Las especies incluyen controles para escuchar sus descripciones.'], ['Lectura clara', 'Tipografía legible, contraste adecuado y estructura semántica.']] },
  },
};

export function localizeSpecimen(specimen, language) {
  if (language === 'pt') return specimen;
  const translation = specimen.translations?.[language] ?? {};
  const value = (field) => translation[field] || specimen[field];
  return {
    ...specimen,
    commonName: value('commonName'),
    category: value('category'),
    period: value('period'),
    era: value('era'),
    discoveredBy: value('discoveredBy'),
    type: value('type'),
    diet: value('diet'),
    location: value('location'),
    description: value('description'),
    summary: value('summary'),
    length: specimen.lengthMeters ? `${specimen.lengthMeters} ${copy[language].specimen.meters}` : '',
  };
}
