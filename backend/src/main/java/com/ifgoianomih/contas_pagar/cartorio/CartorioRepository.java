package com.ifgoianomih.contas_pagar.cartorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CartorioRepository extends JpaRepository<Cartorio, Long> {

    Optional<Cartorio> findByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCase(String nome);

    List<Cartorio> findAllByOrderByNome();
}
