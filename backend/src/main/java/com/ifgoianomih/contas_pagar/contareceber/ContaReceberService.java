package com.ifgoianomih.contas_pagar.contareceber;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.contareceber.dto.ContaReceberRequest;
import com.ifgoianomih.contas_pagar.contareceber.dto.ContaReceberResponse;
import com.ifgoianomih.contas_pagar.contareceber.dto.QuitacaoRecebimentoRequest;
import com.ifgoianomih.contas_pagar.contareceber.dto.RateioRecebimentoRequest;
import com.ifgoianomih.contas_pagar.contareceber.dto.SimulacaoRecebimentoResponse;
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
public class ContaReceberService {

    private static final String PAPEL_CLIENTE = "CLIENTE";

    private final ContaReceberRepository contaRepository;
    private final PessoaRepository pessoaRepository;
    private final PlanoContaRepository planoContaRepository;
    private final TipoTituloRepository tipoTituloRepository;
    private final SituacaoContaRepository situacaoRepository;
    private final FormaPagamentoRepository formaPagamentoRepository;
    private final CalculadoraEncargos calculadora;
    private final ContaReceberMapper mapper;

    public ContaReceberService(ContaReceberRepository contaRepository,
                             PessoaRepository pessoaRepository,
                             PlanoContaRepository planoContaRepository,
                             TipoTituloRepository tipoTituloRepository,
                             SituacaoContaRepository situacaoRepository,
                             FormaPagamentoRepository formaPagamentoRepository,
                             CalculadoraEncargos calculadora,
                             ContaReceberMapper mapper) {
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

    public List<ContaReceberResponse> listar(String situacao, LocalDate de, LocalDate ate) {
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

    public ContaReceberResponse buscar(Long id) {
        return mapper.paraResposta(carregar(id));
    }

    /**
     * Uso interno: devolve a entidade gerenciada. So e chamado dentro de uma
     * transacao - por isso as colecoes (rateios, recebimentos) podem ser lidas.
     */
    private ContaReceber carregar(Long id) {
        return contaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Conta a receber", id));
    }

    /** Titulos vencidos e ainda em aberto. */
    public List<ContaReceberResponse> inadimplentes() {
        return mapper.paraResposta(
                contaRepository.findBySituacaoCodigoAndVencimentoBefore(Situacoes.ABERTA, LocalDate.now()));
    }

    // ------------------------------------------------------------------
    // Lancamento de titulo
    // ------------------------------------------------------------------

    @Transactional
    public ContaReceberResponse lancar(ContaReceberRequest req) {
        if (contaRepository.existsByNumeroTitulo(req.numeroTitulo())) {
            throw new NegocioException("Ja existe um titulo com o numero " + req.numeroTitulo() + ".");
        }
        if (req.vencimento().isBefore(req.emissao())) {
            throw new NegocioException("O vencimento nao pode ser anterior a emissao.");
        }

        Pessoa cliente = pessoaRepository.findById(req.pessoaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Pessoa", req.pessoaId()));

        // RN04 (livro, cap. 3, p. 56): nao se lanca titulo para quem nao e
        // fornecedor cadastrado.
        if (!cliente.temPapel(PAPEL_CLIENTE)) {
            throw new NegocioException(
                    "A pessoa '%s' nao esta cadastrada como cliente.".formatted(cliente.getNome()));
        }

        TipoTitulo tipo = tipoTituloRepository.findByCodigo(req.tipoTitulo())
                .orElseThrow(() -> new NegocioException("Tipo de titulo invalido: " + req.tipoTitulo()));

        ContaReceber conta = new ContaReceber();
        conta.setNumeroTitulo(req.numeroTitulo());
        conta.setPessoa(cliente);
        conta.setTipoTitulo(tipo);
        conta.setSituacao(situacao(Situacoes.ABERTA));
        conta.setValor(req.valor());
        conta.setEmissao(req.emissao());
        conta.setVencimento(req.vencimento());
        conta.setDesconto(ContaReceberMapper.ouZero(req.desconto()));
        conta.setValidadeDesconto(req.validadeDesconto());
        conta.setAcrescimoDia(ContaReceberMapper.ouZero(req.acrescimoDia()));
        conta.setObservacao(req.observacao());

        aplicarRateios(conta, req.rateios());

        return mapper.paraResposta(contaRepository.save(conta));
    }

    private void aplicarRateios(ContaReceber conta, List<RateioRecebimentoRequest> pedidos) {
        if (pedidos == null || pedidos.isEmpty()) {
            return;
        }

        BigDecimal somaRateio = BigDecimal.ZERO;

        for (RateioRecebimentoRequest pedido : pedidos) {
            PlanoConta categoria = planoContaRepository.findById(pedido.planoContaId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria", pedido.planoContaId()));

            // RN01 (livro, cap. 3, p. 48): conta consolidada agrupa outras
            // e nao recebe lancamento.
            if (!categoria.aceitaLancamento()) {
                throw new NegocioException(
                        "A categoria '%s' e consolidada e nao aceita lancamento.".formatted(categoria.getDescricao()));
            }

            RateioContaReceber rateio = new RateioContaReceber();
            rateio.setContaReceber(conta);
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

    // ------------------------------------------------------------------
    // Quitacao
    // ------------------------------------------------------------------

    /** Previa do valor devido numa data, sem gravar nada. */
    public SimulacaoRecebimentoResponse simular(Long id, LocalDate data) {
        ContaReceber conta = carregar(id);
        LocalDate dataSimulada = data != null ? data : LocalDate.now();
        Encargos encargos = calculadora.calcular(conta, dataSimulada);

        return new SimulacaoRecebimentoResponse(
                dataSimulada,
                conta.saldoDevedor(),
                encargos.desconto(),
                encargos.acrescimo(),
                encargos.aplicarSobre(conta.saldoDevedor()));
    }

    /**
     * RN07: quitar e registrar um recebimento, nunca apagar o titulo.
     * Aceita recebimento parcial - a situacao vira PARCIAL ate o saldo zerar.
     */
    @Transactional
    public ContaReceberResponse quitar(Long id, QuitacaoRecebimentoRequest req) {
        ContaReceber conta = carregar(id);

        if (Situacoes.CANCELADA.equals(conta.getSituacao().getCodigo())) {
            throw new NegocioException("Titulo cancelado nao pode ser quitado.");
        }
        if (conta.quitado()) {
            throw new NegocioException("Titulo " + conta.getNumeroTitulo() + " ja esta quitado.");
        }
        if (req.dataRecebimento().isBefore(conta.getEmissao())) {
            throw new NegocioException("O recebimento nao pode ser anterior a emissao do titulo.");
        }

        FormaPagamento forma = formaPagamentoRepository.findByCodigo(req.formaPagamento())
                .orElseThrow(() -> new NegocioException("Forma de recebimento invalida: " + req.formaPagamento()));

        // As Strategies decidem desconto e juros para esta data.
        Encargos encargos = calculadora.calcular(conta, req.dataRecebimento());
        BigDecimal valorDevido = encargos.aplicarSobre(conta.saldoDevedor());

        BigDecimal valorRecebido = req.valorRecebido() != null ? req.valorRecebido() : valorDevido;
        if (valorRecebido.compareTo(valorDevido) > 0) {
            throw new NegocioException(
                    "O valor pago (%s) excede o devido nesta data (%s).".formatted(valorRecebido, valorDevido));
        }

        Recebimento recebimento = new Recebimento();
        recebimento.setContaReceber(conta);
        recebimento.setFormaPagamento(forma);
        recebimento.setDataRecebimento(req.dataRecebimento());
        recebimento.setValorRecebido(valorRecebido);
        recebimento.setDescontoAplicado(encargos.desconto());
        recebimento.setAcrescimoAplicado(encargos.acrescimo());
        recebimento.setObservacao(req.observacao());
        conta.getRecebimentos().add(recebimento);

        boolean integral = valorRecebido.compareTo(valorDevido) == 0;
        conta.setSituacao(situacao(integral ? Situacoes.RECEBIDA : Situacoes.PARCIAL));

        return mapper.paraResposta(contaRepository.save(conta));
    }

    // ------------------------------------------------------------------
    // Alteracao e cancelamento
    // ------------------------------------------------------------------

    @Transactional
    public ContaReceberResponse alterar(Long id, ContaReceberRequest req) {
        ContaReceber conta = carregar(id);

        if (!conta.getRecebimentos().isEmpty()) {
            throw new NegocioException("Titulo com recebimento registrado nao pode ser alterado.");
        }

        conta.setValor(req.valor());
        conta.setEmissao(req.emissao());
        conta.setVencimento(req.vencimento());
        conta.setDesconto(ContaReceberMapper.ouZero(req.desconto()));
        conta.setValidadeDesconto(req.validadeDesconto());
        conta.setAcrescimoDia(ContaReceberMapper.ouZero(req.acrescimoDia()));
        conta.setObservacao(req.observacao());

        conta.getRateios().clear();
        aplicarRateios(conta, req.rateios());

        return mapper.paraResposta(contaRepository.save(conta));
    }

    /** RN07: cancelar muda a situacao; o registro continua na base. */
    @Transactional
    public ContaReceberResponse cancelar(Long id) {
        ContaReceber conta = carregar(id);

        if (!conta.getRecebimentos().isEmpty()) {
            throw new NegocioException("Titulo com recebimento registrado nao pode ser cancelado.");
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
        List<ContaReceber> vencidas =
                contaRepository.findBySituacaoCodigoAndVencimentoBefore(Situacoes.ABERTA, LocalDate.now());
        SituacaoConta situacaoVencida = situacao(Situacoes.VENCIDA);
        vencidas.forEach(c -> c.setSituacao(situacaoVencida));
        contaRepository.saveAll(vencidas);
        return vencidas.size();
    }

    private SituacaoConta situacao(String codigo) {
        return situacaoRepository.findByCodigo(codigo)
                .orElseThrow(() -> new IllegalStateException(
                        "Situacao '" + codigo + "' ausente. Verifique a migration V2."));
    }
}
