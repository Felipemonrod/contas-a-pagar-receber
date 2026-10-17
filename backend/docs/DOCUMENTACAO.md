# Documentação do Projeto — Primeira Etapa (Monolito)

Projeto Integrador de Sistemas Distribuídos — IF Goiano, Campus Morrinhos.

Os itens seguem a numeração da seção 8 do enunciado. Os itens 9, 10, 13, 18 e 19 pertencem à segunda entrega e estão marcados como tal.

---

## 1. Descrição do Problema

O controle de contas a pagar e a receber é uma das atividades mais básicas e mais críticas de qualquer organização. Feito em planilha ou no papel, ele falha de formas previsíveis: títulos vencem sem ninguém perceber, descontos por pagamento antecipado são perdidos, não se sabe quanto a empresa realmente deve em um mês, e não há histórico confiável de quem pagou o quê e quando.

O sistema de referência deste projeto — descrito no livro *Delphi 4 — Contas a Pagar e a Receber* — resolvia esse problema em 1999, com uma aplicação desktop que rodava em um único computador, com banco de dados Paradox em arquivos locais. Esse modelo tem limitações claras hoje: não permite acesso simultâneo confiável, não se integra a outros sistemas, não roda em nuvem e depende de uma tecnologia descontinuada.

**O problema a resolver é a modernização desse sistema legado**: preservar as regras de negócio, que continuam válidas, e substituir a arquitetura por uma API REST capaz de servir a múltiplos clientes e de evoluir para uma arquitetura distribuída.

---

## 2. Objetivos da Aplicação

**Objetivo geral:** desenvolver uma aplicação monolítica em Spring Boot que informatize o controle de contas a pagar e a receber, preservando as regras de negócio do sistema original e expondo-as por uma API REST.

**Objetivos específicos:**

1. Modelar o domínio financeiro em um banco relacional normalizado
2. Implementar as operações de cadastro, consulta, alteração e exclusão
3. Registrar a quitação de títulos, aplicando as regras de desconto e juros
4. Oferecer consultas por período, situação e categoria
5. Organizar o código em camadas e por domínio, preparando a decomposição da segunda etapa
6. Documentar as decisões técnicas e as diferenças em relação ao sistema original

---

## 3. Regras de Negócio

As regras foram extraídas do capítulo 3 do livro (O Manual do Sistema). A coluna "origem" indica a página.

| ID | Regra | Origem |
|---|---|---|
| **RN01** | O plano de contas é hierárquico. Uma conta consolidada agrupa outras e **não recebe lançamento**; apenas contas analíticas aceitam rateio. | p. 48–49 |
| **RN02** | Toda conta tem um código único e pode ter uma conta superior. Uma conta não pode ser subordinada a si mesma nem a uma de suas descendentes. | p. 49 |
| **RN03** | Despesa não é título. Gastos fixos (água, luz, telefone, condomínio) são cadastrados antes como **previsão**, com valor previsto e previsão de pagamento. Quando a fatura chega, a previsão vira um título a pagar com o valor e o vencimento reais. | p. 51, 54–55 |
| **RN04** | Não se lança título para pessoa não cadastrada no papel correspondente: conta a pagar exige **fornecedor**, conta a receber exige **cliente**. | p. 56 |
| **RN05** | O desconto tem prazo de validade. Quitando até a data de validade, aplica-se o desconto; depois dela, não. Passado o vencimento, aplica-se acréscimo por dia de atraso. | p. 60 |
| **RN06** | Todo título tem um tipo: Duplicata, Nota Promissória ou Outros. | p. 60 |
| **RN07** | Quitação é registro, não exclusão. O título permanece na base com o histórico de pagamentos, para consulta e relatório. | p. 60 |
| **RN08** | O valor efetivo de uma quitação é `valor − desconto + acréscimo`, calculado na data do pagamento. | p. 60 |
| **RN09** | Um título pode ser quitado em mais de um pagamento. Enquanto houver saldo, a situação é PARCIAL. | extensão |
| **RN10** | O desconto é concedido uma única vez por título, mesmo em quitação parcelada. | extensão |
| **RN11** | Títulos com pagamento registrado não podem ser alterados nem cancelados. | extensão |
| **RN12** | A soma do rateio entre categorias deve ser igual ao valor do título. | extensão |
| **RN13** | Pessoas não são excluídas fisicamente, apenas inativadas, porque o histórico de títulos depende delas. | extensão |

