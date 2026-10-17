/**
 * Os tres estados que toda tela ligada a API precisa mostrar:
 * carregando, erro e vazio.
 *
 * Ficam juntos num arquivo so porque sao curtos e sempre aparecem lado a
 * lado na mesma tela, nunca isolados.
 */

import { Button } from '../components';

/** Aviso de que a requisicao esta em andamento. */
export function Carregando({ mensagem = 'Carregando…' }: { mensagem?: string }) {
  // `role="status"` faz o leitor de tela anunciar o aviso quando ele aparece.
  return (
    <p className="estado-carregando" role="status">
      {mensagem}
    </p>
  );
}

/**
 * Falha na comunicacao com a API, com a opcao de tentar de novo.
 *
 * A mensagem vem pronta da API, que responde em portugues e em texto
 * legivel para o usuario final, conforme o contrato.
 */
export function Erro({ mensagem, onTentarNovamente }: { mensagem: string; onTentarNovamente?: () => void }) {
  return (
    <div className="estado-erro" role="alert">
      <p>{mensagem}</p>
      {onTentarNovamente && <Button onClick={onTentarNovamente}>Tentar novamente</Button>}
    </div>
  );
}

/** A busca funcionou, mas nao ha registros para mostrar. */
export function Vazio({ mensagem }: { mensagem: string }) {
  return <p className="estado-vazio">{mensagem}</p>;
}
