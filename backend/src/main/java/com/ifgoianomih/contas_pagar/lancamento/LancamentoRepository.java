package com.ifgoianomih.contas_pagar.lancamento;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LancamentoRepository extends JpaRepository<Lancamento, Long> {

    List<Lancamento> findByDataBetweenOrderByDataDescIdDesc(LocalDate de, LocalDate ate);

    List<Lancamento> findByStatusOrderByDataDescIdDesc(String status);

    List<Lancamento> findAllByOrderByDataDescIdDesc();

    /** Lancamentos que envolvem uma conta, de qualquer dos dois lados. */
    List<Lancamento> findByContaCreditoIdOrContaDebitoIdOrderByDataDesc(Long credito, Long debito);
}
