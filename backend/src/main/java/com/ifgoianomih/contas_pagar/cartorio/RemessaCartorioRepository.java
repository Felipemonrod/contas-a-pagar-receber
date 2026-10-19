package com.ifgoianomih.contas_pagar.cartorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RemessaCartorioRepository extends JpaRepository<RemessaCartorio, Long> {

    Optional<RemessaCartorio> findByContaReceberId(Long contaReceberId);

    boolean existsByContaReceberId(Long contaReceberId);

    List<RemessaCartorio> findByCartorioIdOrderByDataRemessaDesc(Long cartorioId);

    List<RemessaCartorio> findAllByOrderByDataRemessaDesc();

    /** Remessas ainda sem baixa: o titulo continua em aberto no cartorio. */
    List<RemessaCartorio> findByDataBaixaIsNullOrderByDataRemessa();
}
