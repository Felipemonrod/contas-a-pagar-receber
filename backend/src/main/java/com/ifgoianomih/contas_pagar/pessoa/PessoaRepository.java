package com.ifgoianomih.contas_pagar.pessoa;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Consultas derivadas do nome do metodo - o Spring Data monta o SQL sozinho.
 */
public interface PessoaRepository extends JpaRepository<Pessoa, Long> {

    Optional<Pessoa> findByDocumento(String documento);

    boolean existsByDocumento(String documento);

    List<Pessoa> findByNomeContainingIgnoreCaseOrderByNome(String nome);

    /** Navega pelo N:N: pessoas que tenham o papel informado. */
    List<Pessoa> findByPapeisCodigoOrderByNome(String codigo);

    List<Pessoa> findByAtivoTrueOrderByNome();
}
