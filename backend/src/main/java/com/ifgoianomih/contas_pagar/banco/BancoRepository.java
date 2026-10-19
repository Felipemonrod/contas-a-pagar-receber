package com.ifgoianomih.contas_pagar.banco;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BancoRepository extends JpaRepository<Banco, Long> {

    Optional<Banco> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    List<Banco> findAllByOrderByCodigo();

    List<Banco> findByNomeContainingIgnoreCaseOrderByCodigo(String nome);
}
