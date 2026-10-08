package com.ifgoianomih.contas_pagar.relatorio;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.InadimplenciaResponse;
import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.ResumoFinanceiroResponse;
import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.TotalPorCategoriaResponse;

@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

    private final RelatorioService service;

    public RelatorioController(RelatorioService service) {
        this.service = service;
    }

    @GetMapping("/resumo")
    public ResumoFinanceiroResponse resumo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.resumo(de, ate);
    }

    @GetMapping("/por-categoria")
    public List<TotalPorCategoriaResponse> porCategoria(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.porCategoria(de, ate);
    }

    @GetMapping("/inadimplencia")
    public InadimplenciaResponse inadimplencia() {
        return service.inadimplencia();
    }
}
