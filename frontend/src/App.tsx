import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, DataTable, Modal, Sidebar } from './components';
import { RecordForm } from './RecordForm';
import { groups, isEntity, nextRecord, normalize, readDatabase, routeFromHash, screens, STORAGE_KEY, type Database, type Entity, type RecordData, type Route } from './data';

type ModalState = { kind: 'new' | 'edit' | 'delete' | 'search' | 'bank'; entity: Entity; recordId?: string } | null;

function Home() {
  return <div className="home-grid">{groups.slice(0, 4).map(group => <section className="home-card" key={group.title}>
    <h2>{group.title === 'CADASTRO' ? 'Cadastro' : group.title === 'PLANO DE CONTAS' ? 'Plano de Contas' : group.title === 'CONTAS A PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'}</h2>
    <div>{group.items.map(([key, label]) => <a className="delphi-button" href={`#/${key}`} key={key}><span>{label}</span></a>)}</div>
  </section>)}</div>;
}

function AccountTree({ records, selected, onSelect, onEdit }: { records: RecordData[]; selected?: string; onSelect: (id: string) => void; onEdit: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  function branch(id: string, label: string, children: React.ReactNode) {
    const open = !collapsed.includes(id);
    return <li key={id}><button type="button" className="tree-branch" aria-expanded={open} onClick={() => setCollapsed(old => open ? [...old, id] : old.filter(c => c !== id))}><span aria-hidden="true">{open ? '▾' : '▸'}</span> {label}</button>{open && <ul>{children}</ul>}</li>;
  }
  const leaves = (parent: string) => records.filter(r => (r['Conta Superior'] || r['Nova Conta']?.split('.')[0]) === parent).map(r => <li key={r.id}><button className={`tree-leaf ${selected === r.id ? 'is-selected' : ''}`} onClick={() => onSelect(r.id)} onDoubleClick={() => onEdit(r.id)}>{r['Nova Conta']}　{r['Descrição da Conta']}</button></li>);
  return <div className="account-tree" aria-label="Estrutura de contas"><ul>
    {branch('1', '1  ATIVO', branch('11', '11  ATIVO CIRCULANTE', <>{branch('111', '111  DISPONÍVEL', leaves('111'))}{branch('112', '112  REALIZÁVEL', leaves('112'))}</>))}
    {branch('2', '2  PASSIVO', <>{branch('21', '21  FORNECEDORES', leaves('21'))}{branch('22', '22  CONTAS A PAGAR', leaves('22'))}</>)}
  </ul></div>;
}

function Reports({ database }: { database: Database }) {
  const [entity, setEntity] = useState<Entity>('fornecedores');
  const [start, setStart] = useState('2026-10-01');
  const [end, setEnd] = useState('2026-10-31');
  const [report, setReport] = useState({ entity, start, end });
  const [error, setError] = useState('');
  const config = screens[report.entity];
  const dateColumn = config.columns.find(c => c.format === 'date');
  const rows = database[report.entity].filter(r => !dateColumn || (!report.start || (r[dateColumn.key] || '') >= report.start) && (!report.end || (r[dateColumn.key] || '') <= report.end));
  function generate(e: FormEvent) {
    e.preventDefault();
    if (start && end && start > end) { setError('O período final deve ser igual ou posterior ao inicial.'); return; }
    setError(''); setReport({ entity, start, end });
  }
  return <>
    <form className="report-filters inset-panel" onSubmit={generate}>
      <div className="field"><label htmlFor="report-type">Relatório</label><select id="report-type" value={entity} onChange={e => setEntity(e.target.value as Entity)}>{(Object.keys(screens) as Entity[]).map(key => <option key={key} value={key}>{screens[key].title}</option>)}</select></div>
      <div className="field"><label htmlFor="report-start">Período Inicial</label><input id="report-start" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
      <div className="field"><label htmlFor="report-end">Período Final</label><input id="report-end" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
      <Button primary type="submit">Visualizar</Button>
    </form>
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="report-paper" aria-label="Prévia do relatório">
      <h2>RELATÓRIO DE {config.title.toLocaleUpperCase('pt-BR')}</h2>
      <table><thead><tr>{config.columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id}>{config.columns.map(c => <td key={c.key}>{c.format === 'money' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r[c.key]) || 0) : c.format === 'date' && r[c.key] ? r[c.key].split('-').reverse().join('/') : r[c.key] || '–'}</td>)}</tr>)}{!rows.length && <tr><td colSpan={config.columns.length}>Nenhum registro no período selecionado.</td></tr>}</tbody></table>
    </section>
    <div className="report-actions"><Button onClick={() => window.print()} primary>Imprimir</Button><a className="delphi-button" href="#/inicio"><span>Fechar</span></a></div>
  </>;
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [database, setDatabase] = useState<Database>(readDatabase);
  const [selected, setSelected] = useState<Partial<Record<Entity, string>>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [order, setOrder] = useState('registro');
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousRoute = useRef(route);

  useEffect(() => {
    const navigate = () => { setRoute(routeFromHash()); setModal(null); setFilter(''); setSearch(''); setOrder('registro'); setSidebarOpen(false); };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    document.title = `${isEntity(route) ? screens[route].title : route === 'inicio' ? 'Menu Principal' : 'Relatórios'} | Contas a Pagar e a Receber`;
    if (previousRoute.current !== route) { headingRef.current?.focus(); previousRoute.current = route; }
  }, [route]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(database)); }
    catch { setNotice('Não foi possível salvar neste navegador. Os dados permanecem disponíveis enquanto esta página estiver aberta.'); }
  }, [database]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const entity = isEntity(route) ? route : undefined;
  const config = entity ? screens[entity] : undefined;
  const title = config?.title || (route === 'inicio' ? 'Menu Principal' : 'Relatórios');
  const currentRows = entity ? database[entity] : [];
  const selectedId = entity ? selected[entity] || currentRows[0]?.id : undefined;
  const filtered = currentRows.filter(row => (!filter || Object.values(row).some(v => normalize(v).includes(normalize(filter)))) && (entity !== 'bancos' || row.Cadastro !== 'Banco' && (!selectedBank || row.Banco === selectedBank)));
  const visibleRows = order === 'alfabetica' && config ? [...filtered].sort((a, b) => (a[config.primary] || '').localeCompare(b[config.primary] || '', 'pt-BR')) : filtered;
  const allBanks = [...new Set(['001 - Banco do Brasil', '237 - Banco Bradesco', '104 - Caixa Econômica Federal', ...database.bancos.map(r => r.Banco)])].map((name, index) => ({ id: name, Número: name.split(' - ')[0], Banco: name.split(' - ').slice(1).join(' - ') || name, Registro: String(index) }));

  function open(kind: NonNullable<ModalState>['kind'], recordId = selectedId) {
    if (!entity) return;
    if ((kind === 'edit' || kind === 'delete') && !recordId) { setNotice('Selecione um registro primeiro.'); return; }
    setModal({ kind, entity, recordId });
  }
  function action(label: string) {
    if (/^(Editar|Edição|Alterar)/.test(label)) open('edit');
    else if (/^(Excluir|Exclusão|Deletar)/.test(label)) open('delete');
    else if (label === 'Localizar') { setSearch(filter); open('search'); }
    else if (label === 'Relatório') window.location.hash = '/relatorios';
    else if (label === 'Fim') window.location.hash = '/inicio';
    else open('new');
  }
  function save(values: Record<string, string>) {
    if (!modal) return;
    const { entity: target, kind, recordId } = modal;
    const original = kind === 'edit' ? database[target].find(r => r.id === recordId) : undefined;
    const adjusted = kind === 'bank' ? { ...values, Banco: `${values.Número} - ${values.Banco}`, Cadastro: 'Banco' } : values;
    const record = nextRecord(target, adjusted, database[target], original);
    setDatabase(old => ({ ...old, [target]: original ? old[target].map(r => r.id === record.id ? record : r) : [...old[target], record] }));
    setSelected(old => ({ ...old, [target]: record.id }));
    setFilter(''); setSelectedBank(undefined);
    setModal(values['Inclusão Contínua'] === 'Sim' ? { kind: 'new', entity: target } : null);
    setNotice(original ? 'Registro atualizado.' : 'Registro gravado.');
  }
  function remove() {
    if (!modal) return;
    const { entity: target, recordId } = modal;
    setDatabase(old => ({ ...old, [target]: old[target].filter(r => r.id !== recordId) }));
    setSelected(old => ({ ...old, [target]: undefined }));
    setModal(null); setNotice('Registro excluído.');
  }
  const modalRecord = modal ? database[modal.entity].find(r => r.id === modal.recordId) : undefined;
  return <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); headingRef.current?.focus(); }}>Ir para o conteúdo</a>
    <Sidebar route={route} />
    {sidebarOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />}
    <div className="main-column">
      <header className="topbar"><Button className="menu-toggle" aria-label="Abrir menu" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(v => !v)}>☰</Button><a href="#/inicio" className="screen-title">{title}</a><small>Sistema de Contas a Pagar e a Receber</small></header>
      <main id="main-content" className="workspace">
        <h1 ref={headingRef} tabIndex={-1}>{config?.heading || title}</h1>
        <p className="screen-description">{config?.description || (route === 'inicio' ? 'Selecione uma opção para acessar o sistema.' : 'Visualização e impressão de relatórios do sistema.')}</p>
        {route === 'inicio' ? <Home /> : route === 'relatorios' ? <Reports database={database} /> : entity && config && <>
          {entity === 'bancos' && <section className="bank-panel"><h2>Bancos</h2><div className="toolbar inset-panel"><Button primary onClick={() => open('bank')}>Incluir Banco</Button></div><DataTable label="Bancos" columns={[{ key: 'Número', label: 'Número', width: 120 }, { key: 'Banco', label: 'Banco', width: 500 }]} rows={allBanks} selectedId={selectedBank} onSelect={setSelectedBank} /><h2 className="section-heading">Agências e Contas Correntes</h2>{selectedBank && <Button className="clear-bank" onClick={() => setSelectedBank(undefined)}>Mostrar todos os bancos</Button>}</section>}
          <div className="toolbar inset-panel" aria-label={`Ações de ${config.heading}`}>
            <div className="toolbar-buttons">{config.actions.map((label, i) => <Button key={label} primary={i === 0} onClick={() => action(label)}>{label}</Button>)}</div>
            {entity === 'clientes' && <div className="order-control"><label htmlFor="order">Ordenação</label><select id="order" value={order} onChange={e => setOrder(e.target.value)}><option value="registro">Ordem de Registro</option><option value="alfabetica">Ordem Alfabética</option></select></div>}
          </div>
          {filter && <div className="filter-summary">Busca: “{filter}” <button onClick={() => setFilter('')}>Limpar busca</button></div>}
          {entity === 'plano' ? <AccountTree records={currentRows} selected={selectedId} onSelect={id => setSelected(old => ({ ...old, plano: id }))} onEdit={id => open('edit', id)} /> : <DataTable label={config.heading} columns={config.columns} rows={visibleRows} selectedId={selectedId} onSelect={id => setSelected(old => ({ ...old, [entity]: id }))} onEdit={id => open('edit', id)} />}
        </>}
      </main>
    </div>
    {notice && <div className="notice" role="status">{notice}<button aria-label="Dispensar mensagem" onClick={() => setNotice('')}>×</button></div>}
    {modal && <Modal title={modal.kind === 'search' ? 'Localizar' : modal.kind === 'delete' ? 'Confirmar Exclusão' : modal.kind === 'bank' ? 'Cadastro de Banco' : screens[modal.entity].modal} compact={modal.kind === 'search' || modal.kind === 'delete' || modal.kind === 'bank'} onClose={() => setModal(null)}>
      {modal.kind === 'delete' ? <><div className="form-body"><p>Confirma a exclusão deste registro?</p><strong>{modalRecord?.[screens[modal.entity].primary]}</strong></div><footer className="modal-footer"><Button onClick={() => setModal(null)}>Não</Button><Button primary onClick={remove}>Sim, excluir</Button></footer></> : modal.kind === 'search' ?
        <form onSubmit={e => { e.preventDefault(); setFilter(search.trim()); setModal(null); }}><div className="form-body"><div className="field"><label htmlFor="search">Entre com uma parte do nome</label><input id="search" value={search} onChange={e => setSearch(e.target.value)} /></div></div><footer className="modal-footer"><Button type="button" onClick={() => setModal(null)}>Cancelar</Button><Button primary type="submit">Localizar</Button></footer></form> :
        <RecordForm entity={modal.entity} record={modal.kind === 'edit' ? modalRecord : undefined} bankOnly={modal.kind === 'bank'} database={database} onSave={save} onClose={() => setModal(null)} />}
    </Modal>}
  </div>;
}
