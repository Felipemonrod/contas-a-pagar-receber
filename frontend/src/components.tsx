import { useEffect, useId, useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import assets from './assets.json';
import { displayValue, groups, type Column, type RecordData, type Route } from './data';

export function Button({ children, primary = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button {...props} className={`delphi-button ${primary ? 'primary' : ''} ${className}`}><span>{children}</span></button>;
}

export function Sidebar({ route }: { route: Route }) {
  const design = assets.screens[route];
  return <aside className="sidebar">
    <a className="brand" href="#/inicio" aria-label="Contas a Pagar e a Receber — Menu Principal"><strong>Contas a Pagar<br />e a Receber</strong><small>Sistema financeiro</small></a>
    <nav aria-label="Menu principal" className="folders">
      {groups.map((group, index) => <section className="root-folder" key={group.title} aria-labelledby={`folder-${index}`}>
        <img className="root-folder-art" src={`/assets/${design.roots[index].asset}`} alt="" aria-hidden="true" />
        <h2 id={`folder-${index}`} className="folder-title">{index === 1 ? <a href="#/plano">{group.title}</a> : group.title}</h2>
        {group.items.map(([key, label]) => {
          const image = `/assets/${design.menu[label as keyof typeof design.menu]}`;
          return <a key={key} href={`#/${key}`} aria-current={route === key ? 'page' : undefined} className="folder-link" style={{ '--tab-image': `url("${image}")` } as CSSProperties}>
            <img src={image} alt="" aria-hidden="true" /><span>{label}</span>
          </a>;
        })}
      </section>)}
    </nav>
  </aside>;
}

export function DataTable({ label, columns, rows, selectedId, onSelect, onEdit }: { label: string; columns: Column[]; rows: RecordData[]; selectedId?: string; onSelect: (id: string) => void; onEdit?: (id: string) => void }) {
  const total = columns.reduce((sum, c) => sum + (c.width || 150), 0);
  return <div className="table-scroll"><table aria-label={label} style={{ width: total }}>
    <colgroup>{columns.map(c => <col key={c.key} style={{ width: `${((c.width || 150) / total) * 100}%` }} />)}</colgroup>
    <thead><tr>{columns.map(c => <th scope="col" key={c.key}>{c.label}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map(row => <tr key={row.id} className={row.id === selectedId ? 'selected-row' : ''} aria-selected={row.id === selectedId}>
      {columns.map((column, i) => <td key={column.key}>{i === 0 ? <button className="row-select" type="button" aria-label={`Selecionar ${row[columns[1]?.key] || row[column.key] || 'registro'}`} onClick={() => onSelect(row.id)} onDoubleClick={() => onEdit?.(row.id)}>{displayValue(row[column.key], column.format)}</button> : <span onClick={() => onSelect(row.id)} onDoubleClick={() => onEdit?.(row.id)}>{displayValue(row[column.key], column.format)}</span>}</td>)}
    </tr>) : <tr><td colSpan={columns.length} className="empty-state">Nenhum registro encontrado.</td></tr>}</tbody>
  </table></div>;
}

export function Modal({ title, onClose, children, compact = false }: { title: string; onClose: () => void; children: ReactNode; compact?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const returnFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('input:not([type="checkbox"]), select, textarea')?.focus();
    return () => { if (dialog.open) dialog.close(); returnFocus?.focus(); };
  }, []);
  return <dialog ref={ref} className={`modal ${compact ? 'compact' : ''}`} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <header className="modal-titlebar"><h2 id={titleId}>{title}</h2><Button className="close-button" aria-label="Fechar janela" onClick={onClose}>×</Button></header>
    {children}
  </dialog>;
}
