package com.ifgoianomih.contas_pagar.banco;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * Conta corrente. Equivale a ContaCorrente.db do livro (cap. 5, p. 76),
 * que tinha numero, banco, agencia, limite e tipo.
 *
 * Aqui aponta para a agencia, que ja conhece o banco - evita a
 * inconsistencia de uma conta apontar para um banco diferente do da
 * sua agencia.
 */
@Entity
@Table(name = "conta_corrente",
       uniqueConstraints = @UniqueConstraint(
               name = "uk_conta_corrente_agencia_numero", columnNames = {"agencia_id", "numero"}))
@Getter
@Setter
public class ContaCorrente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "agencia_id", nullable = false)
    private Agencia agencia;

    @Column(nullable = false, length = 15)
    private String numero;

    /** CORRENTE, POUPANCA, INVESTIMENTO. */
    @Column(nullable = false, length = 20)
    private String tipo = "CORRENTE";

    /** Limite de credito acordado com o banco. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal limite = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean ativa = true;

    /** Identificacao completa, como aparece nas telas: 341 / 1234 / 56789-0 */
    public String identificacao() {
        return "%s / %s / %s".formatted(agencia.getBanco().getCodigo(), agencia.getNumero(), numero);
    }
}
