package com.ifgoianomih.contas_pagar.dominio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TipoTituloRepository extends JpaRepository<TipoTitulo, Long> {

    Optional<TipoTitulo> findByCodigo(String codigo);
}
