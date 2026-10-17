package com.ifgoianomih.contas_pagar.planoconta;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** DTOs do plano de contas. */
public final class PlanoContaDtos {

    private PlanoContaDtos() {}

    public record PlanoContaRequest(

            @NotBlank(message = "O codigo da conta e obrigatorio")
            @Size(max = 18, message = "O codigo deve ter no maximo 18 caracteres")
            String codigo,

            @NotBlank(message = "A descricao e obrigatoria")
            @Size(max = 60, message = "A descricao deve ter no maximo 60 caracteres")
            String descricao,

            /** Codigo da conta superior. Nulo para contas de primeiro nivel. */
            String codigoSuperior,

            /**
             * Conta consolidada agrupa outras e nao recebe lancamento (RN01).
             * Quando nulo, assume falso.
             */
            Boolean consolidada) {
    }

    /** Resposta em arvore: cada conta traz suas subcontas. */
    public record PlanoContaResponse(
            Long id,
            String codigo,
            String descricao,
            Boolean consolidada,
            String codigoSuperior,
            List<PlanoContaResponse> subcontas) {
    }

    /** Resposta plana, para preencher combos de selecao. */
    public record PlanoContaItemResponse(
            Long id,
            String codigo,
            String descricao,
            Boolean consolidada) {
    }
}
