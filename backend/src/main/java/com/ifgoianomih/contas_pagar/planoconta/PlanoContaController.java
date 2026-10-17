package com.ifgoianomih.contas_pagar.planoconta;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ifgoianomih.contas_pagar.planoconta.PlanoContaDtos.PlanoContaItemResponse;
import com.ifgoianomih.contas_pagar.planoconta.PlanoContaDtos.PlanoContaRequest;
import com.ifgoianomih.contas_pagar.planoconta.PlanoContaDtos.PlanoContaResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/plano-contas")
public class PlanoContaController {

    private final PlanoContaService service;

    public PlanoContaController(PlanoContaService service) {
        this.service = service;
    }

    @GetMapping
    public List<PlanoContaResponse> listarArvore() {
        return service.listarArvore();
    }

    @GetMapping("/analiticas")
    public List<PlanoContaItemResponse> listarAnaliticas() {
        return service.listarAnaliticas();
    }

    @GetMapping("/{id}")
    public PlanoContaResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    public ResponseEntity<PlanoContaResponse> criar(@RequestBody @Valid PlanoContaRequest req) {
        PlanoContaResponse criada = service.criar(req);
        return ResponseEntity.created(URI.create("/api/plano-contas/" + criada.id())).body(criada);
    }

    @PutMapping("/{id}")
    public PlanoContaResponse alterar(@PathVariable Long id, @RequestBody @Valid PlanoContaRequest req) {
        return service.alterar(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
