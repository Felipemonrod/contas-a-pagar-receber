package com.ifgoianomih.contas_pagar.banco;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** DTOs do cadastro bancario: banco, agencia e conta corrente. */
public final class BancoDtos {

    private BancoDtos() {}

    // ---------------------------------------------------------- banco

    public record BancoRequest(
            @NotBlank(message = "O codigo do banco e obrigatorio")
            @Size(max = 4, message = "O codigo deve ter no maximo 4 caracteres")
            String codigo,

            @NotBlank(message = "O nome do banco e obrigatorio")
            @Size(max = 60)
            String nome) {
    }

    public record BancoResponse(
            Long id,
            String codigo,
            String nome,
            List<AgenciaResponse> agencias) {
    }

    public record BancoItemResponse(Long id, String codigo, String nome) {}

    // -------------------------------------------------------- agencia

    public record AgenciaRequest(
            @NotNull(message = "O banco e obrigatorio")
            Long bancoId,

            @NotBlank(message = "O numero da agencia e obrigatorio")
            @Size(max = 10)
            String numero,

            @NotBlank(message = "O nome da agencia e obrigatorio")
            @Size(max = 60)
            String nome,

            @Size(max = 120) String endereco,
            @Size(max = 60) String gerente,
            @Size(max = 20) String telefone,
            @Size(max = 6) String ramal,
            @Size(max = 20) String fax,
            @Size(max = 80) String email) {
    }

    public record AgenciaResponse(
            Long id,
            Long bancoId,
            String bancoCodigo,
            String bancoNome,
            String numero,
            String nome,
            String endereco,
            String gerente,
            String telefone,
            String ramal,
            String fax,
            String email,
            List<ContaCorrenteResponse> contas) {
    }

    // -------------------------------------------------- conta corrente

    public record ContaCorrenteRequest(
            @NotNull(message = "A agencia e obrigatoria")
            Long agenciaId,

            @NotBlank(message = "O numero da conta e obrigatorio")
            @Size(max = 15)
            String numero,

            @Size(max = 20) String tipo,

            @PositiveOrZero(message = "O limite nao pode ser negativo")
            BigDecimal limite) {
    }

    public record ContaCorrenteResponse(
            Long id,
            Long agenciaId,
            String numero,
            String tipo,
            BigDecimal limite,
            Boolean ativa,
            String identificacao) {
    }
}
