package com.ifgoianomih.contas_pagar.cartorio;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.BaixaRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.CartorioRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.CartorioResponse;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.ProtestoRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.RemessaRequest;
import com.ifgoianomih.contas_pagar.cartorio.CartorioDtos.RemessaResponse;
import com.ifgoianomih.contas_pagar.contareceber.ContaReceber;
import com.ifgoianomih.contas_pagar.contareceber.ContaReceberRepository;
import com.ifgoianomih.contas_pagar.dominio.Situacoes;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

/**
 * Cartorios e remessa de titulos para protesto (livro, cap. 10 e 17).
 */
@Service
@Transactional(readOnly = true)
public class CartorioService {

    private final CartorioRepository cartorioRepository;
    private final RemessaCartorioRepository remessaRepository;
    private final ContaReceberRepository contaReceberRepository;

    public CartorioService(CartorioRepository cartorioRepository,
                           RemessaCartorioRepository remessaRepository,
                           ContaReceberRepository contaReceberRepository) {
        this.cartorioRepository = cartorioRepository;
        this.remessaRepository = remessaRepository;
        this.contaReceberRepository = contaReceberRepository;
    }

    // --------------------------------------------------------- cartorio

    public List<CartorioResponse> listar() {
        return cartorioRepository.findAllByOrderByNome().stream().map(this::paraResposta).toList();
    }

    public CartorioResponse buscar(Long id) {
        return paraResposta(carregar(id));
    }

    @Transactional
    public CartorioResponse cadastrar(CartorioRequest req) {
        if (cartorioRepository.existsByNomeIgnoreCase(req.nome())) {
            throw new NegocioException("Ja existe um cartorio com o nome '" + req.nome() + "'.");
        }
        Cartorio cartorio = new Cartorio();
        preencher(cartorio, req);
        return paraResposta(cartorioRepository.save(cartorio));
    }

    @Transactional
    public CartorioResponse alterar(Long id, CartorioRequest req) {
        Cartorio cartorio = carregar(id);

        cartorioRepository.findByNomeIgnoreCase(req.nome())
                .filter(outro -> !outro.getId().equals(id))
                .ifPresent(outro -> {
                    throw new NegocioException("O nome '" + req.nome() + "' ja pertence a outro cartorio.");
                });

        preencher(cartorio, req);
        return paraResposta(cartorioRepository.save(cartorio));
    }

    @Transactional
    public void excluir(Long id) {
        Cartorio cartorio = carregar(id);
        List<RemessaCartorio> remessas = remessaRepository.findByCartorioIdOrderByDataRemessaDesc(id);

        if (!remessas.isEmpty()) {
            throw new NegocioException(
                    "O cartorio '%s' possui %d remessa(s) registrada(s) e nao pode ser excluido."
                            .formatted(cartorio.getNome(), remessas.size()));
        }
        cartorioRepository.delete(cartorio);
    }

    private void preencher(Cartorio cartorio, CartorioRequest req) {
        cartorio.setNome(req.nome());
        cartorio.setContato(req.contato());
        cartorio.setTelefone(req.telefone());
    }

    // ---------------------------------------------------------- remessa

    public List<RemessaResponse> listarRemessas(Long cartorioId, Boolean emAberto) {
        List<RemessaCartorio> remessas;
        if (Boolean.TRUE.equals(emAberto)) {
            remessas = remessaRepository.findByDataBaixaIsNullOrderByDataRemessa();
        } else if (cartorioId != null) {
            remessas = remessaRepository.findByCartorioIdOrderByDataRemessaDesc(cartorioId);
        } else {
            remessas = remessaRepository.findAllByOrderByDataRemessaDesc();
        }
        return remessas.stream().map(this::paraResposta).toList();
    }

    public RemessaResponse buscarRemessa(Long id) {
        return paraResposta(carregarRemessa(id));
    }

