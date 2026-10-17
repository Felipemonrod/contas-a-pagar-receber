package com.ifgoianomih.contas_pagar.shared.encargo;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * O contexto do padrao Strategy: soma o resultado de todas as politicas
 * registradas. Em producao quem monta a lista e o Spring; aqui a lista e
 * montada a mao, que e justamente o que torna o comportamento testavel.
 */
@DisplayName("Calculadora de encargos (contexto do Strategy)")
class CalculadoraEncargosTest {

    private static final LocalDate VENCIMENTO = LocalDate.of(2026, 10, 10);
    private static final LocalDate VALIDADE_DESCONTO = LocalDate.of(2026, 10, 5);

    private final CalculadoraEncargos calculadora = new CalculadoraEncargos(
            List.of(new DescontoPorPontualidade(), new JurosPorAtraso()));

    private final TituloFalso titulo = TituloFalso.de("1000.00")
            .vencendoEm(VENCIMENTO)
            .comDesconto("50.00", VALIDADE_DESCONTO)
            .comJurosDiarios("2.00");

    @Test
    @DisplayName("dentro da validade: aplica desconto e nenhum juro")
    void dentroDaValidade() {
        Encargos encargos = calculadora.calcular(titulo, LocalDate.of(2026, 10, 3));

        assertThat(encargos.desconto()).isEqualByComparingTo("50.00");
        assertThat(encargos.acrescimo()).isEqualByComparingTo("0");
        assertThat(encargos.aplicarSobre(new BigDecimal("1000.00"))).isEqualByComparingTo("950.00");
    }

    @Test
    @DisplayName("entre a validade e o vencimento: nao aplica nada")
    void entreValidadeEVencimento() {
        Encargos encargos = calculadora.calcular(titulo, LocalDate.of(2026, 10, 8));

        assertThat(encargos.desconto()).isEqualByComparingTo("0");
        assertThat(encargos.acrescimo()).isEqualByComparingTo("0");
        assertThat(encargos.aplicarSobre(new BigDecimal("1000.00"))).isEqualByComparingTo("1000.00");
    }

    @Test
    @DisplayName("apos o vencimento: aplica juros e nenhum desconto")
    void aposOVencimento() {
        Encargos encargos = calculadora.calcular(titulo, LocalDate.of(2026, 10, 25));

        assertThat(encargos.desconto()).isEqualByComparingTo("0");
        assertThat(encargos.acrescimo()).isEqualByComparingTo("30.00");
        assertThat(encargos.aplicarSobre(new BigDecimal("1000.00"))).isEqualByComparingTo("1030.00");
    }

    @Test
    @DisplayName("sem politica registrada, nao ha encargo algum")
    void semPoliticas() {
        CalculadoraEncargos vazia = new CalculadoraEncargos(List.of());

        Encargos encargos = vazia.calcular(titulo, LocalDate.of(2026, 10, 3));

        assertThat(encargos.desconto()).isEqualByComparingTo("0");
        assertThat(encargos.acrescimo()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("uma politica nova entra na soma sem alterar as existentes")
    void politicaNovaSomaSemQuebrarAsOutras() {
        // Este teste existe para provar o beneficio do Strategy: uma regra nova
        // e uma classe nova, e nada do que ja existe precisa mudar.
        PoliticaEncargo taxaFixa = (t, data) -> Encargos.acrescimo(new BigDecimal("7.00"));

        CalculadoraEncargos comTaxa = new CalculadoraEncargos(
                List.of(new DescontoPorPontualidade(), new JurosPorAtraso(), taxaFixa));

        Encargos encargos = comTaxa.calcular(titulo, LocalDate.of(2026, 10, 3));

        assertThat(encargos.desconto()).isEqualByComparingTo("50.00");
        assertThat(encargos.acrescimo()).isEqualByComparingTo("7.00");
        assertThat(encargos.aplicarSobre(new BigDecimal("1000.00"))).isEqualByComparingTo("957.00");
    }
}
