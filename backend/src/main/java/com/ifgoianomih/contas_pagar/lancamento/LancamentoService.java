package com.ifgoianomih.contas_pagar.lancamento;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.lancamento.LancamentoDtos.LancamentoRequest;
import com.ifgoianomih.contas_pagar.lancamento.LancamentoDtos.LancamentoResponse;
import com.ifgoianomih.contas_pagar.planoconta.PlanoConta;
import com.ifgoianomih.contas_pagar.planoconta.PlanoContaRepository;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * Lancamento contabil (livro, cap. 12).
 *
 * RN01 vale aqui tambem: conta consolidada agrupa outras e nao recebe
 * lancamento. RN14: credito e debito precisam ser contas diferentes.
 */
@Service
@Transactional(readOnly = true)
public class LancamentoService {

    private final LancamentoRepository repository;
    private final PlanoContaRepository planoContaRepository;

    public LancamentoService(LancamentoRepository repository,
                             PlanoContaRepository planoContaRepository) {
        this.repository = repository;
        this.planoContaRepository = planoContaRepository;
    }

    public List<LancamentoResponse> listar(LocalDate de, LocalDate ate, String status) {
        List<Lancamento> lancamentos;
        if (de != null && ate != null) {
            lancamentos = repository.findByDataBetweenOrderByDataDescIdDesc(de, ate);
        } else if (status != null && !status.isBlank()) {
            lancamentos = repository.findByStatusOrderByDataDescIdDesc(status);
        } else {
            lancamentos = repository.findAllByOrderByDataDescIdDesc();
        }
        return lancamentos.stream().map(this::paraResposta).toList();
    }

    /** Extrato de uma conta: tudo que passou por ela, dos dois lados. */
    public List<LancamentoResponse> porConta(Long planoContaId) {
        return repository.findByContaCreditoIdOrContaDebitoIdOrderByDataDesc(planoContaId, planoContaId)
                .stream().map(this::paraResposta).toList();
    }

    public LancamentoResponse buscar(Long id) {
        return paraResposta(carregar(id));
    }

    @Transactional
    public LancamentoResponse lancar(LancamentoRequest req) {
        if (req.contaCreditoId().equals(req.contaDebitoId())) {
            throw new NegocioException(
                    "A conta de credito e a de debito precisam ser diferentes.");
        }

        PlanoConta credito = exigirContaAnalitica(req.contaCreditoId(), "credito");
        PlanoConta debito = exigirContaAnalitica(req.contaDebitoId(), "debito");

        Lancamento lancamento = new Lancamento();
        lancamento.setContaCredito(credito);
        lancamento.setContaDebito(debito);
        lancamento.setValor(req.valor());
        lancamento.setDescricao(req.descricao());
        lancamento.setData(req.data());
        lancamento.setStatus("ATIVO");

        return paraResposta(repository.save(lancamento));
    }

    /**
     * Lancamento contabil nao se apaga: estorna-se.
     * Apagar quebraria a rastreabilidade do movimento.
     */
    @Transactional
    public LancamentoResponse estornar(Long id) {
        Lancamento lancamento = carregar(id);

        if (lancamento.estornado()) {
            throw new NegocioException("Este lancamento ja foi estornado.");
        }

        lancamento.setStatus("ESTORNADO");
        return paraResposta(repository.save(lancamento));
    }

    private PlanoConta exigirContaAnalitica(Long id, String lado) {
        PlanoConta conta = planoContaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Conta de " + lado, id));

        if (!conta.aceitaLancamento()) {
            throw new NegocioException(
                    "A conta de %s '%s' e consolidada e nao aceita lancamento."
                            .formatted(lado, conta.getDescricao()));
        }
        return conta;
    }

    private Lancamento carregar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Lancamento", id));
    }

    private LancamentoResponse paraResposta(Lancamento l) {
        return new LancamentoResponse(
                l.getId(),
                l.getContaCredito().getId(),
                l.getContaCredito().getCodigo() + " - " + l.getContaCredito().getDescricao(),
                l.getContaDebito().getId(),
                l.getContaDebito().getCodigo() + " - " + l.getContaDebito().getDescricao(),
                l.getValor(), l.getDescricao(), l.getData(), l.getStatus());
    }
}
