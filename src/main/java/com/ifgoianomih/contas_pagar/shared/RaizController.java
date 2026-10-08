package com.ifgoianomih.contas_pagar.shared;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A aplicacao e uma API REST e nao tem pagina inicial. Sem este controlador,
 * quem abre http://localhost:8080 ve a pagina de erro padrao do Spring e
 * acha que o sistema esta fora do ar.
 *
 * Aqui a raiz devolve um indice dos recursos disponiveis.
 */
@RestController
public class RaizController {

    @GetMapping("/")
    public Map<String, Object> indice() {
        Map<String, String> recursos = new LinkedHashMap<>();
        recursos.put("pessoas", "/api/pessoas");
        recursos.put("plano de contas", "/api/plano-contas");
        recursos.put("contas a pagar", "/api/contas-pagar");
        recursos.put("contas a receber", "/api/contas-receber");
        recursos.put("despesas", "/api/despesas");
        recursos.put("relatorios", "/api/relatorios/resumo");

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("aplicacao", "Sistema de Contas a Pagar e a Receber");
        corpo.put("descricao", "Projeto Integrador de Sistemas Distribuidos - IF Goiano Morrinhos");
        corpo.put("versao", "1.0");
        corpo.put("recursos", recursos);
        return corpo;
    }
}
