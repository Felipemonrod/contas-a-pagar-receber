package com.ifgoianomih.contas_pagar.dominio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FormaPagamentoRepository extends JpaRepository<FormaPagamento, Long> {

    Optional<FormaPagamento> findByCodigo(String codigo);
}
