package com.ifgoianomih.contas_pagar.contareceber;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Component;

import com.ifgoianomih.contas_pagar.contareceber.dto.ContaReceberResponse;
import com.ifgoianomih.contas_pagar.contareceber.dto.ContaReceberResponse.RecebimentoResponse;
import com.ifgoianomih.contas_pagar.contareceber.dto.ContaReceberResponse.RateioResponse;

/**
 * PADRAO MAPPER (variacao do Adapter).
 *
 * Converte a entidade em DTO. Fica isolado numa classe so para que nem o
 * service nem o controller precisem conhecer os dois formatos ao mesmo tempo.
 */
@Component
public class ContaReceberMapper {

    public ContaReceberResponse paraResposta(ContaReceber conta) {
        List<RateioResponse> rateios = conta.getRateios().stream()
                .map(r -> new RateioResponse(
                        r.getPlanoConta().getId(),
                        r.getPlanoConta().getCodigo() + " - " + r.getPlanoConta().getDescricao(),
                        r.getValor()))
                .toList();

        List<RecebimentoResponse> recebimentos = conta.getRecebimentos().stream()
                .map(p -> new RecebimentoResponse(
                        p.getId(),
                        p.getDataRecebimento(),
                        p.getFormaPagamento().getCodigo(),
                        p.getValorRecebido(),
                        p.getDescontoAplicado(),
                        p.getAcrescimoAplicado()))
                .toList();

        return new ContaReceberResponse(
                conta.getId(),
                conta.getNumeroTitulo(),
                conta.getPessoa().getId(),
                conta.getPessoa().getNome(),
                conta.getTipoTitulo().getCodigo(),
                conta.getSituacao().getCodigo(),
                conta.getValor(),
                conta.totalRecebido(),
                conta.saldoDevedor(),
                conta.getEmissao(),
                conta.getVencimento(),
                conta.getDesconto(),
                conta.getValidadeDesconto(),
                conta.getAcrescimoDia(),
                conta.getObservacao(),
                rateios,
                recebimentos);
    }

    public List<ContaReceberResponse> paraResposta(List<ContaReceber> contas) {
        return contas.stream().map(this::paraResposta).toList();
    }

    /** Evita NullPointerException quando o campo opcional nao vem no JSON. */
    public static BigDecimal ouZero(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }
}
