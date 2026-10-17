package com.ifgoianomih.contas_pagar;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Teste de integracao: sobe o contexto inteiro e exercita a API de ponta a
 * ponta contra um banco H2 real, passando por controller, service,
 * repositorio e JPA.
 *
 * Os metodos rodam em ordem porque simulam um fluxo: cadastrar fornecedor,
 * lancar titulo, quitar. Cada passo depende do anterior.
 */
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Integracao — fluxo completo de contas a pagar")
class ContaPagarIntegracaoTest {

    @Autowired private WebApplicationContext contexto;
    @Autowired private ObjectMapper json;

    private MockMvc mvc;

    private static Long fornecedorId;
    private static Long clienteId;
    private static Long tituloId;

    private MockMvc mvc() {
        if (mvc == null) {
            mvc = MockMvcBuilders.webAppContextSetup(contexto).build();
        }
        return mvc;
    }

    private Long idDaResposta(String corpo) throws Exception {
        return json.readTree(corpo).get("id").asLong();
    }


    /**
     * Compara um valor monetario do JSON.
     *
     * Nao da para usar matchers numericos direto: o Jackson serializa 0 como
     * Integer e 950.00 como Double, e o matcher quebra com ClassCastException
     * conforme o valor. Comparar como BigDecimal resolve nos dois casos.
     */
    private void assertValor(String corpoJson, String campo, String esperado) {
        JsonNode no = json.readTree(corpoJson);
        for (String parte : campo.split("[.]")) {
            no = no.get(parte);
        }
        org.assertj.core.api.Assertions.assertThat(no.decimalValue())
                .as("campo %s", campo)
                .isEqualByComparingTo(esperado);
    }

    // ------------------------------------------------------------ cadastros

    @Test
    @Order(1)
    @DisplayName("cadastra fornecedor com telefones e endereco")
    void cadastrarFornecedor() throws Exception {
        String corpo = """
                {
                  "nome": "Greensoft Informatica Ltda",
                  "documento": "33.537.659/0007-11",
                  "papeis": ["FORNECEDOR"],
                  "telefones": [{ "numero": "(11) 5585-4975", "ramal": "201" }],
                  "enderecos": [{ "logradouro": "Av. Paulista", "numero": "1439",
                                  "cidade": "Sao Paulo", "uf": "SP", "principal": true }]
                }
                """;

        String resposta = mvc().perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.papeis", hasSize(1)))
                .andExpect(jsonPath("$.telefones", hasSize(1)))
                .andExpect(jsonPath("$.enderecos[0].cidade", is("Sao Paulo")))
                .andExpect(jsonPath("$.ativo", is(true)))
                .andReturn().getResponse().getContentAsString();

        fornecedorId = idDaResposta(resposta);
    }

    @Test
    @Order(2)
    @DisplayName("cadastra pessoa apenas como cliente")
    void cadastrarCliente() throws Exception {
        String corpo = """
                { "nome": "Cliente Puro SA", "documento": "22.222.222/0001-22",
                  "papeis": ["CLIENTE"] }
                """;

        String resposta = mvc().perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        clienteId = idDaResposta(resposta);
    }

    @Test
    @Order(3)
    @DisplayName("documento duplicado e recusado com 422")
    void documentoDuplicado() throws Exception {
        String corpo = """
                { "nome": "Outra Empresa", "documento": "22.222.222/0001-22",
                  "papeis": ["CLIENTE"] }
                """;

        mvc().perform(post("/api/pessoas")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.erro", is("REGRA_NEGOCIO")));
    }

    @Test
    @Order(4)
    @DisplayName("plano de contas carregado vem em arvore")
    void planoDeContasEmArvore() throws Exception {
        mvc().perform(get("/api/plano-contas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].codigo", is("1")))
                .andExpect(jsonPath("$[0].consolidada", is(true)))
                .andExpect(jsonPath("$[0].subcontas[0].codigo", is("11")));
    }

    // ------------------------------------------------------------ validacoes

    @Test
    @Order(5)
    @DisplayName("campos obrigatorios ausentes resultam em 400 com a lista de campos")
    void camposObrigatorios() throws Exception {
        mvc().perform(post("/api/contas-pagar")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"valor\": -5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro", is("VALIDACAO")))
                .andExpect(jsonPath("$.campos", hasSize(6)));
    }

