/**
 * Tela de Cartorios, ligada a /api/cartorios (livro, cap. 10).
 *
 * Cadastro simples. A unica regra que a tela precisa conhecer e a da
 * exclusao: cartorio com remessa nao pode ser apagado, e a API recusa com
 * mensagem propria, que mostramos como veio.
 */

import { useState } from 'react';
import { Button, DataTable, Modal } from '../components';
import { RecordForm } from '../RecordForm';
import { screens, type RecordData } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import {
  atualizarCartorio,
  criarCartorio,
  excluirCartorio,
  listarCartorios,
} from '../api/cartorios';
import { mensagemDoErro } from '../api/http';
import type { CartorioApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

type Janela =
  | { tipo: 'incluir' }
  | { tipo: 'editar'; registro: RecordData; cartorio: CartorioApi }
  | { tipo: 'excluir'; cartorio: CartorioApi }
  | null;

/** Converte o cartorio da API na linha da tela. */
function cartorioParaRegistro(cartorio: CartorioApi): RecordData {
  return {
    id: String(cartorio.id),
    'Nome do Cartório': cartorio.nome,
    Contato: cartorio.contato ?? '',
    Telefone: cartorio.telefone ?? '',
  };
}

/** Converte o formulario no corpo que a API espera. */
function registroParaCartorio(valores: Record<string, string>) {
  const campo = (nome: string): string => (valores[nome] ?? '').trim();
  return {
    nome: campo('Nome do Cartório'),
    contato: campo('Contato') || undefined,
    telefone: campo('Telefone') || undefined,
  };
}

export function CartoriosScreen({ onAviso }: { onAviso: (mensagem: string) => void }) {
  const config = screens.cartorios;

  const [janela, setJanela] = useState<Janela>(null);
  const [selecionado, setSelecionado] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState('');

  const recurso = useRecurso(() => listarCartorios(), 'cartorios');
  const cartorios = recurso.dados ?? [];
  const linhas = cartorios.map(cartorioParaRegistro);

  function cartorioSelecionado(): CartorioApi | undefined {
    const cartorio = cartorios.find(item => String(item.id) === selecionado);
    if (!cartorio) onAviso('Selecione um cartório primeiro.');
    return cartorio;
  }

  function abrirEdicao(id = selecionado) {
    const cartorio = cartorios.find(item => String(item.id) === id);
    if (!cartorio) {
      onAviso('Selecione um cartório primeiro.');
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'editar', registro: cartorioParaRegistro(cartorio), cartorio });
  }

  function acionar(rotulo: string) {
    if (rotulo === 'Editar') return abrirEdicao();
    if (rotulo === 'Deletar') {
      const cartorio = cartorioSelecionado();
      if (cartorio) setJanela({ tipo: 'excluir', cartorio });
      return;
    }
    setErroDoFormulario('');
    setJanela({ tipo: 'incluir' });
  }

  async function gravar(valores: Record<string, string>) {
    if (!janela || (janela.tipo !== 'incluir' && janela.tipo !== 'editar')) return;
    const editando = janela.tipo === 'editar' ? janela.cartorio : undefined;

    setSalvando(true);
    setErroDoFormulario('');
    try {
      const corpo = registroParaCartorio(valores);
      const salvo = editando
        ? await atualizarCartorio(editando.id, corpo)
        : await criarCartorio(corpo);

      setJanela(null);
      setSelecionado(String(salvo.id));
      onAviso(editando ? 'Cartório atualizado.' : 'Cartório cadastrado.');
      recurso.recarregar();
    } catch (problema: unknown) {
      setErroDoFormulario(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(cartorio: CartorioApi) {
    setSalvando(true);
    try {
      await excluirCartorio(cartorio.id);
      setJanela(null);
      setSelecionado(undefined);
      onAviso('Cartório excluído.');
      recurso.recarregar();
    } catch (problema: unknown) {
      // Cartorio com remessa nao pode ser apagado: a API explica o porque.
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando cartórios…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!linhas.length) {
      return <Vazio mensagem="Nenhum cartório cadastrado. Use Incluir para cadastrar o primeiro." />;
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

      {conteudo()}

      {(janela?.tipo === 'incluir' || janela?.tipo === 'editar') && (
        <Modal title={config.modal} onClose={() => setJanela(null)}>
          <RecordForm
            entity="cartorios"
            record={janela.tipo === 'editar' ? janela.registro : undefined}
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
            <p>Confirma a exclusão deste cartório?</p>
            <strong>{janela.cartorio.nome}</strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setJanela(null)} disabled={salvando}>
              Não
            </Button>
            <Button primary onClick={() => void excluir(janela.cartorio)} disabled={salvando}>
              Sim, excluir
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
