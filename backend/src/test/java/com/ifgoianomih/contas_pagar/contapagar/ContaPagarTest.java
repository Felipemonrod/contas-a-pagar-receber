package com.ifgoianomih.contas_pagar.contapagar;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regras que vivem dentro da propria entidade: saldo, desconto disponivel e
 * a condicao de quitado.
 *
 * O teste de desconto parcelado existe por causa de um defeito real: a
 * primeira versao concedia o desconto integral a cada pagamento, e o titulo
 * terminava marcado como PAGA com saldo diferente de zero.
 */
@DisplayName("ContaPagar — regras da entidade")
class ContaPagarTest {

    private ContaPagar titulo(String valor, String desconto) {
        ContaPagar conta = new ContaPagar();
        conta.setValor(new BigDecimal(valor));
        conta.setDesconto(new BigDecimal(desconto));
        conta.setVencimento(LocalDate.of(2026, 10, 10));
        conta.setAcrescimoDia(BigDecimal.ZERO);
        return conta;
    }

    private void registrarPagamento(ContaPagar conta, String valorPago, String descontoAplicado) {
        Pagamento p = new Pagamento();
        p.setContaPagar(conta);
        p.setValorPago(new BigDecimal(valorPago));
        p.setDescontoAplicado(new BigDecimal(descontoAplicado));
        p.setAcrescimoAplicado(BigDecimal.ZERO);
        p.setDataPagamento(LocalDate.of(2026, 10, 3));
        conta.getPagamentos().add(p);
    }

    @Test
    @DisplayName("titulo recem-criado deve tudo e nao esta quitado")
    void recemCriado() {
        ContaPagar conta = titulo("1000.00", "0");

        assertThat(conta.totalPago()).isEqualByComparingTo("0");
        assertThat(conta.saldoDevedor()).isEqualByComparingTo("1000.00");
        assertThat(conta.quitado()).isFalse();
    }

    @Test
    @DisplayName("pagamento parcial reduz o saldo na medida do que foi pago")
    void pagamentoParcial() {
        ContaPagar conta = titulo("1000.00", "0");
        registrarPagamento(conta, "400.00", "0");

        assertThat(conta.totalPago()).isEqualByComparingTo("400.00");
        assertThat(conta.saldoDevedor()).isEqualByComparingTo("600.00");
        assertThat(conta.quitado()).isFalse();
    }

    @Test
    @DisplayName("desconto concedido abate o saldo junto com o valor pago")
    void descontoAbateSaldo() {
        // O credor abriu mao de 50: pagar 950 quita um titulo de 1000.
        ContaPagar conta = titulo("1000.00", "50.00");
        registrarPagamento(conta, "950.00", "50.00");

        assertThat(conta.saldoDevedor()).isEqualByComparingTo("0");
        assertThat(conta.quitado()).isTrue();
    }

    @Test
    @DisplayName("RN10 — em quitacao parcelada, o desconto nao e concedido duas vezes")
    void descontoNaoSeRepete() {
        ContaPagar conta = titulo("1000.00", "50.00");

        assertThat(conta.getDescontoDisponivel())
                .as("antes de qualquer pagamento, o desconto inteiro esta disponivel")
                .isEqualByComparingTo("50.00");

        registrarPagamento(conta, "400.00", "50.00");

        assertThat(conta.getDescontoDisponivel())
                .as("apos consumir o desconto, nao resta nada a conceder")
                .isEqualByComparingTo("0");
        assertThat(conta.saldoDevedor()).isEqualByComparingTo("550.00");

        registrarPagamento(conta, "550.00", "0");

        assertThat(conta.saldoDevedor()).isEqualByComparingTo("0");
        assertThat(conta.quitado()).isTrue();
        assertThat(conta.totalPago())
                .as("1000 menos os 50 de desconto")
                .isEqualByComparingTo("950.00");
    }

    @Test
    @DisplayName("desconto disponivel nunca fica negativo")
    void descontoDisponivelNaoFicaNegativo() {
        ContaPagar conta = titulo("1000.00", "50.00");
        registrarPagamento(conta, "100.00", "80.00");

        assertThat(conta.getDescontoDisponivel()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("juros cobrados aumentam o saldo devedor")
    void jurosAumentamSaldo() {
        ContaPagar conta = titulo("1000.00", "0");

        Pagamento p = new Pagamento();
        p.setContaPagar(conta);
        p.setValorPago(new BigDecimal("500.00"));
        p.setDescontoAplicado(BigDecimal.ZERO);
        p.setAcrescimoAplicado(new BigDecimal("30.00"));
        p.setDataPagamento(LocalDate.of(2026, 10, 25));
        conta.getPagamentos().add(p);

        // 1000 - 500 pagos + 30 de juros cobrados
        assertThat(conta.saldoDevedor()).isEqualByComparingTo("530.00");
        assertThat(conta.quitado()).isFalse();
    }

    @Test
    @DisplayName("pagamento alem do devido deixa o titulo quitado, nao negativo em aberto")
    void pagamentoAlemDoDevido() {
        ContaPagar conta = titulo("1000.00", "0");
        registrarPagamento(conta, "1100.00", "0");

        assertThat(conta.saldoDevedor()).isNegative();
        assertThat(conta.quitado())
                .as("saldo menor ou igual a zero significa quitado")
                .isTrue();
    }
}
