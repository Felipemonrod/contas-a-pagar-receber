package com.ifgoianomih.contas_pagar.planoconta;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.planoconta.PlanoContaDtos.PlanoContaItemResponse;
import com.ifgoianomih.contas_pagar.planoconta.PlanoContaDtos.PlanoContaRequest;
import com.ifgoianomih.contas_pagar.planoconta.PlanoContaDtos.PlanoContaResponse;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * Manutencao do plano de contas (livro, cap. 3 p. 48-49 e cap. 11).
 *
 * O plano e uma arvore: cada conta pode ter uma conta superior. Contas
 * consolidadas agrupam outras e nao recebem lancamento (RN01).
 */
@Service
@Transactional(readOnly = true)
public class PlanoContaService {

    private final PlanoContaRepository repository;

    public PlanoContaService(PlanoContaRepository repository) {
        this.repository = repository;
    }

    // ------------------------------------------------------------------
    // Consultas
    // ------------------------------------------------------------------

    /** Arvore completa, a partir das contas de primeiro nivel. */
    public List<PlanoContaResponse> listarArvore() {
        return repository.findBySuperiorIsNullOrderByCodigo().stream()
                .map(this::montarComSubcontas)
                .toList();
    }

    /**
     * Apenas as contas que aceitam lancamento. E a lista que a tela de
     * titulo usa para escolher a categoria.
     */
    public List<PlanoContaItemResponse> listarAnaliticas() {
        return repository.findByConsolidadaFalseOrderByCodigo().stream()
                .map(c -> new PlanoContaItemResponse(c.getId(), c.getCodigo(), c.getDescricao(), c.getConsolidada()))
                .toList();
    }

    public PlanoContaResponse buscar(Long id) {
        return montarComSubcontas(carregar(id));
    }

    private PlanoConta carregar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Conta do plano de contas", id));
    }

    /** Percorre a arvore montando o DTO. Roda dentro da transacao. */
    private PlanoContaResponse montarComSubcontas(PlanoConta conta) {
        List<PlanoContaResponse> filhas = conta.getSubcontas().stream()
                .sorted((a, b) -> a.getCodigo().compareTo(b.getCodigo()))
                .map(this::montarComSubcontas)
                .toList();

        return new PlanoContaResponse(
                conta.getId(),
                conta.getCodigo(),
                conta.getDescricao(),
                conta.getConsolidada(),
                conta.getSuperior() != null ? conta.getSuperior().getCodigo() : null,
                filhas);
    }

    // ------------------------------------------------------------------
    // Manutencao
    // ------------------------------------------------------------------

    @Transactional
    public PlanoContaResponse criar(PlanoContaRequest req) {
        if (repository.existsByCodigo(req.codigo())) {
            throw new NegocioException("Ja existe uma conta com o codigo " + req.codigo() + ".");
        }

        PlanoConta conta = new PlanoConta();
        conta.setCodigo(req.codigo());
        conta.setDescricao(req.descricao());
        conta.setConsolidada(Boolean.TRUE.equals(req.consolidada()));
        conta.setSuperior(resolverSuperior(req.codigoSuperior()));

        return montarComSubcontas(repository.save(conta));
    }

    @Transactional
    public PlanoContaResponse alterar(Long id, PlanoContaRequest req) {
        PlanoConta conta = carregar(id);

        repository.findByCodigo(req.codigo())
                .filter(outra -> !outra.getId().equals(id))
                .ifPresent(outra -> {
                    throw new NegocioException("O codigo " + req.codigo() + " ja pertence a outra conta.");
                });

        PlanoConta novoSuperior = resolverSuperior(req.codigoSuperior());
        validarHierarquia(conta, novoSuperior);

        boolean querSerAnalitica = !Boolean.TRUE.equals(req.consolidada());
        if (querSerAnalitica && !conta.getSubcontas().isEmpty()) {
            throw new NegocioException(
                    "A conta '%s' tem subcontas e por isso precisa permanecer consolidada."
                            .formatted(conta.getDescricao()));
        }

        conta.setCodigo(req.codigo());
        conta.setDescricao(req.descricao());
        conta.setConsolidada(Boolean.TRUE.equals(req.consolidada()));
        conta.setSuperior(novoSuperior);

        return montarComSubcontas(repository.save(conta));
    }

    @Transactional
    public void excluir(Long id) {
        PlanoConta conta = carregar(id);

        if (!conta.getSubcontas().isEmpty()) {
            throw new NegocioException(
                    "A conta '%s' possui %d subconta(s) e nao pode ser excluida."
                            .formatted(conta.getDescricao(), conta.getSubcontas().size()));
        }

        // A FK do rateio impede a exclusao de uma conta em uso; o
        // ApiExceptionHandler traduz isso para 409.
        repository.delete(conta);
    }

    // ------------------------------------------------------------------
    // Regras da hierarquia
    // ------------------------------------------------------------------

    private PlanoConta resolverSuperior(String codigoSuperior) {
        if (codigoSuperior == null || codigoSuperior.isBlank()) {
            return null;
        }

        PlanoConta superior = repository.findByCodigo(codigoSuperior)
                .orElseThrow(() -> new NegocioException("Conta superior inexistente: " + codigoSuperior + "."));

        // RN01: so uma conta consolidada pode agrupar outras.
        if (!Boolean.TRUE.equals(superior.getConsolidada())) {
            throw new NegocioException(
                    "A conta '%s' nao e consolidada e por isso nao pode ter subcontas."
                            .formatted(superior.getDescricao()));
        }
        return superior;
    }

    /** Impede que uma conta vire subconta dela mesma ou de uma descendente. */
    private void validarHierarquia(PlanoConta conta, PlanoConta novoSuperior) {
        PlanoConta atual = novoSuperior;
        while (atual != null) {
            if (atual.getId().equals(conta.getId())) {
                throw new NegocioException(
                        "A conta '%s' nao pode ficar subordinada a si mesma ou a uma de suas subcontas."
                                .formatted(conta.getDescricao()));
            }
            atual = atual.getSuperior();
        }
    }
}
