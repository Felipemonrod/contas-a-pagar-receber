package com.ifgoianomih.contas_pagar.banco;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AgenciaRepository extends JpaRepository<Agencia, Long> {

    List<Agencia> findByBancoIdOrderByNumero(Long bancoId);

    boolean existsByBancoIdAndNumero(Long bancoId, String numero);
}
