package com.ifgoianomih.contas_pagar.cartorio;

import java.time.LocalDate;

import com.ifgoianomih.contas_pagar.contareceber.ContaReceber;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Remessa de titulo para protesto. Equivale a RemessaCartorio.db do livro
 * (cap. 5, p. 73; tela no cap. 3, p. 62).
 *
 * RN16: titulo vencido e nao recebido pode ir a protesto. A remessa
 * guarda tres datas - envio, protesto e baixa.
 *
 * No livro o vinculo com o titulo era pelo numero, em texto. Aqui e
 * chave estrangeira, o que impede remessa de titulo inexistente.
 */
@Entity
@Table(name = "remessa_cartorio")
@Getter
@Setter
public class RemessaCartorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "cartorio_id", nullable = false)
    private Cartorio cartorio;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "conta_receber_id", nullable = false, unique = true)
    private ContaReceber contaReceber;

    @Column(name = "data_remessa", nullable = false)
    private LocalDate dataRemessa;

    /** Preenchida quando o cartorio confirma o protesto. */
    @Column(name = "data_protesto")
    private LocalDate dataProtesto;

    /** Preenchida quando o titulo e pago e o protesto e baixado. */
    @Column(name = "data_baixa")
    private LocalDate dataBaixa;

    @Column(length = 255)
    private String observacao;

    /** Situacao derivada das tres datas, como no sistema original. */
    public String situacao() {
        if (dataBaixa != null) {
            return "BAIXADA";
        }
        if (dataProtesto != null) {
            return "PROTESTADA";
        }
        return "ENVIADA";
    }
}
