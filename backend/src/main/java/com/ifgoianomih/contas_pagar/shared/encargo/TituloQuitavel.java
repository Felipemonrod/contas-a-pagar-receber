package com.ifgoianomih.contas_pagar.shared.encargo;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Contrato comum entre ContaPagar e ContaReceber.
 *
 * As duas tem exatamente a mesma estrutura no livro (cap. 5, p. 75), entao
 * as regras de desconto e juros valem para as duas. Esta interface evita
 * duplicar o calculo em dois lugares.
 */
public interface TituloQuitavel {

    BigDecimal getValor();

    LocalDate getVencimento();

    /**
     * Desconto que ainda pode ser concedido: o valor cadastrado menos o que
     * ja foi usado em pagamentos anteriores. Sem isso, um titulo quitado em
     * duas parcelas receberia o desconto duas vezes.
     */
    BigDecimal getDescontoDisponivel();

    /** Ultima data em que o desconto ainda vale (RN05). */
    LocalDate getValidadeDesconto();

    /** Valor cobrado por dia de atraso. */
    BigDecimal getAcrescimoDia();
}
