package com.ifgoianomih.contas_pagar.cartorio;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** DTOs de cartorio e remessa para protesto. */
public final class CartorioDtos {

    private CartorioDtos() {}

    public record CartorioRequest(
            @NotBlank(message = "O nome do cartorio e obrigatorio")
            @Size(max = 60) String nome,
            @Size(max = 60) String contato,
            @Size(max = 20) String telefone) {
    }

    public record CartorioResponse(Long id, String nome, String contato, String telefone) {}

    public record RemessaRequest(
            @NotNull(message = "O cartorio e obrigatorio")
            Long cartorioId,

            @NotNull(message = "O titulo e obrigatorio")
            Long contaReceberId,

            /** Quando omitida, usa a data de hoje. */
            LocalDate dataRemessa,

            @Size(max = 255) String observacao) {
    }

    public record ProtestoRequest(
            @NotNull(message = "A data do protesto e obrigatoria")
            LocalDate dataProtesto) {
    }

    public record BaixaRequest(
            @NotNull(message = "A data da baixa e obrigatoria")
            LocalDate dataBaixa,
            @Size(max = 255) String observacao) {
    }

    public record RemessaResponse(
            Long id,
            Long cartorioId,
            String cartorioNome,
            Long contaReceberId,
            String numeroTitulo,
            String cliente,
            BigDecimal valorTitulo,
            BigDecimal saldoDevedor,
            LocalDate vencimentoTitulo,
            LocalDate dataRemessa,
            LocalDate dataProtesto,
            LocalDate dataBaixa,
            String situacao,
            String observacao) {
    }
}
