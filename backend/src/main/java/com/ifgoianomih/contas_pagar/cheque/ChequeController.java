package com.ifgoianomih.contas_pagar.cheque;

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

import com.ifgoianomih.contas_pagar.cheque.ChequeDtos.ChequeRequest;
import com.ifgoianomih.contas_pagar.cheque.ChequeDtos.ChequeResponse;
import com.ifgoianomih.contas_pagar.cheque.ChequeDtos.MudancaSituacaoRequest;

import jakarta.validation.Valid;

/** Cheque pre-datado (livro, cap. 16). */
@RestController
@RequestMapping("/api/cheques")
public class ChequeController {

    private final ChequeService service;

    public ChequeController(ChequeService service) {
        this.service = service;
    }

    @GetMapping
    public List<ChequeResponse> listar(
            @RequestParam(required = false) String situacao,
            @RequestParam(required = false) Long pessoaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.listar(situacao, pessoaId, de, ate);
    }

    /** Cheques em carteira cuja data de deposito ja chegou. */
    @GetMapping("/a-depositar")
    public List<ChequeResponse> aDepositar() {
        return service.aDepositar();
    }

    @GetMapping("/{id}")
    public ChequeResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    public ResponseEntity<ChequeResponse> cadastrar(@RequestBody @Valid ChequeRequest req) {
        ChequeResponse criado = service.cadastrar(req);
        return ResponseEntity.created(URI.create("/api/cheques/" + criado.id())).body(criado);
    }

    @PutMapping("/{id}")
    public ChequeResponse alterar(@PathVariable Long id, @RequestBody @Valid ChequeRequest req) {
        return service.alterar(id, req);
    }

    @PostMapping("/{id}/situacao")
    public ChequeResponse mudarSituacao(@PathVariable Long id,
                                        @RequestBody @Valid MudancaSituacaoRequest req) {
        return service.mudarSituacao(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
