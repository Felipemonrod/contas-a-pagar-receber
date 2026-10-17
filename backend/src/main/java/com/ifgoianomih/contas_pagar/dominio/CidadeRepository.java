package com.ifgoianomih.contas_pagar.dominio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CidadeRepository extends JpaRepository<Cidade, Long> {

    Optional<Cidade> findByNomeIgnoreCaseAndUf(String nome, String uf);

    List<Cidade> findByUfOrderByNome(String uf);
}
