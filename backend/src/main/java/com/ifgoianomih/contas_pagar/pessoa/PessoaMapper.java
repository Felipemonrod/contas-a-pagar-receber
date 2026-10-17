package com.ifgoianomih.contas_pagar.pessoa;

import java.util.List;

import org.springframework.stereotype.Component;

import com.ifgoianomih.contas_pagar.dominio.Papel;
import com.ifgoianomih.contas_pagar.pessoa.PessoaDtos.EnderecoResponse;
import com.ifgoianomih.contas_pagar.pessoa.PessoaDtos.PessoaResponse;
import com.ifgoianomih.contas_pagar.pessoa.PessoaDtos.TelefoneResponse;

/** PADRAO MAPPER: converte a entidade Pessoa no DTO de resposta. */
@Component
public class PessoaMapper {

    public PessoaResponse paraResposta(Pessoa p) {
        return new PessoaResponse(
                p.getId(), p.getNome(), p.getDocumento(), p.getInscricaoEstadual(),
                p.getEmail(), p.getContato(), p.getAtivo(),
                p.getPapeis().stream().map(Papel::getCodigo).toList(),
                p.getTelefones().stream()
                        .map(t -> new TelefoneResponse(t.getId(), t.getNumero(), t.getRamal(), t.getTipo()))
                        .toList(),
                p.getEnderecos().stream()
                        .map(e -> new EnderecoResponse(
                                e.getId(), e.getLogradouro(), e.getNumero(), e.getComplemento(),
                                e.getBairro(), e.getCep(), e.getCidade().getNome(),
                                e.getCidade().getUf(), e.getPrincipal()))
                        .toList());
    }

    public List<PessoaResponse> paraResposta(List<Pessoa> pessoas) {
        return pessoas.stream().map(this::paraResposta).toList();
    }
}
