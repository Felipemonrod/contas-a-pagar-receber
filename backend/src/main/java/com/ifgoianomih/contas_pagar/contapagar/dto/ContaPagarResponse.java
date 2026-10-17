package com.ifgoianomih.contas_pagar.contapagar.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** DTO de saida: o que a API devolve, independente do formato da tabela. */
public record ContaPagarResponse(
        Long id,
        String numeroTitulo,
        Long pessoaId,
        String pessoaNome,
        String tipoTitulo,
        String situacao,
        BigDecimal valor,
        BigDecimal totalPago,
        BigDecimal saldoDevedor,
        LocalDate emissao,
        LocalDate vencimento,
        BigDecimal desconto,
        LocalDate validadeDesconto,
        BigDecimal acrescimoDia,
        String observacao,
        List<RateioResponse> rateios,
        List<PagamentoResponse> pagamentos) {

    public record RateioResponse(Long planoContaId, String categoria, BigDecimal valor) {}

    public record PagamentoResponse(
            Long id,
            LocalDate dataPagamento,
            String formaPagamento,
            BigDecimal valorPago,
            BigDecimal descontoAplicado,
            BigDecimal acrescimoAplicado) {}
}
