package com.ifgoianomih.contas_pagar.contareceber.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** DTO de saida: o que a API devolve, independente do formato da tabela. */
public record ContaReceberResponse(
        Long id,
        String numeroTitulo,
        Long pessoaId,
        String pessoaNome,
        String tipoTitulo,
        String situacao,
        BigDecimal valor,
        BigDecimal totalRecebido,
        BigDecimal saldoDevedor,
        LocalDate emissao,
        LocalDate vencimento,
        BigDecimal desconto,
        LocalDate validadeDesconto,
        BigDecimal acrescimoDia,
        String observacao,
        List<RateioResponse> rateios,
        List<RecebimentoResponse> recebimentos) {

    public record RateioResponse(Long planoContaId, String categoria, BigDecimal valor) {}

    public record RecebimentoResponse(
            Long id,
            LocalDate dataRecebimento,
            String formaPagamento,
            BigDecimal valorRecebido,
            BigDecimal descontoAplicado,
            BigDecimal acrescimoAplicado) {}
}
