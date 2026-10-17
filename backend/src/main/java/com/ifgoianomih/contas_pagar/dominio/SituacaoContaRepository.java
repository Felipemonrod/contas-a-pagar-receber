package com.ifgoianomih.contas_pagar.dominio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SituacaoContaRepository extends JpaRepository<SituacaoConta, Long> {

    Optional<SituacaoConta> findByCodigo(String codigo);
}
