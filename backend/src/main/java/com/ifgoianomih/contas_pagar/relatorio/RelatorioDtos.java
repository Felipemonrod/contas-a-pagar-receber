package com.ifgoianomih.contas_pagar.relatorio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** DTOs das consultas financeiras consolidadas. */
public final class RelatorioDtos {

    private RelatorioDtos() {}

    /** Posicao financeira do periodo: o que entra, o que sai e o que sobra. */
    public record ResumoFinanceiroResponse(
            LocalDate de,
            LocalDate ate,
            PosicaoResponse contasAPagar,
            PosicaoResponse contasAReceber,
            BigDecimal saldoProjetado,
            BigDecimal saldoRealizado) {
    }

    public record PosicaoResponse(
            int quantidadeTitulos,
            BigDecimal valorTotal,
            BigDecimal valorQuitado,
            BigDecimal saldoEmAberto,
            int quantidadeVencidos,
            BigDecimal valorVencido) {
    }

    /** Totais agrupados por categoria do plano de contas. */
    public record TotalPorCategoriaResponse(
            String codigo,
            String descricao,
            BigDecimal totalAPagar,
            BigDecimal totalAReceber) {
    }

    /** Titulo vencido e ainda em aberto, com os dias de atraso. */
    public record TituloVencidoResponse(
            String origem,
            String numeroTitulo,
            String pessoa,
            LocalDate vencimento,
            long diasAtraso,
            BigDecimal saldoDevedor) {
    }

    public record InadimplenciaResponse(
            LocalDate posicaoEm,
            BigDecimal totalAPagarVencido,
            BigDecimal totalAReceberVencido,
            List<TituloVencidoResponse> titulos) {
    }
}
