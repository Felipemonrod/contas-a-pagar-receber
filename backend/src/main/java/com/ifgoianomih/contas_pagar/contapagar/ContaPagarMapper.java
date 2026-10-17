package com.ifgoianomih.contas_pagar.contapagar;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Component;

import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarResponse;
import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarResponse.PagamentoResponse;
import com.ifgoianomih.contas_pagar.contapagar.dto.ContaPagarResponse.RateioResponse;

/**
 * PADRAO MAPPER (variacao do Adapter).
 *
 * Converte a entidade em DTO. Fica isolado numa classe so para que nem o
 * service nem o controller precisem conhecer os dois formatos ao mesmo tempo.
 */
@Component
public class ContaPagarMapper {

    public ContaPagarResponse paraResposta(ContaPagar conta) {
        List<RateioResponse> rateios = conta.getRateios().stream()
                .map(r -> new RateioResponse(
                        r.getPlanoConta().getId(),
                        r.getPlanoConta().getCodigo() + " - " + r.getPlanoConta().getDescricao(),
                        r.getValor()))
                .toList();

        List<PagamentoResponse> pagamentos = conta.getPagamentos().stream()
                .map(p -> new PagamentoResponse(
                        p.getId(),
                        p.getDataPagamento(),
                        p.getFormaPagamento().getCodigo(),
                        p.getValorPago(),
                        p.getDescontoAplicado(),
                        p.getAcrescimoAplicado()))
                .toList();

        return new ContaPagarResponse(
                conta.getId(),
                conta.getNumeroTitulo(),
                conta.getPessoa().getId(),
                conta.getPessoa().getNome(),
                conta.getTipoTitulo().getCodigo(),
                conta.getSituacao().getCodigo(),
                conta.getValor(),
                conta.totalPago(),
                conta.saldoDevedor(),
                conta.getEmissao(),
                conta.getVencimento(),
                conta.getDesconto(),
                conta.getValidadeDesconto(),
                conta.getAcrescimoDia(),
                conta.getObservacao(),
                rateios,
                pagamentos);
    }

    public List<ContaPagarResponse> paraResposta(List<ContaPagar> contas) {
        return contas.stream().map(this::paraResposta).toList();
    }

    /** Evita NullPointerException quando o campo opcional nao vem no JSON. */
    public static BigDecimal ouZero(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }
}
