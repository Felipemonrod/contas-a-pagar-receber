package com.ifgoianomih.contas_pagar.lancamento;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class LancamentoDtos {

    private LancamentoDtos() {}

    public record LancamentoRequest(
            @NotNull(message = "A conta de credito e obrigatoria")
            Long contaCreditoId,

            @NotNull(message = "A conta de debito e obrigatoria")
            Long contaDebitoId,

            @NotNull(message = "O valor e obrigatorio")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            BigDecimal valor,

            @NotBlank(message = "A descricao e obrigatoria")
            @Size(max = 80)
            String descricao,

            @NotNull(message = "A data e obrigatoria")
            LocalDate data) {
    }

    public record LancamentoResponse(
            Long id,
            Long contaCreditoId,
            String contaCredito,
            Long contaDebitoId,
            String contaDebito,
            BigDecimal valor,
            String descricao,
            LocalDate data,
            String status) {
    }
}
