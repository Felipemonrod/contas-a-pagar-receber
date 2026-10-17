package com.ifgoianomih.contas_pagar.contapagar;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.QuitacaoRequest;
import com.ifgoianomih.contas_pagar.contapagar.dto.RateioRequest;
import com.ifgoianomih.contas_pagar.dominio.FormaPagamento;
import com.ifgoianomih.contas_pagar.dominio.FormaPagamentoRepository;
import com.ifgoianomih.contas_pagar.dominio.Papel;
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
import com.ifgoianomih.contas_pagar.shared.encargo.DescontoPorPontualidade;
import com.ifgoianomih.contas_pagar.shared.encargo.JurosPorAtraso;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * Regras de negocio do lancamento e da quitacao, com os repositorios
 * simulados. Sem banco e sem contexto Spring: o alvo aqui e a regra.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ContaPagarService — regras de negocio")
class ContaPagarServiceTest {

    @Mock private ContaPagarRepository contaRepository;
    @Mock private PessoaRepository pessoaRepository;
    @Mock private PlanoContaRepository planoContaRepository;
    @Mock private TipoTituloRepository tipoTituloRepository;
    @Mock private SituacaoContaRepository situacaoRepository;
    @Mock private FormaPagamentoRepository formaPagamentoRepository;

    private ContaPagarService service;

    private Pessoa fornecedor;
    private Pessoa cliente;
    private PlanoConta categoriaAnalitica;
    private PlanoConta categoriaConsolidada;

    @BeforeEach
    void preparar() {
        CalculadoraEncargos calculadora = new CalculadoraEncargos(
                List.of(new DescontoPorPontualidade(), new JurosPorAtraso()));

        service = new ContaPagarService(contaRepository, pessoaRepository, planoContaRepository,
                tipoTituloRepository, situacaoRepository, formaPagamentoRepository,
                calculadora, new ContaPagarMapper());

        fornecedor = pessoaCom(1L, "Greensoft Informatica Ltda", "FORNECEDOR");
        cliente = pessoaCom(2L, "Cliente Puro SA", "CLIENTE");

        categoriaAnalitica = planoConta(10L, "21.03", "Energia Eletrica", false);
        categoriaConsolidada = planoConta(4L, "21", "PASSIVO CIRCULANTE", true);

        when(pessoaRepository.findById(1L)).thenReturn(Optional.of(fornecedor));
        when(pessoaRepository.findById(2L)).thenReturn(Optional.of(cliente));
        when(planoContaRepository.findById(10L)).thenReturn(Optional.of(categoriaAnalitica));
        when(planoContaRepository.findById(4L)).thenReturn(Optional.of(categoriaConsolidada));
        when(tipoTituloRepository.findByCodigo("DUPLICATA"))
                .thenReturn(Optional.of(dominio(new TipoTitulo(), "DUPLICATA")));
        when(formaPagamentoRepository.findByCodigo("PIX"))
                .thenReturn(Optional.of(dominio(new FormaPagamento(), "PIX")));
        for (String s : new String[] { Situacoes.ABERTA, Situacoes.PARCIAL, Situacoes.PAGA,
                                       Situacoes.VENCIDA, Situacoes.CANCELADA }) {
            when(situacaoRepository.findByCodigo(s)).thenReturn(Optional.of(situacao(s)));
        }
        when(contaRepository.save(any(ContaPagar.class)))
                .thenAnswer(invocacao -> invocacao.getArgument(0));
    }

    // ---------------------------------------------------------------- apoio

    private Pessoa pessoaCom(Long id, String nome, String... papeis) {
        Pessoa p = new Pessoa();
        p.setId(id);
        p.setNome(nome);
        p.setDocumento("doc-" + id);
        for (String codigo : papeis) {
            p.getPapeis().add(dominio(new Papel(), codigo));
        }
        return p;
    }

    private <T> T dominio(T entidade, String codigo) {
        if (entidade instanceof Papel p) { p.setCodigo(codigo); p.setDescricao(codigo); }
        if (entidade instanceof TipoTitulo t) { t.setCodigo(codigo); t.setDescricao(codigo); }
        if (entidade instanceof FormaPagamento f) { f.setCodigo(codigo); f.setDescricao(codigo); }
        return entidade;
    }

    private SituacaoConta situacao(String codigo) {
        SituacaoConta s = new SituacaoConta();
        s.setCodigo(codigo);
        s.setDescricao(codigo);
        return s;
    }

    private PlanoConta planoConta(Long id, String codigo, String descricao, boolean consolidada) {
        PlanoConta c = new PlanoConta();
        c.setId(id);
        c.setCodigo(codigo);
        c.setDescricao(descricao);
        c.setConsolidada(consolidada);
        return c;
    }