As regras marcadas como "extensão" não existem no livro e foram acrescentadas pela equipe. Estão documentadas separadamente no item 17.

---

## 4. Requisitos Funcionais

| ID | Requisito |
|---|---|
| RF01 | Cadastrar, consultar, alterar e inativar pessoas (clientes e fornecedores) |
| RF02 | Associar a uma pessoa múltiplos telefones e endereços |
| RF03 | Permitir que uma pessoa seja cliente e fornecedor simultaneamente |
| RF04 | Manter o plano de contas hierárquico |
| RF05 | Listar apenas as categorias que aceitam lançamento |
| RF06 | Lançar título a pagar, com rateio entre categorias |
| RF07 | Lançar título a receber, com rateio entre categorias |
| RF08 | Simular o valor devido de um título em uma data, sem gravar |
| RF09 | Registrar pagamento de conta a pagar, total ou parcial |
| RF10 | Registrar recebimento de conta a receber, total ou parcial |
| RF11 | Cancelar título ainda não quitado |
| RF12 | Consultar títulos por período de vencimento e por situação |
| RF13 | Cadastrar despesas previstas |
| RF14 | Converter despesa prevista em título a pagar |
| RF15 | Emitir resumo financeiro do período |
| RF16 | Emitir totais por categoria do plano de contas |
| RF17 | Listar títulos vencidos e em aberto, com dias de atraso |
| RF18 | Marcar automaticamente como vencidos os títulos em aberto com vencimento passado |

---

## 5. Requisitos Não-Funcionais

| ID | Requisito | Como foi atendido |
|---|---|---|
| RNF01 | A API deve seguir o estilo REST | Recursos no plural, verbos HTTP, códigos de status adequados |
| RNF02 | A API deve ser documentada e navegável | Coleção do Postman com exemplos e descrições por requisição |
| RNF03 | Erros devem ter formato uniforme | `@RestControllerAdvice` com corpo padronizado |
| RNF04 | Dados de entrada devem ser validados antes do processamento | Bean Validation nos DTOs |
| RNF05 | O schema do banco deve ser versionado e reproduzível | Migrations Flyway |
| RNF06 | Valores monetários não podem sofrer erro de arredondamento | `BigDecimal` no código e `DECIMAL(14,2)` no banco |
| RNF07 | O ambiente deve ser reproduzível em qualquer máquina | Docker Compose para o banco, Maven Wrapper para o build |
| RNF08 | O código deve estar organizado para a decomposição futura | Pacotes por domínio, sem dependência entre `contapagar` e `contareceber` |
| RNF09 | A integridade dos dados deve ser garantida no banco | Chaves estrangeiras, UNIQUE e CHECK |
| RNF10 | Credenciais não devem estar no código em produção | Externalizadas em `application.properties`; valores locais versionados apenas para desenvolvimento |

---

## 6. Principais Funcionalidades

**Cadastros.** Pessoas com múltiplos telefones e endereços, e papéis de cliente e fornecedor que podem coexistir. Plano de contas hierárquico, com distinção entre contas consolidadas e analíticas.

**Contas a pagar e a receber.** Lançamento com rateio entre categorias, simulação do valor devido, quitação total ou parcial com desconto e juros calculados, e cancelamento preservando o registro.

**Despesas.** Previsão de gastos fixos e conversão em título quando a fatura chega — o conceito mais característico do sistema original.

**Relatórios.** Resumo do período com previsto, quitado e em aberto; totais por categoria; e inadimplência com dias de atraso.

---

## 7. Modelo de Domínio

Ver [DIAGRAMAS.md](DIAGRAMAS.md), seções 1 e 2.

**Entidades centrais:**

