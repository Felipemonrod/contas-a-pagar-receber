package com.ifgoianomih.contas_pagar.contapagar.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Dados para registrar um pagamento (RN07: quitacao e registro, nao exclusao).
 *
 * O valor pago e opcional: quando nao informado, o sistema calcula o valor
 * devido com desconto e juros aplicados na data.
 */
public record QuitacaoRequest(

        @NotNull(message = "A data do pagamento e obrigatoria")
        LocalDate dataPagamento,

        @NotBlank(message = "A forma de pagamento e obrigatoria")
        String formaPagamento,

        @DecimalMin(value = "0.01", message = "O valor pago deve ser maior que zero")
        BigDecimal valorPago,

        String observacao) {
}
