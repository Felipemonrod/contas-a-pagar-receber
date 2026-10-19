package com.ifgoianomih.contas_pagar.banco;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * Agencia bancaria. Equivale a Agencia.db do livro (cap. 5, p. 78).
 *
 * No livro a chave era so o numero da agencia, o que impediria duas
 * agencias de mesmo numero em bancos diferentes. Aqui a unicidade e por
 * (banco, numero).
 */
@Entity
@Table(name = "agencia",
       uniqueConstraints = @UniqueConstraint(
               name = "uk_agencia_banco_numero", columnNames = {"banco_id", "numero"}))
@Getter
@Setter
public class Agencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "banco_id", nullable = false)
    private Banco banco;

    @Column(nullable = false, length = 10)
    private String numero;

    @Column(nullable = false, length = 60)
    private String nome;

    @Column(length = 120)
    private String endereco;

    @Column(length = 60)
    private String gerente;

    @Column(length = 20)
    private String telefone;

    @Column(length = 6)
    private String ramal;

    @Column(length = 20)
    private String fax;

    @Column(length = 80)
    private String email;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @OneToMany(mappedBy = "agencia", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("numero")
    private List<ContaCorrente> contas = new ArrayList<>();
}
