package com.ifgoianomih.contas_pagar.lancamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.ifgoianomih.contas_pagar.planoconta.PlanoConta;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Lancamento contabil por partida dobrada. Equivale a Lancamento.db do
 * livro (cap. 5, p. 75; tela no cap. 3, p. 50).
 *
 * RN14: todo lancamento tem uma conta de credito e uma de debito, valor,
 * data e status, refletindo ativo e passivo.
 *
 * Conceito contabil: toda movimentacao sai de algum lugar e entra em
 * outro. Pagar um fornecedor debita "Fornecedores" (a divida diminui) e
 * credita "Caixa" (o dinheiro sai). Por isso as duas contas, e por isso
 * precisam ser diferentes.
 */
@Entity
@Table(name = "lancamento")
@Getter
@Setter
public class Lancamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Conta que recebe o valor. */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "conta_credito_id", nullable = false)
    private PlanoConta contaCredito;

    /** Conta de onde o valor sai. */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "conta_debito_id", nullable = false)
    private PlanoConta contaDebito;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false, length = 80)
    private String descricao;

    @Column(nullable = false)
    private LocalDate data;

    /** ATIVO ou ESTORNADO. Lancamento nao se apaga, se estorna. */
    @Column(nullable = false, length = 20)
    private String status = "ATIVO";

    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    public boolean estornado() {
        return "ESTORNADO".equals(status);
    }
}
