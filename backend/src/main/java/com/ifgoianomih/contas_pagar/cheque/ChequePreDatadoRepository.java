package com.ifgoianomih.contas_pagar.cheque;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChequePreDatadoRepository extends JpaRepository<ChequePreDatado, Long> {

    List<ChequePreDatado> findAllByOrderByDeposito();

    List<ChequePreDatado> findBySituacaoOrderByDeposito(String situacao);

    List<ChequePreDatado> findByPessoaIdOrderByDeposito(Long pessoaId);

    List<ChequePreDatado> findByDepositoBetweenOrderByDeposito(LocalDate de, LocalDate ate);

    boolean existsByContaCorrenteIdAndNumeroCheque(Long contaCorrenteId, String numeroCheque);
}
