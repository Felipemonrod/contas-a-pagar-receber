package com.ifgoianomih.contas_pagar.shared.encargo;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Titulo de mentira para os testes das politicas de encargo.
 *
 * Usar esta classe em vez de ContaPagar mantem o teste focado: o calculo de
 * desconto e juros nao depende de JPA, de banco nem do resto da entidade.
 */
class TituloFalso implements TituloQuitavel {

    private BigDecimal valor = new BigDecimal("1000.00");
    private LocalDate vencimento = LocalDate.of(2026, 10, 10);
    private BigDecimal descontoDisponivel = BigDecimal.ZERO;
    private LocalDate validadeDesconto;
    private BigDecimal acrescimoDia = BigDecimal.ZERO;

    static TituloFalso de(String valor) {
        TituloFalso t = new TituloFalso();
        t.valor = new BigDecimal(valor);
        return t;
    }

    TituloFalso vencendoEm(LocalDate data) {
        this.vencimento = data;
        return this;
    }

    TituloFalso comDesconto(String valor, LocalDate ate) {
        this.descontoDisponivel = new BigDecimal(valor);
        this.validadeDesconto = ate;
        return this;
    }

    TituloFalso comJurosDiarios(String valor) {
        this.acrescimoDia = new BigDecimal(valor);
        return this;
    }

    @Override
    public BigDecimal getValor() {
        return valor;
    }

    @Override
    public LocalDate getVencimento() {
        return vencimento;
    }

    @Override
    public BigDecimal getDescontoDisponivel() {
        return descontoDisponivel;
    }

    @Override
    public LocalDate getValidadeDesconto() {
        return validadeDesconto;
    }

    @Override
    public BigDecimal getAcrescimoDia() {
        return acrescimoDia;
    }
}
