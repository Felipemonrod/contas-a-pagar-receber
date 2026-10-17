# Padrões de Projeto Utilizados

Documento de apoio para o item "justificativa das decisões técnicas" e para a apresentação em vídeo.

A escolha foi por **usar os padrões que o problema pede**, e não por aplicar o catálogo inteiro. Padrão aplicado sem necessidade vira código que ninguém consegue justificar.

---

## 1. Padrões implementados explicitamente no código

### Strategy — cálculo de encargos
**Onde:** `shared/encargo/`

| Arquivo | Papel no padrão |
|---|---|
| `PoliticaEncargo` | Interface Strategy |
| `DescontoPorPontualidade` | Estratégia concreta — desconto dentro da validade (RN05) |
| `JurosPorAtraso` | Estratégia concreta — acréscimo por dia de atraso |
| `CalculadoraEncargos` | Contexto — aplica todas as estratégias e soma o resultado |

**Por que aqui:** as regras de desconto e juros são exatamente o tipo de coisa que muda. Para criar uma regra nova (multa fixa, carência, desconto por volume), basta escrever mais uma classe com `@Component` — o Spring a injeta automaticamente na lista e **nenhum código existente precisa ser alterado**.

Demonstração no vídeo: a mesma conta simulada em três datas devolve desconto, nada, ou juros, sem nenhum `if` no service.

### Service Layer — regras de negócio isoladas
**Onde:** `ContaPagarService`, `ContaReceberService`, `PessoaService`, `PlanoContaService`, `DespesaService`

O controller só trata HTTP, o repositório só fala com o banco, e toda a regra fica no meio. É o que permite que a mesma regra seja usada por uma API REST hoje e por um microsserviço na etapa 2.

### Facade — uma porta de entrada para operações compostas
**Onde:** `ContaPagarService.quitar()`

Um único método esconde do chamador: buscar o título, validar situação, buscar a forma de pagamento, acionar a calculadora de encargos, criar o registro de pagamento e atualizar a situação.

### DTO (Data Transfer Object)
**Onde:** `contapagar/dto/`, `contareceber/dto/`, `PessoaDtos`, `PlanoContaDtos`, `DespesaDtos`, `RelatorioDtos`

Separa o formato da API do formato do banco. Sem isso, mudar uma coluna quebraria o contrato com quem consome a API. Também é onde ficam as validações de entrada.

### Mapper (variação do Adapter)
**Onde:** `ContaPagarMapper`, `ContaReceberMapper`, `PessoaMapper`

Converte entidade em DTO num lugar só. Detalhe importante: a conversão acontece **dentro da transação**, no service — foi o que resolveu o `LazyInitializationException` que apareceu nos testes.

### Repository
**Onde:** todas as interfaces `*Repository`

Abstrai o acesso a dados. As consultas são derivadas do nome do método (`findByVencimentoBetweenOrderByVencimento`) — o Spring Data gera o SQL a partir do nome, sem escrever query.

---

## 2. Padrões que o Spring já aplica por baixo

Estes **não exigiram código adicional**, mas valem menção na apresentação porque explicam como o framework funciona.

| Padrão | Onde aparece |
|---|---|
| **Singleton** | Todo `@Component`, `@Service`, `@Repository` é instanciado uma única vez pelo container |
| **Proxy** | O `@Transactional` funciona porque o Spring embrulha o service num proxy que abre e fecha a transação em volta do método |
| **Proxy (lazy loading)** | O Hibernate devolve um proxy nas associações `LAZY`, carregando do banco só quando o dado é usado |
| **Factory** | O container é uma fábrica de beans — `BeanFactory` é literalmente o nome da interface |
| **Dependency Injection** | Todas as dependências chegam pelo construtor, nunca com `new` dentro da classe |
| **Front Controller** | O `DispatcherServlet` recebe toda requisição HTTP e roteia para o controller certo |
| **Template Method** | `JpaRepository` define o esqueleto das operações de persistência |

---

## 3. Padrões considerados e descartados

Registrar o que **não** foi usado é tão importante quanto o que foi — mostra que houve escolha, e não desconhecimento.

| Padrão | Por que não |
|---|---|
| **Observer** | Faria sentido para notificar outros módulos quando um título é quitado. No monólito não há quem escutar. **Entra na etapa 2**, com eventos entre microsserviços. |
| **Builder** | As entidades têm poucos campos obrigatórios e são construídas num lugar só. Traria verbosidade sem ganho. |
| **Decorator** | Nenhum comportamento precisa ser empilhado dinamicamente. |
| **Chain of Responsibility** | A `CalculadoraEncargos` chegou perto, mas as políticas são independentes e somadas — não há repasse em cadeia nem interrupção. Chamar de Strategy é mais honesto. |
| **State** | A situação do título (ABERTA → PARCIAL → PAGA) poderia virar máquina de estados, mas com 6 situações e transições simples isso só adicionaria classes. |
| **Singleton escrito à mão** | Seria um erro: o Spring já gerencia o ciclo de vida, e um singleton manual atrapalharia os testes. |

---

## 4. Decisões de modelagem (não são padrões GoF, mas contam como decisão técnica)

- **Cliente e Fornecedor unificados** em `Pessoa`, com o papel em N:N — elimina a duplicação que existia no livro, onde `Cliente.db` e `Fornecedor.db` tinham estruturas quase idênticas.
- **Situação como dado explícito**, e não derivada das datas como no livro original.
- **Quitação em tabela própria** (1:N), permitindo pagamento parcial — o livro tinha um único campo de data.
- **Exclusão lógica** de pessoa (`ativo = false`), porque o histórico de títulos depende da pessoa continuar existindo.
- **Despesa com vínculo opcional ao título** (1:1), para representar a previsão que ainda não se realizou.
