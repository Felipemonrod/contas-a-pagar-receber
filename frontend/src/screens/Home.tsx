/**
 * Menu principal: os quatro grupos de telas em cartões.
 *
 * Mostra só os quatro primeiros grupos de `groups`; o quinto, Relatórios,
 * fica de fora porque já tem um cartão próprio na barra lateral.
 */

import { groups } from '../data';

/**
 * Títulos dos cartões.
 *
 * Na barra lateral os grupos aparecem em caixa alta, como no protótipo; aqui
 * o mesmo grupo aparece em caixa normal, e este mapa faz a correspondência.
 */
const TITULOS: Record<string, string> = {
  CADASTRO: 'Cadastro',
  'PLANO DE CONTAS': 'Plano de Contas',
  'CONTAS A PAGAR': 'Contas a Pagar',
  'CONTAS A RECEBER': 'Contas a Receber',
};

export function Home() {
  return (
    <div className="home-grid">
      {groups.slice(0, 4).map(group => (
        <section className="home-card" key={group.title}>
          <h2>{TITULOS[group.title] ?? group.title}</h2>
          <div>
            {group.items.map(([key, label]) => (
              // Link com cara de botão: a navegação é por hash, então um
              // `<a>` já faz o trabalho, sem JavaScript no clique.
              <a className="delphi-button" href={`#/${key}`} key={key}>
                <span>{label}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
