package com.ifgoianomih.contas_pagar.contapagar;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import com.ifgoianomih.contas_pagar.dominio.SituacaoConta;
import com.ifgoianomih.contas_pagar.dominio.TipoTitulo;
import com.ifgoianomih.contas_pagar.pessoa.Pessoa;
import com.ifgoianomih.contas_pagar.shared.encargo.TituloQuitavel;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Titulo a pagar. Equivale a Pagamento.db do livro (cap. 5, p. 75).
 *
 * Diferencas em relacao ao original, todas documentadas:
 *  - situacao virou dado explicito (o livro a derivava dos campos de data);
 *  - o vinculo com a pessoa e por FK e nao pelo CGC;
 *  - a quitacao saiu para tabela propria, permitindo pagamento parcial.
 */
@Entity
@Table(name = "conta_pagar")
@Getter
@Setter
public class ContaPagar implements TituloQuitavel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_titulo", nullable = false, unique = true, length = 20)
    private String numeroTitulo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "pessoa_id", nullable = false)
    private Pessoa pessoa;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tipo_titulo_id", nullable = false)
    private TipoTitulo tipoTitulo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "situacao_id", nullable = false)
    private SituacaoConta situacao;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false)
    private LocalDate emissao;

    @Column(nullable = false)
    private LocalDate vencimento;

    /** RN05: desconto concedido se a quitacao ocorrer ate validadeDesconto. */
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal desconto = BigDecimal.ZERO;

    @Column(name = "validade_desconto")
    private LocalDate validadeDesconto;

    /** Acrescimo por dia de atraso. */
    @Column(name = "acrescimo_dia", nullable = false, precision = 14, scale = 2)
    private BigDecimal acrescimoDia = BigDecimal.ZERO;

    @Column(length = 255)
    private String observacao;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @OneToMany(mappedBy = "contaPagar", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RateioContaPagar> rateios = new ArrayList<>();

    @OneToMany(mappedBy = "contaPagar", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Pagamento> pagamentos = new ArrayList<>();

    /** Soma efetivamente quitada ate agora. */
    public BigDecimal totalPago() {
        return somar(Pagamento::getValorPago);
    }

    public BigDecimal totalDescontoConcedido() {
        return somar(Pagamento::getDescontoAplicado);
    }

    public BigDecimal totalAcrescimoCobrado() {
        return somar(Pagamento::getAcrescimoAplicado);
    }

    /**
     * Quanto ainda falta quitar.
     *
     * Desconto concedido abate o saldo (o credor abriu mao daquele valor) e
     * juros cobrados aumentam. Sem isso, um titulo com desconto nunca zeraria.
     */
    public BigDecimal saldoDevedor() {
        return valor
                .subtract(totalPago())
                .subtract(totalDescontoConcedido())
                .add(totalAcrescimoCobrado());
    }

    /** Desconto ainda nao utilizado - evita conceder duas vezes. */
    @Override
    public BigDecimal getDescontoDisponivel() {
        BigDecimal restante = desconto.subtract(totalDescontoConcedido());
        return restante.compareTo(BigDecimal.ZERO) > 0 ? restante : BigDecimal.ZERO;
    }

    public boolean quitado() {
        return saldoDevedor().compareTo(BigDecimal.ZERO) <= 0;
    }

    private BigDecimal somar(Function<Pagamento, BigDecimal> campo) {
        return pagamentos.stream().map(campo).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

}
