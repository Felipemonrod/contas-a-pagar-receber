package com.ifgoianomih.contas_pagar.shared.encargo;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * RN05 — o desconto so vale enquanto estiver dentro da validade.
 * Livro, cap. 3, p. 60.
 */
@DisplayName("Desconto por pontualidade (RN05)")
class DescontoPorPontualidadeTest {

    private final DescontoPorPontualidade politica = new DescontoPorPontualidade();

    private static final LocalDate VALIDADE = LocalDate.of(2026, 10, 5);

    @Nested
    @DisplayName("quando o titulo tem desconto com validade")
    class ComDesconto {

        private final TituloFalso titulo =
                TituloFalso.de("1000.00").comDesconto("50.00", VALIDADE);

        @Test
        @DisplayName("concede o desconto quando a quitacao ocorre antes da validade")
        void antesDaValidade() {
            Encargos encargos = politica.calcular(titulo, VALIDADE.minusDays(2));

            assertThat(encargos.desconto()).isEqualByComparingTo("50.00");
            assertThat(encargos.acrescimo()).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("concede o desconto no ultimo dia de validade")
        void noUltimoDia() {
            Encargos encargos = politica.calcular(titulo, VALIDADE);

            assertThat(encargos.desconto()).isEqualByComparingTo("50.00");
        }

        @Test
        @DisplayName("nao concede desconto no dia seguinte ao fim da validade")
        void umDiaDepois() {
            Encargos encargos = politica.calcular(titulo, VALIDADE.plusDays(1));

            assertThat(encargos.desconto()).isEqualByComparingTo("0");
        }
    }

    @Nested
    @DisplayName("quando nao ha desconto a conceder")
    class SemDesconto {

        @Test
        @DisplayName("titulo sem desconto cadastrado nao gera abatimento")
        void semValorDeDesconto() {
            TituloFalso titulo = TituloFalso.de("1000.00");

            assertThat(politica.calcular(titulo, VALIDADE).desconto())
                    .isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("desconto sem data de validade nao e concedido")
        void semValidade() {
            TituloFalso titulo = TituloFalso.de("1000.00").comDesconto("50.00", null);

            assertThat(politica.calcular(titulo, LocalDate.of(2026, 1, 1)).desconto())
                    .isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("desconto ja totalmente consumido nao e concedido de novo (RN10)")
        void descontoJaConsumido() {
            TituloFalso titulo = TituloFalso.de("1000.00").comDesconto("0", VALIDADE);

            assertThat(politica.calcular(titulo, VALIDADE).desconto())
                    .isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("desconto negativo e tratado como ausencia de desconto")
        void descontoNegativo() {
            TituloFalso titulo = TituloFalso.de("1000.00").comDesconto("-10.00", VALIDADE);

            assertThat(politica.calcular(titulo, VALIDADE).desconto())
                    .isEqualByComparingTo("0");
        }
    }

    @Test
    @DisplayName("a politica nunca produz acrescimo — isso e responsabilidade de outra")
    void nuncaProduzAcrescimo() {
        TituloFalso titulo = TituloFalso.de("1000.00").comDesconto("50.00", VALIDADE);

        for (LocalDate data : new LocalDate[] {
                VALIDADE.minusDays(30), VALIDADE, VALIDADE.plusDays(90) }) {
            assertThat(politica.calcular(titulo, data).acrescimo())
                    .as("acrescimo em %s", data)
                    .isEqualByComparingTo(BigDecimal.ZERO);
        }
    }
}
