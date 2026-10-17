package com.ifgoianomih.contas_pagar.shared.exception;

/** Recurso inexistente. Traduzida para HTTP 404. */
public class RecursoNaoEncontradoException extends RuntimeException {
    public RecursoNaoEncontradoException(String recurso, Object id) {
        super("%s de id %s nao encontrado(a).".formatted(recurso, id));
    }

    public RecursoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
