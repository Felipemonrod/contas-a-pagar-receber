/**
 * Janela que converte uma despesa prevista num título a pagar.
 *
 * A despesa guarda só a previsão ("uns R$ 150 de luz em dezembro"). Quando
 * a fatura chega, o valor real e o número do título só então são
 * conhecidos — é a regra RN03 do back-end —, e é isso que esta janela pede.
 */

import { useState } from 'react';
import { Button, Modal } from '../components';
import { gerarTitulo } from '../api/despesas';
import { mensagemDoErro } from '../api/http';
import { displayValue } from '../data';
import { TIPOS_DE_TITULO, rotuloParaTipo } from '../adapters/titulos';
import { acharPessoaPorNome } from '../adapters/titulos';
import type { DespesaApi, PessoaApi } from '../api/tipos';

/** Data de hoje no formato `yyyy-MM-dd`. */
function hoje(): string {
  return new Date().toLocaleDateString('sv-SE');
}

export function JanelaGerarTitulo({
  despesa,
  fornecedores,
  onFechar,
  onGerado,
}: {
  despesa: DespesaApi;
  /** Fornecedores carregados da API, para escolher quem emitiu a fatura. */
  fornecedores: PessoaApi[];
  onFechar: () => void;
  onGerado: (mensagem: string) => void;
}) {
  const [fornecedor, setFornecedor] = useState('');
  const [numeroTitulo, setNumeroTitulo] = useState('');
  // Começa com o previsto, que costuma ser perto do valor real da fatura.
  const [valor, setValor] = useState(String(despesa.valorPrevisto));
  const [emissao, setEmissao] = useState(hoje());
  const [vencimento, setVencimento] = useState(despesa.previsaoPagamento);
  const [tipo, setTipo] = useState(TIPOS_DE_TITULO.OUTROS);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  /** Guarda um valor novo e limpa o erro da tentativa anterior. */
  function alterar(guardar: (valor: string) => void) {
    return (novo: string) => {
      guardar(novo);
      setErro('');
    };
  }

  async function confirmar() {
    const pessoa = acharPessoaPorNome(fornecedor, fornecedores);
    if (!pessoa) {
      setErro('Escolha um fornecedor cadastrado.');
      return;
    }
    if (vencimento < emissao) {
      setErro('O vencimento deve ser igual ou posterior à emissão.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      const titulo = await gerarTitulo(despesa.id, {
        numeroTitulo: numeroTitulo.trim(),
        pessoaId: pessoa.id,
        valor: Number(valor) || 0,
        emissao,
        vencimento,
        tipoTitulo: rotuloParaTipo(tipo),
      });
      onGerado(`Título ${titulo.numeroTitulo} gerado a partir da despesa.`);
    } catch (problema: unknown) {
      setErro(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal title="Gerar Título a Pagar" compact onClose={onFechar}>
      <form
        onSubmit={evento => {
          evento.preventDefault();
          void confirmar();
        }}
      >
        <div className="form-body">
          <dl className="resumo-titulo">
            <div>
              <dt>Despesa</dt>
              <dd>{despesa.descricao}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{despesa.categoria}</dd>
            </div>
            <div>
              <dt>Valor previsto</dt>
              <dd>{displayValue(String(despesa.valorPrevisto), 'money')}</dd>
            </div>
            <div>
              <dt>Previsão</dt>
              <dd>{displayValue(despesa.previsaoPagamento, 'date')}</dd>
            </div>
          </dl>

          <div className="field">
            <label htmlFor="gerar-fornecedor">Nome do Fornecedor</label>
            <select
              id="gerar-fornecedor"
              value={fornecedor}
              required
              onChange={evento => alterar(setFornecedor)(evento.target.value)}
            >
              <option value="">Selecione…</option>
              {fornecedores.map(pessoa => (
                <option key={pessoa.id}>{pessoa.nome}</option>
              ))}
            </select>
          </div>

          <div className="field-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="field">
              <label htmlFor="gerar-numero">Número do Título</label>
              <input
                id="gerar-numero"
                required
                maxLength={20}
                value={numeroTitulo}
                onChange={evento => alterar(setNumeroTitulo)(evento.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="gerar-tipo">Tipo</label>
              <select
                id="gerar-tipo"
                value={tipo}
                onChange={evento => alterar(setTipo)(evento.target.value)}
              >
                {Object.values(TIPOS_DE_TITULO).map(rotulo => (
                  <option key={rotulo}>{rotulo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="field">
              <label htmlFor="gerar-valor">Valor Real da Fatura</label>
              <input
                id="gerar-valor"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={valor}
                onChange={evento => alterar(setValor)(evento.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="gerar-emissao">Data de Emissão</label>
              <input
                id="gerar-emissao"
                type="date"
                required
                value={emissao}
                onChange={evento => alterar(setEmissao)(evento.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="gerar-vencimento">Data de Vencimento</label>
              <input
                id="gerar-vencimento"
                type="date"
                required
                value={vencimento}
                onChange={evento => alterar(setVencimento)(evento.target.value)}
              />
            </div>
          </div>

          {erro && (
            <p className="form-error" role="alert">
              {erro}
            </p>
          )}
        </div>

        <footer className="modal-footer">
          <Button type="button" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" primary disabled={salvando}>
            {salvando ? 'Gerando…' : 'Gerar Título'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
