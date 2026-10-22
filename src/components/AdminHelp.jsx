import { useState } from 'react';
import { BookOpen, Search, ChevronDown, ArrowUpRight, CircleHelp } from 'lucide-react';
import { helpArticles, helpTopics } from '../data/adminHelp';
import './admin-help.css';

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function AdminHelp({ roles = [] }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const articles = helpArticles.filter((article) => {
    const topicTitle = helpTopics.find((item) => item.id === article.topic).title;
    const text = normalize([article.title, article.description, topicTitle, ...article.steps, ...(article.notes ?? [])].join(' '));
    return (topic === 'all' || topic === article.topic) && terms.every((term) => text.includes(term));
  });
  const reset = () => { setQuery(''); setTopic('all'); };

  return <section className="admin-help" aria-label="Central de ajuda">
    <div className="help-intro">
      <div className="help-intro-icon"><BookOpen size={28} aria-hidden="true"/></div>
      <div><p className="eyebrow">Guia da equipe PaleoMonte</p><h2>Como podemos ajudar?</h2><p>Do primeiro cadastro à publicação: encontre orientações para cuidar do acervo e apoiar a visita ao museu.</p></div>
      <a href="#/" target="_blank" rel="noopener noreferrer" className="help-public-link">Conferir site público <ArrowUpRight size={16} aria-hidden="true"/><span className="sr-only"> (abre em nova aba)</span></a>
    </div>

    <div className="help-tools">
      <label className="help-search" htmlFor="help-search"><span className="sr-only">Buscar nos tutoriais</span><Search size={19} aria-hidden="true"/><input id="help-search" type="search" placeholder="Busque por espécie, foto, QR Code, senha…" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <p>Escolha um assunto ou pesquise uma dúvida. Abra um tutorial para ver o passo a passo.</p>
    </div>

    <div className="help-topics" role="group" aria-label="Filtrar tutoriais por assunto">
      <button type="button" className={topic === 'all' ? 'selected' : ''} aria-pressed={topic === 'all'} onClick={() => setTopic('all')}><b>Todos os tutoriais</b><span>Explore o guia completo.</span></button>
      {helpTopics.map((item) => <button type="button" key={item.id} className={topic === item.id ? 'selected' : ''} aria-pressed={topic === item.id} onClick={() => setTopic(item.id)}><b>{item.title}</b><span>{item.description}</span></button>)}
    </div>

    <div className="help-results-heading"><h2>{topic === 'all' ? 'Tutoriais e orientações' : helpTopics.find((item) => item.id === topic).title}</h2><p role="status">{articles.length} {articles.length === 1 ? 'tutorial encontrado' : 'tutoriais encontrados'}</p>{(query || topic !== 'all') && <button type="button" className="text-button" onClick={reset}>Limpar filtros</button>}</div>
    <div className="help-articles">
      {articles.map((article) => <details className="help-article" key={article.id}>
        <summary><span className="help-article-icon"><BookOpen size={18} aria-hidden="true"/></span><span className="help-article-heading"><span className="help-article-meta">{helpTopics.find((item) => item.id === article.topic).title}{article.adminOnly && <span className="help-role-badge">Ação de administrador</span>}</span><h3>{article.title}</h3><span className="help-article-description">{article.description}</span></span><ChevronDown className="help-chevron" size={19} aria-hidden="true"/></summary>
        <div className="help-article-body">
          {article.adminOnly && !roles.includes('admin') && <p className="help-permission-note">Seu nível de Operador não permite gerenciar usuários. Solicite esta ação a um administrador.</p>}
          <ol>{article.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
          {article.notes?.length > 0 && <aside className="help-notes" aria-label="Cuidados e observações"><h4>Vale lembrar</h4><ul>{article.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></aside>}
        </div>
      </details>)}
      {articles.length === 0 && <div className="help-empty"><Search size={28} aria-hidden="true"/><h3>Nenhum tutorial encontrado</h3><p>Tente uma palavra mais curta, como “foto”, “traduzir” ou “usuário”, ou consulte todos os assuntos.</p><button className="button green" type="button" onClick={reset}>Ver todos os tutoriais</button></div>}
    </div>
    <aside className="help-contact"><CircleHelp size={24} aria-hidden="true"/><div><h2>Ainda precisa de ajuda?</h2><p>Procure a administração do projeto. Informe o que tentou fazer, a seção do painel e a mensagem exibida. Nunca compartilhe sua senha.</p></div></aside>
  </section>;
}
