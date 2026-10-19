package com.ifgoianomih.contas_pagar.banco;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.banco.BancoDtos.AgenciaRequest;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.AgenciaResponse;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.BancoItemResponse;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.BancoRequest;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.BancoResponse;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.ContaCorrenteRequest;
import com.ifgoianomih.contas_pagar.banco.BancoDtos.ContaCorrenteResponse;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * Cadastro bancario (livro, cap. 9).
 *
 * Cuida dos tres niveis da cadeia - banco, agencia e conta corrente -
 * num service so, porque na pratica eles sao sempre manipulados juntos:
 * a tela do livro trata os tres no mesmo formulario.
 */
@Service
@Transactional(readOnly = true)
public class BancoService {

    private final BancoRepository bancoRepository;
    private final AgenciaRepository agenciaRepository;
    private final ContaCorrenteRepository contaRepository;

    public BancoService(BancoRepository bancoRepository,
                        AgenciaRepository agenciaRepository,
                        ContaCorrenteRepository contaRepository) {
        this.bancoRepository = bancoRepository;
        this.agenciaRepository = agenciaRepository;
        this.contaRepository = contaRepository;
    }

    // ------------------------------------------------------------ banco

    public List<BancoResponse> listarBancos(String nome) {
        List<Banco> bancos = (nome != null && !nome.isBlank())
                ? bancoRepository.findByNomeContainingIgnoreCaseOrderByCodigo(nome)
                : bancoRepository.findAllByOrderByCodigo();
        return bancos.stream().map(this::paraResposta).toList();
    }

    /** Lista plana, para preencher combos. */
    public List<BancoItemResponse> listarBancosParaSelecao() {
        return bancoRepository.findAllByOrderByCodigo().stream()
                .map(b -> new BancoItemResponse(b.getId(), b.getCodigo(), b.getNome()))
                .toList();
    }

    public BancoResponse buscarBanco(Long id) {
        return paraResposta(carregarBanco(id));
    }

    @Transactional
    public BancoResponse criarBanco(BancoRequest req) {
        if (bancoRepository.existsByCodigo(req.codigo())) {
            throw new NegocioException("Ja existe um banco com o codigo " + req.codigo() + ".");
        }
        Banco banco = new Banco();
        banco.setCodigo(req.codigo());
        banco.setNome(req.nome());
        return paraResposta(bancoRepository.save(banco));
    }

    @Transactional
    public BancoResponse alterarBanco(Long id, BancoRequest req) {
        Banco banco = carregarBanco(id);

        bancoRepository.findByCodigo(req.codigo())
                .filter(outro -> !outro.getId().equals(id))
                .ifPresent(outro -> {
                    throw new NegocioException("O codigo " + req.codigo() + " ja pertence a outro banco.");
                });

        banco.setCodigo(req.codigo());
        banco.setNome(req.nome());
        return paraResposta(bancoRepository.save(banco));
    }

    @Transactional
    public void excluirBanco(Long id) {
        Banco banco = carregarBanco(id);
        if (!banco.getAgencias().isEmpty()) {
            throw new NegocioException(
                    "O banco '%s' possui %d agencia(s) e nao pode ser excluido."
                            .formatted(banco.getNome(), banco.getAgencias().size()));
        }
        bancoRepository.delete(banco);
    }

    // ---------------------------------------------------------- agencia

    public List<AgenciaResponse> listarAgencias(Long bancoId) {
        List<Agencia> agencias = bancoId != null
                ? agenciaRepository.findByBancoIdOrderByNumero(bancoId)
                : agenciaRepository.findAll();
        return agencias.stream().map(this::paraResposta).toList();
    }

    public AgenciaResponse buscarAgencia(Long id) {
        return paraResposta(carregarAgencia(id));
    }

    @Transactional
    public AgenciaResponse criarAgencia(AgenciaRequest req) {
        Banco banco = carregarBanco(req.bancoId());

        if (agenciaRepository.existsByBancoIdAndNumero(banco.getId(), req.numero())) {
            throw new NegocioException(
                    "O banco '%s' ja tem uma agencia de numero %s.".formatted(banco.getNome(), req.numero()));
        }

        Agencia agencia = new Agencia();
        agencia.setBanco(banco);
        preencher(agencia, req);
        return paraResposta(agenciaRepository.save(agencia));
    }

    @Transactional
    public AgenciaResponse alterarAgencia(Long id, AgenciaRequest req) {
        Agencia agencia = carregarAgencia(id);

        boolean mudouNumero = !agencia.getNumero().equals(req.numero());
        boolean mudouBanco = !agencia.getBanco().getId().equals(req.bancoId());

        if (mudouBanco) {
            agencia.setBanco(carregarBanco(req.bancoId()));
        }
        if ((mudouNumero || mudouBanco)
                && agenciaRepository.existsByBancoIdAndNumero(req.bancoId(), req.numero())) {
            throw new NegocioException(
                    "Ja existe uma agencia de numero %s neste banco.".formatted(req.numero()));
        }

        preencher(agencia, req);
        return paraResposta(agenciaRepository.save(agencia));
    }

