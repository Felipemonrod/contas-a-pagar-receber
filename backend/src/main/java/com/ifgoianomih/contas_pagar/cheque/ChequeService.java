package com.ifgoianomih.contas_pagar.cheque;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.banco.ContaCorrente;
import com.ifgoianomih.contas_pagar.banco.ContaCorrenteRepository;
import com.ifgoianomih.contas_pagar.cheque.ChequeDtos.ChequeRequest;
import com.ifgoianomih.contas_pagar.cheque.ChequeDtos.ChequeResponse;
import com.ifgoianomih.contas_pagar.cheque.ChequeDtos.MudancaSituacaoRequest;
import com.ifgoianomih.contas_pagar.contareceber.ContaReceber;
import com.ifgoianomih.contas_pagar.contareceber.ContaReceberRepository;
import com.ifgoianomih.contas_pagar.pessoa.Pessoa;
import com.ifgoianomih.contas_pagar.pessoa.PessoaRepository;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * Cheque pre-datado (livro, cap. 16).
 *
 * RN08: e um recebimento com data de deposito futura, vinculado a
 * cliente, banco, agencia e conta corrente, e funciona como garantia.
 */
@Service
@Transactional(readOnly = true)
public class ChequeService {

    private static final String PAPEL_CLIENTE = "CLIENTE";
    private static final String EM_CARTEIRA = "EM_CARTEIRA";

    /** Situacoes validas no ciclo de vida do cheque. */
    private static final Set<String> SITUACOES =
            Set.of(EM_CARTEIRA, "DEPOSITADO", "COMPENSADO", "DEVOLVIDO");

    private final ChequePreDatadoRepository repository;
    private final PessoaRepository pessoaRepository;
    private final ContaCorrenteRepository contaCorrenteRepository;
    private final ContaReceberRepository contaReceberRepository;

    public ChequeService(ChequePreDatadoRepository repository,
                         PessoaRepository pessoaRepository,
                         ContaCorrenteRepository contaCorrenteRepository,
                         ContaReceberRepository contaReceberRepository) {
        this.repository = repository;
        this.pessoaRepository = pessoaRepository;
        this.contaCorrenteRepository = contaCorrenteRepository;
        this.contaReceberRepository = contaReceberRepository;
    }

    public List<ChequeResponse> listar(String situacao, Long pessoaId, LocalDate de, LocalDate ate) {
        List<ChequePreDatado> cheques;
        if (de != null && ate != null) {
            cheques = repository.findByDepositoBetweenOrderByDeposito(de, ate);
        } else if (situacao != null && !situacao.isBlank()) {
            cheques = repository.findBySituacaoOrderByDeposito(situacao.toUpperCase());
        } else if (pessoaId != null) {
            cheques = repository.findByPessoaIdOrderByDeposito(pessoaId);
        } else {
            cheques = repository.findAllByOrderByDeposito();
        }
        return cheques.stream().map(this::paraResposta).toList();
    }

    /** Cheques em carteira cuja data de deposito ja chegou. */
    public List<ChequeResponse> aDepositar() {
        return repository.findBySituacaoOrderByDeposito(EM_CARTEIRA).stream()
                .filter(c -> !c.getDeposito().isAfter(LocalDate.now()))
                .map(this::paraResposta)
                .toList();
    }

    public ChequeResponse buscar(Long id) {
        return paraResposta(carregar(id));
    }

