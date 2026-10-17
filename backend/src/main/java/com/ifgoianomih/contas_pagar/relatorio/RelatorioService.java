package com.ifgoianomih.contas_pagar.relatorio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.contapagar.ContaPagar;
import com.ifgoianomih.contas_pagar.contapagar.ContaPagarRepository;
import com.ifgoianomih.contas_pagar.contareceber.ContaReceber;
import com.ifgoianomih.contas_pagar.contareceber.ContaReceberRepository;
import com.ifgoianomih.contas_pagar.dominio.Situacoes;
import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.InadimplenciaResponse;
import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.PosicaoResponse;
import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.ResumoFinanceiroResponse;
import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.TituloVencidoResponse;
import com.ifgoianomih.contas_pagar.relatorio.RelatorioDtos.TotalPorCategoriaResponse;

/**
 * Consultas financeiras consolidadas (livro, cap. 18).
 *
 * Este service nao tem repositorio proprio: ele compoe os dados dos dois
 * dominios. Na etapa 2 ele vira o microsservico de relatorios, alimentado
 * por eventos em vez de consultas diretas.
 */
@Service
@Transactional(readOnly = true)
public class RelatorioService {

    private final ContaPagarRepository contaPagarRepository;
    private final ContaReceberRepository contaReceberRepository;

    public RelatorioService(ContaPagarRepository contaPagarRepository,
                            ContaReceberRepository contaReceberRepository) {
        this.contaPagarRepository = contaPagarRepository;
        this.contaReceberRepository = contaReceberRepository;
    }

    // ------------------------------------------------------------------
    // Resumo do periodo
    // ------------------------------------------------------------------

    public ResumoFinanceiroResponse resumo(LocalDate de, LocalDate ate) {
        LocalDate inicio = de != null ? de : LocalDate.now().withDayOfMonth(1);
        LocalDate fim = ate != null ? ate : inicio.plusMonths(1).minusDays(1);

        List<ContaPagar> pagar = contaPagarRepository.findByVencimentoBetweenOrderByVencimento(inicio, fim);
        List<ContaReceber> receber = contaReceberRepository.findByVencimentoBetweenOrderByVencimento(inicio, fim);

        PosicaoResponse posicaoPagar = posicao(
                pagar.size(),
                soma(pagar, ContaPagar::getValor),
                soma(pagar, ContaPagar::totalPago),
                soma(pagar, ContaPagar::saldoDevedor),
                pagar.stream().filter(this::emAbertoEVencida).toList().size(),
                soma(pagar.stream().filter(this::emAbertoEVencida).toList(), ContaPagar::saldoDevedor));

        PosicaoResponse posicaoReceber = posicao(
                receber.size(),
                soma(receber, ContaReceber::getValor),
                soma(receber, ContaReceber::totalRecebido),
                soma(receber, ContaReceber::saldoDevedor),
                receber.stream().filter(this::emAbertoEVencida).toList().size(),
                soma(receber.stream().filter(this::emAbertoEVencida).toList(), ContaReceber::saldoDevedor));

        // Projetado: tudo que esta previsto no periodo, quitado ou nao.
        BigDecimal saldoProjetado = posicaoReceber.valorTotal().subtract(posicaoPagar.valorTotal());
        // Realizado: somente o que ja entrou e saiu de fato.
        BigDecimal saldoRealizado = posicaoReceber.valorQuitado().subtract(posicaoPagar.valorQuitado());

        return new ResumoFinanceiroResponse(inicio, fim, posicaoPagar, posicaoReceber,
                saldoProjetado, saldoRealizado);
    }

    private PosicaoResponse posicao(int qtd, BigDecimal total, BigDecimal quitado,
                                    BigDecimal saldo, int qtdVencidos, BigDecimal valorVencido) {
        return new PosicaoResponse(qtd, total, quitado, saldo, qtdVencidos, valorVencido);
    }

    // ------------------------------------------------------------------
    // Totais por categoria do plano de contas
    // ------------------------------------------------------------------

