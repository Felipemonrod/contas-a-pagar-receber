/**
 * Casca da aplicação: barra lateral, cabeçalho e a tela da rota atual.
 *
 * O sistema está em transição. Três telas já falam com a API e cuidam do
 * próprio estado (`src/screens/`); as demais ainda guardam os registros no
 * `localStorage`, e é esse estado que vive aqui, em `database`.
 *
 * Por isso este arquivo tem duas partes bem distintas:
 *
 *  - a casca comum a todas as telas (barra lateral, título, avisos);
 *  - a lógica de inclusão, edição e exclusão das telas NÃO integradas.
 *
 * Conforme cada tela for integrada, a segunda parte encolhe.
 */

import { useEffect, useRef, useState } from 'react';
import { Button, DataTable, Modal, Sidebar } from './components';
import { RecordForm } from './RecordForm';
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
import {
  OPERACOES_A_PAGAR,
  OPERACOES_A_RECEBER,
} from './screens/operacoes-de-titulo';
import {
  isEntity,
  nextRecord,
  normalize,
  readDatabase,
  routeFromHash,
  screens,
  STORAGE_KEY,
  type Database,
  type Entity,
  type Route,
} from './data';

/** Qual janela está aberta sobre uma tela não integrada. */
type ModalState = {
  kind: 'new' | 'edit' | 'delete' | 'search' | 'bank';
  entity: Entity;
  recordId?: string;
} | null;

/** Bancos que o protótipo já trazia na lista. */
const BANCOS_PADRAO = [
  '001 - Banco do Brasil',
  '237 - Banco Bradesco',
  '104 - Caixa Econômica Federal',
];

