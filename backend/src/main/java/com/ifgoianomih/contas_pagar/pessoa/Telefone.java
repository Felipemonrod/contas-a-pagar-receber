package com.ifgoianomih.contas_pagar.pessoa;

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

/** 1FN: uma linha por telefone, no lugar das colunas Telefone/Ramal/Fax. */
@Entity
@Table(name = "telefone")
@Getter
@Setter
public class Telefone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pessoa_id", nullable = false)
    private Pessoa pessoa;

    @Column(nullable = false, length = 20)
    private String numero;

    @Column(length = 6)
    private String ramal;

    /** COMERCIAL, CELULAR, FAX. */
    @Column(nullable = false, length = 20)
    private String tipo = "COMERCIAL";
}
