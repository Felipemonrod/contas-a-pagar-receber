package com.ifgoianomih.contas_pagar.shared.encargo;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.stereotype.Component;

/**
 * STRATEGY: desconto concedido quando a quitacao ocorre dentro da validade.
 *
 * RN05 (livro, cap. 3, p. 60): o titulo carrega "valor do desconto" e
 * "validade do desconto". Passada essa data, o desconto deixa de valer.
 */
@Component
public class DescontoPorPontualidade implements PoliticaEncargo {

    @Override
    public Encargos calcular(TituloQuitavel titulo, LocalDate dataQuitacao) {
        BigDecimal desconto = titulo.getDescontoDisponivel();
        LocalDate validade = titulo.getValidadeDesconto();

        boolean semDesconto = desconto == null || desconto.compareTo(BigDecimal.ZERO) <= 0;
        boolean foraDoPrazo = validade == null || dataQuitacao.isAfter(validade);

        if (semDesconto || foraDoPrazo) {
            return Encargos.NENHUM;
        }
        return Encargos.desconto(desconto);
    }
}