    @Test
    @Order(6)
    @DisplayName("RN04 — titulo a pagar para quem nao e fornecedor resulta em 422")
    void rn04() throws Exception {
        String corpo = """
                { "numeroTitulo": "ERR-001", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01" }
                """.formatted(clienteId);

        mvc().perform(post("/api/contas-pagar")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem", containsString("fornecedor")));
    }

    @Test
    @Order(7)
    @DisplayName("RN01 — rateio em categoria consolidada resulta em 422")
    void rn01() throws Exception {
        String corpo = """
                { "numeroTitulo": "ERR-002", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01",
                  "rateios": [{ "planoContaId": 4, "valor": 100.00 }] }
                """.formatted(fornecedorId);

        mvc().perform(post("/api/contas-pagar")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem", containsString("consolidada")));
    }

    @Test
    @Order(8)
    @DisplayName("RN12 — rateio que nao fecha com o valor resulta em 422")
    void rn12() throws Exception {
        String corpo = """
                { "numeroTitulo": "ERR-003", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01",
                  "rateios": [{ "planoContaId": 10, "valor": 70.00 }] }
                """.formatted(fornecedorId);

        mvc().perform(post("/api/contas-pagar")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem", containsString("difere do valor")));
    }

    // ------------------------------------------------- lancamento e quitacao

    @Test
    @Order(10)
    @DisplayName("lanca titulo de R$ 1.000,00 rateado em duas categorias")
    void lancarTitulo() throws Exception {
        String corpo = """
                { "numeroTitulo": "DUP-123456", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10",
                  "desconto": 50.00, "validadeDesconto": "2026-10-05", "acrescimoDia": 2.00,
                  "rateios": [{ "planoContaId": 10, "valor": 600.00 },
                              { "planoContaId": 13, "valor": 400.00 }] }
                """.formatted(fornecedorId);

        String resposta = mvc().perform(post("/api/contas-pagar")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.situacao", is("ABERTA")))
                .andExpect(jsonPath("$.rateios", hasSize(2)))
                .andReturn().getResponse().getContentAsString();

        assertValor(resposta, "saldoDevedor", "1000.00");
        tituloId = idDaResposta(resposta);
    }

    @Test
    @Order(11)
    @DisplayName("RN05 — simulacao reflete desconto, nada ou juros conforme a data")
    void rn05SimulacaoNasTresFaixas() throws Exception {
        // dentro da validade do desconto
        String dentro = mvc().perform(get("/api/contas-pagar/{id}/simulacao", tituloId)
                        .param("data", "2026-10-03"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertValor(dentro, "descontoAplicado", "50.00");
        assertValor(dentro, "valorDevido", "950.00");

        // depois da validade, antes do vencimento
        String meio = mvc().perform(get("/api/contas-pagar/{id}/simulacao", tituloId)
                        .param("data", "2026-10-08"))
                .andReturn().getResponse().getContentAsString();
        assertValor(meio, "descontoAplicado", "0");
        assertValor(meio, "acrescimoAplicado", "0");
        assertValor(meio, "valorDevido", "1000.00");

        // 15 dias de atraso x 2,00
        String atrasado = mvc().perform(get("/api/contas-pagar/{id}/simulacao", tituloId)
                        .param("data", "2026-10-25"))
                .andReturn().getResponse().getContentAsString();
        assertValor(atrasado, "acrescimoAplicado", "30.00");
        assertValor(atrasado, "valorDevido", "1030.00");
    }

    @Test
    @Order(12)
    @DisplayName("RN09 — pagamento parcial deixa o titulo em PARCIAL")
    void rn09PagamentoParcial() throws Exception {
        String corpo = """
                { "dataPagamento": "2026-10-03", "formaPagamento": "PIX", "valorPago": 400.00 }
                """;

        String parcial = mvc().perform(post("/api/contas-pagar/{id}/pagamento", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao", is("PARCIAL")))
                .andReturn().getResponse().getContentAsString();

        assertValor(parcial, "totalPago", "400.00");
        assertValor(parcial, "saldoDevedor", "550.00");
    }

    @Test
    @Order(13)
    @DisplayName("RN11 — alterar titulo com pagamento resulta em 422")
    void rn11() throws Exception {
        String corpo = """
                { "numeroTitulo": "DUP-123456", "pessoaId": %d, "tipoTitulo": "DUPLICATA",
                  "valor": 2000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10" }
                """.formatted(fornecedorId);

        mvc().perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/contas-pagar/{id}", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem", containsString("nao pode ser alterado")));
    }

    @Test
    @Order(14)
    @DisplayName("RN10 — quitar o restante sem repetir o desconto")
    void rn10QuitacaoFinal() throws Exception {
        String corpo = """
                { "dataPagamento": "2026-10-03", "formaPagamento": "BOLETO" }
                """;

        String resposta = mvc().perform(post("/api/contas-pagar/{id}/pagamento", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao", is("PAGA")))
                .andExpect(jsonPath("$.pagamentos", hasSize(2)))
                .andReturn().getResponse().getContentAsString();

        assertValor(resposta, "saldoDevedor", "0");
        assertValor(resposta, "totalPago", "950.00");

        JsonNode pagamentos = json.readTree(resposta).get("pagamentos");
        BigDecimal somaDescontos = BigDecimal.ZERO;
        for (JsonNode p : pagamentos) {
            somaDescontos = somaDescontos.add(p.get("descontoAplicado").decimalValue());
        }
        org.assertj.core.api.Assertions.assertThat(somaDescontos)
                .as("o desconto de 50,00 e concedido uma unica vez")
                .isEqualByComparingTo("50.00");
    }

    @Test
    @Order(15)
    @DisplayName("RN07 — quitar titulo ja quitado resulta em 422")
    void rn07() throws Exception {
        String corpo = """
                { "dataPagamento": "2026-10-03", "formaPagamento": "PIX" }
                """;

        mvc().perform(post("/api/contas-pagar/{id}/pagamento", tituloId)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem", containsString("ja esta quitado")));
    }

    @Test
    @Order(16)
    @DisplayName("RN07 — o titulo quitado permanece consultavel com o historico")
    void historicoPreservado() throws Exception {
        mvc().perform(get("/api/contas-pagar/{id}", tituloId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numeroTitulo", is("DUP-123456")))
                .andExpect(jsonPath("$.pagamentos", hasSize(2)));
    }

    // ------------------------------------------------------------- consultas

    @Test
    @Order(17)
    @DisplayName("consulta por periodo e situacao devolve apenas o que casa")
    void consultaComFiltros() throws Exception {
        mvc().perform(get("/api/contas-pagar")
                        .param("situacao", "PAGA")
                        .param("de", "2026-09-01").param("ate", "2026-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].situacao", is("PAGA")));
    }

    @Test
    @Order(18)
    @DisplayName("relatorio de resumo consolida os dois dominios")
    void relatorioResumo() throws Exception {
        String resumo = mvc().perform(get("/api/relatorios/resumo")
                        .param("de", "2026-09-01").param("ate", "2026-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contasAPagar.quantidadeTitulos", is(1)))
                .andReturn().getResponse().getContentAsString();

        assertValor(resumo, "contasAPagar.valorQuitado", "950.00");
    }

    @Test
    @Order(19)
    @DisplayName("recurso inexistente resulta em 404")
    void recursoInexistente() throws Exception {
        mvc().perform(get("/api/contas-pagar/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro", is("NAO_ENCONTRADO")));
    }

    @Test
    @Order(20)
    @DisplayName("RN13 — excluir pessoa apenas a inativa")
    void rn13ExclusaoLogica() throws Exception {
        mvc().perform(delete("/api/pessoas/{id}", clienteId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo", is(false)));

        mvc().perform(get("/api/pessoas/{id}", clienteId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome", is("Cliente Puro SA")));
    }
}