    /**
     * RN09: so vai a protesto titulo vencido e ainda nao recebido.
     * Enviar um titulo ja quitado ou ainda a vencer nao faz sentido.
     */
    @Transactional
    public RemessaResponse enviarParaProtesto(RemessaRequest req) {
        Cartorio cartorio = carregar(req.cartorioId());

        ContaReceber titulo = contaReceberRepository.findById(req.contaReceberId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Conta a receber", req.contaReceberId()));

        if (remessaRepository.existsByContaReceberId(titulo.getId())) {
            throw new NegocioException(
                    "O titulo %s ja foi enviado a cartorio.".formatted(titulo.getNumeroTitulo()));
        }
        if (titulo.quitado()) {
            throw new NegocioException(
                    "O titulo %s ja esta quitado e nao pode ir a protesto.".formatted(titulo.getNumeroTitulo()));
        }
        if (Situacoes.CANCELADA.equals(titulo.getSituacao().getCodigo())) {
            throw new NegocioException(
                    "O titulo %s esta cancelado.".formatted(titulo.getNumeroTitulo()));
        }

        LocalDate dataRemessa = req.dataRemessa() != null ? req.dataRemessa() : LocalDate.now();

        if (!titulo.getVencimento().isBefore(dataRemessa)) {
            throw new NegocioException(
                    "O titulo %s vence em %s e so pode ir a protesto depois do vencimento."
                            .formatted(titulo.getNumeroTitulo(), titulo.getVencimento()));
        }

        RemessaCartorio remessa = new RemessaCartorio();
        remessa.setCartorio(cartorio);
        remessa.setContaReceber(titulo);
        remessa.setDataRemessa(dataRemessa);
        remessa.setObservacao(req.observacao());

        return paraResposta(remessaRepository.save(remessa));
    }

    /** Registra a confirmacao do protesto pelo cartorio. */
    @Transactional
    public RemessaResponse registrarProtesto(Long id, ProtestoRequest req) {
        RemessaCartorio remessa = carregarRemessa(id);

        if (remessa.getDataBaixa() != null) {
            throw new NegocioException("Esta remessa ja foi baixada.");
        }
        if (remessa.getDataProtesto() != null) {
            throw new NegocioException("O protesto desta remessa ja foi registrado em "
                    + remessa.getDataProtesto() + ".");
        }
        if (req.dataProtesto().isBefore(remessa.getDataRemessa())) {
            throw new NegocioException("O protesto nao pode ser anterior a data da remessa.");
        }

        remessa.setDataProtesto(req.dataProtesto());
        return paraResposta(remessaRepository.save(remessa));
    }

    /** Baixa do protesto, normalmente apos o titulo ser pago. */
    @Transactional
    public RemessaResponse registrarBaixa(Long id, BaixaRequest req) {
        RemessaCartorio remessa = carregarRemessa(id);

        if (remessa.getDataBaixa() != null) {
            throw new NegocioException("Esta remessa ja foi baixada em " + remessa.getDataBaixa() + ".");
        }
        if (req.dataBaixa().isBefore(remessa.getDataRemessa())) {
            throw new NegocioException("A baixa nao pode ser anterior a data da remessa.");
        }

        remessa.setDataBaixa(req.dataBaixa());
        if (req.observacao() != null) {
            remessa.setObservacao(req.observacao());
        }
        return paraResposta(remessaRepository.save(remessa));
    }

    // ------------------------------------------------------------ apoio

    private Cartorio carregar(Long id) {
        return cartorioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cartorio", id));
    }

    private RemessaCartorio carregarRemessa(Long id) {
        return remessaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Remessa", id));
    }

    private CartorioResponse paraResposta(Cartorio c) {
        return new CartorioResponse(c.getId(), c.getNome(), c.getContato(), c.getTelefone());
    }

    private RemessaResponse paraResposta(RemessaCartorio r) {
        ContaReceber t = r.getContaReceber();
        return new RemessaResponse(
                r.getId(),
                r.getCartorio().getId(), r.getCartorio().getNome(),
                t.getId(), t.getNumeroTitulo(), t.getPessoa().getNome(),
                t.getValor(), t.saldoDevedor(), t.getVencimento(),
                r.getDataRemessa(), r.getDataProtesto(), r.getDataBaixa(),
                r.situacao(), r.getObservacao());
    }
}
