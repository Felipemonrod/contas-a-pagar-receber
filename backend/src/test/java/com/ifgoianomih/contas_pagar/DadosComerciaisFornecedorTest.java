package com.ifgoianomih.contas_pagar;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import tools.jackson.databind.ObjectMapper;

/**
 * Os quatro campos que o Fornecedor.db do livro tem e o Cliente.db nao
 * (cap. 5, p. 72): Pagamento, Desconto, Entrega e Vendedor.
 *
 * Como cliente e fornecedor foram unificados em Pessoa, eles sao
 * anulaveis e so se aplicam a quem tem o papel FORNECEDOR.
 */
@SpringBootTest
@Transactional
@DisplayName("Dados comerciais do fornecedor")
class DadosComerciaisFornecedorTest {

    @Autowired private WebApplicationContext contexto;
    @Autowired private ObjectMapper json;

    private MockMvc mvc;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).build();
    }

    @Test
    @DisplayName("fornecedor grava e devolve os quatro campos")
    void gravaOsQuatroCampos() throws Exception {
        String corpo = """
                { "nome": "DC Fornecedor Completo Ltda", "documento": "70.111.111/0001-11",
                  "papeis": ["FORNECEDOR"],
                  "condicaoPagamento": "30/60/90 dias",
                  "descontoNegociado": "5% a vista",
                  "prazoEntregaDias": 15,
                  "vendedor": "Wilson Souza" }
                """;

        String resposta = mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.condicaoPagamento", is("30/60/90 dias")))
                .andExpect(jsonPath("$.descontoNegociado", is("5% a vista")))
                .andExpect(jsonPath("$.prazoEntregaDias", is(15)))
                .andExpect(jsonPath("$.vendedor", is("Wilson Souza")))
                .andReturn().getResponse().getContentAsString();

        Long id = json.readTree(resposta).get("id").asLong();

        // E persistem de verdade, nao so no retorno da criacao
        mvc.perform(get("/api/pessoas/{id}", id))
                .andExpect(jsonPath("$.prazoEntregaDias", is(15)))
                .andExpect(jsonPath("$.vendedor", is("Wilson Souza")));
    }

    @Test
    @DisplayName("cliente sem dados comerciais fica com os campos nulos")
    void clienteFicaComCamposNulos() throws Exception {
        String corpo = """
                { "nome": "DC Cliente Simples SA", "documento": "70.222.222/0001-22",
                  "papeis": ["CLIENTE"] }
                """;

        mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.condicaoPagamento", nullValue()))
                .andExpect(jsonPath("$.descontoNegociado", nullValue()))
                .andExpect(jsonPath("$.prazoEntregaDias", nullValue()))
                .andExpect(jsonPath("$.vendedor", nullValue()));
    }

    @Test
    @DisplayName("os campos podem ser alterados")
    void alteracao() throws Exception {
        String criacao = """
                { "nome": "DC Fornecedor Para Editar Ltda", "documento": "70.333.333/0001-33",
                  "papeis": ["FORNECEDOR"], "prazoEntregaDias": 10, "vendedor": "Antigo" }
                """;

        String resposta = mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(criacao))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long id = json.readTree(resposta).get("id").asLong();

        String edicao = """
                { "nome": "DC Fornecedor Para Editar Ltda", "documento": "70.333.333/0001-33",
                  "papeis": ["FORNECEDOR"], "prazoEntregaDias": 7, "vendedor": "Novo",
                  "condicaoPagamento": "a vista" }
                """;

        mvc.perform(put("/api/pessoas/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON).content(edicao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prazoEntregaDias", is(7)))
                .andExpect(jsonPath("$.vendedor", is("Novo")))
                .andExpect(jsonPath("$.condicaoPagamento", is("a vista")));
    }

    @Test
    @DisplayName("prazo de entrega negativo e recusado")
    void prazoNegativo() throws Exception {
        String corpo = """
                { "nome": "DC Fornecedor Invalido Ltda", "documento": "70.444.444/0001-44",
                  "papeis": ["FORNECEDOR"], "prazoEntregaDias": -5 }
                """;

        mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro", is("VALIDACAO")));
    }

    @Test
    @DisplayName("prazo de entrega zero e aceito, para entrega imediata")
    void prazoZero() throws Exception {
        String corpo = """
                { "nome": "DC Fornecedor Imediato Ltda", "documento": "70.555.555/0001-55",
                  "papeis": ["FORNECEDOR"], "prazoEntregaDias": 0 }
                """;

        mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.prazoEntregaDias", is(0)));
    }
}
