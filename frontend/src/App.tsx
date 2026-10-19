/**
 * Casca da aplicação: barra lateral, cabeçalho e a tela da rota atual.
 *
 * Este arquivo não guarda dados. Cada tela busca o que precisa da API e
 * cuida do próprio estado; aqui ficam só as três coisas comuns a todas:
 * a navegação por hash, o título da página e a faixa de avisos.
 *
 * Até a integração terminar, ele também guardava os registros das telas que
 * ainda viviam no `localStorage`. Com as doze telas consumindo a API, essa
 * camada inteira deixou de ser alcançada e foi removida.
 */

import { useEffect, useRef, useState } from 'react';
import { Button, Sidebar } from './components';
import { Home } from './screens/Home';
import { Reports } from './screens/Reports';
import { PessoasScreen } from './screens/PessoasScreen';
import { TitulosScreen } from './screens/TitulosScreen';
import { PlanoContasScreen } from './screens/PlanoContasScreen';
import { DespesasScreen } from './screens/DespesasScreen';
import { ChequesScreen } from './screens/ChequesScreen';
import { RemessasScreen } from './screens/RemessasScreen';
import { CartoriosScreen } from './screens/CartoriosScreen';
import { LancamentosScreen } from './screens/LancamentosScreen';
import { BancosScreen } from './screens/BancosScreen';
import { LADO_A_PAGAR, LADO_A_RECEBER } from './adapters/titulos';
import { OPERACOES_A_PAGAR, OPERACOES_A_RECEBER } from './screens/operacoes-de-titulo';
import { isEntity, routeFromHash, screens, type Route } from './data';

/** Quanto tempo um aviso fica na tela, em milissegundos. */
const DURACAO_DO_AVISO = 6000;

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const rotaAnterior = useRef(route);

  // Navegação por hash: nada de biblioteca de rotas, só o evento do navegador.
  useEffect(() => {
    const navegar = () => {
      setRoute(routeFromHash());
      setSidebarOpen(false);
    };
    window.addEventListener('hashchange', navegar);
    return () => window.removeEventListener('hashchange', navegar);
  }, []);

  // Título da aba e foco no cabeçalho a cada troca de tela, para quem navega
  // pelo teclado perceber que a página mudou.
  useEffect(() => {
    const nome = isEntity(route)
      ? screens[route].title
      : route === 'inicio'
        ? 'Menu Principal'
        : 'Relatórios';
    document.title = `${nome} | Contas a Pagar e a Receber`;

    if (rotaAnterior.current !== route) {
      headingRef.current?.focus();
      rotaAnterior.current = route;
    }
  }, [route]);

  // O aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!notice) return;
    const relogio = window.setTimeout(() => setNotice(''), DURACAO_DO_AVISO);
    return () => window.clearTimeout(relogio);
  }, [notice]);

  const config = isEntity(route) ? screens[route] : undefined;
  const title = config?.title || (route === 'inicio' ? 'Menu Principal' : 'Relatórios');

  /**
   * Escolhe a tela a desenhar conforme a rota.
   *
   * Todas as telas de cadastro recebem `onAviso`, que é como elas falam com
   * a faixa de avisos lá embaixo, e nada mais: os dados cada uma busca.
   */
  function telaAtual() {
    switch (route) {
      case 'inicio':
        return <Home />;
      case 'relatorios':
        return <Reports />;
      case 'clientes':
        return <PessoasScreen entity="clientes" papel="CLIENTE" onAviso={setNotice} />;
      case 'fornecedores':
        return <PessoasScreen entity="fornecedores" papel="FORNECEDOR" onAviso={setNotice} />;
      case 'pagamentos':
        return (
          <TitulosScreen
            entity="pagamentos"
            lado={LADO_A_PAGAR}
            operacoes={OPERACOES_A_PAGAR}
            onAviso={setNotice}
          />
        );
      case 'recebimentos':
        return (
          <TitulosScreen
            entity="recebimentos"
            lado={LADO_A_RECEBER}
            operacoes={OPERACOES_A_RECEBER}
            onAviso={setNotice}
          />
        );
      case 'plano':
        return <PlanoContasScreen onAviso={setNotice} />;
      case 'despesas':
        return <DespesasScreen onAviso={setNotice} />;
      case 'cheques':
        return <ChequesScreen onAviso={setNotice} />;
      case 'remessas':
        return <RemessasScreen onAviso={setNotice} />;
      case 'cartorios':
        return <CartoriosScreen onAviso={setNotice} />;
      case 'lancamentos':
        return <LancamentosScreen onAviso={setNotice} />;
      case 'bancos':
        return <BancosScreen onAviso={setNotice} />;
    }
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={evento => {
          evento.preventDefault();
          headingRef.current?.focus();
        }}
      >
        Ir para o conteúdo
      </a>

      <Sidebar route={route} />

      {/* Em telas estreitas, o menu vira gaveta; este fundo a fecha. */}
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main-column">
        <header className="topbar">
          <Button
            className="menu-toggle"
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(aberto => !aberto)}
          >
            ☰
          </Button>
          <a href="#/inicio" className="screen-title">
            {title}
          </a>
          <small>Sistema de Contas a Pagar e a Receber</small>
        </header>

        <main id="main-content" className="workspace">
          {/* `tabIndex={-1}` deixa o título receber foco por código, sem
              entrar na ordem de tabulação. */}
          <h1 ref={headingRef} tabIndex={-1}>
            {config?.heading || title}
          </h1>
          <p className="screen-description">
            {config?.description ||
              (route === 'inicio'
                ? 'Selecione uma opção para acessar o sistema.'
                : 'Visualização e impressão de relatórios do sistema.')}
          </p>

          {telaAtual()}
        </main>
      </div>

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button aria-label="Dispensar mensagem" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