/** Quanto tempo um aviso fica na tela, em milissegundos. */
const DURACAO_DO_AVISO = 6000;

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [database, setDatabase] = useState<Database>(readDatabase);
  const [selected, setSelected] = useState<Partial<Record<Entity, string>>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const rotaAnterior = useRef(route);

  // Navegação por hash: nada de biblioteca de rotas, só o evento do navegador.
  useEffect(() => {
    const navegar = () => {
      setRoute(routeFromHash());
      setModal(null);
      setFilter('');
      setSearch('');
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

  // Grava as telas não integradas no navegador a cada alteração.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch {
      // Pode falhar em janela anônima ou com o armazenamento cheio.
      setNotice(
        'Não foi possível salvar neste navegador. Os dados permanecem ' +
          'disponíveis enquanto esta página estiver aberta.',
      );
    }
  }, [database]);

  // O aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!notice) return;
    const relogio = window.setTimeout(() => setNotice(''), DURACAO_DO_AVISO);
    return () => window.clearTimeout(relogio);
  }, [notice]);

  const entity = isEntity(route) ? route : undefined;
  const config = entity ? screens[entity] : undefined;
  const title = config?.title || (route === 'inicio' ? 'Menu Principal' : 'Relatórios');

  const currentRows = entity ? database[entity] : [];
  const selectedId = entity ? selected[entity] || currentRows[0]?.id : undefined;

  /** Aplica a busca e, na tela de bancos, o banco escolhido no painel. */
  const visibleRows = currentRows.filter(row => {
    const combinaComBusca =
      !filter || Object.values(row).some(valor => normalize(valor).includes(normalize(filter)));

    // Na tela de bancos, as linhas de banco ficam no painel de cima; a
    // tabela de baixo mostra só agências, filtradas pelo banco escolhido.
    const combinaComBanco =
      entity !== 'bancos' ||
      (row.Cadastro !== 'Banco' && (!selectedBank || row.Banco === selectedBank));

    return combinaComBusca && combinaComBanco;
  });

  /** Lista de bancos do painel: os padrão mais os cadastrados. */
  const allBanks = [...new Set([...BANCOS_PADRAO, ...database.bancos.map(r => r.Banco)])].map(
    (nome, indice) => ({
      id: nome,
      Número: nome.split(' - ')[0],
      Banco: nome.split(' - ').slice(1).join(' - ') || nome,
      Registro: String(indice),
    }),
  );

  /** Abre uma janela sobre a tela atual. */
  function abrir(kind: NonNullable<ModalState>['kind'], recordId = selectedId) {
    if (!entity) return;
    if ((kind === 'edit' || kind === 'delete') && !recordId) {
      setNotice('Selecione um registro primeiro.');
      return;
    }
    setModal({ kind, entity, recordId });
  }

  /**
   * Traduz o clique de um botão da barra de ações na janela correspondente.
   *
   * Os rótulos variam de tela para tela ("Editar", "Edição", "Alterar"),
   * porque vêm do livro, por isso a comparação é por expressão regular.
   */
  function acionar(rotulo: string) {
    if (/^(Editar|Edição|Alterar)/.test(rotulo)) return abrir('edit');
    if (/^(Excluir|Exclusão|Deletar)/.test(rotulo)) return abrir('delete');
    if (rotulo === 'Localizar') {
      setSearch(filter);
      return abrir('search');
    }
    if (rotulo === 'Relatório') {
      window.location.hash = '/relatorios';
      return;
    }
    if (rotulo === 'Fim') {
      window.location.hash = '/inicio';
      return;
    }
    abrir('new');
  }

  /** Grava o formulário de uma tela não integrada no `localStorage`. */
  function gravar(values: Record<string, string>) {
    if (!modal) return;
    const { entity: tela, kind, recordId } = modal;

    const original = kind === 'edit' ? database[tela].find(r => r.id === recordId) : undefined;

    // O cadastro de banco junta número e nome num campo só, e se marca como
    // linha de banco para o painel de cima saber separá-la das agências.
    const valores =
      kind === 'bank'
        ? { ...values, Banco: `${values.Número} - ${values.Banco}`, Cadastro: 'Banco' }
        : values;

    const registro = nextRecord(tela, valores, database[tela], original);

    setDatabase(anterior => ({
      ...anterior,
      [tela]: original
        ? anterior[tela].map(r => (r.id === registro.id ? registro : r))
        : [...anterior[tela], registro],
    }));
    setSelected(anterior => ({ ...anterior, [tela]: registro.id }));
    setFilter('');
    setSelectedBank(undefined);

    // "Inclusão Contínua" mantém a janela aberta para o próximo registro.
    setModal(values['Inclusão Contínua'] === 'Sim' ? { kind: 'new', entity: tela } : null);
    setNotice(original ? 'Registro atualizado.' : 'Registro gravado.');
  }

  /** Exclui o registro confirmado na janela de exclusão. */
  function excluir() {
    if (!modal) return;
    const { entity: tela, recordId } = modal;

    setDatabase(anterior => ({
      ...anterior,
      [tela]: anterior[tela].filter(r => r.id !== recordId),
    }));
    setSelected(anterior => ({ ...anterior, [tela]: undefined }));
    setModal(null);
    setNotice('Registro excluído.');
  }

  const modalRecord = modal
    ? database[modal.entity].find(r => r.id === modal.recordId)
    : undefined;

  /** Título da janela aberta. */
  function tituloDaJanela(estado: NonNullable<ModalState>): string {
    if (estado.kind === 'search') return 'Localizar';
    if (estado.kind === 'delete') return 'Confirmar Exclusão';
    if (estado.kind === 'bank') return 'Cadastro de Banco';
    return screens[estado.entity].modal;
  }

  /** Escolhe a tela a desenhar conforme a rota. */
  function telaAtual() {
    if (route === 'inicio') return <Home />;
    if (route === 'relatorios') return <Reports />;

    // Telas já integradas à API: cuidam do próprio estado e não usam
    // `database` para os seus registros.
    if (route === 'clientes') {
      return (
        <PessoasScreen
          entity="clientes"
          papel="CLIENTE"
          database={database}
          onAviso={setNotice}
        />
      );
    }
    if (route === 'fornecedores') {
      return (
        <PessoasScreen
          entity="fornecedores"
          papel="FORNECEDOR"
          database={database}
          onAviso={setNotice}
        />
      );
    }
    if (route === 'pagamentos') {
      return (
        <TitulosScreen
          entity="pagamentos"
          lado={LADO_A_PAGAR}
          operacoes={OPERACOES_A_PAGAR}
          database={database}
          onAviso={setNotice}
        />
      );
    }
    if (route === 'recebimentos') {
      return (
        <TitulosScreen
          entity="recebimentos"
          lado={LADO_A_RECEBER}
          operacoes={OPERACOES_A_RECEBER}
          database={database}
          onAviso={setNotice}
        />
      );
    }

    if (route === 'plano') {
      return <PlanoContasScreen database={database} onAviso={setNotice} />;
    }

    if (route === 'despesas') {
      return <DespesasScreen database={database} onAviso={setNotice} />;
    }

    if (route === 'cheques') {
      return <ChequesScreen database={database} onAviso={setNotice} />;
    }
    if (route === 'remessas') {
      return <RemessasScreen database={database} onAviso={setNotice} />;
    }

    if (route === 'cartorios') {
      return <CartoriosScreen database={database} onAviso={setNotice} />;
    }
    if (route === 'lancamentos') {
      return <LancamentosScreen database={database} onAviso={setNotice} />;
    }

    if (route === 'bancos') {
      return <BancosScreen database={database} onAviso={setNotice} />;
    }

    // Demais telas: ainda no `localStorage`.
    if (!entity || !config) return null;

    return (
      <>
        {entity === 'bancos' && (
          <section className="bank-panel">
            <h2>Bancos</h2>
            <div className="toolbar inset-panel">
              <Button primary onClick={() => abrir('bank')}>
                Incluir Banco
              </Button>
            </div>
            <DataTable
              label="Bancos"
              columns={[
                { key: 'Número', label: 'Número', width: 120 },
                { key: 'Banco', label: 'Banco', width: 500 },
              ]}
              rows={allBanks}
              selectedId={selectedBank}
              onSelect={setSelectedBank}
            />
            <h2 className="section-heading">Agências e Contas Correntes</h2>
            {selectedBank && (
              <Button className="clear-bank" onClick={() => setSelectedBank(undefined)}>
                Mostrar todos os bancos
              </Button>
            )}
          </section>
        )}

        <div className="toolbar inset-panel" aria-label={`Ações de ${config.heading}`}>
          <div className="toolbar-buttons">
            {config.actions.map((rotulo, indice) => (
              <Button key={rotulo} primary={indice === 0} onClick={() => acionar(rotulo)}>
                {rotulo}
              </Button>
            ))}
          </div>
        </div>

        {filter && (
          <div className="filter-summary">
            Busca: “{filter}” <button onClick={() => setFilter('')}>Limpar busca</button>
          </div>
        )}

        <DataTable
          label={config.heading}
          columns={config.columns}
          rows={visibleRows}
          selectedId={selectedId}
          onSelect={id => setSelected(anterior => ({ ...anterior, [entity]: id }))}
          onEdit={id => abrir('edit', id)}
        />
      </>
    );
  }

  /** Conteúdo da janela aberta. */
  function conteudoDaJanela(estado: NonNullable<ModalState>) {
    if (estado.kind === 'delete') {
      return (
        <>
          <div className="form-body">
            <p>Confirma a exclusão deste registro?</p>
            <strong>{modalRecord?.[screens[estado.entity].primary]}</strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setModal(null)}>Não</Button>
            <Button primary onClick={excluir}>
              Sim, excluir
            </Button>
          </footer>
        </>
      );
    }

    if (estado.kind === 'search') {
      return (
        <form
          onSubmit={evento => {
            evento.preventDefault();
            setFilter(search.trim());
            setModal(null);
          }}
        >
          <div className="form-body">
            <div className="field">
              <label htmlFor="search">Entre com uma parte do nome</label>
              <input
                id="search"
                value={search}
                onChange={evento => setSearch(evento.target.value)}
              />
            </div>
          </div>
          <footer className="modal-footer">
            <Button type="button" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button primary type="submit">
              Localizar
            </Button>
          </footer>
        </form>
      );
    }

    return (
      <RecordForm
        entity={estado.entity}
        record={estado.kind === 'edit' ? modalRecord : undefined}
        bankOnly={estado.kind === 'bank'}
        database={database}
        onSave={gravar}
        onClose={() => setModal(null)}
      />
    );
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

      {modal && (
        <Modal
          title={tituloDaJanela(modal)}
          compact={modal.kind === 'search' || modal.kind === 'delete' || modal.kind === 'bank'}
          onClose={() => setModal(null)}
        >
          {conteudoDaJanela(modal)}
        </Modal>
      )}
    </div>
  );
}
