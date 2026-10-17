package com.ifgoianomih.contas_pagar.contapagar.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * PADRAO DTO (Data Transfer Object).
 *
 * Separa o que a API recebe do que o banco armazena. Sem isso, a entidade
 * ficaria exposta na API e qualquer mudanca no banco quebraria o contrato
 * com o cliente.
 *
 * As anotacoes de validacao sao verificadas antes de o metodo do controller
 * ser executado.
 */
public record ContaPagarRequest(

        @NotBlank(message = "O numero do titulo e obrigatorio")
        @Size(max = 20, message = "O numero do titulo deve ter no maximo 20 caracteres")
        String numeroTitulo,

        @NotNull(message = "O fornecedor e obrigatorio")
        Long pessoaId,

        @NotBlank(message = "O tipo do titulo e obrigatorio")
        String tipoTitulo,

        @NotNull(message = "O valor e obrigatorio")
        @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
        BigDecimal valor,

        @NotNull(message = "A data de emissao e obrigatoria")
        LocalDate emissao,

        @NotNull(message = "A data de vencimento e obrigatoria")
        LocalDate vencimento,

        BigDecimal desconto,

        LocalDate validadeDesconto,

        BigDecimal acrescimoDia,

        @Size(max = 255)
        String observacao,

        /** Rateio entre categorias. Se vier vazio, a conta fica sem rateio. */
        @Valid
        List<RateioRequest> rateios) {
}
