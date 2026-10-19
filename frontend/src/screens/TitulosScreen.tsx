/**
 * Tela de Pagamentos e de Recebimentos.
 *
 * As duas sao o mesmo componente porque na API sao endpoints espelhados:
 * muda o endereco, o papel exigido da pessoa (FORNECEDOR x CLIENTE) e os
 * nomes dos campos de quitacao. Tudo isso chega por `lado` e pelas funcoes
 * de API passadas como propriedade, que e o que mantem esta tela sem saber
 * de qual dos dois lados ela esta tratando.
 *
 * Diferenca em relacao ao formulario do livro: lancar um titulo e quita-lo
 * sao duas acoes separadas, porque sao dois endpoints, e a regra RN11 recusa
 * alterar um titulo que ja tenha quitacao.
 */

import { useState } from 'react';
import { Button, DataTable, Modal } from '../components';
import { RecordForm } from '../RecordForm';
import { normalize, screens, type Database, type Entity, type RecordData } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import { listarPessoas } from '../api/pessoas';
import { mensagemDoErro } from '../api/http';
import { pessoaParaRegistro } from '../adapters/pessoas';
import {
  acharPessoaPorNome,
  registroParaTitulo,
  tituloParaRegistro,
  type ConfiguracaoDoLado,
  type Titulo,
} from '../adapters/titulos';
import type { ContaPagarNova, FormaPagamento, SimulacaoApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';
import { JanelaDeQuitacao } from './JanelaDeQuitacao';

/** As chamadas de API do lado em uso, já convertidas para a forma comum. */
export type OperacoesDeTitulo = {
  listar: () => Promise<Titulo[]>;
  criar: (corpo: ContaPagarNova) => Promise<Titulo>;
  atualizar: (id: number, corpo: ContaPagarNova) => Promise<Titulo>;
  simular: (id: number, data: string) => Promise<SimulacaoApi>;
  quitar: (
    id: number,
    dados: { data: string; forma: FormaPagamento; valor?: number },
  ) => Promise<Titulo>;
};

type Janela =
  | { tipo: 'incluir' }
  | { tipo: 'editar'; registro: RecordData; titulo: Titulo }
  | { tipo: 'quitar'; titulo: Titulo }
  | { tipo: 'localizar' }
  | null;

export function TitulosScreen({
  entity,
  lado,
  operacoes,
  database,
  onAviso,
}: {
  /** 'pagamentos' ou 'recebimentos'. */
  entity: Entity;
  lado: ConfiguracaoDoLado;
  operacoes: OperacoesDeTitulo;
  database: Database;
  onAviso: (mensagem: string) => void;
}) {
  const config = screens[entity];

  const [janela, setJanela] = useState<Janela>(null);
  const [selecionado, setSelecionado] = useState<string>();
  // Texto ja confirmado na janela "Localizar", e o que esta sendo digitado.
  const [busca, setBusca] = useState('');
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');

  const recurso = useRecurso(() => operacoes.listar(), `titulos:${lado.direcao}`);
  // O formulario precisa das pessoas para o campo de escolha, e a gravacao
  // precisa delas para trocar o nome escolhido pelo `pessoaId`.
  const pessoas = useRecurso(() => listarPessoas(lado.papel), `pessoas:${lado.papel}`);

  const titulos = recurso.dados ?? [];
  // A API de titulos nao tem filtro por nome ou numero (so situacao e
  // periodo), entao a busca e feita sobre a lista ja carregada.
  const encontrados = busca
    ? titulos.filter(
        titulo =>
          normalize(titulo.numeroTitulo).includes(normalize(busca)) ||
          normalize(titulo.pessoaNome).includes(normalize(busca)),
      )
    : titulos;
  const linhas = encontrados.map(titulo => tituloParaRegistro(titulo, lado));

  /**
   * Entrega ao formulario a lista de pessoas vinda da API, no formato que
   * ele ja sabe ler. Assim o campo de escolha passa a oferecer os cadastros
   * reais, sem precisar mudar o RecordForm.
   */
  const comoLinhas = (pessoas.dados ?? []).map(pessoa =>
    pessoaParaRegistro(pessoa, lado.papel),
  );
  const dadosDoFormulario: Database = {
    ...database,
    ...(lado.papel === 'FORNECEDOR' ? { fornecedores: comoLinhas } : { clientes: comoLinhas }),
  };

  function abrirEdicao(id = selecionado) {
    const titulo = titulos.find(item => String(item.id) === id);
    if (!titulo) {
      onAviso('Selecione um título primeiro.');
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'editar', registro: tituloParaRegistro(titulo, lado), titulo });
  }

  function acionar(rotulo: string) {
    if (rotulo === 'Editar') return abrirEdicao();
    if (rotulo === 'Quitar' || rotulo === 'Receber') {
      const titulo = titulos.find(item => String(item.id) === selecionado);
      if (!titulo) {
        onAviso('Selecione um título primeiro.');
        return;
      }
      setJanela({ tipo: 'quitar', titulo });
      return;
    }
    if (rotulo === 'Localizar') {
      setBuscaDigitada(busca);
      setJanela({ tipo: 'localizar' });
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'incluir' });
  }

  /**
   * Grava o lancamento na API.
   *
   * O nome escolhido na tela vira `pessoaId` aqui. Se nao casar com nenhum
   * cadastro carregado, a tela avisa em vez de mandar um id invalido.
   */
  async function gravar(valores: Record<string, string>) {
    if (!janela || (janela.tipo !== 'incluir' && janela.tipo !== 'editar')) return;
    const editando = janela.tipo === 'editar' ? janela.titulo : undefined;

    const pessoa = acharPessoaPorNome(
      valores[lado.campoDaPessoa] ?? '',
      pessoas.dados ?? [],
    );
    if (!pessoa) {
      const quem = lado.papel === 'FORNECEDOR' ? 'um fornecedor' : 'um cliente';
      setErroDoFormulario(`Escolha ${quem} cadastrado.`);
      return;
    }

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const corpo = registroParaTitulo(valores, pessoa.id, editando);
      const salvo = editando
        ? await operacoes.atualizar(editando.id, corpo)
        : await operacoes.criar(corpo);

      setJanela(null);
      setSelecionado(String(salvo.id));
      onAviso(editando ? 'Título atualizado.' : 'Título lançado.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /** Decide o que aparece no lugar da tabela conforme o estado da requisicao. */
  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando títulos…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!linhas.length) {
      return (
        <Vazio
          mensagem={
            busca
              ? `Nenhum título encontrado para “${busca}”.`
              : 'Nenhum título lançado. Use Incluir para lançar o primeiro.'
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

      {/* O formulario precisa dos cadastros; avisa se a lista nao veio. */}
      {pessoas.erro && (
        <Erro
          mensagem={`Não foi possível carregar os cadastros: ${pessoas.erro}`}
          onTentarNovamente={pessoas.recarregar}
        />
      )}

      {busca && (
        <div className="filter-summary">
          Busca: “{busca}” <button onClick={() => setBusca('')}>Limpar busca</button>
        </div>
      )}

      {conteudo()}

      {(janela?.tipo === 'incluir' || janela?.tipo === 'editar') && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity={entity}
            record={janela.tipo === 'editar' ? janela.registro : undefined}
            database={dadosDoFormulario}
            onSave={gravar}
            onClose={() => setJanela(null)}
            mensagemErro={erroDoFormulario}
            salvando={salvando}
          />
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
                <label htmlFor="busca-titulo">Entre com parte do número ou do nome</label>
                <input
                  id="busca-titulo"
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

      {janela?.tipo === 'quitar' && (
        <JanelaDeQuitacao
          titulo={janela.titulo}
          lado={lado}
          simular={operacoes.simular}
          quitar={operacoes.quitar}
          onFechar={() => setJanela(null)}
          onQuitado={mensagem => {
            setJanela(null);
            onAviso(mensagem);
            recurso.recarregar();
          }}
        />
      )}
    </>
  );
}
