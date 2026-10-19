/**
 * Tela de Clientes e de Fornecedores, ligada a /api/pessoas.
 *
 * As duas telas sao o mesmo componente porque na API sao a mesma entidade:
 * existe uma unica Pessoa, e "cliente" e "fornecedor" sao papeis dela. O que
 * muda entre as duas e so o papel usado no filtro e na gravacao.
 *
 * Fluxo de dados:
 *
 *   /api/pessoas  ->  src/api/pessoas.ts  ->  adapter  ->  esta tela
 *   (JSON da API)     (tipos do contrato)    (traducao)    (nomes do livro)
 */

import { useState } from 'react';
import { Button, DataTable, Modal } from '../components';
import { RecordForm } from '../RecordForm';
import { screens, type Entity, type RecordData } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import {
  atualizarPessoa,
  criarPessoa,
  inativarPessoa,
  listarPessoas,
} from '../api/pessoas';
import { mensagemDoErro } from '../api/http';
import { pessoaParaRegistro, registroParaPessoa } from '../adapters/pessoas';
import type { Papel, PessoaApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

/** Qual janela esta aberta sobre a tela. `null` quando nenhuma. */
type Janela =
  | { tipo: 'incluir' }
  | { tipo: 'editar'; registro: RecordData; pessoa: PessoaApi }
  | { tipo: 'localizar' }
  | { tipo: 'inativar'; pessoa: PessoaApi }
  | null;

export function PessoasScreen({
  entity,
  papel,
  onAviso,
}: {
  /** Tela correspondente em `screens`: 'clientes' ou 'fornecedores'. */
  entity: Entity;
  /** Papel filtrado nesta tela. */
  papel: Papel;
  /** Mostra um aviso curto na barra inferior da aplicacao. */
  onAviso: (mensagem: string) => void;
}) {
  const config = screens[entity];

  // Texto já confirmado na janela "Localizar". Vai para a API no parametro
  // `nome`, e nao filtra no navegador, para buscar em todos os registros.
  const [busca, setBusca] = useState('');
  // Texto sendo digitado dentro da janela, antes de confirmar.
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [janela, setJanela] = useState<Janela>(null);
  const [selecionado, setSelecionado] = useState<string>();
  const [ordem, setOrdem] = useState('registro');
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');

  // A chave descreve a busca: quando ela muda, o hook consulta a API de novo.
  const recurso = useRecurso(() => listarPessoas(papel, busca), `pessoas:${papel}:${busca}`);
  const pessoas = recurso.dados ?? [];

  // Aqui o formato da API passa a ser o formato que as telas do livro usam.
  const linhas = pessoas.map(pessoa => pessoaParaRegistro(pessoa, papel));
  const visiveis =
    ordem === 'alfabetica'
      ? [...linhas].sort((a, b) =>
          (a[config.primary] || '').localeCompare(b[config.primary] || '', 'pt-BR'),
        )
      : linhas;

  /** Abre o formulario de edicao do registro selecionado. */
  function abrirEdicao(id = selecionado) {
    const registro = linhas.find(linha => linha.id === id);
    const pessoa = pessoas.find(item => String(item.id) === id);
    if (!registro || !pessoa) {
      onAviso('Selecione um registro primeiro.');
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'editar', registro, pessoa });
  }

  /** Traduz o clique de um botao da barra de acoes numa acao da tela. */
  function acionar(rotulo: string) {
    if (rotulo === 'Editar') return abrirEdicao();
    if (rotulo === 'Inativar') {
      const pessoa = pessoas.find(item => String(item.id) === selecionado);
      if (!pessoa) {
        onAviso('Selecione um registro primeiro.');
        return;
      }
      setJanela({ tipo: 'inativar', pessoa });
      return;
    }
    if (rotulo === 'Localizar') {
      setBuscaDigitada(busca);
      return setJanela({ tipo: 'localizar' });
    }
    if (rotulo === 'Relatório') {
      window.location.hash = '/relatorios';
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'incluir' });
  }

  /**
   * Grava o formulario na API.
   *
   * Erro de regra de negocio (422) ou de validacao (400) nao fecha a janela:
   * a mensagem da API aparece dentro do formulario para o usuario corrigir.
   */
  async function gravar(valores: Record<string, string>) {
    if (!janela || (janela.tipo !== 'incluir' && janela.tipo !== 'editar')) return;
    const editando = janela.tipo === 'editar' ? janela.pessoa : undefined;

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const corpo = registroParaPessoa(valores, papel, editando);
      const salva = editando
        ? await atualizarPessoa(editando.id, corpo)
        : await criarPessoa(corpo);

      setJanela(null);
      setSelecionado(String(salva.id));
      onAviso(editando ? 'Registro atualizado.' : 'Registro gravado.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Inativa a pessoa. A API não exclui (regra RN13): o histórico de títulos
   * depende dela continuar existindo, então ela some das listas mas o
   * registro permanece no banco.
   */
  async function inativar(pessoa: PessoaApi) {
    setSalvando(true);
    try {
      await inativarPessoa(pessoa.id);
      setJanela(null);
      setSelecionado(undefined);
      onAviso(`${pessoa.nome} foi inativado.`);
      recurso.recarregar();
    } catch (problema: unknown) {
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /** Decide o que aparece no lugar da tabela conforme o estado da requisicao. */
  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem={`Carregando ${config.heading.toLowerCase()}…`} />;
    if (recurso.erro) return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    if (!visiveis.length) {
      return (
        <Vazio
          mensagem={
            busca
              ? `Nenhum registro encontrado para “${busca}”.`
              : 'Nenhum registro cadastrado. Use Incluir para cadastrar o primeiro.'
          }
        />
      );
    }
    return (
      <DataTable
        label={config.heading}
        columns={config.columns}
        rows={visiveis}
        selectedId={selecionado}
        onSelect={setSelecionado}
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
        <div className="order-control">
          <label htmlFor="order">Ordenação</label>
          <select id="order" value={ordem} onChange={evento => setOrdem(evento.target.value)}>
            <option value="registro">Ordem de Registro</option>
            <option value="alfabetica">Ordem Alfabética</option>
          </select>
        </div>
      </div>

      {busca && (
        <div className="filter-summary">
          Busca: “{busca}” <button onClick={() => setBusca('')}>Limpar busca</button>
        </div>
      )}

      {conteudo()}

      {janela?.tipo === 'inativar' && (
        <Modal title="Inativar Registro" compact onClose={() => setJanela(null)}>
          <div className="form-body">
            {/* A API nao exclui pessoa: o historico de titulos depende dela. */}
            <p>
              Confirma a inativação deste registro? Ele não é excluído, porque os títulos já
              lançados dependem dele.
            </p>
            <strong>{janela.pessoa.nome}</strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setJanela(null)} disabled={salvando}>
              Não
            </Button>
            <Button primary onClick={() => void inativar(janela.pessoa)} disabled={salvando}>
              Sim, inativar
            </Button>
          </footer>
        </Modal>
      )}

      {janela?.tipo === 'localizar' && (
        <Modal title="Localizar" compact onClose={() => setJanela(null)}>
          <form
            onSubmit={evento => {
              evento.preventDefault();
              setBusca(buscaDigitada.trim());
              setJanela(null);
            }}
          >
            <div className="form-body">
              <div className="field">
                <label htmlFor="search">Entre com uma parte do nome</label>
                <input
                  id="search"
                  value={buscaDigitada}
                  onChange={evento => setBuscaDigitada(evento.target.value)}
                />
              </div>
            </div>
            <footer className="modal-footer">
              <Button type="button" onClick={() => setJanela(null)}>
                Cancelar
              </Button>
              <Button primary type="submit">
                Localizar
              </Button>
            </footer>
          </form>
        </Modal>
      )}

      {(janela?.tipo === 'incluir' || janela?.tipo === 'editar') && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity={entity}
            record={janela.tipo === 'editar' ? janela.registro : undefined}
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
