/**
 * Tela de Relatórios, ligada a /api/relatorios.
 *
 * Esta é a tela que mais mudou em relação ao protótipo, e por um motivo de
 * fundo: a API não devolve LINHAS para estes relatórios, devolve NÚMEROS já
 * somados pelo back-end — totais por período, saldos, dias de atraso.
 *
 * A tela antiga escolhia um cadastro e listava os registros dele filtrando
 * por data no navegador. Isso não tem correspondente na API, e repetir a
 * soma aqui seria refazer no front-end um trabalho que o back-end já faz, e
 * com risco de divergir dele. Por isso a tela passou a mostrar os três
 * relatórios que a API realmente oferece:
 *
 *   /resumo         posição do período: a pagar, a receber e os saldos
 *   /por-categoria  totais agrupados por categoria do plano de contas
 *   /inadimplencia  títulos vencidos e ainda em aberto
 */

import { useState, type FormEvent } from 'react';
import { Button } from '../components';
import { useRecurso } from '../hooks/useRecurso';
import { obterInadimplencia, obterPorCategoria, obterResumo } from '../api/relatorios';
import { displayValue } from '../data';
import type { PosicaoApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

/**
 * Periodo padrao: o ano corrente inteiro.
 *
 * Era uma data fixa de 2026, o que faria a tela abrir zerada em qualquer
 * ano seguinte. Agora sai da data de hoje.
 */
function primeiroDiaDoAno(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function ultimoDiaDoAno(): string {
  return `${new Date().getFullYear()}-12-31`;
}

/** Formata um número como moeda brasileira. */
const dinheiro = (valor: number) => displayValue(String(valor), 'money');

/** Painel com os números de um lado do caixa. */
function Posicao({ titulo, posicao }: { titulo: string; posicao: PosicaoApi }) {
  return (
    <section className="posicao-card">
      <h3>{titulo}</h3>
      <dl>
        <div>
          <dt>Títulos</dt>
          <dd>{posicao.quantidadeTitulos}</dd>
        </div>
        <div>
          <dt>Valor total</dt>
          <dd>{dinheiro(posicao.valorTotal)}</dd>
        </div>
        <div>
          <dt>Já quitado</dt>
          <dd>{dinheiro(posicao.valorQuitado)}</dd>
        </div>
        <div>
          <dt>Em aberto</dt>
          <dd>{dinheiro(posicao.saldoEmAberto)}</dd>
        </div>
        <div>
          <dt>Vencidos</dt>
          <dd>{posicao.quantidadeVencidos}</dd>
        </div>
        <div className={posicao.valorVencido > 0 ? 'valor-vencido' : ''}>
          <dt>Valor vencido</dt>
          <dd>{dinheiro(posicao.valorVencido)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function Reports() {
  // Campos do formulário e período exibido são estados separados: mexer nos
  // campos não refaz as consultas até clicar em Visualizar.
  const [de, setDe] = useState(primeiroDiaDoAno);
  const [ate, setAte] = useState(ultimoDiaDoAno);
  const [periodo, setPeriodo] = useState({ de, ate });
  const [erro, setErro] = useState('');

  const chave = `${periodo.de}:${periodo.ate}`;
  const resumo = useRecurso(() => obterResumo(periodo.de, periodo.ate), `resumo:${chave}`);
  const categorias = useRecurso(
    () => obterPorCategoria(periodo.de, periodo.ate),
    `por-categoria:${chave}`,
  );
  const inadimplencia = useRecurso(
    () => obterInadimplencia(periodo.de, periodo.ate),
    `inadimplencia:${chave}`,
  );

  function gerar(evento: FormEvent) {
    evento.preventDefault();
    if (de && ate && de > ate) {
      setErro('O período final deve ser igual ou posterior ao inicial.');
      return;
    }
    setErro('');
    setPeriodo({ de, ate });
  }

  /** Recarrega os três relatórios de uma vez. */
  function recarregarTudo() {
    resumo.recarregar();
    categorias.recarregar();
    inadimplencia.recarregar();
  }

  const linhasDeCategoria = categorias.dados ?? [];
  const vencidos = inadimplencia.dados?.titulos ?? [];

  return (
    <>
      <form className="report-filters inset-panel" onSubmit={gerar}>
        <div className="field">
          <label htmlFor="report-start">Período Inicial</label>
          <input
            id="report-start"
            type="date"
            value={de}
            onChange={evento => setDe(evento.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="report-end">Período Final</label>
          <input
            id="report-end"
            type="date"
            value={ate}
            onChange={evento => setAte(evento.target.value)}
          />
        </div>
        <Button primary type="submit">
          Visualizar
        </Button>
      </form>

      {erro && (
        <p role="alert" className="form-error">
          {erro}
        </p>
      )}

      <section className="report-paper" aria-label="Prévia do relatório">
        <h2>POSIÇÃO FINANCEIRA</h2>
        <p className="report-periodo">
          Período de {displayValue(periodo.de, 'date')} a {displayValue(periodo.ate, 'date')}
        </p>

        {resumo.carregando && <Carregando mensagem="Calculando a posição do período…" />}
        {resumo.erro && <Erro mensagem={resumo.erro} onTentarNovamente={recarregarTudo} />}

        {resumo.dados && (
          <>
            <div className="posicao-grid">
              <Posicao titulo="Contas a Pagar" posicao={resumo.dados.contasAPagar} />
              <Posicao titulo="Contas a Receber" posicao={resumo.dados.contasAReceber} />
            </div>

            <dl className="saldos">
              <div>
                {/* Projetado: considera tudo que foi lançado no período. */}
                <dt>Saldo projetado</dt>
                <dd className={resumo.dados.saldoProjetado < 0 ? 'valor-negativo' : ''}>
                  {dinheiro(resumo.dados.saldoProjetado)}
                </dd>
              </div>
              <div>
                {/* Realizado: considera só o que já foi pago e recebido. */}
                <dt>Saldo realizado</dt>
                <dd className={resumo.dados.saldoRealizado < 0 ? 'valor-negativo' : ''}>
                  {dinheiro(resumo.dados.saldoRealizado)}
                </dd>
              </div>
            </dl>
          </>
        )}

        <h2 className="section-heading">TOTAIS POR CATEGORIA</h2>
        {categorias.carregando && <Carregando />}
        {categorias.erro && <Erro mensagem={categorias.erro} onTentarNovamente={recarregarTudo} />}
        {categorias.dados && !linhasDeCategoria.length && (
          <Vazio mensagem="Nenhum lançamento por categoria no período." />
        )}
        {!!linhasDeCategoria.length && (
          <table>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Categoria</th>
                <th scope="col">A Pagar</th>
                <th scope="col">A Receber</th>
              </tr>
            </thead>
            <tbody>
              {linhasDeCategoria.map(linha => (
                <tr key={linha.codigo}>
                  <td>{linha.codigo}</td>
                  <td>{linha.descricao}</td>
                  <td>{dinheiro(linha.totalAPagar)}</td>
                  <td>{dinheiro(linha.totalAReceber)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className="section-heading">INADIMPLÊNCIA</h2>
        {inadimplencia.carregando && <Carregando />}
        {inadimplencia.erro && (
          <Erro mensagem={inadimplencia.erro} onTentarNovamente={recarregarTudo} />
        )}
        {inadimplencia.dados && !vencidos.length && (
          <Vazio mensagem="Nenhum título vencido em aberto. " />
        )}
        {!!vencidos.length && (
          <table>
            <thead>
              <tr>
                <th scope="col">Origem</th>
                <th scope="col">Título</th>
                <th scope="col">Pessoa</th>
                <th scope="col">Vencimento</th>
                <th scope="col">Atraso</th>
                <th scope="col">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {vencidos.map(titulo => (
                <tr key={`${titulo.origem}-${titulo.numeroTitulo}`}>
                  <td>{titulo.origem === 'CONTA_A_PAGAR' ? 'A pagar' : 'A receber'}</td>
                  <td>{titulo.numeroTitulo}</td>
                  <td>{titulo.pessoa}</td>
                  <td>{displayValue(titulo.vencimento, 'date')}</td>
                  <td>{titulo.diasAtraso} dias</td>
                  <td>{dinheiro(titulo.saldoDevedor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="report-actions">
        <Button onClick={() => window.print()} primary>
          Imprimir
        </Button>
        <a className="delphi-button" href="#/inicio">
          <span>Fechar</span>
        </a>
      </div>
    </>
  );
}
