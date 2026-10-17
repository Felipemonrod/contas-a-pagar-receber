package com.ifgoianomih.contas_pagar.despesa;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.ifgoianomih.contas_pagar.contapagar.ContaPagar;
import com.ifgoianomih.contas_pagar.planoconta.PlanoConta;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Previsao de gasto fixo - agua, luz, telefone, condominio.
 * Livro, cap. 3, p. 51: "em despesas, serao cadastrados gastos previstos".
 *
 * RN03: despesa nao e titulo. Ela vira um titulo a pagar quando a fatura
 * chega, com o valor exato e a data de vencimento reais. Enquanto
 * contaPagar for nula, a despesa ainda e apenas previsao.
 */
@Entity
@Table(name = "despesa")
@Getter
@Setter
public class Despesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "plano_conta_id", nullable = false)
    private PlanoConta planoConta;

    @Column(nullable = false, length = 80)
    private String descricao;

    @Column(name = "valor_previsto", nullable = false, precision = 14, scale = 2)
    private BigDecimal valorPrevisto;

    @Column(name = "data_lancamento", nullable = false)
    private LocalDate dataLancamento = LocalDate.now();

    @Column(name = "previsao_pagamento", nullable = false)
    private LocalDate previsaoPagamento;

    /** RELACIONAMENTO 1:1 opcional com o titulo gerado a partir desta previsao. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_pagar_id", unique = true)
    private ContaPagar contaPagar;

    /** Uma despesa ja realizada nao pode gerar outro titulo. */
    public boolean realizada() {
        return contaPagar != null;
    }
}
