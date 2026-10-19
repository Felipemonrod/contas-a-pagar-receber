package com.ifgoianomih.contas_pagar.cartorio;

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

import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.BaixaRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.CartorioRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.CartorioResponse;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.ProtestoRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.RemessaRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.RemessaResponse;

import jakarta.validation.Valid;

/** Cartorios e remessa de titulos para protesto (livro, cap. 10 e 17). */
@RestController
@RequestMapping("/api")
public class CartorioController {

    private final CartorioService service;

    public CartorioController(CartorioService service) {
        this.service = service;
    }

    // --------------------------------------------------------- cartorio

    @GetMapping("/cartorios")
    public List<CartorioResponse> listar() {
        return service.listar();
    }

    @GetMapping("/cartorios/{id}")
    public CartorioResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping("/cartorios")
    public ResponseEntity<CartorioResponse> cadastrar(@RequestBody @Valid CartorioRequest req) {
        CartorioResponse criado = service.cadastrar(req);
        return ResponseEntity.created(URI.create("/api/cartorios/" + criado.id())).body(criado);
    }

    @PutMapping("/cartorios/{id}")
    public CartorioResponse alterar(@PathVariable Long id, @RequestBody @Valid CartorioRequest req) {
        return service.alterar(id, req);
    }

    @DeleteMapping("/cartorios/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---------------------------------------------------------- remessa

    @GetMapping("/remessas-cartorio")
    public List<RemessaResponse> listarRemessas(@RequestParam(required = false) Long cartorioId,
                                                @RequestParam(required = false) Boolean emAberto) {
        return service.listarRemessas(cartorioId, emAberto);
    }

    @GetMapping("/remessas-cartorio/{id}")
    public RemessaResponse buscarRemessa(@PathVariable Long id) {
        return service.buscarRemessa(id);
    }

    @PostMapping("/remessas-cartorio")
    public ResponseEntity<RemessaResponse> enviar(@RequestBody @Valid RemessaRequest req) {
        RemessaResponse criada = service.enviarParaProtesto(req);
        return ResponseEntity.created(URI.create("/api/remessas-cartorio/" + criada.id())).body(criada);
    }

    @PostMapping("/remessas-cartorio/{id}/protesto")
    public RemessaResponse registrarProtesto(@PathVariable Long id,
                                             @RequestBody @Valid ProtestoRequest req) {
        return service.registrarProtesto(id, req);
    }

    @PostMapping("/remessas-cartorio/{id}/baixa")
    public RemessaResponse registrarBaixa(@PathVariable Long id, @RequestBody @Valid BaixaRequest req) {
        return service.registrarBaixa(id, req);
    }
}
