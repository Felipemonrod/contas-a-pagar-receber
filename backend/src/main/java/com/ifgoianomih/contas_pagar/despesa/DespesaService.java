package com.ifgoianomih.contas_pagar.despesa;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.contapagar.ContaPagar;
import com.ifgoianomih.contas_pagar.contapagar.ContaPagarService;
import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.RateioRequest;
import com.ifgoianomih.contas_pagar.despesa.DespesaDtos.DespesaRequest;
import com.ifgoianomih.contas_pagar.despesa.DespesaDtos.DespesaResponse;
import com.ifgoianomih.contas_pagar.despesa.DespesaDtos.GerarTituloRequest;
import com.ifgoianomih.contas_pagar.planoconta.PlanoConta;
import com.ifgoianomih.contas_pagar.planoconta.PlanoContaRepository;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * Despesas previstas (livro, cap. 3 p. 51 e 54-55).
 *
 * RN03: a despesa e cadastrada antes, com valor previsto e previsao de
 * pagamento. Quando a fatura chega, ela vira um titulo a pagar com o valor
 * e o vencimento reais - que raramente batem com a previsao.
 */
@Service
@Transactional(readOnly = true)
public class DespesaService {

    private static final String TIPO_PADRAO = "OUTROS";

    private final DespesaRepository repository;
    private final PlanoContaRepository planoContaRepository;
    private final ContaPagarService contaPagarService;

    public DespesaService(DespesaRepository repository,
                          PlanoContaRepository planoContaRepository,
                          ContaPagarService contaPagarService) {
        this.repository = repository;
        this.planoContaRepository = planoContaRepository;
        this.contaPagarService = contaPagarService;
    }

    // ------------------------------------------------------------------
    // Consultas
    // ------------------------------------------------------------------

    public List<DespesaResponse> listar(Boolean somentePrevistas, LocalDate de, LocalDate ate) {
        List<Despesa> despesas;

        if (Boolean.TRUE.equals(somentePrevistas)) {
            despesas = repository.findByContaPagarIsNullOrderByPrevisaoPagamento();
        } else if (de != null && ate != null) {
            despesas = repository.findByPrevisaoPagamentoBetweenOrderByPrevisaoPagamento(de, ate);
        } else {
            despesas = repository.findAll();
        }
        return despesas.stream().map(this::paraResposta).toList();
    }

    public DespesaResponse buscar(Long id) {
        return paraResposta(carregar(id));
    }

    private Despesa carregar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Despesa", id));
    }

    // ------------------------------------------------------------------
    // Manutencao da previsao
    // ------------------------------------------------------------------

    @Transactional
    public DespesaResponse cadastrar(DespesaRequest req) {
        Despesa despesa = new Despesa();
        preencher(despesa, req);
        despesa.setDataLancamento(LocalDate.now());
        return paraResposta(repository.save(despesa));
    }

    @Transactional
    public DespesaResponse alterar(Long id, DespesaRequest req) {
        Despesa despesa = carregar(id);

        if (despesa.realizada()) {
            throw new NegocioException(
                    "A despesa '%s' ja gerou o titulo %s e nao pode mais ser alterada."
                            .formatted(despesa.getDescricao(), despesa.getContaPagar().getNumeroTitulo()));
        }

        preencher(despesa, req);
        return paraResposta(repository.save(despesa));
    }

    @Transactional
    public void excluir(Long id) {
        Despesa despesa = carregar(id);

        if (despesa.realizada()) {
            throw new NegocioException(
                    "A despesa '%s' ja gerou um titulo e nao pode ser excluida."
                            .formatted(despesa.getDescricao()));
        }
        repository.delete(despesa);
    }

    private void preencher(Despesa despesa, DespesaRequest req) {
        PlanoConta categoria = planoContaRepository.findById(req.planoContaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria", req.planoContaId()));

        // RN01: conta consolidada nao recebe lancamento.
        if (!categoria.aceitaLancamento()) {
            throw new NegocioException(
                    "A categoria '%s' e consolidada e nao aceita lancamento.".formatted(categoria.getDescricao()));
        }

        despesa.setPlanoConta(categoria);
        despesa.setDescricao(req.descricao());
        despesa.setValorPrevisto(req.valorPrevisto());
        despesa.setPrevisaoPagamento(req.previsaoPagamento());
    }

    // ------------------------------------------------------------------
    // RN03: a previsao vira titulo
    // ------------------------------------------------------------------

    /**
     * Gera o titulo a pagar correspondente a esta despesa, com o valor e o
     * vencimento reais da fatura.
     *
     * O rateio vai integralmente para a categoria da despesa - e ela que
     * define onde o gasto entra no plano de contas.
     */
    @Transactional
    public DespesaResponse gerarTitulo(Long id, GerarTituloRequest req) {
        Despesa despesa = carregar(id);

        if (despesa.realizada()) {
            throw new NegocioException(
                    "A despesa '%s' ja gerou o titulo %s."
                            .formatted(despesa.getDescricao(), despesa.getContaPagar().getNumeroTitulo()));
        }

        ContaPagarRequest pedido = new ContaPagarRequest(
                req.numeroTitulo(),
                req.pessoaId(),
                req.tipoTitulo() != null ? req.tipoTitulo() : TIPO_PADRAO,
                req.valor(),
                req.emissao(),
                req.vencimento(),
                null,   // desconto e negociado no titulo, nao na previsao
                null,
                null,
                "Gerado a partir da despesa: " + despesa.getDescricao(),
                List.of(new RateioRequest(despesa.getPlanoConta().getId(), req.valor())));

        // Reusa a regra de lancamento inteira, inclusive a RN04 (a pessoa
        // precisa estar cadastrada como fornecedor).
        ContaPagar titulo = contaPagarService.lancarTitulo(pedido);
        despesa.setContaPagar(titulo);

        return paraResposta(repository.save(despesa));
    }

    private DespesaResponse paraResposta(Despesa d) {
        return new DespesaResponse(
                d.getId(),
                d.getPlanoConta().getId(),
                d.getPlanoConta().getCodigo() + " - " + d.getPlanoConta().getDescricao(),
                d.getDescricao(),
                d.getValorPrevisto(),
                d.getDataLancamento(),
                d.getPrevisaoPagamento(),
                d.realizada(),
                d.realizada() ? d.getContaPagar().getId() : null,
                d.realizada() ? d.getContaPagar().getNumeroTitulo() : null);
    }
}
