/**
 * Tela de Bancos, Agencias e Contas Correntes (livro, cap. 9).
 *
 * Nao sao tres telas: e uma cadeia de tres niveis, e GET /api/bancos ja
 * devolve tudo aninhado, entao uma requisicao desenha a arvore inteira.
 *
 * Cada nivel tem sua inclusao, porque cada um e um endpoint proprio e
 * precisa saber a que pai pertence — e o pai e justamente o no onde o
 * usuario clicou na arvore.
 *
 * Desativar conta corrente nao exclui: cheques ja cadastrados dependem
 * dela continuar existindo.
 */

import { useState } from 'react';
import { Button, Modal } from '../components';
import { screens, displayValue, type Database } from '../data';
import { useRecurso } from '../hooks/useRecurso';
import {
  criarAgencia,
  criarBanco,
  criarContaCorrente,
  desativarContaCorrente,
  listarBancos,
} from '../api/bancos';
import { mensagemDoErro } from '../api/http';
import type { AgenciaApi, BancoApi, ContaCorrenteApi } from '../api/tipos';
import { Carregando, Erro, Vazio } from '../ui/estados';

/** Qual janela esta aberta, e a que no da arvore ela pertence. */
type Janela =
  | { tipo: 'banco' }
  | { tipo: 'agencia'; banco: BancoApi }
  | { tipo: 'conta'; agencia: AgenciaApi }
  | { tipo: 'desativar'; conta: ContaCorrenteApi }
  | null;

/** Quantos pixels cada nivel recua. */
const RECUO_POR_NIVEL = 22;

