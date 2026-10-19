/**
 * Tela do Plano de Contas, ligada a /api/plano-contas.
 *
 * A árvore antiga tinha os galhos fixos no código, com a estrutura do livro
 * (111 DISPONÍVEL, 112 REALIZÁVEL…). A do back-end é outra — 1 ATIVO,
 * 11 ATIVO CIRCULANTE, 11.01 Caixa — e vem com as subcontas aninhadas em
 * cada conta, com profundidade qualquer. Por isso a árvore agora é
 * desenhada por recursão sobre a resposta, e não escrita à mão.
 *
 * Conta CONSOLIDADA agrupa outras e não aceita lançamento (regra RN01);
 * conta ANALÍTICA aceita. A tela marca a diferença.
 */

import { useState } from 'react';
import { Button, Modal } from '../components';
import { RecordForm, type ListasDeEscolha } from '../RecordForm';
import { screens, type RecordData } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import {
  atualizarPlanoConta,
  criarPlanoConta,
  excluirPlanoConta,
  listarArvore,
} from '../api/plano-contas';
import { mensagemDoErro } from '../api/http';
import {
  achatarArvore,
  planoContaParaRegistro,
  registroParaPlanoConta,
} from '../adapters/plano-contas';
import type { PlanoContaApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

type Janela =
  | { tipo: 'incluir' }
  | { tipo: 'editar'; conta: PlanoContaApi }
  | { tipo: 'excluir'; conta: PlanoContaApi }
  | null;

/** Quantos pixels cada nível da árvore recua. */
const RECUO_POR_NIVEL = 22;

export function PlanoContasScreen({
  onAviso,
}: {
  onAviso: (mensagem: string) => void;
}) {
  const config = screens.plano;

  const [janela, setJanela] = useState<Janela>(null);
  const [selecionada, setSelecionada] = useState<number>();
  const [fechadas, setFechadas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');

  const recurso = useRecurso(() => listarArvore(), 'plano-contas');
  const arvore = recurso.dados ?? [];

  /** Todas as contas numa lista plana, para montar a lista de superiores. */
  const todas = achatarArvore(arvore);

  function abrirEdicao(conta: PlanoContaApi) {
    setErroDoFormulario('');
    setJanela({ tipo: 'editar', conta });
  }

  /** Grava a categoria na API. */
  async function gravar(valores: Record<string, string>) {
    if (!janela) return;
    const editando = janela.tipo === 'editar' ? janela.conta : undefined;

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const corpo = registroParaPlanoConta(valores);
      const salva = editando
        ? await atualizarPlanoConta(editando.id, corpo)
        : await criarPlanoConta(corpo);

      setSelecionada(salva.id);
      onAviso(editando ? 'Categoria atualizada.' : 'Categoria cadastrada.');
      recurso.recarregar();

      // "Inclusão Contínua" mantém a janela aberta para a próxima conta.
      if (valores['Inclusão Contínua'] === 'Sim') setJanela({ tipo: 'incluir' });
      else setJanela(null);
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Exclui a categoria. A API recusa quando ela tem subcontas, e explica o
   * motivo — mostramos a mensagem como veio.
   */
  async function excluir(conta: PlanoContaApi) {
    setSalvando(true);
    try {
      await excluirPlanoConta(conta.id);
      setJanela(null);
      setSelecionada(undefined);
      onAviso(`Categoria ${conta.codigo} excluída.`);
      recurso.recarregar();
    } catch (problema: unknown) {
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Desenha uma conta e, abaixo dela, as suas subcontas.
   *
   * Esta é a função que substituiu os galhos fixos: ela chama a si mesma
   * para cada subconta, então funciona com qualquer profundidade.
   */
  function desenharConta(conta: PlanoContaApi, nivel: number) {
    const temSubcontas = conta.subcontas.length > 0;
    const aberta = !fechadas.includes(conta.codigo);
    const recuo = { paddingLeft: `${nivel * RECUO_POR_NIVEL}px` };

    return (
      <li key={conta.id}>
        {temSubcontas ? (
          <button
            type="button"
            className="tree-branch"
            style={recuo}
            aria-expanded={aberta}
            onClick={() =>
              setFechadas(anteriores =>
                aberta
                  ? [...anteriores, conta.codigo]
                  : anteriores.filter(codigo => codigo !== conta.codigo),
              )
            }
            onDoubleClick={() => abrirEdicao(conta)}
          >
            <span aria-hidden="true">{aberta ? '▾' : '▸'}</span>{' '}
            {/* Codigo e descricao num texto so: se ficassem em linhas
                separadas, o JSX apagaria o espaco entre eles. */}
            {`${conta.codigo}　${conta.descricao}`}
          </button>
        ) : (
          <button
            className={`tree-leaf ${selecionada === conta.id ? 'is-selected' : ''}`}
            style={recuo}
            onClick={() => setSelecionada(conta.id)}
            onDoubleClick={() => abrirEdicao(conta)}
          >
            {`${conta.codigo}　${conta.descricao}`}
            {/* Conta consolidada sem subcontas ainda não recebe lançamento. */}
            {conta.consolidada && <span className="marca-consolidada">consolidada</span>}
          </button>
        )}

        {temSubcontas && aberta && (
          <ul>{conta.subcontas.map(sub => desenharConta(sub, nivel + 1))}</ul>
        )}
      </li>
    );
  }

  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando plano de contas…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!arvore.length) {
      return <Vazio mensagem="Nenhuma categoria cadastrada. Use Inclusão para criar a primeira." />;
    }
    return (
      <div className="account-tree" aria-label="Estrutura de contas">
        <ul>{arvore.map(conta => desenharConta(conta, 0))}</ul>
      </div>
    );
  }

  /** Qualquer conta existente pode ser a superior de uma nova. */
  const listas: ListasDeEscolha = {
    'Conta Superior': todas.map(({ conta }) => conta.codigo),
  };

  const registroEmEdicao: RecordData | undefined =
    janela?.tipo === 'editar' ? planoContaParaRegistro(janela.conta) : undefined;

  /** Despacha o clique da barra para a operação correspondente. */
  function acionar(rotulo: string) {
    if (rotulo === 'Inclusão') {
      setErroDoFormulario('');
      setJanela({ tipo: 'incluir' });
      return;
    }

    // Só a folha da árvore é selecionável, então aqui a conta nunca tem
    // subcontas — a exclusão que o servidor recusaria não chega a ser pedida.
    const conta = todas.find(({ conta: c }) => c.id === selecionada)?.conta;
    if (!conta) {
      onAviso('Selecione uma categoria primeiro.');
      return;
    }
    setJanela({ tipo: 'excluir', conta });
  }


  return (
    <>
      <div className="toolbar inset-panel" aria-label={`Ações de ${config.heading}`}>
        <div className="toolbar-buttons">
          {/* A barra vem de `data.ts`, como nas outras telas, para a
              configuração e o que aparece não saírem de sincronia. */}
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
      </div>

      {conteudo()}

      {(janela?.tipo === 'incluir' || janela?.tipo === 'editar') && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity="plano"
            record={registroEmEdicao}
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
            {/* A API recusa excluir categoria que tenha subcontas. */}
            <p>Confirma a exclusão desta categoria? Só é possível se ela não tiver subcontas.</p>
            <strong>
              {janela.conta.codigo} — {janela.conta.descricao}
            </strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setJanela(null)} disabled={salvando}>
              Não
            </Button>
            <Button primary onClick={() => void excluir(janela.conta)} disabled={salvando}>
              Sim, excluir
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
