package com.ifgoianomih.contas_pagar.despesa;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class DespesaDtos {

    private DespesaDtos() {}

    public record DespesaRequest(

            @NotNull(message = "A categoria e obrigatoria")
            Long planoContaId,

            @NotBlank(message = "A descricao e obrigatoria")
            @Size(max = 80)
            String descricao,

            @NotNull(message = "O valor previsto e obrigatorio")
            @DecimalMin(value = "0.01", message = "O valor previsto deve ser maior que zero")
            BigDecimal valorPrevisto,

            @NotNull(message = "A previsao de pagamento e obrigatoria")
            LocalDate previsaoPagamento) {
    }

    /** Dados que so se conhecem quando a fatura chega (RN03). */
    public record GerarTituloRequest(

            @NotBlank(message = "O numero do titulo e obrigatorio")
            @Size(max = 20)
            String numeroTitulo,

            @NotNull(message = "O fornecedor e obrigatorio")
            Long pessoaId,

            @NotNull(message = "O valor real da fatura e obrigatorio")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            BigDecimal valor,

            @NotNull(message = "A data de emissao e obrigatoria")
            LocalDate emissao,

            @NotNull(message = "A data de vencimento e obrigatoria")
            LocalDate vencimento,

            String tipoTitulo) {
    }

    public record DespesaResponse(
            Long id,
            Long planoContaId,
            String categoria,
            String descricao,
            BigDecimal valorPrevisto,
            LocalDate dataLancamento,
            LocalDate previsaoPagamento,
            Boolean realizada,
            Long contaPagarId,
            String numeroTitulo) {
    }
}
