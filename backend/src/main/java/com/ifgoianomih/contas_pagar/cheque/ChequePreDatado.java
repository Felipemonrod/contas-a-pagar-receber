package com.ifgoianomih.contas_pagar.cheque;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.ifgoianomih.contas_pagar.banco.ContaCorrente;
import com.ifgoianomih.contas_pagar.contareceber.ContaReceber;
import com.ifgoianomih.contas_pagar.pessoa.Pessoa;

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
 * Cheque pre-datado. Equivale a ChequePre.db do livro (cap. 5, p. 77;
 * tela no cap. 3, p. 61).
 *
 * RN08: recebimento com data de deposito futura, vinculado a cliente,
 * banco, agencia e conta corrente. Funciona como garantia.
 *
 * No livro, banco, agencia e conta eram tres campos soltos. Aqui aponta
 * para conta_corrente, que ja conhece os outros dois - impede o cheque
 * de apontar para uma conta que nao pertence aquela agencia.
 */
@Entity
@Table(name = "cheque_pre_datado",
       uniqueConstraints = @UniqueConstraint(
               name = "uk_cheque_conta_numero",
               columnNames = {"conta_corrente_id", "numero_cheque"}))
@Getter
@Setter
public class ChequePreDatado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_cheque", nullable = false, length = 10)
    private String numeroCheque;

    /** Emitente do cheque. No livro era o campo Cpf-Cgc. */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "pessoa_id", nullable = false)
    private Pessoa pessoa;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "conta_corrente_id", nullable = false)
    private ContaCorrente contaCorrente;

    @Column(nullable = false)
    private LocalDate emissao;

    /** Data combinada para apresentar o cheque ao banco. */
    @Column(nullable = false)
    private LocalDate deposito;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    /** EM_CARTEIRA, DEPOSITADO, COMPENSADO, DEVOLVIDO. */
    @Column(nullable = false, length = 20)
    private String situacao = "EM_CARTEIRA";

    /** Titulo que o cheque garante, quando houver. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_receber_id")
    private ContaReceber contaReceber;

    @Column(length = 80)
    private String descricao;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    /** Cheque cuja data de deposito ja passou e que segue em carteira. */
    public boolean vencido() {
        return "EM_CARTEIRA".equals(situacao) && deposito.isBefore(LocalDate.now());
    }
}
