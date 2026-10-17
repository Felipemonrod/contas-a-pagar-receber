package com.ifgoianomih.contas_pagar.despesa;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DespesaRepository extends JpaRepository<Despesa, Long> {

    /** Previsoes que ainda nao viraram titulo. */
    List<Despesa> findByContaPagarIsNullOrderByPrevisaoPagamento();

    List<Despesa> findByPrevisaoPagamentoBetweenOrderByPrevisaoPagamento(LocalDate de, LocalDate ate);
}
