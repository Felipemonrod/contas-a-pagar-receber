package com.ifgoianomih.contas_pagar.banco;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContaCorrenteRepository extends JpaRepository<ContaCorrente, Long> {

    List<ContaCorrente> findByAgenciaIdOrderByNumero(Long agenciaId);

    List<ContaCorrente> findByAtivaTrueOrderByNumero();

    boolean existsByAgenciaIdAndNumero(Long agenciaId, String numero);
}
