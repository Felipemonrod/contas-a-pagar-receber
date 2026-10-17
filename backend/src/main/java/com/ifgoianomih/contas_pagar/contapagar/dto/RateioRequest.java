package com.ifgoianomih.contas_pagar.contapagar.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Uma linha do rateio: quanto do titulo cai em qual categoria. */
public record RateioRequest(

        @NotNull(message = "A categoria e obrigatoria")
        Long planoContaId,

        @NotNull(message = "O valor do rateio e obrigatorio")
        @DecimalMin(value = "0.01", message = "O valor do rateio deve ser maior que zero")
        BigDecimal valor) {
}
