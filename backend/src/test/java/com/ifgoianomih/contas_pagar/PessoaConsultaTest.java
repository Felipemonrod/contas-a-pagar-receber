package com.ifgoianomih.contas_pagar;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

/**
 * Consulta de pessoas. Os casos aqui vieram de defeitos relatados pelo
 * front-end: os filtros de nome e papel se excluiam, e a ordem de
 * telefones e enderecos variava entre leituras.
 */
@SpringBootTest
@Transactional
@DisplayName("Consulta de pessoas")
class PessoaConsultaTest {

    @Autowired private WebApplicationContext contexto;

    private MockMvc mvc;

    @BeforeEach
    void preparar() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).build();

        // O prefixo ZZC isola esta classe: outras deixam registros no mesmo
        // banco em memoria, e contar o total nao seria confiavel.
        //
        // "Fornecedor" aparece de proposito no nome de uma pessoa que e
        // CLIENTE - era exatamente esse o caso que expunha o defeito.
        criar("""
                { "nome": "ZZC Fornecedor Puro Ltda", "documento": "90.111.111/0001-11",
                  "papeis": ["FORNECEDOR"] }
                """);
        criar("""
                { "nome": "ZZC Cliente Fornecedor Mix SA", "documento": "90.222.222/0001-22",
                  "papeis": ["CLIENTE"] }
                """);
        criar("""
                { "nome": "ZZC Greensoft Informatica Ltda", "documento": "90.333.333/0001-33",
                  "papeis": ["CLIENTE", "FORNECEDOR"],
                  "telefones": [
                    { "numero": "(11) 1111-1111", "tipo": "COMERCIAL" },
                    { "numero": "(11) 2222-2222", "tipo": "FAX" },
                    { "numero": "(11) 3333-3333", "tipo": "CELULAR" }
                  ],
                  "enderecos": [
                    { "logradouro": "Rua Primeira", "cidade": "Morrinhos", "uf": "GO" },
                    { "logradouro": "Rua Segunda", "cidade": "Goiania", "uf": "GO" }
                  ] }
                """);
    }

    private void criar(String corpo) throws Exception {
        mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("nome e papel se combinam, em vez de um excluir o outro")
    void filtrosCombinam() throws Exception {
        // "ZZC Fornecedor" casa com duas pessoas pelo nome, mas so uma e CLIENTE
        mvc.perform(get("/api/pessoas")
                        .param("papel", "CLIENTE").param("nome", "ZZC Cliente Fornecedor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].nome", is("ZZC Cliente Fornecedor Mix SA")));
    }

    @Test
    @DisplayName("o filtro por papel exclui quem nao o tem")
    void papelFiltraDeVerdade() throws Exception {
        // Das tres pessoas criadas aqui, duas sao FORNECEDOR
        mvc.perform(get("/api/pessoas").param("papel", "FORNECEDOR").param("nome", "ZZC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // E uma e CLIENTE e FORNECEDOR ao mesmo tempo
        mvc.perform(get("/api/pessoas").param("papel", "CLIENTE").param("nome", "ZZC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @DisplayName("filtrar so por nome continua funcionando")
    void somenteNome() throws Exception {
        mvc.perform(get("/api/pessoas").param("nome", "ZZC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    @DisplayName("telefones vem sempre na ordem em que foram cadastrados")
    void ordemDosTelefones() throws Exception {
        for (int tentativa = 1; tentativa <= 3; tentativa++) {
            mvc.perform(get("/api/pessoas").param("nome", "ZZC Greensoft"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].telefones", hasSize(3)))
                    .andExpect(jsonPath("$[0].telefones[0].tipo", is("COMERCIAL")))
                    .andExpect(jsonPath("$[0].telefones[1].tipo", is("FAX")))
                    .andExpect(jsonPath("$[0].telefones[2].tipo", is("CELULAR")));
        }
    }

    @Test
    @DisplayName("enderecos vem sempre na ordem em que foram cadastrados")
    void ordemDosEnderecos() throws Exception {
        for (int tentativa = 1; tentativa <= 3; tentativa++) {
            mvc.perform(get("/api/pessoas").param("nome", "ZZC Greensoft"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].enderecos", hasSize(2)))
                    .andExpect(jsonPath("$[0].enderecos[0].logradouro", is("Rua Primeira")))
                    .andExpect(jsonPath("$[0].enderecos[1].logradouro", is("Rua Segunda")));
        }
    }
}
