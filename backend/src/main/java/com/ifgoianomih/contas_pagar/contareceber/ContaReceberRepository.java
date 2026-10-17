package com.ifgoianomih.contas_pagar.contareceber;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Consultas escritas pela derivacao de nome do Spring Data: o proprio nome
 * do metodo gera o SQL, sem precisar escrever query.
 */
public interface ContaReceberRepository extends JpaRepository<ContaReceber, Long> {

    Optional<ContaReceber> findByNumeroTitulo(String numeroTitulo);

    boolean existsByNumeroTitulo(String numeroTitulo);

    /** Todas as contas de um periodo - exigencia do enunciado. */
    List<ContaReceber> findByVencimentoBetweenOrderByVencimento(LocalDate de, LocalDate ate);

    /** Periodo + situacao. */
    List<ContaReceber> findBySituacaoCodigoAndVencimentoBetweenOrderByVencimento(
            String situacao, LocalDate de, LocalDate ate);

    List<ContaReceber> findBySituacaoCodigoOrderByVencimento(String situacao);

    List<ContaReceber> findByPessoaIdOrderByVencimento(Long pessoaId);

    /** Titulos vencidos e ainda em aberto - base do relatorio de inadimplencia. */
    List<ContaReceber> findBySituacaoCodigoAndVencimentoBefore(String situacao, LocalDate data);
}