    @Transactional
    public void excluirAgencia(Long id) {
        Agencia agencia = carregarAgencia(id);
        if (!agencia.getContas().isEmpty()) {
            throw new NegocioException(
                    "A agencia %s possui %d conta(s) corrente e nao pode ser excluida."
                            .formatted(agencia.getNumero(), agencia.getContas().size()));
        }
        agenciaRepository.delete(agencia);
    }

    private void preencher(Agencia agencia, AgenciaRequest req) {
        agencia.setNumero(req.numero());
        agencia.setNome(req.nome());
        agencia.setEndereco(req.endereco());
        agencia.setGerente(req.gerente());
        agencia.setTelefone(req.telefone());
        agencia.setRamal(req.ramal());
        agencia.setFax(req.fax());
        agencia.setEmail(req.email());
    }

    // --------------------------------------------------- conta corrente

    public List<ContaCorrenteResponse> listarContas(Long agenciaId) {
        List<ContaCorrente> contas = agenciaId != null
                ? contaRepository.findByAgenciaIdOrderByNumero(agenciaId)
                : contaRepository.findAll();
        return contas.stream().map(this::paraResposta).toList();
    }

    /** Somente as contas ativas, para preencher combos. */
    public List<ContaCorrenteResponse> listarContasAtivas() {
        return contaRepository.findByAtivaTrueOrderByNumero().stream()
                .map(this::paraResposta).toList();
    }

    public ContaCorrenteResponse buscarConta(Long id) {
        return paraResposta(carregarConta(id));
    }

    @Transactional
    public ContaCorrenteResponse criarConta(ContaCorrenteRequest req) {
        Agencia agencia = carregarAgencia(req.agenciaId());

        if (contaRepository.existsByAgenciaIdAndNumero(agencia.getId(), req.numero())) {
            throw new NegocioException(
                    "A agencia %s ja tem uma conta de numero %s.".formatted(agencia.getNumero(), req.numero()));
        }

        ContaCorrente conta = new ContaCorrente();
        conta.setAgencia(agencia);
        conta.setNumero(req.numero());
        conta.setTipo(req.tipo() != null ? req.tipo() : "CORRENTE");
        conta.setLimite(req.limite() != null ? req.limite() : BigDecimal.ZERO);
        return paraResposta(contaRepository.save(conta));
    }

    @Transactional
    public ContaCorrenteResponse alterarConta(Long id, ContaCorrenteRequest req) {
        ContaCorrente conta = carregarConta(id);

        boolean mudouNumero = !conta.getNumero().equals(req.numero());
        boolean mudouAgencia = !conta.getAgencia().getId().equals(req.agenciaId());

        if (mudouAgencia) {
            conta.setAgencia(carregarAgencia(req.agenciaId()));
        }
        if ((mudouNumero || mudouAgencia)
                && contaRepository.existsByAgenciaIdAndNumero(req.agenciaId(), req.numero())) {
            throw new NegocioException(
                    "Ja existe uma conta de numero %s nesta agencia.".formatted(req.numero()));
        }

        conta.setNumero(req.numero());
        conta.setTipo(req.tipo() != null ? req.tipo() : conta.getTipo());
        conta.setLimite(req.limite() != null ? req.limite() : conta.getLimite());
        return paraResposta(contaRepository.save(conta));
    }

    /** Desativa em vez de excluir: cheques pre-datados dependem da conta. */
    @Transactional
    public ContaCorrenteResponse desativarConta(Long id) {
        ContaCorrente conta = carregarConta(id);
        conta.setAtiva(false);
        return paraResposta(contaRepository.save(conta));
    }

    // ------------------------------------------------------------ apoio

    private Banco carregarBanco(Long id) {
        return bancoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Banco", id));
    }

    private Agencia carregarAgencia(Long id) {
        return agenciaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agencia", id));
    }

    private ContaCorrente carregarConta(Long id) {
        return contaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Conta corrente", id));
    }

    private BancoResponse paraResposta(Banco b) {
        return new BancoResponse(b.getId(), b.getCodigo(), b.getNome(),
                b.getAgencias().stream().map(this::paraResposta).toList());
    }

    private AgenciaResponse paraResposta(Agencia a) {
        return new AgenciaResponse(
                a.getId(), a.getBanco().getId(), a.getBanco().getCodigo(), a.getBanco().getNome(),
                a.getNumero(), a.getNome(), a.getEndereco(), a.getGerente(),
                a.getTelefone(), a.getRamal(), a.getFax(), a.getEmail(),
                a.getContas().stream().map(this::paraResposta).toList());
    }

    private ContaCorrenteResponse paraResposta(ContaCorrente c) {
        return new ContaCorrenteResponse(c.getId(), c.getAgencia().getId(), c.getNumero(),
                c.getTipo(), c.getLimite(), c.getAtiva(), c.identificacao());
    }
}
