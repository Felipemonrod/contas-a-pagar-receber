package com.ifgoianomih.contas_pagar.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * 3FN: no livro, Cidade e Estado ficavam na propria linha do cliente.
 * Como a UF depende da cidade e nao do cliente, havia dependencia
 * transitiva. Aqui a cidade e entidade propria.
 */
@Entity
@Table(name = "cidade")
@Getter
@Setter
public class Cidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String nome;

    @Column(nullable = false, length = 2)
    private String uf;
}
