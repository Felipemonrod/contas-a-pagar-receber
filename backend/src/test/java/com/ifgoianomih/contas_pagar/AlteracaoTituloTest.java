package com.ifgoianomih.contas_pagar;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
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
 * Alteracao de titulo. Os casos aqui vieram de defeitos relatados pelo
 * front-end ao integrar, e existem para que nao voltem:
 *
 *  - reenviar o mesmo rateio num PUT estourava 409, porque o Hibernate
 *    emitia o INSERT antes do DELETE e colidia com a restricao de
 *    unicidade (conta, categoria);
 *  - numeroTitulo e pessoaId chegavam no corpo e eram ignorados em
 *    silencio, com a API respondendo 200 como se tivesse gravado.
 */
@SpringBootTest
@Transactional
@DisplayName("Alteracao de titulo")
class AlteracaoTituloTest {

    @Autowired private WebApplicationContext contexto;
    @Autowired private ObjectMapper json;

    private MockMvc mvc;
    private Long fornecedorA;
    private Long fornecedorB;
    private Long tituloId;

    @BeforeEach
    void preparar() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).build();

        fornecedorA = criarPessoa("Fornecedor A Ltda", "80.111.111/0001-11", "FORNECEDOR");
        fornecedorB = criarPessoa("Fornecedor B Ltda", "80.222.222/0001-22", "FORNECEDOR");

        String corpo = """
                { "numeroTitulo": "ALT-ORIGINAL", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10",
                  "rateios": [{ "planoContaId": 10, "valor": 600.00 },
                              { "planoContaId": 13, "valor": 400.00 }] }
                """.formatted(fornecedorA);

        String resposta = mvc.perform(post("/api/contas-pagar")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        tituloId = json.readTree(resposta).get("id").asLong();
    }

    private Long criarPessoa(String nome, String documento, String papel) throws Exception {
        String corpo = """
                { "nome": "%s", "documento": "%s", "papeis": ["%s"] }
                """.formatted(nome, documento, papel);

        String resposta = mvc.perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return json.readTree(resposta).get("id").asLong();
    }

    @Test
    @DisplayName("reenviar exatamente o mesmo rateio nao pode estourar erro de unicidade")
    void reenviarMesmoRateio() throws Exception {
        String corpo = """
                { "numeroTitulo": "ALT-ORIGINAL", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-20",
                  "rateios": [{ "planoContaId": 10, "valor": 600.00 },
                              { "planoContaId": 13, "valor": 400.00 }] }
                """.formatted(fornecedorA);

        mvc.perform(put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rateios", hasSize(2)))
                .andExpect(jsonPath("$.vencimento", is("2026-10-20")));
    }

    @Test
    @DisplayName("trocar as categorias do rateio funciona")
    void trocarCategoriasDoRateio() throws Exception {
        String corpo = """
                { "numeroTitulo": "ALT-ORIGINAL", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10",
                  "rateios": [{ "planoContaId": 11, "valor": 1000.00 }] }
                """.formatted(fornecedorA);

        mvc.perform(put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rateios", hasSize(1)))
                .andExpect(jsonPath("$.rateios[0].planoContaId", is(11)));
    }

    @Test
    @DisplayName("alterar o numero do titulo grava de verdade")
    void alterarNumeroTitulo() throws Exception {
        String corpo = """
                { "numeroTitulo": "ALT-CORRIGIDO", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10" }
                """.formatted(fornecedorA);

        mvc.perform(put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numeroTitulo", is("ALT-CORRIGIDO")));

        mvc.perform(get("/api/contas-pagar/{id}", tituloId))
                .andExpect(jsonPath("$.numeroTitulo", is("ALT-CORRIGIDO")));
    }

    @Test
    @DisplayName("alterar o fornecedor grava de verdade")
    void alterarFornecedor() throws Exception {
        String corpo = """
                { "numeroTitulo": "ALT-ORIGINAL", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10" }
                """.formatted(fornecedorB);

        mvc.perform(put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pessoaId", is(fornecedorB.intValue())))
                .andExpect(jsonPath("$.pessoaNome", is("Fornecedor B Ltda")));
    }

    @Test
    @DisplayName("alterar o tipo do titulo grava de verdade")
    void alterarTipoTitulo() throws Exception {
        String corpo = """
                { "numeroTitulo": "ALT-ORIGINAL", "pessoaId": %d, "tipoTitulo": "NOTA_PROMISSORIA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10" }
                """.formatted(fornecedorA);

        mvc.perform(put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoTitulo", is("NOTA_PROMISSORIA")));
    }

    @Test
    @DisplayName("RN04 continua valendo na alteracao: nao aceita trocar para quem nao e fornecedor")
    void alterarParaPessoaSemPapel() throws Exception {
        Long cliente = criarPessoa("Cliente Puro SA", "80.333.333/0001-33", "CLIENTE");

        String corpo = """
                { "numeroTitulo": "ALT-ORIGINAL", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10" }
                """.formatted(cliente);

        mvc.perform(put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("nao aceita mudar para um numero de titulo que ja existe")
    void alterarParaNumeroDuplicado() throws Exception {
        String outro = """
                { "numeroTitulo": "ALT-OUTRO", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 500.00, "emissao": "2026-09-01", "vencimento": "2026-10-10" }
                """.formatted(fornecedorA);
        mvc.perform(post("/api/contas-pagar")
                        .contentType(MediaType.APPLICATION_JSON).content(outro))
                .andExpect(status().isCreated());

        String corpo = """
                { "numeroTitulo": "ALT-OUTRO", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10" }
                """.formatted(fornecedorA);

        mvc.perform(put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity());
    }
}
