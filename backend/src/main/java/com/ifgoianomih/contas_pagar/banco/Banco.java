package com.ifgoianomih.contas_pagar.banco;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Banco. Equivale a Banco.db do livro (cap. 5, p. 79), que tinha apenas
 * codigo e nome.
 *
 * Primeiro nivel da cadeia banco -> agencia -> conta corrente.
 */
@Entity
@Table(name = "banco")
@Getter
@Setter
public class Banco {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Codigo de compensacao: 001, 237, 341... */
    @Column(nullable = false, unique = true, length = 4)
    private String codigo;

    @Column(nullable = false, length = 60)
    private String nome;

    @OneToMany(mappedBy = "banco", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("numero")
    private List<Agencia> agencias = new ArrayList<>();
}
