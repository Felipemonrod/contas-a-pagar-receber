package com.ifgoianomih.contas_pagar.pessoa;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ifgoianomih.contas_pagar.dominio.Cidade;
import com.ifgoianomih.contas_pagar.dominio.CidadeRepository;
import com.ifgoianomih.contas_pagar.dominio.Papel;
import com.ifgoianomih.contas_pagar.dominio.PapelRepository;
import com.ifgoianomih.contas_pagar.pessoa.PessoaDtos.EnderecoRequest;
import com.ifgoianomih.contas_pagar.pessoa.PessoaDtos.PessoaResponse;
import com.ifgoianomih.contas_pagar.pessoa.PessoaDtos.PessoaRequest;
import com.ifgoianomih.contas_pagar.pessoa.PessoaDtos.TelefoneRequest;
import com.ifgoianomih.contas_pagar.shared.exception.NegocioException;
import com.ifgoianomih.contas_pagar.shared.exception.RecursoNaoEncontradoException;

@Service
@Transactional(readOnly = true)
public class PessoaService {

    private final PessoaRepository pessoaRepository;
    private final PapelRepository papelRepository;
    private final CidadeRepository cidadeRepository;
    private final PessoaMapper mapper;

    public PessoaService(PessoaRepository pessoaRepository,
                         PapelRepository papelRepository,
                         CidadeRepository cidadeRepository,
                         PessoaMapper mapper) {
        this.pessoaRepository = pessoaRepository;
        this.papelRepository = papelRepository;
        this.cidadeRepository = cidadeRepository;
        this.mapper = mapper;
    }

    public List<PessoaResponse> listar(String nome, String papel) {
        if (nome != null && !nome.isBlank()) {
            return mapper.paraResposta(pessoaRepository.findByNomeContainingIgnoreCaseOrderByNome(nome));
        }
        if (papel != null && !papel.isBlank()) {
            return mapper.paraResposta(pessoaRepository.findByPapeisCodigoOrderByNome(papel));
        }
        return mapper.paraResposta(pessoaRepository.findAll());
    }

    public PessoaResponse buscar(Long id) {
        return mapper.paraResposta(carregar(id));
    }

    /** Uso interno: entidade gerenciada, so dentro de transacao. */
    private Pessoa carregar(Long id) {
        return pessoaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Pessoa", id));
    }

    @Transactional
    public PessoaResponse cadastrar(PessoaRequest req) {
        if (pessoaRepository.existsByDocumento(req.documento())) {
            throw new NegocioException("Ja existe uma pessoa com o documento " + req.documento() + ".");
        }

        Pessoa pessoa = new Pessoa();
        preencher(pessoa, req);
        return mapper.paraResposta(pessoaRepository.save(pessoa));
    }

    @Transactional
    public PessoaResponse alterar(Long id, PessoaRequest req) {
        Pessoa pessoa = carregar(id);

        pessoaRepository.findByDocumento(req.documento())
                .filter(outra -> !outra.getId().equals(id))
                .ifPresent(outra -> {
                    throw new NegocioException("O documento " + req.documento() + " ja pertence a outra pessoa.");
                });

        pessoa.getPapeis().clear();
        pessoa.getTelefones().clear();
        pessoa.getEnderecos().clear();
        preencher(pessoa, req);
        return mapper.paraResposta(pessoaRepository.save(pessoa));
    }

    /** Exclusao logica: o historico de titulos depende da pessoa existir. */
    @Transactional
    public PessoaResponse inativar(Long id) {
        Pessoa pessoa = carregar(id);
        pessoa.setAtivo(false);
        return mapper.paraResposta(pessoaRepository.save(pessoa));
    }

    private void preencher(Pessoa pessoa, PessoaRequest req) {
        pessoa.setNome(req.nome());
        pessoa.setDocumento(req.documento());
        pessoa.setInscricaoEstadual(req.inscricaoEstadual());
        pessoa.setEmail(req.email());
        pessoa.setContato(req.contato());

        for (String codigo : req.papeis()) {
            Papel papel = papelRepository.findByCodigo(codigo)
                    .orElseThrow(() -> new NegocioException(
                            "Papel invalido: " + codigo + ". Use CLIENTE ou FORNECEDOR."));
            pessoa.getPapeis().add(papel);
        }

        if (req.telefones() != null) {
            for (TelefoneRequest t : req.telefones()) {
                Telefone telefone = new Telefone();
                telefone.setNumero(t.numero());
                telefone.setRamal(t.ramal());
                telefone.setTipo(t.tipo() != null ? t.tipo() : "COMERCIAL");
                pessoa.adicionarTelefone(telefone);
            }
        }

        if (req.enderecos() != null) {
            for (EnderecoRequest e : req.enderecos()) {
                Endereco endereco = new Endereco();
                endereco.setLogradouro(e.logradouro());
                endereco.setNumero(e.numero());
                endereco.setComplemento(e.complemento());
                endereco.setBairro(e.bairro());
                endereco.setCep(e.cep());
                endereco.setPrincipal(e.principal() != null ? e.principal() : false);
                endereco.setCidade(obterOuCriarCidade(e.cidade(), e.uf()));
                pessoa.adicionarEndereco(endereco);
            }
        }
    }

    /** Evita duplicar cidade: reaproveita a existente ou cria uma nova. */
    private Cidade obterOuCriarCidade(String nome, String uf) {
        return cidadeRepository.findByNomeIgnoreCaseAndUf(nome, uf.toUpperCase())
                .orElseGet(() -> {
                    Cidade nova = new Cidade();
                    nova.setNome(nome);
                    nova.setUf(uf.toUpperCase());
                    return cidadeRepository.save(nova);
                });
    }
}
