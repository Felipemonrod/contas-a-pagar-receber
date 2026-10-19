package com.ifgoianomih.contas_pagar.cheque;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ChequeDtos {

    private ChequeDtos() {}

    public record ChequeRequest(
            @NotBlank(message = "O numero do cheque e obrigatorio")
            @Size(max = 10) String numeroCheque,

            @NotNull(message = "O emitente e obrigatorio")
            Long pessoaId,

            @NotNull(message = "A conta corrente e obrigatoria")
            Long contaCorrenteId,

            @NotNull(message = "A data de emissao e obrigatoria")
            LocalDate emissao,

            @NotNull(message = "A data de deposito e obrigatoria")
            LocalDate deposito,

            @NotNull(message = "O valor e obrigatorio")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            BigDecimal valor,

            /** Titulo que o cheque garante. Opcional. */
            Long contaReceberId,

            @Size(max = 80) String descricao) {
    }

    public record MudancaSituacaoRequest(
            @NotBlank(message = "A situacao e obrigatoria")
            String situacao,
            @Size(max = 80) String observacao) {
    }

    public record ChequeResponse(
            Long id,
            String numeroCheque,
            Long pessoaId,
            String emitente,
            Long contaCorrenteId,
            String contaCorrente,
            LocalDate emissao,
            LocalDate deposito,
            BigDecimal valor,
            String situacao,
            Boolean vencido,
            Long contaReceberId,
            String numeroTitulo,
            String descricao) {
    }
}
