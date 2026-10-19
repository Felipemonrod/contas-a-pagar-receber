/**
 * Tela de Lancamento Contabil, ligada a /api/lancamentos (livro, cap. 12).
 *
 * Partida dobrada: o valor sai de uma conta (credito) e entra em outra
 * (debito). As duas precisam ser DIFERENTES e ambas ANALITICAS, porque
 * conta consolidada nao recebe lancamento (regra RN01) — por isso os dois
 * campos sao alimentados por /plano-contas/analiticas, e nao pela arvore
 * inteira.
 *
 * Excluir nao apaga: ESTORNA. A API devolve 200 com o lancamento em
 * status ESTORNADO, e ele continua na lista, como manda a contabilidade.
 */

import { useState } from 'react';
import { Button, DataTable, Modal } from '../components';
import { RecordForm, type ListasDeEscolha } from '../RecordForm';
import { screens } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import { criarLancamento, estornarLancamento, listarLancamentos } from '../api/lancamentos';
import { listarAnaliticas } from '../api/plano-contas';
import { mensagemDoErro } from '../api/http';
import {
  acharContaPorRotulo,
  lancamentoParaRegistro,
  registroParaLancamento,
  rotuloDaConta,
} from '../adapters/lancamentos';
import type { LancamentoApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

type Janela = { tipo: 'incluir' } | { tipo: 'estornar'; lancamento: LancamentoApi } | null;

export function LancamentosScreen({
  onAviso,
}: {
  onAviso: (mensagem: string) => void;
}) {
  const config = screens.lancamentos;

  const [janela, setJanela] = useState<Janela>(null);
  const [selecionado, setSelecionado] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');

  const recurso = useRecurso(() => listarLancamentos(), 'lancamentos');
  const contas = useRecurso(() => listarAnaliticas(), 'plano-contas:analiticas');

  const lancamentos = recurso.dados ?? [];
  const linhas = lancamentos.map(lancamentoParaRegistro);

  /** Os dois lados da partida dobrada oferecem as mesmas contas. */
  const rotulos = (contas.dados ?? []).map(rotuloDaConta);
  const listas: ListasDeEscolha = {
    'Conta de Crédito': rotulos,
    'Conta de Débito': rotulos,
  };

  function acionar(rotulo: string) {
    if (rotulo === 'Estornar') {
      const lancamento = lancamentos.find(item => String(item.id) === selecionado);
      if (!lancamento) {
        onAviso('Selecione um lançamento primeiro.');
        return;
      }
      if (lancamento.status === 'ESTORNADO') {
        onAviso('Este lançamento já foi estornado.');
        return;
      }
      setJanela({ tipo: 'estornar', lancamento });
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'incluir' });
  }

  /** Grava o lançamento, resolvendo as duas contas escolhidas. */
  async function gravar(valores: Record<string, string>) {
    const credito = acharContaPorRotulo(valores['Conta de Crédito'] ?? '', contas.dados ?? []);
    const debito = acharContaPorRotulo(valores['Conta de Débito'] ?? '', contas.dados ?? []);

    if (!credito || !debito) {
      setErroDoFormulario('Escolha as duas contas, ambas analíticas.');
      return;
    }

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const salvo = await criarLancamento(registroParaLancamento(valores, credito.id, debito.id));

      setJanela(null);
      setSelecionado(String(salvo.id));
      onAviso('Lançamento registrado.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  async function estornar(lancamento: LancamentoApi) {
    setSalvando(true);
    try {
      const estornado = await estornarLancamento(lancamento.id);
      setJanela(null);
      onAviso(`Lançamento ${estornado.id} estornado.`);
      recurso.recarregar();
    } catch (problema: unknown) {
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando lançamentos…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!linhas.length) {
      return <Vazio mensagem="Nenhum lançamento registrado. Use Incluir para o primeiro." />;
    }
    return (
      <DataTable
        label={config.heading}
        columns={config.columns}
        rows={linhas}
        selectedId={selecionado}
        onSelect={setSelecionado}
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

      {contas.erro && (
        <Erro
          mensagem={`Não foi possível carregar as contas: ${contas.erro}`}
          onTentarNovamente={contas.recarregar}
        />
      )}

      {conteudo()}

      {janela?.tipo === 'incluir' && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity="lancamentos"
            listas={listas}
            onSave={gravar}
            onClose={() => setJanela(null)}
            mensagemErro={erroDoFormulario}
            salvando={salvando}
          />
        </Modal>
      )}

      {janela?.tipo === 'estornar' && (
        <Modal title="Confirmar Estorno" compact onClose={() => setJanela(null)}>
          <div className="form-body">
            {/* Estorno não apaga: o lançamento continua na lista, marcado. */}
            <p>Confirma o estorno deste lançamento? Ele continuará na lista, como estornado.</p>
            <strong>{janela.lancamento.descricao}</strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setJanela(null)} disabled={salvando}>
              Não
            </Button>
            <Button primary onClick={() => void estornar(janela.lancamento)} disabled={salvando}>
              Sim, estornar
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
