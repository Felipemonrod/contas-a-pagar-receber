package com.ifgoianomih.contas_pagar.contapagar;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarResponse;
import com.ifgoianomih.contas_pagar.contapagar.dto.QuitacaoRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.SimulacaoQuitacaoResponse;

import jakarta.validation.Valid;

/**
 * Camada de entrada HTTP. Nao contem regra de negocio: recebe, delega ao
 * service e devolve o DTO de resposta.
 */
@RestController
@RequestMapping("/api/contas-pagar")
public class ContaPagarController {

    private final ContaPagarService service;

    public ContaPagarController(ContaPagarService service) {
        this.service = service;
    }

    @GetMapping
    public List<ContaPagarResponse> listar(
            @RequestParam(required = false) String situacao,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.listar(situacao, de, ate);
    }

    @GetMapping("/{id}")
    public ContaPagarResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @GetMapping("/inadimplentes")
    public List<ContaPagarResponse> inadimplentes() {
        return service.inadimplentes();
    }

    @PostMapping
    public ResponseEntity<ContaPagarResponse> lancar(@RequestBody @Valid ContaPagarRequest req) {
        ContaPagarResponse criada = service.lancar(req);
        return ResponseEntity.created(URI.create("/api/contas-pagar/" + criada.id())).body(criada);
    }

    @PutMapping("/{id}")
    public ContaPagarResponse alterar(@PathVariable Long id, @RequestBody @Valid ContaPagarRequest req) {
        return service.alterar(id, req);
    }

    @GetMapping("/{id}/simulacao")
    public SimulacaoQuitacaoResponse simular(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return service.simular(id, data);
    }

    @PostMapping("/{id}/pagamento")
    public ContaPagarResponse quitar(@PathVariable Long id, @RequestBody @Valid QuitacaoRequest req) {
        return service.quitar(id, req);
    }

    @DeleteMapping("/{id}")
    public ContaPagarResponse cancelar(@PathVariable Long id) {
        return service.cancelar(id);
    }

    @PostMapping("/atualizar-vencidas")
    public ResponseEntity<String> atualizarVencidas() {
        int total = service.atualizarVencidas();
        return ResponseEntity.ok(total + " titulo(s) marcado(s) como vencido(s).");
    }
}