- `Pessoa` — unifica Cliente e Fornecedor, que no livro eram duas tabelas quase idênticas
- `PlanoConta` — categoria financeira, auto-relacionada
- `ContaPagar` / `ContaReceber` — títulos, com estrutura espelhada
- `Pagamento` / `Recebimento` — registros de quitação
- `Despesa` — previsão que origina um título
- Tabelas de domínio: `Papel`, `SituacaoConta`, `TipoTitulo`, `FormaPagamento`, `Cidade`

**Relacionamentos que estruturam o modelo:**

| Tipo | Onde | Por quê |
|---|---|---|
| N:N | `pessoa` ↔ `papel` | Uma pessoa pode ser cliente e fornecedor |
| N:N com atributo | `conta_pagar` ↔ `plano_conta` | Rateio de um título entre categorias |
| 1:N | `pessoa` → `telefone`, `endereco` | Elimina o grupo repetitivo do livro |
| 1:N | `conta_pagar` → `pagamento` | Permite quitação parcial |
| 1:N auto | `plano_conta` → `plano_conta` | Hierarquia contábil |
| 1:1 opcional | `despesa` → `conta_pagar` | A previsão que virou título |

---

## 8. Arquitetura Monolítica

Ver [DIAGRAMAS.md](DIAGRAMAS.md), seções 3 e 4.

### Classificação do sistema

Pelos modelos de sistemas distribuídos vistos em aula, o sistema adota o **modelo cliente-servidor**: o servidor (aplicação Spring Boot) gerencia os dados e a lógica de negócio e aguarda requisições; os clientes (interface web, Postman ou qualquer consumidor HTTP) iniciam as requisições e cuidam da apresentação. A comunicação é **direta e síncrona**, sobre HTTP.

As características desse modelo valem tanto a favor quanto contra, e a equipe assume as duas:

| | Como se manifesta neste sistema |
|---|---|
| **Centralização dos recursos** | Uma base única garante consistência dos dados e simplifica backup, controle de acesso e atualização |
| **Ponto único de falha** | Se a aplicação ou o MySQL ficam fora do ar, todos os clientes param. Não há redundância |
| **Gargalo de desempenho** | Todas as requisições disputam o mesmo processo e a mesma conexão de banco |
| **Escalabilidade limitada** | Só é possível escalar verticalmente, ou replicar a aplicação inteira — não um módulo específico |

São justamente essas três limitações que motivam a segunda etapa. A decomposição em microsserviços não é um exercício gratuito: ela ataca o ponto único de falha e permite escalar só o módulo que precisa.

### Definição formal

A aplicação é **um único processo**, com **uma única base de dados** e **uma base de código centralizada**, atendendo à definição da seção 4 do enunciado.

**Organização em camadas:**

| Camada | Responsabilidade | Onde |
|---|---|---|
| Controladores | Receber HTTP, validar entrada, devolver status | `*Controller` |
| Serviços | Regras de negócio e controle transacional | `*Service` |
| Repositórios | Acesso a dados | `*Repository` |
| Entidades | Mapeamento objeto-relacional | `Pessoa`, `ContaPagar`, … |
| DTOs | Contrato da API, separado do banco | `*Dtos`, `dto/` |
| Tratamento de exceções | Tradução para códigos HTTP | `shared/exception` |
| Validações | Bean Validation nos DTOs | `@NotNull`, `@DecimalMin`, … |
| Configurações | CORS, datasource, Flyway | `shared/CorsConfig`, `application.properties` |

**Decisão estrutural:** os pacotes são organizados **por domínio** e não por camada. Cada pasta de primeiro nível (`pessoa`, `planoconta`, `contapagar`, `contareceber`, `despesa`, `relatorio`) contém suas próprias camadas. Isso tem uma consequência direta na segunda etapa: cada pacote já é um candidato a microsserviço, e a decomposição não exige reorganizar o código arquivo por arquivo.

---

## 11. Descrição das APIs

A documentação executável é a **coleção do Postman** em [`docs/Projeto-CPR.postman_collection.json`](Projeto-CPR.postman_collection.json): 32 requisições organizadas por domínio, com exemplos de corpo preenchidos e verificação automática da resposta. No Postman, *View Documentation* gera a página navegável da API.

