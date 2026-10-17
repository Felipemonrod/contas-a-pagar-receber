package com.ifgoianomih.contas_pagar.shared;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Libera o acesso do front-end, que roda em outra porta durante o
 * desenvolvimento. Sem isto o navegador bloqueia as chamadas por politica
 * de mesma origem, e o erro aparece so no console do navegador - nada
 * chega a ser registrado no log da API.
 *
 * As origens permitidas ficam em application.properties (cpr.cors.origens),
 * para que producao nao herde a configuracao de desenvolvimento. O valor
 * padrao existe para que os testes subam sem depender dessa propriedade.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] origensPermitidas;

    public CorsConfig(@Value("${cpr.cors.origens:http://localhost:5173}") String[] origensPermitidas) {
        this.origensPermitidas = origensPermitidas;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origensPermitidas)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
