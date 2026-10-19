package com.ifgoianomih.contas_pagar.contapagar;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarResponse;
import com.ifgoianomih.contas_pagar.contapagar.dto.QuitacaoRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.RateioRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.SimulacaoQuitacaoResponse;
import com.ifgoianomih.contas_pagar.dominio.FormaPagamento;
import com.ifgoianomih.contas_pagar.dominio.FormaPagamentoRepository;
import com.ifgoianomih.contas_pagar.dominio.SituacaoConta;
import com.ifgoianomih.contas_pagar.dominio.SituacaoContaRepository;
import com.ifgoianomih.contas_pagar.dominio.Situacoes;
import com.ifgoianomih.contas_pagar.dominio.TipoTitulo;
import com.ifgoianomih.contas_pagar.dominio.TipoTituloRepository;
import com.ifgoianomih.contas_pagar.pessoa.Pessoa;
import com.ifgoianomih.contas_pagar.pessoa.PessoaRepository;
import com.ifgoianomih.contas_pagar.planoconta.PlanoConta;
import com.ifgoianomih.contas_pagar.planoconta.PlanoContaRepository;
import com.ifgoianomih.contas_pagar.shared.encargo.CalculadoraEncargos;
import com.ifgoianomih.contas_pagar.shared.encargo.Encargos;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * PADRAO SERVICE LAYER: concentra as regras de negocio. O controller so
 * recebe e devolve HTTP; o repositorio so fala com o banco.
 *
 * Tambem funciona como FACADE: expoe operacoes simples ("lancar", "quitar")
 * sobre varios repositorios e sobre a calculadora de encargos.
 *
 * @Transactional garante que, se algo falhar no meio, nada e gravado pela
 * metade. E o Spring que cria a transacao, usando um PROXY em volta desta
 * classe.
 */
@Service
@Transactional(readOnly = true)
public class ContaPagarService {

    private static final String PAPEL_FORNECEDOR = "FORNECEDOR";

    private final ContaPagarRepository contaRepository;
    private final PessoaRepository pessoaRepository;
    private final PlanoContaRepository planoContaRepository;
    private final TipoTituloRepository tipoTituloRepository;
    private final SituacaoContaRepository situacaoRepository;
    private final FormaPagamentoRepository formaPagamentoRepository;
    private final CalculadoraEncargos calculadora;
    private final ContaPagarMapper mapper;

    public ContaPagarService(ContaPagarRepository contaRepository,
                             PessoaRepository pessoaRepository,
                             PlanoContaRepository planoContaRepository,
                             TipoTituloRepository tipoTituloRepository,
                             SituacaoContaRepository situacaoRepository,
                             FormaPagamentoRepository formaPagamentoRepository,
                             CalculadoraEncargos calculadora,
                             ContaPagarMapper mapper) {
        this.contaRepository = contaRepository;
        this.pessoaRepository = pessoaRepository;
        this.planoContaRepository = planoContaRepository;
        this.tipoTituloRepository = tipoTituloRepository;
        this.situacaoRepository = situacaoRepository;
        this.formaPagamentoRepository = formaPagamentoRepository;
        this.calculadora = calculadora;
        this.mapper = mapper;
    }

    // ------------------------------------------------------------------
    // Consultas
    // ------------------------------------------------------------------

    public List<ContaPagarResponse> listar(String situacao, LocalDate de, LocalDate ate) {
        if (situacao != null && de != null && ate != null) {
            return mapper.paraResposta(
                    contaRepository.findBySituacaoCodigoAndVencimentoBetweenOrderByVencimento(situacao, de, ate));
        }
        if (de != null && ate != null) {
            return mapper.paraResposta(contaRepository.findByVencimentoBetweenOrderByVencimento(de, ate));
        }
        if (situacao != null) {
            return mapper.paraResposta(contaRepository.findBySituacaoCodigoOrderByVencimento(situacao));
        }
        return mapper.paraResposta(contaRepository.findAll());
    }

    public ContaPagarResponse buscar(Long id) {
        return mapper.paraResposta(carregar(id));
    }

    /**
     * Uso interno: devolve a entidade gerenciada. So e chamado dentro de uma
     * transacao - por isso as colecoes (rateios, pagamentos) podem ser lidas.
     */
    private ContaPagar carregar(Long id) {
        return contaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Conta a pagar", id));
    }