**Convenções adotadas:**

| Situação | Status | Corpo |
|---|---|---|
| Consulta bem-sucedida | 200 | Recurso ou lista |
| Criação bem-sucedida | 201 | Recurso criado, com header `Location` |
| Exclusão bem-sucedida | 204 | Vazio |
| Dados de entrada inválidos | 400 | Lista dos campos com erro |
| Recurso inexistente | 404 | Mensagem |
| Violação de restrição do banco | 409 | Mensagem |
| Violação de regra de negócio | 422 | Mensagem explicando a regra |

**Formato de erro:**

```json
{
  "timestamp": "2026-09-30T20:23:05.536-03:00",
  "status": 422,
  "erro": "REGRA_NEGOCIO",
  "mensagem": "A categoria 'PASSIVO CIRCULANTE' e consolidada e nao aceita lancamento.",
  "campos": []
}
```

Em erros de validação, `campos` traz o nome de cada campo e a mensagem correspondente.

**Decisão de desenho:** a quitação é `POST` em um sub-recurso (`/contas-pagar/{id}/pagamento`) e não `PUT` no título. Quitar não é editar um campo: é uma ação de negócio com regra própria, que calcula encargos e muda a situação. Esse desenho também facilita torná-la idempotente na segunda etapa.

---

## 12. Estratégia de Persistência

**Banco de dados.** MySQL 8.4 em contêiner Docker. Instância única compartilhada por toda a aplicação, como é próprio de um monolito.

**Versionamento do schema.** Flyway, com migrations numeradas em `src/main/resources/db/migration`. Nenhuma alteração de schema é feita manualmente: toda mudança é um arquivo novo, aplicado automaticamente na inicialização. O Hibernate roda com `ddl-auto=validate`, ou seja, ele **valida** que as entidades batem com o schema, mas nunca o altera.

**Normalização.** O modelo foi normalizado até a 3ª Forma Normal. As violações do modelo original e suas correções estão na tabela do [DIAGRAMAS.md](DIAGRAMAS.md), seção 2.

**Integridade.** Garantida no banco, e não apenas na aplicação: chaves estrangeiras em todos os relacionamentos, `UNIQUE` em documento de pessoa, código de conta e número de título, e `CHECK` em valores monetários e coerência de datas.

**Valores monetários.** `BigDecimal` em Java e `DECIMAL(14,2)` no banco. `double` foi descartado por introduzir erro de arredondamento inaceitável em valores financeiros.

**Carregamento.** `open-in-view` desabilitado, o que força a conversão de entidade em DTO a acontecer dentro da transação, no service. É mais trabalhoso, mas evita consultas inesperadas ao banco durante a serialização da resposta.

---

## 14. Tratamento de Falhas

**Validação de entrada.** Bean Validation nos DTOs rejeita a requisição antes que ela chegue ao service, devolvendo 400 com a lista de campos inválidos.

**Violação de regra de negócio.** Lançada como `NegocioException` e traduzida para 422, com mensagem que explica a regra violada em linguagem compreensível pelo operador.

**Recurso inexistente.** `RecursoNaoEncontradoException` → 404.

**Integridade do banco.** `DataIntegrityViolationException` → 409. É a rede de segurança para casos em que a validação da aplicação não alcança, como uma exclusão que violaria uma chave estrangeira.

**Atomicidade.** Todo método de escrita é `@Transactional`. Se uma exceção ocorre no meio da operação, a transação é revertida inteira — não existe título gravado sem o rateio, nem pagamento sem a atualização da situação.

**Tratamento central.** Um único `@RestControllerAdvice` concentra todas as traduções. Nenhum controller tem `try/catch`.

---

## 15. Procedimentos para Executar

Ver [README.md](../README.md), seção "Como executar".

Resumo: `docker compose up -d` e depois `./mvnw spring-boot:run`. O Flyway cria o schema e carrega os dados de domínio automaticamente.

---

## 16. Testes Realizados

### Bateria de validação da API

Foi construída uma bateria automatizada que exercita o sistema de fora, pela API, cobrindo **as 13 regras de negócio** e **os requisitos mínimos da seção 7 do enunciado**. São **44 verificações**, todas aprovadas.

