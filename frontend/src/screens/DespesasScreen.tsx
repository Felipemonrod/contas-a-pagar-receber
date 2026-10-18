/**
 * Tela de Despesas, ligada a /api/despesas.
 *
 * Uma despesa é a previsão de um gasto fixo. Além de incluir, editar e
 * excluir, esta tela faz a conversão que dá sentido ao cadastro: quando a
 * fatura chega, "Gerar Título" transforma a previsão num título a pagar.
 */

import { useState } from 'react';
import { Button, DataTable, Modal } from '../components';
import { RecordForm } from '../RecordForm';
import { screens, type Database, type RecordData } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import {
  atualizarDespesa,
  criarDespesa,
  excluirDespesa,
  listarDespesas,
} from '../api/despesas';
import { listarAnaliticas } from '../api/plano-contas';
import { listarPessoas } from '../api/pessoas';
import { mensagemDoErro } from '../api/http';
import {
  acharCategoriaPorRotulo,
  despesaParaRegistro,
  registroParaDespesa,
  rotuloDaCategoria,
} from '../adapters/despesas';
import type { DespesaApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';
import { JanelaGerarTitulo } from './JanelaGerarTitulo';

type Janela =
  | { tipo: 'incluir' }
  | { tipo: 'editar'; registro: RecordData; despesa: DespesaApi }
  | { tipo: 'excluir'; despesa: DespesaApi }
  | { tipo: 'gerar'; despesa: DespesaApi }
  | null;

export function DespesasScreen({
  database,
  onAviso,
}: {
  database: Database;
  onAviso: (mensagem: string) => void;
}) {
  const config = screens.despesas;

  const [janela, setJanela] = useState<Janela>(null);
  const [selecionada, setSelecionada] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');

  const recurso = useRecurso(() => listarDespesas(), 'despesas');
  // Só contas analíticas aceitam lançamento (regra RN01), então são essas
  // que o campo de categoria oferece.
  const categorias = useRecurso(() => listarAnaliticas(), 'plano-contas:analiticas');
  const fornecedores = useRecurso(() => listarPessoas('FORNECEDOR'), 'pessoas:FORNECEDOR');

  const despesas = recurso.dados ?? [];
  const linhas = despesas.map(despesaParaRegistro);

  /** Entrega as categorias ao formulário no formato que ele já lê. */
  const dadosDoFormulario: Database = {
    ...database,
    plano: (categorias.dados ?? []).map(conta => ({
      id: String(conta.id),
      'Nova Conta': conta.codigo,
      'Descrição da Conta': rotuloDaCategoria(conta),
    })),
  };

  /** Devolve a despesa selecionada, avisando quando não há nenhuma. */
  function despesaSelecionada(): DespesaApi | undefined {
    const despesa = despesas.find(item => String(item.id) === selecionada);
    if (!despesa) onAviso('Selecione uma despesa primeiro.');
    return despesa;
  }

  function abrirEdicao(id = selecionada) {
    const despesa = despesas.find(item => String(item.id) === id);
    if (!despesa) {
      onAviso('Selecione uma despesa primeiro.');
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'editar', registro: despesaParaRegistro(despesa), despesa });
  }

  function acionar(rotulo: string) {
    if (rotulo === 'Edição') return abrirEdicao();
    if (rotulo === 'Exclusão') {
      const despesa = despesaSelecionada();
      if (despesa) setJanela({ tipo: 'excluir', despesa });
      return;
    }
    if (rotulo === 'Gerar Título') {
      const despesa = despesaSelecionada();
      if (!despesa) return;
      if (despesa.realizada) {
        onAviso(`Esta despesa já virou o título ${despesa.numeroTitulo}.`);
        return;
      }
      setJanela({ tipo: 'gerar', despesa });
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'incluir' });
  }

  /** Grava a despesa na API. */
  async function gravar(valores: Record<string, string>) {
    if (!janela || (janela.tipo !== 'incluir' && janela.tipo !== 'editar')) return;
    const editando = janela.tipo === 'editar' ? janela.despesa : undefined;

    const categoria = acharCategoriaPorRotulo(
      valores['Lançamento'] ?? '',
      categorias.dados ?? [],
    );
    if (!categoria) {
      setErroDoFormulario('Escolha uma categoria que aceite lançamento.');
      return;
    }

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const corpo = registroParaDespesa(valores, categoria.id);
      const salva = editando
        ? await atualizarDespesa(editando.id, corpo)
        : await criarDespesa(corpo);

      setJanela(null);
      setSelecionada(String(salva.id));
      onAviso(editando ? 'Despesa atualizada.' : 'Despesa cadastrada.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /** Exclui a despesa confirmada na janela. */
  async function excluir(despesa: DespesaApi) {
    setSalvando(true);
    try {
      await excluirDespesa(despesa.id);
      setJanela(null);
      setSelecionada(undefined);
      onAviso('Despesa excluída.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando despesas…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!linhas.length) {
      return <Vazio mensagem="Nenhuma despesa prevista. Use Inclusão para cadastrar a primeira." />;
    }
    return (
      <DataTable
        label={config.heading}
        columns={config.columns}
        rows={linhas}
        selectedId={selecionada}
        onSelect={setSelecionada}
        onEdit={abrirEdicao}
      />
    );
  }

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
      </div>

      {categorias.erro && (
        <Erro
          mensagem={`Não foi possível carregar as categorias: ${categorias.erro}`}
          onTentarNovamente={categorias.recarregar}
        />
      )}

      {/* Sem os fornecedores, "Gerar Título" abriria com a lista vazia e
          sem explicação, porque o campo é obrigatório. */}
      {fornecedores.erro && (
        <Erro
          mensagem={`Não foi possível carregar os fornecedores: ${fornecedores.erro}`}
          onTentarNovamente={fornecedores.recarregar}
        />
      )}

      {conteudo()}

      {(janela?.tipo === 'incluir' || janela?.tipo === 'editar') && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity="despesas"
            record={janela.tipo === 'editar' ? janela.registro : undefined}
            database={dadosDoFormulario}
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
            <p>Confirma a exclusão desta despesa?</p>
            <strong>{janela.despesa.descricao}</strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setJanela(null)} disabled={salvando}>
              Não
            </Button>
            <Button primary onClick={() => void excluir(janela.despesa)} disabled={salvando}>
              Sim, excluir
            </Button>
          </footer>
        </Modal>
      )}

      {janela?.tipo === 'gerar' && (
        <JanelaGerarTitulo
          despesa={janela.despesa}
          fornecedores={fornecedores.dados ?? []}
          onFechar={() => setJanela(null)}
          onGerado={mensagem => {
            setJanela(null);
            onAviso(mensagem);
            recurso.recarregar();
          }}
        />
      )}
    </>
  );
}
