/**
 * Tela de Cheque Pre-Datado, ligada a /api/cheques (livro, cap. 16).
 *
 * Alem do cadastro, acompanha o ciclo do cheque: EM_CARTEIRA ->
 * DEPOSITADO -> COMPENSADO ou DEVOLVIDO. Mover no ciclo e um endpoint
 * proprio, entao e uma acao propria na tela, como a quitacao de titulo.
 *
 * A tela do livro tinha campos separados de Banco, Agencia e Conta; na API
 * isso e uma conta corrente so, e a resposta ja traz o texto formatado.
 */

import { useState } from 'react';
import { Button, DataTable, Modal } from '../components';
import { RecordForm, type ListasDeEscolha } from '../RecordForm';
import { screens, type RecordData } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import {
  atualizarCheque,
  criarCheque,
  excluirCheque,
  listarCheques,
  listarChequesADepositar,
} from '../api/cheques';
import { listarContasCorrentesAtivas } from '../api/bancos';
import { listarPessoas } from '../api/pessoas';
import { mensagemDoErro } from '../api/http';
import {
  acharContaCorrentePorIdentificacao,
  chequeParaRegistro,
  registroParaCheque,
} from '../adapters/cheques';
import { acharPessoaPorNome } from '../adapters/titulos';
import type { ChequeApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';
import { JanelaDeSituacao } from './JanelaDeSituacao';

type Janela =
  | { tipo: 'incluir' }
  | { tipo: 'editar'; registro: RecordData; cheque: ChequeApi }
  | { tipo: 'excluir'; cheque: ChequeApi }
  | { tipo: 'movimentar'; cheque: ChequeApi }
  | null;

export function ChequesScreen({
  onAviso,
}: {
  onAviso: (mensagem: string) => void;
}) {
  const config = screens.cheques;

  const [janela, setJanela] = useState<Janela>(null);
  const [selecionado, setSelecionado] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');
  // Quando ligado, a lista vem de /cheques/a-depositar: os que estão em
  // carteira com a data de depósito já vencida.
  const [soADepositar, setSoADepositar] = useState(false);

  const recurso = useRecurso(
    () => (soADepositar ? listarChequesADepositar() : listarCheques()),
    `cheques:${soADepositar ? 'a-depositar' : 'todos'}`,
  );
  // O emitente precisa ter o papel CLIENTE (regra da API).
  const clientes = useRecurso(() => listarPessoas('CLIENTE'), 'pessoas:CLIENTE');
  const contas = useRecurso(() => listarContasCorrentesAtivas(), 'contas-correntes:ativas');

  const cheques = recurso.dados ?? [];
  const linhas = cheques.map(chequeParaRegistro);

  /** Os dois campos de escolha do formulário, vindos da API. */
  const listas: ListasDeEscolha = {
    Cliente: (clientes.dados ?? []).map(pessoa => pessoa.nome),
    'Conta Corrente': (contas.dados ?? []).map(conta => conta.identificacao),
  };

  function chequeSelecionado(): ChequeApi | undefined {
    const cheque = cheques.find(item => String(item.id) === selecionado);
    if (!cheque) onAviso('Selecione um cheque primeiro.');
    return cheque;
  }

  function abrirEdicao(id = selecionado) {
    const cheque = cheques.find(item => String(item.id) === id);
    if (!cheque) {
      onAviso('Selecione um cheque primeiro.');
      return;
    }
    // A API so aceita alterar enquanto o cheque esta em carteira.
    if (cheque.situacao !== 'EM_CARTEIRA') {
      onAviso('Só é possível alterar cheque que ainda está em carteira.');
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'editar', registro: chequeParaRegistro(cheque), cheque });
  }

  function acionar(rotulo: string) {
    if (rotulo === 'Editar') return abrirEdicao();
    if (rotulo === 'Movimentar') {
      const cheque = chequeSelecionado();
      if (cheque) setJanela({ tipo: 'movimentar', cheque });
      return;
    }
    if (rotulo === 'Excluir') {
      const cheque = chequeSelecionado();
      if (!cheque) return;
      if (cheque.situacao !== 'EM_CARTEIRA') {
        onAviso('Só é possível excluir cheque que ainda está em carteira.');
        return;
      }
      setJanela({ tipo: 'excluir', cheque });
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'incluir' });
  }

  /** Grava o cheque, resolvendo o cliente e a conta corrente escolhidos. */
  async function gravar(valores: Record<string, string>) {
    if (!janela || (janela.tipo !== 'incluir' && janela.tipo !== 'editar')) return;
    const editando = janela.tipo === 'editar' ? janela.cheque : undefined;

    const cliente = acharPessoaPorNome(valores.Cliente ?? '', clientes.dados ?? []);
    if (!cliente) {
      setErroDoFormulario('Escolha um cliente cadastrado.');
      return;
    }
    const conta = acharContaCorrentePorIdentificacao(
      valores['Conta Corrente'] ?? '',
      contas.dados ?? [],
    );
    if (!conta) {
      setErroDoFormulario('Escolha uma conta corrente ativa.');
      return;
    }

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const corpo = registroParaCheque(valores, cliente.id, conta.id);
      const salvo = editando
        ? await atualizarCheque(editando.id, corpo)
        : await criarCheque(corpo);

      setJanela(null);
      setSelecionado(String(salvo.id));
      onAviso(editando ? 'Cheque atualizado.' : 'Cheque cadastrado.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(cheque: ChequeApi) {
    setSalvando(true);
    try {
      await excluirCheque(cheque.id);
      setJanela(null);
      setSelecionado(undefined);
      onAviso('Cheque excluído.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando cheques…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!linhas.length) {
      return (
        <Vazio
          mensagem={
            soADepositar
              ? 'Nenhum cheque em carteira com a data de depósito vencida.'
              : 'Nenhum cheque cadastrado. Use Incluir para cadastrar o primeiro.'
          }
        />
      );
    }
    return (
      <DataTable
        label={config.heading}
        columns={config.columns}
        rows={linhas}
        selectedId={selecionado}
        onSelect={setSelecionado}
        onEdit={abrirEdicao}
      />
    );
  }

  /** Cheques em carteira cujo depósito já passou: merecem destaque. */
  const vencidos = cheques.filter(cheque => cheque.vencido);

  return (
    <>
      <div className="toolbar inset-panel" aria-label={`Ações de ${config.heading}`}>
        <div className="toolbar-buttons">
          {config.actions.map((rotulo, indice) => (
            <Button
              key={rotulo}
              primary={indice === 0}
              disabled={recurso.carregando}
              onClick={() => acionar(rotulo)}
            >
              {rotulo}
            </Button>
          ))}
        </div>

        <div className="order-control">
          <label htmlFor="cheques-filtro">Exibir</label>
          <select
            id="cheques-filtro"
            value={soADepositar ? 'a-depositar' : 'todos'}
            onChange={evento => setSoADepositar(evento.target.value === 'a-depositar')}
          >
            <option value="todos">Todos os cheques</option>
            <option value="a-depositar">Só os a depositar</option>
          </select>
        </div>
      </div>

      {/* Sem clientes ou sem contas ativas não há como cadastrar cheque. */}
      {clientes.erro && (
        <Erro
          mensagem={`Não foi possível carregar os clientes: ${clientes.erro}`}
          onTentarNovamente={clientes.recarregar}
        />
      )}
      {contas.erro && (
        <Erro
          mensagem={`Não foi possível carregar as contas correntes: ${contas.erro}`}
          onTentarNovamente={contas.recarregar}
        />
      )}

      {!!vencidos.length && (
        <div className="aviso-vencidos" role="status">
          {vencidos.length === 1
            ? '1 cheque em carteira com a data de depósito vencida.'
            : `${vencidos.length} cheques em carteira com a data de depósito vencida.`}
        </div>
      )}

      {conteudo()}

      {(janela?.tipo === 'incluir' || janela?.tipo === 'editar') && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity="cheques"
            record={janela.tipo === 'editar' ? janela.registro : undefined}
            listas={listas}
            onSave={gravar}
            onClose={() => setJanela(null)}
            mensagemErro={erroDoFormulario}
            salvando={salvando}
          />
        </Modal>
      )}

      {janela?.tipo === 'excluir' && (
        <Modal title="Confirmar Exclusão" compact onClose={() => setJanela(null)}>
          <div className="form-body">
            <p>Confirma a exclusão deste cheque?</p>
            <strong>
              {janela.cheque.numeroCheque} — {janela.cheque.emitente}
            </strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setJanela(null)} disabled={salvando}>
              Não
            </Button>
            <Button primary onClick={() => void excluir(janela.cheque)} disabled={salvando}>
              Sim, excluir
            </Button>
          </footer>
        </Modal>
      )}

      {janela?.tipo === 'movimentar' && (
        <JanelaDeSituacao
          cheque={janela.cheque}
          onFechar={() => setJanela(null)}
          onMovido={mensagem => {
            setJanela(null);
            onAviso(mensagem);
            recurso.recarregar();
          }}
        />
      )}
    </>
  );
}