    public List<TotalPorCategoriaResponse> porCategoria(LocalDate de, LocalDate ate) {
        LocalDate inicio = de != null ? de : LocalDate.now().withDayOfMonth(1);
        LocalDate fim = ate != null ? ate : inicio.plusMonths(1).minusDays(1);

        // chave: codigo da categoria -> [descricao, total a pagar, total a receber]
        Map<String, Acumulado> mapa = new LinkedHashMap<>();

        contaPagarRepository.findByVencimentoBetweenOrderByVencimento(inicio, fim)
                .forEach(c -> c.getRateios().forEach(r -> {
                    Acumulado a = mapa.computeIfAbsent(r.getPlanoConta().getCodigo(),
                            k -> new Acumulado(r.getPlanoConta().getDescricao()));
                    a.aPagar = a.aPagar.add(r.getValor());
                }));

        contaReceberRepository.findByVencimentoBetweenOrderByVencimento(inicio, fim)
                .forEach(c -> c.getRateios().forEach(r -> {
                    Acumulado a = mapa.computeIfAbsent(r.getPlanoConta().getCodigo(),
                            k -> new Acumulado(r.getPlanoConta().getDescricao()));
                    a.aReceber = a.aReceber.add(r.getValor());
                }));

        return mapa.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new TotalPorCategoriaResponse(
                        e.getKey(), e.getValue().descricao, e.getValue().aPagar, e.getValue().aReceber))
                .toList();
    }

    /** Acumulador auxiliar do agrupamento por categoria. */
    private static final class Acumulado {
        private final String descricao;
        private BigDecimal aPagar = BigDecimal.ZERO;
        private BigDecimal aReceber = BigDecimal.ZERO;

        private Acumulado(String descricao) {
            this.descricao = descricao;
        }
    }

    // ------------------------------------------------------------------
    // Inadimplencia
    // ------------------------------------------------------------------

    public InadimplenciaResponse inadimplencia() {
        LocalDate hoje = LocalDate.now();
        List<TituloVencidoResponse> titulos = new ArrayList<>();

        for (ContaPagar c : contaPagarRepository.findAll()) {
            if (emAbertoEVencida(c)) {
                titulos.add(new TituloVencidoResponse(
                        "CONTA_A_PAGAR", c.getNumeroTitulo(), c.getPessoa().getNome(),
                        c.getVencimento(), ChronoUnit.DAYS.between(c.getVencimento(), hoje),
                        c.saldoDevedor()));
            }
        }
        for (ContaReceber c : contaReceberRepository.findAll()) {
            if (emAbertoEVencida(c)) {
                titulos.add(new TituloVencidoResponse(
                        "CONTA_A_RECEBER", c.getNumeroTitulo(), c.getPessoa().getNome(),
                        c.getVencimento(), ChronoUnit.DAYS.between(c.getVencimento(), hoje),
                        c.saldoDevedor()));
            }
        }

        titulos.sort(Comparator.comparing(TituloVencidoResponse::vencimento));

        BigDecimal totalPagar = titulos.stream()
                .filter(t -> "CONTA_A_PAGAR".equals(t.origem()))
                .map(TituloVencidoResponse::saldoDevedor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalReceber = titulos.stream()
                .filter(t -> "CONTA_A_RECEBER".equals(t.origem()))
                .map(TituloVencidoResponse::saldoDevedor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new InadimplenciaResponse(hoje, totalPagar, totalReceber, titulos);
    }

    // ------------------------------------------------------------------
    // Apoio
    // ------------------------------------------------------------------

    private boolean emAbertoEVencida(ContaPagar c) {
        return estaEmAberto(c.getSituacao().getCodigo()) && c.getVencimento().isBefore(LocalDate.now());
    }

    private boolean emAbertoEVencida(ContaReceber c) {
        return estaEmAberto(c.getSituacao().getCodigo()) && c.getVencimento().isBefore(LocalDate.now());
    }

    private boolean estaEmAberto(String situacao) {
        return Situacoes.ABERTA.equals(situacao)
                || Situacoes.PARCIAL.equals(situacao)
                || Situacoes.VENCIDA.equals(situacao);
    }

    private <T> BigDecimal soma(List<T> itens, Function<T, BigDecimal> campo) {
        return itens.stream().map(campo).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
