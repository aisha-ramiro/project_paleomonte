import { useState } from 'react';
import { ArrowUpRight, Clock3, MapPin, Phone, Mail } from 'lucide-react';
import { museumAbout, museumPhotos, museumSources } from '../data/museumAbout';

function SourceLink({ id, text }) {
  const source = museumSources[id];
  return <a className="museum-source-link" href={source.url} target="_blank" rel="noopener noreferrer">{text.sourceLink}: {source.label}<ArrowUpRight size={12} aria-hidden="true"/></a>;
}

function MuseumPhoto({ photo, text, prominent = false }) {
  const [failed, setFailed] = useState(false);
  const description = text.photos[photo.id];
  return <figure className={`museum-photo museum-photo-${photo.id}`}>
    <a href={photo.source} target="_blank" rel="noopener noreferrer" aria-label={`${description.caption} · ${text.original}`}>
      {failed ? <div className="museum-photo-unavailable">{text.unavailable}</div> : <img src={photo.url} alt={description.alt} width={photo.width} height={photo.height} loading={prominent ? 'eager' : 'lazy'} fetchPriority={prominent ? 'high' : 'auto'} decoding="async" onError={() => setFailed(true)}/>}
    </a>
    <figcaption><strong>{description.caption}</strong><span>{text.credit}: {photo.author} · <a href={photo.source} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a> · {text.framing}</span></figcaption>
  </figure>;
}

export default function AboutMuseum({ language }) {
  const text = museumAbout[language] ?? museumAbout.pt;
  return <main className="page museum-about">
    <section className="shell museum-intro">
      <div className="museum-intro-copy"><p className="eyebrow">{text.eyebrow}</p><h1>{text.title}</h1><p className="museum-intro-text">{text.intro}</p><p className="museum-official-name">Museu de Paleontologia<br/><strong>Prof. Antonio Celso de Arruda Campos</strong></p><div className="museum-intro-actions"><a className="button green" href="#/catalogo">{text.catalog}<ArrowUpRight size={16} aria-hidden="true"/></a><button type="button" className="museum-visit-jump" onClick={() => { const section = document.getElementById('museum-visit'); section?.focus({ preventScroll: true }); section?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{text.plan} ↓</button></div><ul className="museum-facts"><li>{text.since}</li><li>{text.publicMuseum}</li><li>{text.free}</li></ul></div>
      <MuseumPhoto photo={museumPhotos[0]} text={text} prominent/>
    </section>

    <section className="shell museum-story" aria-labelledby="museum-history-title">
      <div><p className="eyebrow">{text.historyEyebrow}</p><h2 id="museum-history-title">{text.historyTitle}</h2><p>{text.history}</p><SourceLink id="origins" text={text}/></div>
      <ol className="museum-timeline">{text.timeline.map((item) => <li key={item.year}><span>{item.year}</span><div><h3>{item.title}</h3><p>{item.text}</p><SourceLink id={item.source} text={text}/></div></li>)}</ol>
    </section>

    <section className="museum-collection" aria-labelledby="museum-collection-title"><div className="shell">
      <div className="museum-section-heading"><div><p className="eyebrow">{text.collectionEyebrow}</p><h2 id="museum-collection-title">{text.collectionTitle}</h2></div><div><p>{text.collection}</p><SourceLink id="city" text={text}/></div></div>
      <div className="museum-gallery-heading"><h3>{text.galleryTitle}</h3><p>{text.galleryNote}</p></div>
      <div className="museum-gallery">{museumPhotos.slice(1).map((photo) => <MuseumPhoto key={photo.id} photo={photo} text={text}/>)}</div>
    </div></section>

    <section className="shell museum-mission" aria-labelledby="museum-mission-title"><p className="eyebrow">{text.missionEyebrow}</p><h2 id="museum-mission-title">{text.missionTitle}</h2><div className="museum-mission-grid">{text.mission.map((item, index) => <article key={item.title}><span className="museum-mission-number" aria-hidden="true">0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p><SourceLink id={item.source} text={text}/>{index === 1 && <SourceLink id="backstage" text={text}/>}{index === 2 && <SourceLink id="registry" text={text}/>}</article>)}</div></section>

    <section className="shell museum-visit" id="museum-visit" aria-labelledby="museum-visit-title" tabIndex="-1"><div className="museum-visit-heading"><p className="eyebrow">{text.visitEyebrow}</p><h2 id="museum-visit-title">{text.visitTitle}</h2><span className="museum-free-badge">{text.free}</span></div><div className="museum-visit-grid">
      <article><MapPin size={24} aria-hidden="true"/><h3>{text.addressLabel}</h3><address><strong>{text.address}</strong>{text.addressLines.map((line) => <span key={line}>{line}</span>)}</address><a className="museum-action-link" href="https://www.google.com/maps/search/?api=1&query=Museu+de+Paleontologia+Monte+Alto+Pra%C3%A7a+do+Centen%C3%A1rio" target="_blank" rel="noopener noreferrer">{text.map}<ArrowUpRight size={15} aria-hidden="true"/></a></article>
      <article><Clock3 size={24} aria-hidden="true"/><h3>{text.hoursLabel}</h3><dl>{text.hours.map(([day, hours]) => <div key={day}><dt>{day}</dt><dd>{hours}</dd></div>)}</dl><p className="museum-visit-note">{text.visitNote}</p></article>
      <article><Phone size={24} aria-hidden="true"/><h3>{text.bookingLabel}</h3><p>{text.booking}</p><a className="museum-action-link" href="tel:+551632444067" aria-label={`${text.contact}: (16) 3244-4067`}>(16) 3244-4067<ArrowUpRight size={15} aria-hidden="true"/></a><a className="museum-action-link museum-email" href="mailto:mpaleo@montealto.sp.gov.br" aria-label={`${text.email}: mpaleo@montealto.sp.gov.br`}><Mail size={15} aria-hidden="true"/>mpaleo@montealto.sp.gov.br</a></article>
    </div><div className="museum-visit-sources"><SourceLink id="city" text={text}/><SourceLink id="registry" text={text}/><SourceLink id="backstage" text={text}/></div></section>

    <section className="shell museum-digital"><div><p className="eyebrow">PaleoMonte</p><h2>{text.projectTitle}</h2><p>{text.projectText}</p></div><div><a className="button green" href="#/catalogo">{text.catalog}<ArrowUpRight size={16} aria-hidden="true"/></a><a className="museum-action-link" href="#/acessibilidade">{text.accessibility} →</a></div></section>
    <section className="shell museum-sources" aria-labelledby="museum-sources-title"><h2 id="museum-sources-title">{text.sourcesTitle}</h2><p>{text.sourcesNote}</p><ul>{Object.entries(museumSources).map(([id, source]) => <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ArrowUpRight size={12} aria-hidden="true"/></a></li>)}</ul></section>
  </main>;
}
