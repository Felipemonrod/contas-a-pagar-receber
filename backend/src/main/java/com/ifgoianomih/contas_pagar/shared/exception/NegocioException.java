package com.ifgoianomih.contas_pagar.shared.exception;

/** Violacao de uma regra de negocio. Traduzida para HTTP 422. */
public class NegocioException extends RuntimeException {
    public NegocioException(String mensagem) {
        super(mensagem);
    }
}
