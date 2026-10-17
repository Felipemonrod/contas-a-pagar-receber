package com.ifgoianomih.contas_pagar.shared.encargo;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

/**
 * Contexto do padrao STRATEGY.
 *
 * O Spring injeta automaticamente todas as implementacoes de PoliticaEncargo
 * registradas como @Component. Esta classe apenas soma o resultado de todas.
 *
 * Consequencia pratica: criar uma regra nova nao exige mexer aqui.
 */
@Component
public class CalculadoraEncargos {

    private final List<PoliticaEncargo> politicas;

    public CalculadoraEncargos(List<PoliticaEncargo> politicas) {
        this.politicas = politicas;
    }

    public Encargos calcular(TituloQuitavel titulo, LocalDate dataQuitacao) {
        return politicas.stream()
                .map(politica -> politica.calcular(titulo, dataQuitacao))
                .reduce(Encargos.NENHUM, Encargos::somar);
    }
}