    /** Titulos vencidos e ainda em aberto. */
    public List<ContaPagarResponse> inadimplentes() {
        return mapper.paraResposta(
                contaRepository.findBySituacaoCodigoAndVencimentoBefore(Situacoes.ABERTA, LocalDate.now()));
    }

    // ------------------------------------------------------------------
    // Lancamento de titulo
    // ------------------------------------------------------------------

    @Transactional
    public ContaPagarResponse lancar(ContaPagarRequest req) {
        return mapper.paraResposta(lancarTitulo(req));
    }

    /**
     * Mesma regra de lancamento, devolvendo a entidade. Usado pelo modulo de
     * despesas, que precisa guardar a referencia ao titulo gerado.
     * So deve ser chamado de dentro de uma transacao.
     */
    @Transactional
    public ContaPagar lancarTitulo(ContaPagarRequest req) {
        if (contaRepository.existsByNumeroTitulo(req.numeroTitulo())) {
            throw new NegocioException("Ja existe um titulo com o numero " + req.numeroTitulo() + ".");
        }
        if (req.vencimento().isBefore(req.emissao())) {
            throw new NegocioException("O vencimento nao pode ser anterior a emissao.");
        }

        Pessoa fornecedor = exigirPessoaComFornecedor(req.pessoaId());
        TipoTitulo tipo = exigirTipoTitulo(req.tipoTitulo());

        ContaPagar conta = new ContaPagar();
        conta.setNumeroTitulo(req.numeroTitulo());
        conta.setPessoa(fornecedor);
        conta.setTipoTitulo(tipo);
        conta.setSituacao(situacao(Situacoes.ABERTA));
        conta.setValor(req.valor());
        conta.setEmissao(req.emissao());
        conta.setVencimento(req.vencimento());
        conta.setDesconto(ContaPagarMapper.ouZero(req.desconto()));
        conta.setValidadeDesconto(req.validadeDesconto());
        conta.setAcrescimoDia(ContaPagarMapper.ouZero(req.acrescimoDia()));
        conta.setObservacao(req.observacao());

        aplicarRateios(conta, req.rateios());

        return contaRepository.save(conta);
    }