    @Transactional
    public ChequeResponse cadastrar(ChequeRequest req) {
        Pessoa emitente = pessoaRepository.findById(req.pessoaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Pessoa", req.pessoaId()));

        // Cheque pre-datado e forma de recebimento: so de quem e cliente.
        if (!emitente.temPapel(PAPEL_CLIENTE)) {
            throw new NegocioException(
                    "A pessoa '%s' nao esta cadastrada como cliente.".formatted(emitente.getNome()));
        }

        ContaCorrente conta = contaCorrenteRepository.findById(req.contaCorrenteId())
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Conta corrente", req.contaCorrenteId()));

        if (repository.existsByContaCorrenteIdAndNumeroCheque(conta.getId(), req.numeroCheque())) {
            throw new NegocioException(
                    "O cheque %s ja esta cadastrado para esta conta.".formatted(req.numeroCheque()));
        }
        if (req.deposito().isBefore(req.emissao())) {
            throw new NegocioException("A data de deposito nao pode ser anterior a emissao.");
        }

        ChequePreDatado cheque = new ChequePreDatado();
        cheque.setNumeroCheque(req.numeroCheque());
        cheque.setPessoa(emitente);
        cheque.setContaCorrente(conta);
        cheque.setEmissao(req.emissao());
        cheque.setDeposito(req.deposito());
        cheque.setValor(req.valor());
        cheque.setDescricao(req.descricao());
        cheque.setSituacao(EM_CARTEIRA);

        if (req.contaReceberId() != null) {
            ContaReceber titulo = contaReceberRepository.findById(req.contaReceberId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException(
                            "Conta a receber", req.contaReceberId()));
            cheque.setContaReceber(titulo);
        }

        return paraResposta(repository.save(cheque));
    }

    @Transactional
    public ChequeResponse alterar(Long id, ChequeRequest req) {
        ChequePreDatado cheque = carregar(id);

        if (!EM_CARTEIRA.equals(cheque.getSituacao())) {
            throw new NegocioException(
                    "O cheque ja foi movimentado (%s) e nao pode mais ser alterado."
                            .formatted(cheque.getSituacao()));
        }
        if (req.deposito().isBefore(req.emissao())) {
            throw new NegocioException("A data de deposito nao pode ser anterior a emissao.");
        }

        cheque.setNumeroCheque(req.numeroCheque());
        cheque.setEmissao(req.emissao());
        cheque.setDeposito(req.deposito());
        cheque.setValor(req.valor());
        cheque.setDescricao(req.descricao());

        return paraResposta(repository.save(cheque));
    }

    /** Move o cheque pelo ciclo: em carteira, depositado, compensado ou devolvido. */
    @Transactional
    public ChequeResponse mudarSituacao(Long id, MudancaSituacaoRequest req) {
        ChequePreDatado cheque = carregar(id);
        String nova = req.situacao().toUpperCase();

        if (!SITUACOES.contains(nova)) {
            throw new NegocioException(
                    "Situacao invalida: %s. Use EM_CARTEIRA, DEPOSITADO, COMPENSADO ou DEVOLVIDO."
                            .formatted(req.situacao()));
        }
        if ("COMPENSADO".equals(cheque.getSituacao())) {
            throw new NegocioException("Cheque compensado nao muda mais de situacao.");
        }
        if (nova.equals(cheque.getSituacao())) {
            throw new NegocioException("O cheque ja esta nesta situacao.");
        }

        cheque.setSituacao(nova);
        if (req.observacao() != null) {
            cheque.setDescricao(req.observacao());
        }
        return paraResposta(repository.save(cheque));
    }

    @Transactional
    public void excluir(Long id) {
        ChequePreDatado cheque = carregar(id);

        if (!EM_CARTEIRA.equals(cheque.getSituacao())) {
            throw new NegocioException(
                    "Cheque ja movimentado nao pode ser excluido; registre a devolucao.");
        }
        repository.delete(cheque);
    }

    private ChequePreDatado carregar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cheque", id));
    }

    private ChequeResponse paraResposta(ChequePreDatado c) {
        return new ChequeResponse(
                c.getId(), c.getNumeroCheque(),
                c.getPessoa().getId(), c.getPessoa().getNome(),
                c.getContaCorrente().getId(), c.getContaCorrente().identificacao(),
                c.getEmissao(), c.getDeposito(), c.getValor(),
                c.getSituacao(), c.vencido(),
                c.getContaReceber() != null ? c.getContaReceber().getId() : null,
                c.getContaReceber() != null ? c.getContaReceber().getNumeroTitulo() : null,
                c.getDescricao());
    }
}
