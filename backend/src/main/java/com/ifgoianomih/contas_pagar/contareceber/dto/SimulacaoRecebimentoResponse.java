package com.ifgoianomih.contas_pagar.contareceber.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Previa do que sera cobrado numa data, sem gravar nada.
 * Util na tela de quitacao: o usuario ve o desconto ou os juros antes
 * de confirmar.
 */
public record SimulacaoRecebimentoResponse(
        LocalDate dataSimulada,
        BigDecimal valorOriginal,
        BigDecimal descontoAplicado,
        BigDecimal acrescimoAplicado,
        BigDecimal valorDevido) {
}
