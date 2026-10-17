package com.ifgoianomih.contas_pagar.contapagar;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Consultas escritas pela derivacao de nome do Spring Data: o proprio nome
 * do metodo gera o SQL, sem precisar escrever query.
 */
public interface ContaPagarRepository extends JpaRepository<ContaPagar, Long> {

    Optional<ContaPagar> findByNumeroTitulo(String numeroTitulo);

    boolean existsByNumeroTitulo(String numeroTitulo);

    /** Todas as contas de um periodo - exigencia do enunciado. */
    List<ContaPagar> findByVencimentoBetweenOrderByVencimento(LocalDate de, LocalDate ate);

    /** Periodo + situacao. */
    List<ContaPagar> findBySituacaoCodigoAndVencimentoBetweenOrderByVencimento(
            String situacao, LocalDate de, LocalDate ate);

    List<ContaPagar> findBySituacaoCodigoOrderByVencimento(String situacao);

    List<ContaPagar> findByPessoaIdOrderByVencimento(Long pessoaId);

    /** Titulos vencidos e ainda em aberto - base do relatorio de inadimplencia. */
    List<ContaPagar> findBySituacaoCodigoAndVencimentoBefore(String situacao, LocalDate data);
}