    private void aplicarRateios(ContaPagar conta, List<RateioRequest> pedidos) {
        if (pedidos == null || pedidos.isEmpty()) {
            return;
        }

        BigDecimal somaRateio = BigDecimal.ZERO;

        for (RateioRequest pedido : pedidos) {
            PlanoConta categoria = planoContaRepository.findById(pedido.planoContaId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria", pedido.planoContaId()));

            // RN01 (livro, cap. 3, p. 48): conta consolidada agrupa outras
            // e nao recebe lancamento.
            if (!categoria.aceitaLancamento()) {
                throw new NegocioException(
                        "A categoria '%s' e consolidada e nao aceita lancamento.".formatted(categoria.getDescricao()));
            }

            RateioContaPagar rateio = new RateioContaPagar();
            rateio.setContaPagar(conta);
            rateio.setPlanoConta(categoria);
            rateio.setValor(pedido.valor());
            conta.getRateios().add(rateio);

            somaRateio = somaRateio.add(pedido.valor());
        }

        if (somaRateio.compareTo(conta.getValor()) != 0) {
            throw new NegocioException(
                    "A soma do rateio (%s) difere do valor do titulo (%s).".formatted(somaRateio, conta.getValor()));
        }
    }

    /**
     * Ajusta o rateio de um titulo que ja existe.
     *
     * Nao da para simplesmente limpar a colecao e reinserir: a tabela tem
     * restricao de unicidade por (titulo, categoria), e ao reenviar o mesmo
     * rateio o banco recusa a nova linha antes de a antiga ser removida.
     *
     * Entao as linhas que permanecem sao atualizadas no lugar, as que
     * sairam do pedido sao removidas e so as realmente novas sao criadas.
     */
    private void reconciliarRateios(ContaPagar conta, List<RateioRequest> pedidos) {
        List<RateioRequest> novos = pedidos != null ? pedidos : List.of();

        BigDecimal soma = novos.stream()
                .map(RateioRequest::valor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (!novos.isEmpty() && soma.compareTo(conta.getValor()) != 0) {
            throw new NegocioException(
                    "A soma do rateio (%s) difere do valor do titulo (%s).".formatted(soma, conta.getValor()));
        }

        Set<Long> categoriasPedidas = novos.stream()
                .map(RateioRequest::planoContaId)
                .collect(Collectors.toSet());

        // Fora do pedido: remove (o orphanRemoval cuida do DELETE)
        conta.getRateios().removeIf(r -> !categoriasPedidas.contains(r.getPlanoConta().getId()));

        for (RateioRequest pedido : novos) {
            PlanoConta categoria = exigirCategoriaAnalitica(pedido.planoContaId());

            conta.getRateios().stream()
                    .filter(r -> r.getPlanoConta().getId().equals(categoria.getId()))
                    .findFirst()
                    .ifPresentOrElse(
                            existente -> existente.setValor(pedido.valor()),
                            () -> {
                                RateioContaPagar r = new RateioContaPagar();
                                r.setContaPagar(conta);
                                r.setPlanoConta(categoria);
                                r.setValor(pedido.valor());
                                conta.getRateios().add(r);
                            });
        }
    }

    /** RN01: conta consolidada agrupa outras e nao aceita lancamento. */
    private PlanoConta exigirCategoriaAnalitica(Long planoContaId) {
        PlanoConta categoria = planoContaRepository.findById(planoContaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria", planoContaId));

        if (!categoria.aceitaLancamento()) {
            throw new NegocioException(
                    "A categoria '%s' e consolidada e nao aceita lancamento.".formatted(categoria.getDescricao()));
        }
        return categoria;
    }

    // ------------------------------------------------------------------
    // Quitacao
    // ------------------------------------------------------------------

    /** Previa do valor devido numa data, sem gravar nada. */
    public SimulacaoQuitacaoResponse simular(Long id, LocalDate data) {
        ContaPagar conta = carregar(id);
        LocalDate dataSimulada = data != null ? data : LocalDate.now();
        Encargos encargos = calculadora.calcular(conta, dataSimulada);

        return new SimulacaoQuitacaoResponse(
                dataSimulada,
                conta.saldoDevedor(),
                encargos.desconto(),
                encargos.acrescimo(),
                encargos.aplicarSobre(conta.saldoDevedor()));
    }

    /**
     * RN07: quitar e registrar um pagamento, nunca apagar o titulo.
     * Aceita pagamento parcial - a situacao vira PARCIAL ate o saldo zerar.
     */
    @Transactional
    public ContaPagarResponse quitar(Long id, QuitacaoRequest req) {
        ContaPagar conta = carregar(id);

        if (Situacoes.CANCELADA.equals(conta.getSituacao().getCodigo())) {
            throw new NegocioException("Titulo cancelado nao pode ser quitado.");
        }
        if (conta.quitado()) {
            throw new NegocioException("Titulo " + conta.getNumeroTitulo() + " ja esta quitado.");
        }
        if (req.dataPagamento().isBefore(conta.getEmissao())) {
            throw new NegocioException("O pagamento nao pode ser anterior a emissao do titulo.");
        }

        FormaPagamento forma = formaPagamentoRepository.findByCodigo(req.formaPagamento())
                .orElseThrow(() -> new NegocioException("Forma de pagamento invalida: " + req.formaPagamento()));

        // As Strategies decidem desconto e juros para esta data.
        Encargos encargos = calculadora.calcular(conta, req.dataPagamento());
        BigDecimal valorDevido = encargos.aplicarSobre(conta.saldoDevedor());

        BigDecimal valorPago = req.valorPago() != null ? req.valorPago() : valorDevido;
        if (valorPago.compareTo(valorDevido) > 0) {
            throw new NegocioException(
                    "O valor pago (%s) excede o devido nesta data (%s).".formatted(valorPago, valorDevido));
        }

        Pagamento pagamento = new Pagamento();
        pagamento.setContaPagar(conta);
        pagamento.setFormaPagamento(forma);
        pagamento.setDataPagamento(req.dataPagamento());
        pagamento.setValorPago(valorPago);
        pagamento.setDescontoAplicado(encargos.desconto());
        pagamento.setAcrescimoAplicado(encargos.acrescimo());
        pagamento.setObservacao(req.observacao());
        conta.getPagamentos().add(pagamento);

        boolean integral = valorPago.compareTo(valorDevido) == 0;
        conta.setSituacao(situacao(integral ? Situacoes.PAGA : Situacoes.PARCIAL));

        return mapper.paraResposta(contaRepository.save(conta));
    }

    // ------------------------------------------------------------------
    // Alteracao e cancelamento
    // ------------------------------------------------------------------

    @Transactional
    public ContaPagarResponse alterar(Long id, ContaPagarRequest req) {
        ContaPagar conta = carregar(id);

        if (!conta.getPagamentos().isEmpty()) {
            throw new NegocioException("Titulo com pagamento registrado nao pode ser alterado.");
        }

        // Numero do titulo: so valida a unicidade se de fato mudou.
        if (!conta.getNumeroTitulo().equals(req.numeroTitulo())) {
            if (contaRepository.existsByNumeroTitulo(req.numeroTitulo())) {
                throw new NegocioException(
                        "Ja existe um titulo com o numero " + req.numeroTitulo() + ".");
            }
            conta.setNumeroTitulo(req.numeroTitulo());
        }

        // Trocar a pessoa exige o mesmo papel que o lancamento exige.
        if (!conta.getPessoa().getId().equals(req.pessoaId())) {
            conta.setPessoa(exigirPessoaComFornecedor(req.pessoaId()));
        }

        conta.setTipoTitulo(exigirTipoTitulo(req.tipoTitulo()));
        conta.setValor(req.valor());
        conta.setEmissao(req.emissao());
        conta.setVencimento(req.vencimento());
        conta.setDesconto(ContaPagarMapper.ouZero(req.desconto()));
        conta.setValidadeDesconto(req.validadeDesconto());
        conta.setAcrescimoDia(ContaPagarMapper.ouZero(req.acrescimoDia()));
        conta.setObservacao(req.observacao());

        reconciliarRateios(conta, req.rateios());

        return mapper.paraResposta(contaRepository.save(conta));
    }

    /** RN07: cancelar muda a situacao; o registro continua na base. */
    @Transactional
    public ContaPagarResponse cancelar(Long id) {
        ContaPagar conta = carregar(id);

        if (!conta.getPagamentos().isEmpty()) {
            throw new NegocioException("Titulo com pagamento registrado nao pode ser cancelado.");
        }

        conta.setSituacao(situacao(Situacoes.CANCELADA));
        return mapper.paraResposta(contaRepository.save(conta));
    }

    /**
     * Marca como VENCIDA todo titulo em aberto cujo vencimento ja passou.
     * O livro derivava isso na tela; aqui a situacao e dado explicito.
     */
    @Transactional
    public int atualizarVencidas() {
        List<ContaPagar> vencidas =
                contaRepository.findBySituacaoCodigoAndVencimentoBefore(Situacoes.ABERTA, LocalDate.now());
        SituacaoConta situacaoVencida = situacao(Situacoes.VENCIDA);
        vencidas.forEach(c -> c.setSituacao(situacaoVencida));
        contaRepository.saveAll(vencidas);
        return vencidas.size();
    }

    /**
     * RN04 (livro, cap. 3, p. 56): titulo so pode ser vinculado a quem esta
     * cadastrado com o papel correspondente. Vale tanto no lancamento
     * quanto na troca de pessoa durante a alteracao.
     */
    private Pessoa exigirPessoaComFornecedor(Long pessoaId) {
        Pessoa pessoa = pessoaRepository.findById(pessoaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Pessoa", pessoaId));

        if (!pessoa.temPapel(PAPEL_FORNECEDOR)) {
            throw new NegocioException(
                    "A pessoa '%s' nao esta cadastrada como fornecedor.".formatted(pessoa.getNome()));
        }
        return pessoa;
    }

    private TipoTitulo exigirTipoTitulo(String codigo) {
        return tipoTituloRepository.findByCodigo(codigo)
                .orElseThrow(() -> new NegocioException("Tipo de titulo invalido: " + codigo));
    }

    private SituacaoConta situacao(String codigo) {
        return situacaoRepository.findByCodigo(codigo)
                .orElseThrow(() -> new IllegalStateException(
                        "Situacao '" + codigo + "' ausente. Verifique a migration V2."));
    }
}
