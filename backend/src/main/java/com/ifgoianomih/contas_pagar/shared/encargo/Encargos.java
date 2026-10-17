package com.ifgoianomih.contas_pagar.shared.encargo;

import java.math.BigDecimal;

/**
 * Resultado do calculo: quanto abater e quanto acrescentar.
 *
 * E um objeto imutavel - uma vez criado nao muda, o que evita que uma parte
 * do codigo altere o valor calculado por outra.
 */
public record Encargos(BigDecimal desconto, BigDecimal acrescimo) {

    public static final Encargos NENHUM = new Encargos(BigDecimal.ZERO, BigDecimal.ZERO);

    public static Encargos desconto(BigDecimal valor) {
        return new Encargos(valor, BigDecimal.ZERO);
    }

    public static Encargos acrescimo(BigDecimal valor) {
        return new Encargos(BigDecimal.ZERO, valor);
    }

    public Encargos somar(Encargos outro) {
        return new Encargos(
                this.desconto.add(outro.desconto),
                this.acrescimo.add(outro.acrescimo));
    }

    /** Valor final a pagar/receber: valor do titulo - desconto + acrescimo. */
    public BigDecimal aplicarSobre(BigDecimal valorBase) {
        return valorBase.subtract(desconto).add(acrescimo);
    }
}
