# Evidencias dos testes

Execucao de 19/10/2026.

## Back-end — `mvnw test`

Os testes rodam em H2 em memoria e nao dependem do MySQL estar no ar.

```
Running Alteracao de titulo
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 8.264 s -- in Alteracao de titulo
Running ContaPagarService � regras de negocio
Tests run: 20, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.160 s -- in ContaPagarService � regras de negocio
Running ContaPagar � regras da entidade
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.021 s -- in ContaPagar � regras da entidade
Running Integracao � fluxo completo de contas a pagar
Tests run: 19, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.660 s -- in Integracao � fluxo completo de contas a pagar
Running com.ifgoianomih.contas_pagar.ContasPagarApplicationTests
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.016 s -- in com.ifgoianomih.contas_pagar.ContasPagarApplicationTests
Running Dados comerciais do fornecedor
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.088 s -- in Dados comerciais do fornecedor
Running Consulta de pessoas
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.261 s -- in Consulta de pessoas
Running Calculadora de encargos (contexto do Strategy)
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.020 s -- in Calculadora de encargos (contexto do Strategy)
Running Desconto por pontualidade (RN05)
Running quando nao ha desconto a conceder
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.002 s -- in quando nao ha desconto a conceder
Running quando o titulo tem desconto com validade
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0 s -- in quando o titulo tem desconto com validade
Tests run: 0, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.013 s -- in Desconto por pontualidade (RN05)
Running Juros por atraso
Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.139 s -- in Juros por atraso
Tests run: 85, Failures: 0, Errors: 0, Skipped: 0
```

## Front-end — `npm test`

```
 Test Files  5 passed (5)
      Tests  120 passed (120)
   Duration  18.14s
```

## Validacao da integracao

Com o banco recriado do zero (`docker compose down -v && docker compose up -d`),
as sete migrations foram aplicadas e o fluxo foi exercitado pelo navegador:

| Passo | Resultado |
|---|---|
| Tela de Clientes com banco vazio | "Nenhum registro cadastrado" |
| Cadastro pela interface | "Registro gravado" |
| Conferencia no MySQL | pessoa, endereco, cidade, telefone e pessoa_papel gravados |
| Navegacao pelas 13 telas | sem erro no console |

Consulta usada na conferencia:

```sql
SELECT p.id, p.nome, p.documento, e.logradouro, c.nome AS cidade, c.uf, t.numero
  FROM pessoa p
  LEFT JOIN endereco e ON e.pessoa_id = p.id
  LEFT JOIN cidade   c ON c.id = e.cidade_id
  LEFT JOIN telefone t ON t.pessoa_id = p.id;
```

```
id  nome                  documento           logradouro         cidade     uf  numero
1   Validacao Final Ltda  12.345.678/0001-99  Rua da Validacao   Morrinhos  GO  (64) 3413-0000
```

## Colecao do Postman

[`docs/Projeto-CPR.postman_collection.json`](../Projeto-CPR.postman_collection.json):
58 requisicoes em 11 pastas, em ordem de execucao, com verificacao automatica da
resposta e uma pasta dedicada aos cenarios que devem ser recusados.

Executada contra o banco recriado do zero:

```
1. Plano de Contas                        3 requisicoes   OK
2. Pessoas                                5 requisicoes   OK
3. Contas a Pagar                         7 requisicoes   OK
4. Contas a Receber                       3 requisicoes   OK
5. Despesas (RN03)                        3 requisicoes   OK
6. Relatorios                             3 requisicoes   OK
7. Bancos e Contas Correntes              5 requisicoes   OK
8. Cheques Pre-Datados                    8 requisicoes   OK
10. Cartorios e Protesto                  7 requisicoes   OK
11. Lancamentos Contabeis                 6 requisicoes   OK
9. Cenarios de Erro                       8 requisicoes   OK

58 requisicoes executadas, 0 com problema
```

As 15 recusas esperadas (422, 400 e 404) sao verificadas pelo proprio script de
cada requisicao: a requisicao so passa se o status for exatamente o previsto.
