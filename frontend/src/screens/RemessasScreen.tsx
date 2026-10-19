/**
 * Tela de Remessa de Titulos para Cartorio (livro, cap. 10 e 17).
 *
 * A regra RN09 so deixa protestar titulo VENCIDO e NAO QUITADO. Em vez de
 * aceitar qualquer titulo e deixar a API recusar com 422, o formulario
 * oferece apenas os titulos elegiveis, vindos de
 * /api/contas-receber/inadimplentes.
 *
 * Depois de enviada, a remessa anda por duas acoes proprias: Protestar e
 * Baixar. A situacao (ENVIADA / PROTESTADA / BAIXADA) nao e um campo que a
 * tela controla: a API a deriva das datas.
 */

import { useState } from 'react';
import { Button, DataTable, Modal } from '../components';
import { RecordForm } from '../RecordForm';
import { screens, type Database } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import {
  baixarRemessa,
  criarRemessa,
  listarCartorios,
  listarRemessas,
  protestarRemessa,
} from '../api/cartorios';
import { listarReceberInadimplentes } from '../api/contas-receber';
import { mensagemDoErro } from '../api/http';
import {
  acharCartorioPorNome,
  acharTituloPorRotulo,
  remessaParaRegistro,
  rotuloDoTitulo,
} from '../adapters/remessas';
import type { RemessaApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

type Janela =
  | { tipo: 'enviar' }
  | { tipo: 'protestar'; remessa: RemessaApi }
  | { tipo: 'baixar'; remessa: RemessaApi }
  | null;

/** Data de hoje em `yyyy-MM-dd`, que e o formato que a API espera. */
function hoje(): string {
  return new Date().toLocaleDateString('sv-SE');
}

export function RemessasScreen({
  database,
  onAviso,
}: {
  database: Database;
  onAviso: (mensagem: string) => void;
}) {
  const config = screens.remessas;

  const [janela, setJanela] = useState<Janela>(null);
  const [selecionada, setSelecionada] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');
  const [data, setData] = useState(hoje());

  const recurso = useRecurso(() => listarRemessas(), 'remessas');
  const cartorios = useRecurso(() => listarCartorios(), 'cartorios');
  const elegiveis = useRecurso(() => listarReceberInadimplentes(), 'contas-receber:vencidas');

  const remessas = recurso.dados ?? [];
  const linhas = remessas.map(remessaParaRegistro);

  /**
   * Entrega ao formulario os cartorios e os titulos elegiveis, no formato
   * que o RecordForm ja le.
   */
  const dadosDoFormulario: Database = {
    ...database,
    cartorios: (cartorios.dados ?? []).map(cartorio => ({
      id: String(cartorio.id),
      'Nome do Cartório': cartorio.nome,
      Contato: cartorio.contato ?? '',
      Telefone: cartorio.telefone ?? '',
    })),
    recebimentos: (elegiveis.dados ?? []).map(titulo => ({
      id: String(titulo.id),
      'Número do Título': rotuloDoTitulo(titulo),
      'Nome do Cliente': titulo.pessoaNome,
    })),
  };

  function remessaSelecionada(): RemessaApi | undefined {
    const remessa = remessas.find(item => String(item.id) === selecionada);
    if (!remessa) onAviso('Selecione uma remessa primeiro.');
    return remessa;
  }

  function acionar(rotulo: string) {
    if (rotulo === 'Protestar') {
      const remessa = remessaSelecionada();
      if (!remessa) return;
      if (remessa.situacao !== 'ENVIADA') {
        onAviso('Só uma remessa recém-enviada pode ser protestada.');
        return;
      }
      setData(hoje());
      setJanela({ tipo: 'protestar', remessa });
      return;
    }
    if (rotulo === 'Baixar') {
      const remessa = remessaSelecionada();
      if (!remessa) return;
      if (remessa.situacao === 'BAIXADA') {
        onAviso('Esta remessa já foi baixada.');
        return;
      }
      setData(hoje());
      setJanela({ tipo: 'baixar', remessa });
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'enviar' });
  }

  /** Envia o titulo escolhido ao cartorio escolhido. */
  async function enviar(valores: Record<string, string>) {
    const cartorio = acharCartorioPorNome(valores['Cartório'] ?? '', cartorios.dados ?? []);
    if (!cartorio) {
      setErroDoFormulario('Escolha um cartório cadastrado.');
      return;
    }
    const titulo = acharTituloPorRotulo(
      valores['Número do Título'] ?? '',
      elegiveis.dados ?? [],
    );
    if (!titulo) {
      setErroDoFormulario('Escolha um título vencido e em aberto.');
      return;
    }

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const criada = await criarRemessa({
        cartorioId: cartorio.id,
        contaReceberId: titulo.id,
        dataRemessa: (valores.Remessa ?? '').trim() || undefined,
        observacao: (valores['Observação'] ?? '').trim() || undefined,
      });

      setJanela(null);
      setSelecionada(String(criada.id));
      onAviso(`Título ${criada.numeroTitulo} enviado a ${criada.cartorioNome}.`);
      recurso.recarregar();
      // O titulo saiu da lista de elegiveis: so pode estar numa remessa.
      elegiveis.recarregar();
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /** Registra o protesto ou a baixa, conforme a janela aberta. */
  async function movimentar(remessa: RemessaApi, acao: 'protestar' | 'baixar') {
    setSalvando(true);
    try {
      const atualizada =
        acao === 'protestar'
          ? await protestarRemessa(remessa.id, data)
          : await baixarRemessa(remessa.id, data);

      setJanela(null);
      onAviso(
        acao === 'protestar'
          ? `Protesto do título ${atualizada.numeroTitulo} registrado.`
          : `Protesto do título ${atualizada.numeroTitulo} baixado.`,
      );
      recurso.recarregar();
    } catch (problema: unknown) {
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando remessas…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!linhas.length) {
      return <Vazio mensagem="Nenhuma remessa enviada. Use Enviar para mandar um título a protesto." />;
    }
    return (
      <DataTable
        label={config.heading}
        columns={config.columns}
        rows={linhas}
        selectedId={selecionada}
        onSelect={setSelecionada}
      />
    );
  }

  /** Quantos títulos estão vencidos e ainda não foram para nenhum cartório. */
  const quantidadeElegivel = elegiveis.dados?.length ?? 0;

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

      {cartorios.erro && (
        <Erro
          mensagem={`Não foi possível carregar os cartórios: ${cartorios.erro}`}
          onTentarNovamente={cartorios.recarregar}
        />
      )}
      {elegiveis.erro && (
        <Erro
          mensagem={`Não foi possível carregar os títulos vencidos: ${elegiveis.erro}`}
          onTentarNovamente={elegiveis.recarregar}
        />
      )}

      {/* Diz de antemão se há o que protestar, para o usuário não abrir
          o formulário e encontrar a lista vazia. */}
      {!elegiveis.carregando && !elegiveis.erro && (
        <div className="filter-summary">
          {quantidadeElegivel
            ? `${quantidadeElegivel} título(s) vencido(s) em aberto, disponíveis para protesto.`
            : 'Nenhum título vencido em aberto: não há o que mandar a protesto.'}
        </div>
      )}

      {conteudo()}

      {janela?.tipo === 'enviar' && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity="remessas"
            database={dadosDoFormulario}
            onSave={enviar}
            onClose={() => setJanela(null)}
            mensagemErro={erroDoFormulario}
            salvando={salvando}
          />
        </Modal>
      )}

      {(janela?.tipo === 'protestar' || janela?.tipo === 'baixar') && (
        <Modal
          title={janela.tipo === 'protestar' ? 'Registrar Protesto' : 'Baixar Protesto'}
          compact
          onClose={() => setJanela(null)}
        >
          <form
            onSubmit={evento => {
              evento.preventDefault();
              void movimentar(janela.remessa, janela.tipo === 'protestar' ? 'protestar' : 'baixar');
            }}
          >
            <div className="form-body">
              <dl className="resumo-titulo">
                <div>
                  <dt>Título</dt>
                  <dd>{janela.remessa.numeroTitulo}</dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>{janela.remessa.cliente}</dd>
                </div>
                <div>
                  <dt>Cartório</dt>
                  <dd>{janela.remessa.cartorioNome}</dd>
                </div>
                <div>
                  <dt>Situação</dt>
                  <dd>{remessaParaRegistro(janela.remessa)['Situação']}</dd>
                </div>
              </dl>

              <div className="field">
                <label htmlFor="remessa-data">
                  {janela.tipo === 'protestar' ? 'Data do Protesto' : 'Data da Baixa'}
                </label>
                <input
                  id="remessa-data"
                  type="date"
                  required
                  value={data}
                  onChange={evento => setData(evento.target.value)}
                />
              </div>
            </div>
            <footer className="modal-footer">
              <Button type="button" onClick={() => setJanela(null)} disabled={salvando}>
                Cancelar
              </Button>
              <Button type="submit" primary disabled={salvando}>
                {salvando ? 'Gravando…' : 'Confirmar'}
              </Button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
