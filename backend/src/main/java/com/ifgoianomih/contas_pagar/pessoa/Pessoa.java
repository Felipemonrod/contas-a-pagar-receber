package com.ifgoianomih.contas_pagar.pessoa;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import com.ifgoianomih.contas_pagar.dominio.Papel;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Unifica Cliente.db e Fornecedor.db do livro, cujas estruturas eram
 * quase identicas (cap. 5, p. 69 e 72).
 */
@Entity
@Table(name = "pessoa")
@Getter
@Setter
public class Pessoa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    /** CNPJ (CGC no livro) ou CPF. Identificador natural da pessoa. */
    @Column(nullable = false, unique = true, length = 18)
    private String documento;

    @Column(name = "inscricao_estadual", length = 15)
    private String inscricaoEstadual;

    @Column(length = 80)
    private String email;

    @Column(length = 50)
    private String contato;

    @Column(nullable = false)
    private Boolean ativo = true;

    // ------------------------------------------------------------------
    // Dados comerciais do fornecedor (livro, cap. 5, p. 72).
    // So fazem sentido para quem tem o papel FORNECEDOR; para clientes
    // ficam nulos.
    // ------------------------------------------------------------------

    /** Condicao negociada, como "30/60/90 dias". Texto livre, como no livro. */
    @Column(name = "condicao_pagamento", length = 20)
    private String condicaoPagamento;

    /** Desconto acordado, como "5% a vista". Texto livre, como no livro. */
    @Column(name = "desconto_negociado", length = 20)
    private String descontoNegociado;

    /** Prazo de entrega em dias. */
    @Column(name = "prazo_entrega_dias")
    private Integer prazoEntregaDias;

    /** Contato comercial dentro do fornecedor. */
    @Column(length = 50)
    private String vendedor;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    /**
     * RELACIONAMENTO N:N. Uma pessoa pode ser cliente e fornecedor ao mesmo
     * tempo, e cada papel e exercido por varias pessoas. Substitui o campo
     * "tipo = AMBOS", que seria uma gambiarra sem respaldo no modelo.
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "pessoa_papel",
            joinColumns = @JoinColumn(name = "pessoa_id"),
            inverseJoinColumns = @JoinColumn(name = "papel_id"))
    private Set<Papel> papeis = new LinkedHashSet<>();

    /**
     * RELACIONAMENTO 1:N - comercial, cobranca, entrega.
     *
     * O @OrderBy garante ordem estavel entre leituras: sem ele a ordem do
     * Set nao e previsivel e a interface mostra os registros embaralhados.
     */
    @OneToMany(mappedBy = "pessoa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private Set<Endereco> enderecos = new LinkedHashSet<>();

    /**
     * RELACIONAMENTO 1:N. 1FN: o livro tinha Telefone, Ramal e Fax como
     * colunas lado a lado - um grupo repetitivo.
     */
    @OneToMany(mappedBy = "pessoa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private Set<Telefone> telefones = new LinkedHashSet<>();

    public void adicionarEndereco(Endereco endereco) {
        endereco.setPessoa(this);
        this.enderecos.add(endereco);
    }

    public void adicionarTelefone(Telefone telefone) {
        telefone.setPessoa(this);
        this.telefones.add(telefone);
    }

    public boolean temPapel(String codigo) {
        return papeis.stream().anyMatch(p -> p.getCodigo().equals(codigo));
    }
}
