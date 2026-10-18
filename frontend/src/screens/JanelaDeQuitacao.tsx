/**
 * Janela de quitacao de um titulo, nos dois lados do caixa.
 *
 * Existe separada do formulario de lancamento porque na API sao dois
 * endpoints: o titulo e criado em aberto, e a quitacao e um POST proprio.
 *
 * Antes de confirmar, a tela pede a previa do valor devido na data escolhida
 * (GET /simulacao), que nao grava nada e ja aplica desconto ou juros. Assim
 * o usuario ve quanto vai pagar ou receber antes de decidir.
 */

import { useState } from 'react';
import { Button, Modal } from '../components';
import { useRecurso } from '../hooks/useRecurso';
import { mensagemDoErro } from '../api/http';
import { displayValue } from '../data';
import type { FormaPagamento, SimulacaoApi } from '../api/tipos';
import type { ConfiguracaoDoLado, Titulo } from '../adapters/titulos';

/** Formas de pagamento aceitas pela API, com o rotulo mostrado na tela. */
const FORMAS: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
  CHEQUE: 'Cheque',
  CARTAO: 'Cartão',
};

/** Os textos mudam conforme o lado: paga-se um, recebe-se o outro. */
const TEXTOS = {
  PAGAR: {
    tituloDaJanela: 'Quitação de Título',
    rotuloData: 'Data do Pagamento',
    rotuloForma: 'Forma de Pagamento',
    rotuloValor: 'Valor Pago',
    dicaDoValor: 'Deixe em branco para quitar o valor devido',
    quitado: 'Título quitado.',
    parcial: 'Pagamento registrado.',
  },
  RECEBER: {
    tituloDaJanela: 'Recebimento de Título',
    rotuloData: 'Data do Recebimento',
    rotuloForma: 'Forma de Recebimento',
    rotuloValor: 'Valor Recebido',
    dicaDoValor: 'Deixe em branco para receber o valor devido',
    quitado: 'Título recebido.',
    parcial: 'Recebimento registrado.',
  },
} as const;

/** Data de hoje no formato `yyyy-MM-dd`, que e o que a API espera. */
function hoje(): string {
  return new Date().toLocaleDateString('sv-SE');
}

export function JanelaDeQuitacao({
  titulo,
  lado,
  simular,
  quitar,
  onFechar,
  onQuitado,
}: {
  titulo: Titulo;
  lado: ConfiguracaoDoLado;
  /** Consulta a previa do valor devido numa data, sem gravar nada. */
  simular: (id: number, data: string) => Promise<SimulacaoApi>;
  /** Grava a quitacao e devolve o titulo atualizado. */
  quitar: (
    id: number,
    dados: { data: string; forma: FormaPagamento; valor?: number },
  ) => Promise<Titulo>;
  onFechar: () => void;
  /** Avisado com a mensagem de sucesso depois de gravar. */
  onQuitado: (mensagem: string) => void;
}) {
  const textos = TEXTOS[lado.direcao];

  const [data, setData] = useState(hoje());
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  // Vazio significa "quitacao integral": a API calcula o valor devido.
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // A previa e refeita toda vez que a data muda.
  const previa = useRecurso(() => simular(titulo.id, data), `simulacao:${titulo.id}:${data}`);

  /**
   * Guarda um valor novo e limpa a mensagem de erro anterior: assim que o
   * usuario muda alguma coisa, o erro da tentativa passada deixa de valer.
   */
  function alterar<T>(guardar: (valor: T) => void): (valor: T) => void {
    return novo => {
      guardar(novo);
      setErro('');
    };
  }

  const mudarData = alterar(setData);
  const mudarForma = alterar(setForma);
  const mudarValor = alterar(setValor);

  async function confirmar() {
    setSalvando(true);
    setErro('');
    try {
      const informado = valor.trim();
      const atualizado = await quitar(titulo.id, {
        data,
        forma,
        // Campo em branco: a API cobra o valor devido integral.
        valor: informado ? Number(informado) : undefined,
      });

      const quitadoPorInteiro = atualizado.situacao === lado.situacaoQuitada;
      const saldo = displayValue(String(atualizado.saldoDevedor), 'money');
      onQuitado(
        quitadoPorInteiro ? textos.quitado : `${textos.parcial} Saldo devedor: ${saldo}.`,
      );
    } catch (problema: unknown) {
      setErro(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  const dinheiro = (numero: number) => displayValue(String(numero), 'money');

  return (
    <Modal title={textos.tituloDaJanela} compact onClose={onFechar}>
      <form
        onSubmit={evento => {
          evento.preventDefault();
          void confirmar();
        }}
      >
        <div className="form-body">
          <dl className="resumo-titulo">
            <div>
              <dt>Título</dt>
              <dd>{titulo.numeroTitulo}</dd>
            </div>
            <div>
              <dt>{lado.direcao === 'PAGAR' ? 'Fornecedor' : 'Cliente'}</dt>
              <dd>{titulo.pessoaNome}</dd>
            </div>
            <div>
              <dt>Vencimento</dt>
              <dd>{displayValue(titulo.vencimento, 'date')}</dd>
            </div>
            <div>
              <dt>Saldo devedor</dt>
              <dd>{dinheiro(titulo.saldoDevedor)}</dd>
            </div>
          </dl>

          <div className="field-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="field">
              <label htmlFor="quitacao-data">{textos.rotuloData}</label>
              <input
                id="quitacao-data"
                type="date"
                value={data}
                required
                onChange={evento => mudarData(evento.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="quitacao-forma">{textos.rotuloForma}</label>
              <select
                id="quitacao-forma"
                value={forma}
                onChange={evento => mudarForma(evento.target.value as FormaPagamento)}
              >
                {(Object.keys(FORMAS) as FormaPagamento[]).map(codigo => (
                  <option key={codigo} value={codigo}>
                    {FORMAS[codigo]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="quitacao-valor">{textos.rotuloValor}</label>
            <input
              id="quitacao-valor"
              type="number"
              step="0.01"
              min="0.01"
              placeholder={textos.dicaDoValor}
              value={valor}
              onChange={evento => mudarValor(evento.target.value)}
            />
          </div>

          <section className="previa-quitacao" aria-live="polite">
            <h3>Prévia na data escolhida</h3>
            {previa.carregando && <p>Calculando…</p>}
            {previa.erro && <p className="form-error">{previa.erro}</p>}
            {previa.dados && (
              <dl>
                <div>
                  <dt>Valor original</dt>
                  <dd>{dinheiro(previa.dados.valorOriginal)}</dd>
                </div>
                <div>
                  <dt>Desconto</dt>
                  <dd>{dinheiro(previa.dados.descontoAplicado)}</dd>
                </div>
                <div>
                  <dt>Acréscimo</dt>
                  <dd>{dinheiro(previa.dados.acrescimoAplicado)}</dd>
                </div>
                <div className="previa-total">
                  <dt>Valor devido</dt>
                  <dd>{dinheiro(previa.dados.valorDevido)}</dd>
                </div>
              </dl>
            )}
          </section>

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
            {salvando ? 'Gravando…' : 'Confirmar'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
