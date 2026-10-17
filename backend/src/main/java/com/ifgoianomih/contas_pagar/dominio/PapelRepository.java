package com.ifgoianomih.contas_pagar.dominio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PapelRepository extends JpaRepository<Papel, Long> {

    Optional<Papel> findByCodigo(String codigo);
}
