package com.ifgoianomih.contas_pagar.planoconta;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanoContaRepository extends JpaRepository<PlanoConta, Long> {

    Optional<PlanoConta> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    /** Raizes da arvore (contas sem superior). */
    List<PlanoConta> findBySuperiorIsNullOrderByCodigo();

    List<PlanoConta> findByConsolidadaFalseOrderByCodigo();
}