- Script: [`docs/evidencias/validar-api.py`](evidencias/validar-api.py)
- Saída da última execução: [`docs/evidencias/resultado-validacao.txt`](evidencias/resultado-validacao.txt)
- Execução: `python docs/evidencias/validar-api.py` com a aplicação no ar

A bateria é repetível — cada execução usa identificadores próprios e não exige recriar a base.

### Cenários cobertos

| Grupo | Cenários | Resultado |
|---|---|---|
| CRUD de pessoas | Cadastro, consulta e alteração | 3/3 |
| Relacionamentos | N:N de papéis, 1:N de telefones e endereços | 3/3 |
| RN01 — conta consolidada | Rateio em conta consolidada recusado | 1/1 |
| RN02 — hierarquia | Subconta sob analítica recusada; sob consolidada aceita; código duplicado recusado | 3/3 |
| RN03 — despesa vira título | Previsão criada; convertida com valor real; conversão dupla recusada; RN04 herdada | 4/4 |
| RN04 — papel exigido | Conta a pagar sem fornecedor e a receber sem cliente, ambas recusadas | 2/2 |
| RN05 — desconto e juros | Dentro da validade, após a validade, e após o vencimento | 3/3 |
| RN06 — tipo de título | Tipo inexistente recusado | 1/1 |
| RN07 — quitação é registro | Quitação dupla recusada; histórico preservado | 2/2 |
| RN08 — valor efetivo | 1000 − 50 de desconto = 950 pagos | 1/1 |
| RN09 — quitação parcial | Situação PARCIAL com saldo correto | 1/1 |
| RN10 — desconto único | Desconto não repetido em quitação parcelada | 1/1 |
| RN11 — título com pagamento | Alteração e cancelamento recusados | 2/2 |
| RN12 — rateio fecha | Rateio divergente do valor recusado | 1/1 |
| RN13 — exclusão lógica | Pessoa inativada e ainda consultável | 2/2 |
| Contas a receber | Lançamento e recebimento integral | 2/2 |
| Consultas | Por período, e por período com situação | 2/2 |
| Relatórios | Resumo, por categoria e inadimplência | 3/3 |
| Tratamento de erros | 400 com lista de campos, 404, 422 duplicado, 422 datas incoerentes | 4/4 |
| Lançamento e situação | Título com rateio N:N; situação inicial ABERTA; quitação integral | 3/3 |
| **Total** | | **44/44** |

### Coleção do Postman

A coleção [`docs/Projeto-CPR.postman_collection.json`](Projeto-CPR.postman_collection.json) reproduz os mesmos fluxos de forma interativa, com 30 requisições, incluindo uma pasta dedicada a cenários de erro. Serve para a demonstração em vídeo.

### Pendência

> Os testes **unitários e de integração em JUnit** ainda não foram escritos. Eles verificam as regras isoladamente e rodam junto do build (`mvnw test`), o que a bateria externa não substitui. Está planejado para a sequência.

## 17. Dificuldades Encontradas

**O modelo do livro é desnormalizado.** Telefone, ramal e fax eram colunas lado a lado; cidade e estado ficavam na linha do cliente; cliente e fornecedor eram duas tabelas quase idênticas. Decidir o que normalizar e o que preservar exigiu separar o que é regra de negócio do que é limitação da tecnologia de 1999.

**O livro não tem situação da conta.** Ela era derivada na tela, a partir dos campos de data. Como o enunciado exige situação como dado, foi preciso criá-la e decidir as transições — incluindo o estado PARCIAL, que não existe no original.

**Desconto com quitação parcial gerou um bug real.** A primeira implementação concedia o desconto integral a cada pagamento, e o título ficava com situação PAGA e saldo diferente de zero ao mesmo tempo. A correção foi rastrear o desconto já concedido e calcular o saldo considerando os encargos aplicados. O bug só apareceu porque o fluxo foi testado de ponta a ponta, e não assumido como correto.

