import { Component } from 'react';
import { recordDiagnosticEvent } from '../services/diagnosticEvents';

export default class AppErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { recordDiagnosticEvent('interface', 'runtime_error'); }
  openDiagnostics = () => {
    try { window.sessionStorage.setItem('paleomonte-open-diagnostics', 'true'); } catch { /* A navegação continua sem persistência. */ }
    window.location.hash = '/admin';
    window.location.reload();
  };
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="admin-login"><div className="login-card"><p className="eyebrow">PaleoMonte</p><h1>Não foi possível abrir esta tela</h1><p>Atualize a página e tente novamente. A equipe pode consultar o aviso no Diagnóstico do painel.</p><button className="button green" type="button" onClick={() => window.location.reload()}>Atualizar página</button><button className="login-text-action" type="button" onClick={this.openDiagnostics}>Acessar diagnóstico da equipe</button></div></main>;
  }
}
