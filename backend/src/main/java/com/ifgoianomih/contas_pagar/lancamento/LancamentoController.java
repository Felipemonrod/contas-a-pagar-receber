package com.ifgoianomih.contas_pagar.lancamento;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ifgoianomih.contas_pagar.lancamento.LancamentoDtos.LancamentoRequest;
import com.ifgoianomih.contas_pagar.lancamento.LancamentoDtos.LancamentoResponse;

import jakarta.validation.Valid;

/** Lancamento contabil por partida dobrada (livro, cap. 12). */
@RestController
@RequestMapping("/api/lancamentos")
public class LancamentoController {

    private final LancamentoService service;

    public LancamentoController(LancamentoService service) {
        this.service = service;
    }

    @GetMapping
    public List<LancamentoResponse> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            @RequestParam(required = false) String status) {
        return service.listar(de, ate, status);
    }

    @GetMapping("/por-conta/{planoContaId}")
    public List<LancamentoResponse> porConta(@PathVariable Long planoContaId) {
        return service.porConta(planoContaId);
    }

    @GetMapping("/{id}")
    public LancamentoResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    public ResponseEntity<LancamentoResponse> lancar(@RequestBody @Valid LancamentoRequest req) {
        LancamentoResponse criado = service.lancar(req);
        return ResponseEntity.created(URI.create("/api/lancamentos/" + criado.id())).body(criado);
    }

    /** Lancamento contabil nao se apaga: estorna-se. */
    @DeleteMapping("/{id}")
    public LancamentoResponse estornar(@PathVariable Long id) {
        return service.estornar(id);
    }
}