export function BancosScreen({
  onAviso,
}: {
  database: Database;
  onAviso: (mensagem: string) => void;
}) {
  const config = screens.bancos;

  const [janela, setJanela] = useState<Janela>(null);
  const [fechados, setFechados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState<Record<string, string>>({});

  const recurso = useRecurso(() => listarBancos(), 'bancos');
  const bancos = recurso.dados ?? [];

  /** Abre uma janela limpa, sem o que foi digitado na anterior. */
  function abrir(nova: NonNullable<Janela>) {
    setCampos({});
    setErro('');
    setJanela(nova);
  }

  const alterar = (nome: string) => (valor: string) => {
    setCampos(anteriores => ({ ...anteriores, [nome]: valor }));
    setErro('');
  };

  const campo = (nome: string) => (campos[nome] ?? '').trim();

  /** Grava o nivel correspondente a janela aberta. */
  async function gravar() {
    if (!janela) return;

    setSalvando(true);
    setErro('');
    try {
      if (janela.tipo === 'banco') {
        const criado = await criarBanco({ codigo: campo('codigo'), nome: campo('nome') });
        onAviso(`Banco ${criado.codigo} cadastrado.`);
      } else if (janela.tipo === 'agencia') {
        const criada = await criarAgencia({
          bancoId: janela.banco.id,
          numero: campo('numero'),
          nome: campo('nome') || undefined,
          gerente: campo('gerente') || undefined,
          telefone: campo('telefone') || undefined,
        });
        onAviso(`Agência ${criada.numero} cadastrada.`);
      } else if (janela.tipo === 'conta') {
        const criada = await criarContaCorrente({
          agenciaId: janela.agencia.id,
          numero: campo('numero'),
          limite: campo('limite') ? Number(campo('limite')) : undefined,
        });
        onAviso(`Conta ${criada.identificacao} cadastrada.`);
      }
      setJanela(null);
      recurso.recarregar();
    } catch (problema: unknown) {
      setErro(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  async function desativar(conta: ContaCorrenteApi) {
    setSalvando(true);
    try {
      await desativarContaCorrente(conta.id);
      setJanela(null);
      onAviso(`Conta ${conta.identificacao} desativada.`);
      recurso.recarregar();
    } catch (problema: unknown) {
      setJanela(null);
      onAviso(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  /** Recolhe ou abre um nó da árvore. */
  function alternar(chave: string) {
    setFechados(anteriores =>
      anteriores.includes(chave)
        ? anteriores.filter(item => item !== chave)
        : [...anteriores, chave],
    );
  }

  /** Desenha uma conta corrente: o nível mais fundo da cadeia. */
  function desenharConta(conta: ContaCorrenteApi) {
    return (
      <li key={`conta-${conta.id}`}>
        <span className="tree-leaf" style={{ paddingLeft: `${2 * RECUO_POR_NIVEL}px` }}>
          {conta.identificacao}
          {conta.limite ? ` — limite ${displayValue(String(conta.limite), 'money')}` : ''}
          {!conta.ativa && <span className="marca-consolidada">desativada</span>}
        </span>
        {conta.ativa && (
          <Button className="acao-no-no" onClick={() => abrir({ tipo: 'desativar', conta })}>
            Desativar
          </Button>
        )}
      </li>
    );
  }

  /** Desenha uma agência e, abaixo, as suas contas. */
  function desenharAgencia(agencia: AgenciaApi) {
    const chave = `agencia-${agencia.id}`;
    const aberta = !fechados.includes(chave);

    return (
      <li key={chave}>
        <button
          type="button"
          className="tree-branch"
          style={{ paddingLeft: `${RECUO_POR_NIVEL}px` }}
          aria-expanded={aberta}
          onClick={() => alternar(chave)}
        >
          <span aria-hidden="true">{aberta ? '▾' : '▸'}</span>{' '}
          {`${agencia.numero}　${agencia.nome ?? 'Agência'}`}
        </button>
        <Button className="acao-no-no" onClick={() => abrir({ tipo: 'conta', agencia })}>
          Incluir Conta
        </Button>

        {aberta && (
          <ul>
            {agencia.contas.map(desenharConta)}
            {!agencia.contas.length && (
              <li className="no-vazio" style={{ paddingLeft: `${2 * RECUO_POR_NIVEL}px` }}>
                Nenhuma conta corrente nesta agência.
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }

  /** Desenha um banco e, abaixo, as suas agências. */
  function desenharBanco(banco: BancoApi) {
    const chave = `banco-${banco.id}`;
    const aberto = !fechados.includes(chave);

    return (
      <li key={chave}>
        <button
          type="button"
          className="tree-branch"
          aria-expanded={aberto}
          onClick={() => alternar(chave)}
        >
          <span aria-hidden="true">{aberto ? '▾' : '▸'}</span> {`${banco.codigo}　${banco.nome}`}
        </button>
        <Button className="acao-no-no" onClick={() => abrir({ tipo: 'agencia', banco })}>
          Incluir Agência
        </Button>

        {aberto && (
          <ul>
            {banco.agencias.map(desenharAgencia)}
            {!banco.agencias.length && (
              <li className="no-vazio" style={{ paddingLeft: `${RECUO_POR_NIVEL}px` }}>
                Nenhuma agência neste banco.
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }

  function conteudo() {
    if (recurso.carregando) return <Carregando mensagem="Carregando bancos…" />;
    if (recurso.erro) {
      return <Erro mensagem={recurso.erro} onTentarNovamente={recurso.recarregar} />;
    }
    if (!bancos.length) {
      return <Vazio mensagem="Nenhum banco cadastrado. Use Incluir Banco para o primeiro." />;
    }
    return (
      <div className="account-tree" aria-label="Bancos, agências e contas">
        <ul>{bancos.map(desenharBanco)}</ul>
      </div>
    );
  }

  /** Os campos de cada janela, que mudam conforme o nível. */
  function camposDaJanela(atual: NonNullable<Janela>) {
    if (atual.tipo === 'banco') {
      return [
        { nome: 'codigo', rotulo: 'Número', limite: 4, obrigatorio: true },
        { nome: 'nome', rotulo: 'Banco', limite: 60, obrigatorio: true },
      ];
    }
    if (atual.tipo === 'agencia') {
      return [
        { nome: 'numero', rotulo: 'Agência', limite: 10, obrigatorio: true },
        { nome: 'nome', rotulo: 'Nome da Agência', limite: 60, obrigatorio: false },
        { nome: 'gerente', rotulo: 'Gerente', limite: 60, obrigatorio: false },
        { nome: 'telefone', rotulo: 'Telefone', limite: 20, obrigatorio: false },
      ];
    }
    return [
      { nome: 'numero', rotulo: 'Conta Corrente', limite: 20, obrigatorio: true },
      { nome: 'limite', rotulo: 'Limite', limite: 14, obrigatorio: false },
    ];
  }

  /** Título da janela, dizendo a que nó o novo registro vai pertencer. */
  function tituloDaJanela(atual: NonNullable<Janela>) {
    if (atual.tipo === 'banco') return 'Novo Banco';
    if (atual.tipo === 'agencia') return `Nova Agência — ${atual.banco.nome}`;
    if (atual.tipo === 'conta') return `Nova Conta — agência ${atual.agencia.numero}`;
    return 'Desativar Conta Corrente';
  }

  return (
    <>
      <div className="toolbar inset-panel" aria-label={`Ações de ${config.heading}`}>
        <div className="toolbar-buttons">
          <Button primary disabled={recurso.carregando} onClick={() => abrir({ tipo: 'banco' })}>
            Incluir Banco
          </Button>
        </div>
      </div>

      {conteudo()}

      {janela && janela.tipo !== 'desativar' && (
        <Modal title={tituloDaJanela(janela)} compact onClose={() => setJanela(null)}>
          <form
            onSubmit={evento => {
              evento.preventDefault();
              void gravar();
            }}
          >
            <div className="form-body">
              {camposDaJanela(janela).map(({ nome, rotulo, limite, obrigatorio }) => (
                <div className="field" key={nome}>
                  <label htmlFor={`banco-${nome}`}>
                    {rotulo}
                    {obrigatorio && (
                      <span className="required-mark" aria-hidden="true">
                        {' '}
                        *
                      </span>
                    )}
                  </label>
                  <input
                    id={`banco-${nome}`}
                    required={obrigatorio}
                    maxLength={limite}
                    type={nome === 'limite' ? 'number' : 'text'}
                    step={nome === 'limite' ? '0.01' : undefined}
                    min={nome === 'limite' ? '0' : undefined}
                    value={campos[nome] ?? ''}
                    onChange={evento => alterar(nome)(evento.target.value)}
                  />
                </div>
              ))}

              {erro && (
                <p className="form-error" role="alert">
                  {erro}
                </p>
              )}
            </div>
            <footer className="modal-footer">
              <Button type="button" onClick={() => setJanela(null)} disabled={salvando}>
                Cancelar
              </Button>
              <Button type="submit" primary disabled={salvando}>
                {salvando ? 'Gravando…' : 'OK'}
              </Button>
            </footer>
          </form>
        </Modal>
      )}

      {janela?.tipo === 'desativar' && (
        <Modal title="Desativar Conta Corrente" compact onClose={() => setJanela(null)}>
          <div className="form-body">
            {/* Desativar não exclui: cheques já cadastrados dependem dela. */}
            <p>
              Confirma desativar esta conta? Ela não é excluída, porque cheques já cadastrados
              dependem dela.
            </p>
            <strong>{janela.conta.identificacao}</strong>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setJanela(null)} disabled={salvando}>
              Não
            </Button>
            <Button primary onClick={() => void desativar(janela.conta)} disabled={salvando}>
              Sim, desativar
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
