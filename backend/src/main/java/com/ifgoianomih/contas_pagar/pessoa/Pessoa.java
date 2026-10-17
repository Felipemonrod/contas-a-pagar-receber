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

    /** RELACIONAMENTO 1:N - comercial, cobranca, entrega. */
    @OneToMany(mappedBy = "pessoa", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Endereco> enderecos = new LinkedHashSet<>();

    /**
     * RELACIONAMENTO 1:N. 1FN: o livro tinha Telefone, Ramal e Fax como
     * colunas lado a lado - um grupo repetitivo.
     */
    @OneToMany(mappedBy = "pessoa", cascade = CascadeType.ALL, orphanRemoval = true)
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
