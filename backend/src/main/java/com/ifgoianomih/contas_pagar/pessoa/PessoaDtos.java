package com.ifgoianomih.contas_pagar.pessoa;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** DTOs de pessoa. Agrupados porque sao curtos e sempre usados juntos. */
public final class PessoaDtos {

    private PessoaDtos() {}

    public record PessoaRequest(

            @NotBlank(message = "O nome e obrigatorio")
            @Size(max = 100)
            String nome,

            @NotBlank(message = "O documento (CNPJ ou CPF) e obrigatorio")
            @Size(max = 18)
            String documento,

            @NotEmpty(message = "Informe ao menos um papel: CLIENTE ou FORNECEDOR")
            List<String> papeis,

            String inscricaoEstadual,
            String email,
            String contato,
            List<TelefoneRequest> telefones,
            List<EnderecoRequest> enderecos) {
    }

    public record TelefoneRequest(
            @NotBlank(message = "O numero do telefone e obrigatorio") String numero,
            String ramal,
            String tipo) {
    }

    public record EnderecoRequest(
            @NotBlank(message = "O logradouro e obrigatorio") String logradouro,
            String numero,
            String complemento,
            String bairro,
            String cep,
            @NotBlank(message = "A cidade e obrigatoria") String cidade,
            @NotBlank(message = "A UF e obrigatoria") @Size(min = 2, max = 2) String uf,
            Boolean principal) {
    }

    public record PessoaResponse(
            Long id,
            String nome,
            String documento,
            String inscricaoEstadual,
            String email,
            String contato,
            Boolean ativo,
            List<String> papeis,
            List<TelefoneResponse> telefones,
            List<EnderecoResponse> enderecos) {
    }

    public record TelefoneResponse(Long id, String numero, String ramal, String tipo) {}

    public record EnderecoResponse(
            Long id, String logradouro, String numero, String complemento,
            String bairro, String cep, String cidade, String uf, Boolean principal) {}
}
