package com.ifgoianomih.contas_pagar.shared.encargo;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Acrescimo proporcional aos dias de atraso.
 */
@DisplayName("Juros por atraso")
class JurosPorAtrasoTest {

    private final JurosPorAtraso politica = new JurosPorAtraso();

    private static final LocalDate VENCIMENTO = LocalDate.of(2026, 10, 10);

    private TituloFalso tituloComJuros(String porDia) {
        return TituloFalso.de("1000.00").vencendoEm(VENCIMENTO).comJurosDiarios(porDia);
    }

    @ParameterizedTest(name = "{0} dia(s) de atraso x R$ 2,00 = R$ {1}")
    @CsvSource({
            "1,   2.00",
            "5,  10.00",
            "15, 30.00",
            "30, 60.00"
    })
    @DisplayName("cobra os juros proporcionais aos dias de atraso")
    void jurosProporcionais(int diasAtraso, String esperado) {
        Encargos encargos = politica.calcular(tituloComJuros("2.00"),
                VENCIMENTO.plusDays(diasAtraso));

        assertThat(encargos.acrescimo()).isEqualByComparingTo(esperado);
        assertThat(encargos.desconto()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("nao cobra juros antes do vencimento")
    void antesDoVencimento() {
        assertThat(politica.calcular(tituloComJuros("2.00"), VENCIMENTO.minusDays(1)).acrescimo())
                .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("nao cobra juros no proprio dia do vencimento")
    void noDiaDoVencimento() {
        assertThat(politica.calcular(tituloComJuros("2.00"), VENCIMENTO).acrescimo())
                .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("titulo sem juros cadastrados nao acumula nada, mesmo muito atrasado")
    void semJurosCadastrados() {
        TituloFalso titulo = TituloFalso.de("1000.00").vencendoEm(VENCIMENTO);

        assertThat(politica.calcular(titulo, VENCIMENTO.plusDays(365)).acrescimo())
                .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("juros zero nao acumula")
    void jurosZero() {
        assertThat(politica.calcular(tituloComJuros("0"), VENCIMENTO.plusDays(10)).acrescimo())
                .isEqualByComparingTo("0");
    }
}
