package com.ifgoianomih.contas_pagar.contareceber;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.ifgoianomih.contas_pagar.dominio.FormaPagamento;

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
 * RELACIONAMENTO 1:N com ContaReceber - um titulo pode ser quitado em
 * varios recebimentos. No livro isso era um unico campo "Pagto" na propria
 * conta, o que impedia registrar recebimento parcial.
 *
 * RN07: quitacao e registro, nao exclusao.
 */
@Entity
@Table(name = "recebimento")
@Getter
@Setter
public class Recebimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conta_receber_id", nullable = false)
    private ContaReceber contaReceber;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "forma_pagamento_id", nullable = false)
    private FormaPagamento formaPagamento;

    @Column(name = "data_recebimento", nullable = false)
    private LocalDate dataRecebimento;

    @Column(name = "valor_recebido", nullable = false, precision = 14, scale = 2)
    private BigDecimal valorRecebido;

    @Column(name = "desconto_aplicado", nullable = false, precision = 14, scale = 2)
    private BigDecimal descontoAplicado = BigDecimal.ZERO;

    @Column(name = "acrescimo_aplicado", nullable = false, precision = 14, scale = 2)
    private BigDecimal acrescimoAplicado = BigDecimal.ZERO;

    @Column(length = 255)
    private String observacao;
}
