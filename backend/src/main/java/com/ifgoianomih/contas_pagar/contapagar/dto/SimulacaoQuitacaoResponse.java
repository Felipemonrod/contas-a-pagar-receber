package com.ifgoianomih.contas_pagar.contapagar.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Previa do que sera cobrado numa data, sem gravar nada.
 * Util na tela de quitacao: o usuario ve o desconto ou os juros antes
 * de confirmar.
 */
public record SimulacaoQuitacaoResponse(
        LocalDate dataSimulada,
        BigDecimal valorOriginal,
        BigDecimal descontoAplicado,
        BigDecimal acrescimoAplicado,
        BigDecimal valorDevido) {
}