    private ContaPagarRequest pedido(Long pessoaId, String valor, List<RateioRequest> rateios) {
        return new ContaPagarRequest("DUP-001", pessoaId, "DUPLICATA", new BigDecimal(valor),
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 10),
                new BigDecimal("50.00"), LocalDate.of(2026, 10, 5), new BigDecimal("2.00"),
                null, rateios);
    }

    // ------------------------------------------------------------ lancamento

    @Test
    @DisplayName("lanca o titulo quando tudo esta valido")
    void lancamentoValido() {
        var resposta = service.lancar(pedido(1L, "1000.00",
                List.of(new RateioRequest(10L, new BigDecimal("1000.00")))));

        assertThat(resposta.numeroTitulo()).isEqualTo("DUP-001");
        assertThat(resposta.situacao()).isEqualTo(Situacoes.ABERTA);
        assertThat(resposta.rateios()).hasSize(1);
        verify(contaRepository).save(any(ContaPagar.class));
    }

    @Test
    @DisplayName("RN04 — recusa titulo para quem nao e fornecedor")
    void rn04PessoaSemPapelDeFornecedor() {
        assertThatThrownBy(() -> service.lancar(pedido(2L, "1000.00", null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("Cliente Puro SA")
                .hasMessageContaining("fornecedor");

        verify(contaRepository, never()).save(any());
    }

    @Test
    @DisplayName("RN01 — recusa rateio em categoria consolidada")
    void rn01CategoriaConsolidada() {
        assertThatThrownBy(() -> service.lancar(pedido(1L, "100.00",
                List.of(new RateioRequest(4L, new BigDecimal("100.00"))))))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("consolidada");

        verify(contaRepository, never()).save(any());
    }

    @Test
    @DisplayName("RN12 — recusa rateio cuja soma difere do valor do titulo")
    void rn12RateioNaoFecha() {
        assertThatThrownBy(() -> service.lancar(pedido(1L, "100.00",
                List.of(new RateioRequest(10L, new BigDecimal("70.00"))))))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("difere do valor");
    }

    @Test
    @DisplayName("aceita rateio dividido entre categorias quando a soma fecha")
    void rateioDivididoQueFecha() {
        when(planoContaRepository.findById(13L))
                .thenReturn(Optional.of(planoConta(13L, "21.06", "Condominio", false)));

        var resposta = service.lancar(pedido(1L, "1000.00", List.of(
                new RateioRequest(10L, new BigDecimal("600.00")),
                new RateioRequest(13L, new BigDecimal("400.00")))));

        assertThat(resposta.rateios()).hasSize(2);
    }

    @Test
    @DisplayName("recusa numero de titulo ja existente")
    void numeroDuplicado() {
        when(contaRepository.existsByNumeroTitulo("DUP-001")).thenReturn(true);

        assertThatThrownBy(() -> service.lancar(pedido(1L, "100.00", null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("Ja existe um titulo");
    }

    @Test
    @DisplayName("recusa vencimento anterior a emissao")
    void vencimentoAntesDaEmissao() {
        ContaPagarRequest req = new ContaPagarRequest("DUP-002", 1L, "DUPLICATA",
                new BigDecimal("100.00"), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 9, 1),
                null, null, null, null, null);

        assertThatThrownBy(() -> service.lancar(req))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("vencimento");
    }

    @Test
    @DisplayName("pessoa inexistente resulta em 404, nao em erro de regra")
    void pessoaInexistente() {
        when(pessoaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.lancar(pedido(99L, "100.00", null)))
                .isInstanceOf(RecursoNaoEncontradoException.class);
    }

    // -------------------------------------------------------------- quitacao

    private ContaPagar tituloEmAberto() {
        ContaPagar conta = new ContaPagar();
        conta.setId(1L);
        conta.setNumeroTitulo("DUP-001");
        conta.setPessoa(fornecedor);
        conta.setTipoTitulo(dominio(new TipoTitulo(), "DUPLICATA"));
        conta.setSituacao(situacao(Situacoes.ABERTA));
        conta.setValor(new BigDecimal("1000.00"));
        conta.setEmissao(LocalDate.of(2026, 9, 1));
        conta.setVencimento(LocalDate.of(2026, 10, 10));
        conta.setDesconto(new BigDecimal("50.00"));
        conta.setValidadeDesconto(LocalDate.of(2026, 10, 5));
        conta.setAcrescimoDia(new BigDecimal("2.00"));
        when(contaRepository.findById(1L)).thenReturn(Optional.of(conta));
        return conta;
    }

    @Test
    @DisplayName("quitacao integral dentro da validade aplica o desconto e marca PAGA")
    void quitacaoIntegralComDesconto() {
        tituloEmAberto();

        var resposta = service.quitar(1L,
                new QuitacaoRequest(LocalDate.of(2026, 10, 3), "PIX", null, null));

        assertThat(resposta.situacao()).isEqualTo(Situacoes.PAGA);
        assertThat(resposta.totalPago()).isEqualByComparingTo("950.00");
        assertThat(resposta.saldoDevedor()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("RN09 — pagamento parcial deixa a situacao em PARCIAL")
    void quitacaoParcial() {
        tituloEmAberto();

        var resposta = service.quitar(1L, new QuitacaoRequest(
                LocalDate.of(2026, 10, 3), "PIX", new BigDecimal("400.00"), null));

        assertThat(resposta.situacao()).isEqualTo(Situacoes.PARCIAL);
        assertThat(resposta.saldoDevedor()).isEqualByComparingTo("550.00");
    }

    @Test
    @DisplayName("quitacao apos o vencimento cobra os juros do periodo")
    void quitacaoComJuros() {
        tituloEmAberto();

        var resposta = service.quitar(1L,
                new QuitacaoRequest(LocalDate.of(2026, 10, 25), "PIX", null, null));

        // 15 dias de atraso x 2,00 = 30,00 acima do valor
        assertThat(resposta.totalPago()).isEqualByComparingTo("1030.00");
        assertThat(resposta.situacao()).isEqualTo(Situacoes.PAGA);
    }

    @Test
    @DisplayName("RN07 — recusa quitar titulo ja quitado")
    void rn07TituloJaQuitado() {
        ContaPagar conta = tituloEmAberto();
        Pagamento quitacao = new Pagamento();
        quitacao.setValorPago(new BigDecimal("950.00"));
        quitacao.setDescontoAplicado(new BigDecimal("50.00"));
        quitacao.setAcrescimoAplicado(BigDecimal.ZERO);
        conta.getPagamentos().add(quitacao);

        assertThatThrownBy(() -> service.quitar(1L,
                new QuitacaoRequest(LocalDate.of(2026, 10, 3), "PIX", null, null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("ja esta quitado");
    }

    @Test
    @DisplayName("recusa quitar titulo cancelado")
    void tituloCancelado() {
        tituloEmAberto().setSituacao(situacao(Situacoes.CANCELADA));

        assertThatThrownBy(() -> service.quitar(1L,
                new QuitacaoRequest(LocalDate.of(2026, 10, 3), "PIX", null, null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("cancelado");
    }

    @Test
    @DisplayName("recusa pagamento maior que o valor devido na data")
    void pagamentoAcimaDoDevido() {
        tituloEmAberto();

        assertThatThrownBy(() -> service.quitar(1L, new QuitacaoRequest(
                LocalDate.of(2026, 10, 3), "PIX", new BigDecimal("5000.00"), null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("excede o devido");
    }

    @Test
    @DisplayName("recusa pagamento anterior a emissao do titulo")
    void pagamentoAntesDaEmissao() {
        tituloEmAberto();

        assertThatThrownBy(() -> service.quitar(1L, new QuitacaoRequest(
                LocalDate.of(2026, 1, 1), "PIX", null, null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("anterior a emissao");
    }

    @Test
    @DisplayName("forma de pagamento invalida e recusada")
    void formaPagamentoInvalida() {
        tituloEmAberto();
        when(formaPagamentoRepository.findByCodigo("BITCOIN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.quitar(1L, new QuitacaoRequest(
                LocalDate.of(2026, 10, 3), "BITCOIN", null, null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("Forma de pagamento invalida");
    }

    // ---------------------------------------------------- alteracao e cancelamento

    @Test
    @DisplayName("RN11 — recusa alterar titulo que ja tem pagamento")
    void rn11AlterarComPagamento() {
        ContaPagar conta = tituloEmAberto();
        Pagamento p = new Pagamento();
        p.setValorPago(new BigDecimal("100.00"));
        p.setDescontoAplicado(BigDecimal.ZERO);
        p.setAcrescimoAplicado(BigDecimal.ZERO);
        conta.getPagamentos().add(p);

        assertThatThrownBy(() -> service.alterar(1L, pedido(1L, "2000.00", null)))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("nao pode ser alterado");
    }

    @Test
    @DisplayName("RN11 — recusa cancelar titulo que ja tem pagamento")
    void rn11CancelarComPagamento() {
        ContaPagar conta = tituloEmAberto();
        Pagamento p = new Pagamento();
        p.setValorPago(new BigDecimal("100.00"));
        p.setDescontoAplicado(BigDecimal.ZERO);
        p.setAcrescimoAplicado(BigDecimal.ZERO);
        conta.getPagamentos().add(p);

        assertThatThrownBy(() -> service.cancelar(1L))
                .isInstanceOf(NegocioException.class)
                .hasMessageContaining("nao pode ser cancelado");
    }

    @Test
    @DisplayName("RN07 — cancelar muda a situacao e mantem o registro")
    void cancelamentoMantemRegistro() {
        tituloEmAberto();

        var resposta = service.cancelar(1L);

        assertThat(resposta.situacao()).isEqualTo(Situacoes.CANCELADA);
        assertThat(resposta.numeroTitulo()).isEqualTo("DUP-001");
        verify(contaRepository).save(any(ContaPagar.class));
    }

    @Test
    @DisplayName("titulo inexistente resulta em 404")
    void tituloInexistente() {
        when(contaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscar(99L))
                .isInstanceOf(RecursoNaoEncontradoException.class)
                .hasMessageContaining("99");
    }
}