**Spring Boot 4 modularizou as autoconfigurações.** A dependência `flyway-core` sozinha não ativa as migrations: é necessário também `org.springframework.boot:spring-boot-flyway`. O sintoma era enganoso — a aplicação subia, mas o Hibernate acusava tabela inexistente.

**Compilação incremental mascarou erros.** `mvnw compile` reportou sucesso enquanto a aplicação falhava ao subir com `Unresolved compilation problem`. Apenas `clean compile` revelou os erros reais. Passou a ser prática do grupo sempre usar `clean`.

**LazyInitializationException ao serializar a resposta.** Com `open-in-view` desabilitado, converter a entidade em DTO no controller falhava, porque as coleções já não estavam disponíveis fora da transação. A solução foi mover a conversão para dentro do service — que é também a decisão arquiteturalmente correta.

---

## 18. Preparação para a Segunda Etapa

Esta seção não é exigida na primeira entrega. Está aqui porque as decisões tomadas agora determinam o que será possível depois, e porque a equipe quer deixar registrado que a decomposição foi pensada desde o início.

### O que o monolito já tem pronto para a decomposição

| Decisão da primeira etapa | Efeito na segunda |
|---|---|
| Pacotes por domínio, não por camada | Cada pacote é um candidato a serviço, sem reorganizar arquivo por arquivo |
| `contapagar` e `contareceber` não se conhecem | Podem virar serviços independentes sem reescrita |
| Vínculo com pessoa também pelo `documento` | Serve de identificador entre serviços quando a FK deixar de existir |
| Quitação como ação em sub-recurso (`POST /{id}/pagamento`) | Operação isolada, mais simples de tornar idempotente |
| Relatórios sem repositório próprio | Já é um consumidor de dados, candidato natural a ser alimentado por eventos |

A única dependência entre domínios é `despesa → contapagar`, e ela é intencional, para não duplicar a RN04. Na decomposição, essa chamada em memória vira chamada de rede e passa a exigir tratamento de falha.

### Divisão prevista e forma de comunicação

| Serviço | Depende de | Comunicação |
|---|---|---|
| pessoas | — | — |
| categorias | — | — |
| contas-a-pagar | pessoas, categorias | **síncrona** — a validação precisa da resposta antes de gravar |
| contas-a-receber | pessoas, categorias | **síncrona**, mesma razão |
| relatorios | eventos dos dois | **assíncrona** — tolera atraso, não pode travar a quitação |

### Riscos da comunicação distribuída e como serão tratados

A comunicação síncrona entre serviços introduz problemas que não existem dentro de um processo. O tratamento previsto segue as boas práticas de comunicação síncrona:

| Risco | Tratamento previsto |
|---|---|
| Serviço indisponível | **Timeouts curtos** — a espera indefinida é o que transforma uma falha local em incidente generalizado |
| Falha em cascata | **Circuit breaker** — após N falhas o circuito abre e responde rápido, em vez de acumular requisições pendentes |
| Falha transitória de rede | **Retries com jitter e limite**, para não sincronizar tentativas e agravar a sobrecarga |
| Requisição duplicada pela rede | **Idempotência** — chave na requisição de quitação, de modo que a segunda chamada devolva o mesmo resultado sem registrar outro pagamento |
| Consulta repetida a dados estáveis | **Réplica local** do nome e documento da pessoa, aceitando **consistência eventual** |
| Dificuldade de diagnosticar | **Observabilidade** — identificador de correlação propagado entre os serviços, para acompanhar uma requisição que percorre vários deles |

O princípio que orienta todas essas escolhas: em um monolito, uma chamada entre módulos ou funciona ou lança exceção. Entre serviços, ela pode ainda **demorar indefinidamente** ou **ter sido executada sem que a resposta chegue** — e são esses dois casos novos que exigem timeout, circuit breaker e idempotência.

---

## Itens da Segunda Entrega

- **9.** Arquitetura de microsserviços
- **10.** Justificativa da divisão dos serviços
- **13.** Forma de comunicação entre os serviços
- **18.** Comparação entre as duas arquiteturas *(a seção 18 acima antecipa o planejamento; a comparação em si só é possível depois de implementar)*
- **19.** Conclusão da equipe
