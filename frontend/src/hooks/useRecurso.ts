/**
 * Hook que cuida do ciclo de vida de uma busca na API.
 *
 * Toda tela integrada precisa das mesmas tres informacoes: se ainda esta
 * carregando, se deu erro, e quais sao os dados. Em vez de repetir esse
 * controle em cada tela, ele fica concentrado aqui.
 */

import { useEffect, useRef, useState } from 'react';
import { mensagemDoErro } from '../api/http';

/** O que a tela recebe de volta para desenhar seus tres estados. */
export type Recurso<T> = {
  /** Dados carregados, ou `null` enquanto nao houver resposta. */
  dados: T | null;
  /** `true` enquanto a requisicao esta em andamento. */
  carregando: boolean;
  /** Mensagem de erro pronta para exibir, ou texto vazio quando deu certo. */
  erro: string;
  /** Dispara a busca de novo, por exemplo depois de gravar um registro. */
  recarregar: () => void;
};

/**
 * Executa `buscar` e acompanha o resultado.
 *
 * @param buscar funcao que chama a API e devolve os dados
 * @param chave identifica a busca; quando muda, a busca e refeita.
 *        E um texto (por exemplo 'pessoas:CLIENTE:erica') em vez de uma lista
 *        de dependencias para deixar explicito o que provoca uma nova busca.
 */
export function useRecurso<T>(buscar: () => Promise<T>, chave: string): Recurso<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  // Contador que, ao mudar, forca o efeito a rodar novamente.
  const [tentativa, setTentativa] = useState(0);

  // `buscar` e recriada a cada render da tela. Guardamos a versao mais recente
  // numa referencia para que o efeito nao dependa dela e nao entre em laco.
  const buscarAtual = useRef(buscar);
  buscarAtual.current = buscar;

  useEffect(() => {
    // Se a chave mudar antes da resposta chegar, descartamos o resultado
    // antigo para nao sobrescrever os dados novos.
    let cancelado = false;

    setCarregando(true);
    setErro('');

    buscarAtual
      .current()
      .then(resultado => {
        if (!cancelado) setDados(resultado);
      })
      .catch((problema: unknown) => {
        if (!cancelado) setErro(mensagemDoErro(problema));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [chave, tentativa]);

  return {
    dados,
    carregando,
    erro,
    recarregar: () => setTentativa(numero => numero + 1),
  };
}
