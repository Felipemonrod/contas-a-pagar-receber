package com.ifgoianomih.contas_pagar.shared.encargo;

import java.time.LocalDate;

/**
 * PADRAO STRATEGY.
 *
 * Cada regra de desconto ou juros e uma implementacao desta interface.
 * Para criar uma nova regra (multa fixa, desconto por volume, carencia),
 * basta escrever mais uma classe com @Component - nenhum codigo existente
 * precisa ser alterado.
 */
public interface PoliticaEncargo {

    Encargos calcular(TituloQuitavel titulo, LocalDate dataQuitacao);
}
