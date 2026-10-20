package com.ifgoianomih.contas_pagar.cartorio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Cartorio de protesto. Equivale a Cartorio.db do livro (cap. 5, p. 77).
 *
 * RN16: o cartorio precisa estar cadastrado antes de o titulo ser
 * enviado a protesto.
 */
@Entity
@Table(name = "cartorio")
@Getter
@Setter
public class Cartorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String nome;

    @Column(length = 60)
    private String contato;

    @Column(length = 20)
    private String telefone;
}
