package com.ifgoianomih.contas_pagar.shared.encargo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Component;

/**
 * STRATEGY: acrescimo proporcional aos dias de atraso.
 *
 * O livro tem o campo "Acrescimo" como valor unico. Aqui ele e por dia,
 * o que torna a regra explicita em vez de calculada na mao pelo usuario.
 */
@Component
public class JurosPorAtraso implements PoliticaEncargo {

    @Override
    public Encargos calcular(TituloQuitavel titulo, LocalDate dataQuitacao) {
        BigDecimal porDia = titulo.getAcrescimoDia();

        boolean semJuros = porDia == null || porDia.compareTo(BigDecimal.ZERO) <= 0;
        boolean dentroDoPrazo = !dataQuitacao.isAfter(titulo.getVencimento());

        if (semJuros || dentroDoPrazo) {
            return Encargos.NENHUM;
        }

        long diasAtraso = ChronoUnit.DAYS.between(titulo.getVencimento(), dataQuitacao);
        return Encargos.acrescimo(porDia.multiply(BigDecimal.valueOf(diasAtraso)));
    }
}
