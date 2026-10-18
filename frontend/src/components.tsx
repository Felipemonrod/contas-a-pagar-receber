/**
 * Componentes de interface reaproveitados por todas as telas: botao, barra
 * lateral, tabela e janela modal.
 *
 * Nenhum deles conhece a API: recebem tudo por propriedade. Quem busca os
 * dados sao as telas em `src/screens/`.
 */

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import assets from './assets.json';
import { displayValue, groups, type Column, type RecordData, type Route } from './data';

/**
 * Botao no estilo Delphi do protótipo.
 *
 * O `<span>` interno existe por causa do efeito de clique: ao ser pressionado,
 * o relevo inverte e o texto desloca 2px, e e o span que se move.
 *
 * `...props` repassa os atributos normais de um botao (`type`, `disabled`,
 * `aria-label`, `onClick`), por isso nao precisamos declarar cada um.
 */
export function Button({
  children,
  primary = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button {...props} className={`delphi-button ${primary ? 'primary' : ''} ${className}`}>
      <span>{children}</span>
    </button>
  );
}

/**
 * Barra lateral com as pastas do menu, montada a partir de `groups`.
 *
 * As imagens vem de `assets.json`, que guarda os vetores exportados do Figma
 * para cada tela. Por isso o desenho muda conforme a rota aberta.
 */
export function Sidebar({ route }: { route: Route }) {
  const design = assets.screens[route];

  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#/inicio"
        aria-label="Contas a Pagar e a Receber — Menu Principal"
      >
        <strong>
          Contas a Pagar
          <br />e a Receber
        </strong>
        <small>Sistema financeiro</small>
      </a>

      <nav aria-label="Menu principal" className="folders">
        {groups.map((group, index) => (
          <section className="root-folder" key={group.title} aria-labelledby={`folder-${index}`}>
            {/* Desenho da pasta marrom ao fundo; decorativo, sem texto alternativo. */}
            <img
              className="root-folder-art"
              src={`/assets/${design.roots[index].asset}`}
              alt=""
              aria-hidden="true"
            />

            <h2 id={`folder-${index}`} className="folder-title">
              {/* Só "PLANO DE CONTAS" (índice 1) é um link no protótipo. */}
              {index === 1 ? <a href="#/plano">{group.title}</a> : group.title}
            </h2>

            {group.items.map(([key, label]) => {
              const imagem = `/assets/${design.menu[label as keyof typeof design.menu]}`;
              return (
                <a
                  key={key}
                  href={`#/${key}`}
                  aria-current={route === key ? 'page' : undefined}
                  className="folder-link"
                  // A etiqueta azul inclinada é desenhada pelo CSS a partir
                  // desta variável, por isso a imagem vai junto no style.
                  style={{ '--tab-image': `url("${imagem}")` } as CSSProperties}
                >
                  <img src={imagem} alt="" aria-hidden="true" />
                  <span>{label}</span>
                </a>
              );
            })}
          </section>
        ))}
      </nav>
    </aside>
  );
}

/** Largura padrão de uma coluna que não informa a sua. */
const LARGURA_PADRAO = 150;

/**
 * Tabela de registros.
 *
 * A primeira coluna de cada linha e um botao de verdade, e nao um texto
 * clicavel: e ele que permite selecionar a linha pelo teclado. As demais
 * colunas respondem ao clique por conveniência do mouse.
 */
export function DataTable({
  label,
  columns,
  rows,
  selectedId,
  onSelect,
  onEdit,
}: {
  label: string;
  columns: Column[];
  rows: RecordData[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  // As larguras do Figma sao absolutas; somadas, viram porcentagens, para a
  // tabela encolher junto com a tela sem perder a proporcao entre colunas.
  const total = columns.reduce((soma, coluna) => soma + (coluna.width || LARGURA_PADRAO), 0);

  /** Nome usado para anunciar a linha a quem usa leitor de tela. */
  const descrever = (row: RecordData, coluna: Column) =>
    row[columns[1]?.key] || row[coluna.key] || 'registro';

  return (
    <div className="table-scroll">
      <table aria-label={label} style={{ width: total }}>
        <colgroup>
          {columns.map(coluna => (
            <col
              key={coluna.key}
              style={{ width: `${((coluna.width || LARGURA_PADRAO) / total) * 100}%` }}
            />
          ))}
        </colgroup>

        <thead>
          <tr>
            {columns.map(coluna => (
              <th scope="col" key={coluna.key}>
                {coluna.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={columns.length} className="empty-state">
                Nenhum registro encontrado.
              </td>
            </tr>
          )}

          {rows.map(row => (
            <tr
              key={row.id}
              className={row.id === selectedId ? 'selected-row' : ''}
              aria-selected={row.id === selectedId}
            >
              {columns.map((coluna, indice) => (
                <td key={coluna.key}>
                  {indice === 0 ? (
                    <button
                      className="row-select"
                      type="button"
                      aria-label={`Selecionar ${descrever(row, coluna)}`}
                      onClick={() => onSelect(row.id)}
                      onDoubleClick={() => onEdit?.(row.id)}
                    >
                      {displayValue(row[coluna.key], coluna.format)}
                    </button>
                  ) : (
                    <span onClick={() => onSelect(row.id)} onDoubleClick={() => onEdit?.(row.id)}>
                      {displayValue(row[coluna.key], coluna.format)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Janela modal, montada sobre o `<dialog>` nativo do navegador.
 *
 * Usar o elemento nativo nos da de graca tres comportamentos que seriam
 * trabalhosos de escrever a mao: o teclado fica preso dentro da janela, a
 * tecla Escape fecha, e o resto da pagina fica inerte.
 */
export function Modal({
  title,
  onClose,
  children,
  compact = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idDoTitulo = useId();

  useEffect(() => {
    const dialog = referencia.current!;
    // Guarda quem tinha o foco para devolvê-lo quando a janela fechar.
    const focoAnterior = document.activeElement as HTMLElement | null;

    dialog.showModal();
    // Leva o foco ao primeiro campo útil, pulando caixas de marcar.
    dialog.querySelector<HTMLElement>('input:not([type="checkbox"]), select, textarea')?.focus();

    return () => {
      if (dialog.open) dialog.close();
      focoAnterior?.focus();
    };
  }, []);

  return (
    <dialog
      ref={referencia}
      className={`modal ${compact ? 'compact' : ''}`}
      aria-labelledby={idDoTitulo}
      // `onCancel` é o Escape: avisamos a tela em vez de deixar o navegador
      // fechar sozinho, para o estado da aplicação acompanhar.
      onCancel={evento => {
        evento.preventDefault();
        onClose();
      }}
      // Clique no fundo escuro, fora do conteúdo, também fecha.
      onClick={evento => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <header className="modal-titlebar">
        <h2 id={idDoTitulo}>{title}</h2>
        <Button className="close-button" aria-label="Fechar janela" onClick={onClose}>
          ×
        </Button>
      </header>
      {children}
    </dialog>
  );
}
