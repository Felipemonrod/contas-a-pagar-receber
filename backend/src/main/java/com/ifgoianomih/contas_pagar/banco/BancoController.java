package com.ifgoianomih.contas_pagar.banco;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ifgoianomih.contas_pagar.banco.BancoDtos.AgenciaRequest;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.AgenciaResponse;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.BancoItemResponse;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.BancoRequest;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.BancoResponse;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.ContaCorrenteRequest;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.ContaCorrenteResponse;

import jakarta.validation.Valid;

/** Cadastro bancario: bancos, agencias e contas correntes (livro, cap. 9). */
@RestController
@RequestMapping("/api")
public class BancoController {

    private final BancoService service;

    public BancoController(BancoService service) {
        this.service = service;
    }

    // ------------------------------------------------------------ banco

    @GetMapping("/bancos")
    public List<BancoResponse> listarBancos(@RequestParam(required = false) String nome) {
        return service.listarBancos(nome);
    }

    @GetMapping("/bancos/selecao")
    public List<BancoItemResponse> listarParaSelecao() {
        return service.listarBancosParaSelecao();
    }

    @GetMapping("/bancos/{id}")
    public BancoResponse buscarBanco(@PathVariable Long id) {
        return service.buscarBanco(id);
    }

    @PostMapping("/bancos")
    public ResponseEntity<BancoResponse> criarBanco(@RequestBody @Valid BancoRequest req) {
        BancoResponse criado = service.criarBanco(req);
        return ResponseEntity.created(URI.create("/api/bancos/" + criado.id())).body(criado);
    }

    @PutMapping("/bancos/{id}")
    public BancoResponse alterarBanco(@PathVariable Long id, @RequestBody @Valid BancoRequest req) {
        return service.alterarBanco(id, req);
    }

    @DeleteMapping("/bancos/{id}")
    public ResponseEntity<Void> excluirBanco(@PathVariable Long id) {
        service.excluirBanco(id);
        return ResponseEntity.noContent().build();
    }

    // ---------------------------------------------------------- agencia

    @GetMapping("/agencias")
    public List<AgenciaResponse> listarAgencias(@RequestParam(required = false) Long bancoId) {
        return service.listarAgencias(bancoId);
    }

    @GetMapping("/agencias/{id}")
    public AgenciaResponse buscarAgencia(@PathVariable Long id) {
        return service.buscarAgencia(id);
    }

    @PostMapping("/agencias")
    public ResponseEntity<AgenciaResponse> criarAgencia(@RequestBody @Valid AgenciaRequest req) {
        AgenciaResponse criada = service.criarAgencia(req);
        return ResponseEntity.created(URI.create("/api/agencias/" + criada.id())).body(criada);
    }

    @PutMapping("/agencias/{id}")
    public AgenciaResponse alterarAgencia(@PathVariable Long id, @RequestBody @Valid AgenciaRequest req) {
        return service.alterarAgencia(id, req);
    }

    @DeleteMapping("/agencias/{id}")
    public ResponseEntity<Void> excluirAgencia(@PathVariable Long id) {
        service.excluirAgencia(id);
        return ResponseEntity.noContent().build();
    }

    // --------------------------------------------------- conta corrente

    @GetMapping("/contas-correntes")
    public List<ContaCorrenteResponse> listarContas(@RequestParam(required = false) Long agenciaId) {
        return service.listarContas(agenciaId);
    }

    @GetMapping("/contas-correntes/ativas")
    public List<ContaCorrenteResponse> listarContasAtivas() {
        return service.listarContasAtivas();
    }

    @GetMapping("/contas-correntes/{id}")
    public ContaCorrenteResponse buscarConta(@PathVariable Long id) {
        return service.buscarConta(id);
    }

    @PostMapping("/contas-correntes")
    public ResponseEntity<ContaCorrenteResponse> criarConta(@RequestBody @Valid ContaCorrenteRequest req) {
        ContaCorrenteResponse criada = service.criarConta(req);
        return ResponseEntity.created(URI.create("/api/contas-correntes/" + criada.id())).body(criada);
    }

    @PutMapping("/contas-correntes/{id}")
    public ContaCorrenteResponse alterarConta(@PathVariable Long id,
                                              @RequestBody @Valid ContaCorrenteRequest req) {
        return service.alterarConta(id, req);
    }

    @DeleteMapping("/contas-correntes/{id}")
    public ContaCorrenteResponse desativarConta(@PathVariable Long id) {
        return service.desativarConta(id);
    }
}
