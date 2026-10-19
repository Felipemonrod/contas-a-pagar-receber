/**
 * Janela que move o cheque no seu ciclo.
 *
 * O ciclo e EM_CARTEIRA -> DEPOSITADO -> COMPENSADO ou DEVOLVIDO, e cheque
 * compensado nao muda mais. A janela oferece so os destinos validos a
 * partir de onde o cheque esta, em vez de deixar o usuario escolher
 * qualquer um e receber 422 da API.
 */

import { useState } from 'react';
import { Button, Modal } from '../components';
import { mudarSituacaoDoCheque } from '../api/cheques';
import { mensagemDoErro } from '../api/http';
import { displayValue } from '../data';
import {
  PROXIMAS_SITUACOES,
  SITUACOES_DO_CHEQUE,
} from '../adapters/cheques';
import type { ChequeApi, SituacaoCheque } from '../api/tipos';

export function JanelaDeSituacao({
  cheque,
  onFechar,
  onMovido,
}: {
  cheque: ChequeApi;
  onFechar: () => void;
  onMovido: (mensagem: string) => void;
}) {
  const destinos = PROXIMAS_SITUACOES[cheque.situacao];
  const [destino, setDestino] = useState<SituacaoCheque | ''>(destinos[0] ?? '');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!destino) return;

    setSalvando(true);
    setErro('');
    try {
      const movido = await mudarSituacaoDoCheque(cheque.id, { situacao: destino, observacao });
      onMovido(`Cheque ${movido.numeroCheque}: ${SITUACOES_DO_CHEQUE[movido.situacao]}.`);
    } catch (problema: unknown) {
      setErro(mensagemDoErro(problema));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal title="Movimentar Cheque" compact onClose={onFechar}>
      <form
        onSubmit={evento => {
          evento.preventDefault();
          void confirmar();
        }}
      >
        <div className="form-body">
          <dl className="resumo-titulo">
            <div>
              <dt>Cheque</dt>
              <dd>{cheque.numeroCheque}</dd>
            </div>
            <div>
              <dt>Emitente</dt>
              <dd>{cheque.emitente}</dd>
            </div>
            <div>
              <dt>Conta</dt>
              <dd>{cheque.contaCorrente}</dd>
            </div>
            <div>
              <dt>Valor</dt>
              <dd>{displayValue(String(cheque.valor), 'money')}</dd>
            </div>
          </dl>

          <p className="situacao-atual">
            Situação atual: <strong>{SITUACOES_DO_CHEQUE[cheque.situacao]}</strong>
            {cheque.vencido && <span className="marca-vencido">depósito vencido</span>}
          </p>

          {/* Cheque no fim do ciclo nao tem para onde ir. */}
          {!destinos.length ? (
            <p className="estado-vazio">
              Cheque {SITUACOES_DO_CHEQUE[cheque.situacao].toLowerCase()}: o ciclo terminou e a
              situação não muda mais.
            </p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="cheque-destino">Nova Situação</label>
                <select
                  id="cheque-destino"
                  value={destino}
                  onChange={evento => {
                    setDestino(evento.target.value as SituacaoCheque);
                    setErro('');
                  }}
                >
                  {destinos.map(codigo => (
                    <option key={codigo} value={codigo}>
                      {SITUACOES_DO_CHEQUE[codigo]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="cheque-observacao">Observação</label>
                <input
                  id="cheque-observacao"
                  value={observacao}
                  onChange={evento => {
                    setObservacao(evento.target.value);
                    setErro('');
                  }}
                />
              </div>
            </>
          )}

          {erro && (
            <p className="form-error" role="alert">
              {erro}
            </p>
          )}
        </div>

        <footer className="modal-footer">
          <Button type="button" onClick={onFechar} disabled={salvando}>
            {destinos.length ? 'Cancelar' : 'Fechar'}
          </Button>
          {!!destinos.length && (
            <Button type="submit" primary disabled={salvando}>
              {salvando ? 'Gravando…' : 'Confirmar'}
            </Button>
          )}
        </footer>
      </form>
    </Modal>
  );
}
