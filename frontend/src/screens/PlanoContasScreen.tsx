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
import { RecordForm } from '../RecordForm';
import { screens, type Database, type RecordData } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import { criarPlanoConta, atualizarPlanoConta, listarArvore } from '../api/plano-contas';
import { mensagemDoErro } from '../api/http';
import {
  achatarArvore,
  planoContaParaRegistro,
  registroParaPlanoConta,
} from '../adapters/plano-contas';
import type { PlanoContaApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

type Janela = { tipo: 'incluir' } | { tipo: 'editar'; conta: PlanoContaApi } | null;

/** Quantos pixels cada nível da árvore recua. */
const RECUO_POR_NIVEL = 22;

export function PlanoContasScreen({
  database,
  onAviso,
}: {
  database: Database;
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

  /**
   * O formulário oferece as contas existentes como superior possível.
   * Entregamos a lista pelo `database`, no formato que o RecordForm já lê,
   * para não precisar mudá-lo.
   */
  const dadosDoFormulario: Database = {
    ...database,
    plano: todas.map(({ conta }) => planoContaParaRegistro(conta)),
  };

  const registroEmEdicao: RecordData | undefined =
    janela?.tipo === 'editar' ? planoContaParaRegistro(janela.conta) : undefined;

  return (
    <>
      <div className="toolbar inset-panel" aria-label={`Ações de ${config.heading}`}>
        <div className="toolbar-buttons">
          <Button
            primary
            disabled={recurso.carregando}
            onClick={() => {
              setErroDoFormulario('');
              setJanela({ tipo: 'incluir' });
            }}
          >
            Inclusão
          </Button>
        </div>
      </div>

      {conteudo()}

      {janela && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity="plano"
            record={registroEmEdicao}
            database={dadosDoFormulario}
            onSave={gravar}
            onClose={() => setJanela(null)}
            mensagemErro={erroDoFormulario}
            salvando={salvando}
          />
        </Modal>
      )}
    </>
  );
}
