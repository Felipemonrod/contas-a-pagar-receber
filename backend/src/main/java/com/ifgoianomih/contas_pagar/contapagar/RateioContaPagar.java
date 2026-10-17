package com.ifgoianomih.contas_pagar.contapagar;

import java.math.BigDecimal;

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
 * RELACIONAMENTO N:N entre conta a pagar e plano de contas.
 *
 * Um titulo pode ser rateado entre varias categorias (uma fatura de energia
 * dividida entre Administrativo e Producao) e uma categoria recebe rateio de
 * varios titulos. Como o relacionamento tem um atributo proprio - o valor
 * rateado - ele vira uma entidade, e nao um simples @ManyToMany.
 *
 * A dupla (conta, categoria) nao se repete: a restricao de unicidade esta
 * no banco (uk_rateio_cp).
 */
@Entity
@Table(name = "rateio_conta_pagar")
@Getter
@Setter
public class RateioContaPagar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conta_pagar_id", nullable = false)
    private ContaPagar contaPagar;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "plano_conta_id", nullable = false)
    private PlanoConta planoConta;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;
}
