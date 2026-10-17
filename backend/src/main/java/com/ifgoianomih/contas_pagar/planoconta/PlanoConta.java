package com.ifgoianomih.contas_pagar.planoconta;

import java.util.ArrayList;
import java.util.List;

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
 * Categoria financeira, hierarquica, como no livro (cap. 3, p. 48-49).
 * AUTO-RELACIONAMENTO 1:N: uma conta superior agrupa varias subcontas.
 *
 * RN01 - conta consolidada agrupa outras e nao recebe lancamento.
 */
@Entity
@Table(name = "plano_conta")
@Getter
@Setter
public class PlanoConta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Codigo contabil: 1, 11, 11.01 ... */
    @Column(nullable = false, unique = true, length = 18)
    private String codigo;

    @Column(nullable = false, length = 60)
    private String descricao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "superior_id")
    private PlanoConta superior;

    @OneToMany(mappedBy = "superior")
    private List<PlanoConta> subcontas = new ArrayList<>();

    @Column(nullable = false)
    private Boolean consolidada = false;

    /** RN01: so contas analiticas (nao consolidadas) recebem lancamento. */
    public boolean aceitaLancamento() {
        return Boolean.FALSE.equals(consolidada);
    }
}
