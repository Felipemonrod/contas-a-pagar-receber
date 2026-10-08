# Sistema de Contas a Pagar e a Receber

Projeto Integrador da disciplina de **Sistemas Distribuídos** — Instituto Federal Goiano, Campus Morrinhos.

Aplicação monolítica em Spring Boot que informatiza o controle financeiro de uma organização. As funcionalidades e regras de negócio foram extraídas do livro **Delphi 4 — Contas a Pagar e a Receber**, de Kazuhiro Shiraishi e Pedro Luiz Côrtes (Editora Érica), adaptadas de uma aplicação desktop de 1999 para uma API REST.

Esta é a **primeira etapa** do projeto. A segunda etapa decompõe esta aplicação em microsserviços.

---

## Tecnologias

| Componente | Versão | Por quê |
|---|---|---|
| Java | 21 (LTS) | Suportado pelo Boot 4, amplamente documentado |
| Spring Boot | 4.1.1 | Versão suportada; o 3.5 chegou ao fim de vida em junho/2026 |
| MySQL | 8.4 (LTS) | Executado em contêiner Docker |
| Flyway | — | Versiona o schema do banco |
| Lombok | — | Reduz código repetitivo de getters e setters |

---

## Como executar

### Pré-requisitos

- **JDK 21** — verifique com `java -version`
- **Docker Desktop** em execução (usado apenas para o banco de dados)

O Maven não precisa estar instalado: o projeto inclui o Maven Wrapper (`mvnw`).

### Passo 1 — Subir o banco de dados

```bash
docker compose up -d
```

Aguarde o contêiner ficar saudável (cerca de 20 segundos):

```bash
docker compose ps
```

### Passo 2 — Executar a aplicação

**Linux, macOS ou Git Bash:**
```bash
./mvnw spring-boot:run
```

**Windows (PowerShell ou CMD):**
```bash
mvnw.cmd spring-boot:run
```

Na primeira execução, o Flyway cria todas as tabelas e carrega os dados de domínio automaticamente. A aplicação sobe em **http://localhost:8080**.

### Passo 3 — Conferir que subiu

Abra `http://localhost:8080` no navegador. A resposta é um JSON com o índice dos recursos:

```json
{
  "aplicacao": "Sistema de Contas a Pagar e a Receber",
  "recursos": {
    "pessoas": "/api/pessoas",
    "plano de contas": "/api/plano-contas",
    "contas a pagar": "/api/contas-pagar",
    ...
  }
}
```

A documentação completa da API, com todos os endpoints e exemplos, está na coleção do Postman.

---

## Acesso ao banco de dados

| Campo | Valor |
|---|---|
| Host | `127.0.0.1` |
| Porta | `3306` |
| Banco | `cpr` |
| Usuário | `cpr` |
| Senha | `cpr` |

Pela linha de comando, sem precisar de cliente instalado:

```bash
docker exec -it cpr-mysql mysql -ucpr -pcpr cpr
```

> As credenciais são de desenvolvimento local e estão versionadas de propósito, para que qualquer integrante do grupo execute o projeto sem configuração adicional. Em um ambiente real elas viriam de variáveis de ambiente.

### Recomeçar do zero

Apaga o banco e recria tudo pelas migrations:

```bash
docker compose down -v && docker compose up -d
```

---

## Funcionalidades

### Cadastros
- **Pessoas** — clientes e fornecedores, com múltiplos telefones e endereços
- **Plano de contas** — categorias financeiras hierárquicas, com contas consolidadas e analíticas

### Contas a pagar
- Lançamento de títulos com rateio entre categorias
- Simulação do valor devido em uma data, com desconto ou juros
- Registro de pagamento, inclusive **parcial**
- Cancelamento (mantendo o registro para consulta)

### Contas a receber
- As mesmas operações, espelhadas

### Despesas
- Cadastro da **previsão** de gastos fixos (água, luz, telefone, condomínio)
- Conversão da previsão em título a pagar quando a fatura chega

### Relatórios
- Resumo financeiro do período: previsto, quitado, em aberto e vencido
- Totais agrupados por categoria
- Inadimplência, com dias de atraso

---

## Principais endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` `POST` | `/api/pessoas` | Lista e cadastra clientes e fornecedores |
| `GET` `POST` | `/api/plano-contas` | Árvore de categorias financeiras |
| `GET` | `/api/plano-contas/analiticas` | Categorias que aceitam lançamento |
| `GET` `POST` | `/api/contas-pagar` | Filtros: `?situacao=&de=&ate=` |
| `GET` | `/api/contas-pagar/{id}/simulacao?data=` | Prévia do valor devido |
| `POST` | `/api/contas-pagar/{id}/pagamento` | Registra o pagamento |
| `GET` `POST` | `/api/contas-receber` | Espelho de contas a pagar |
| `POST` | `/api/contas-receber/{id}/recebimento` | Registra o recebimento |
| `GET` `POST` | `/api/despesas` | Previsões de gastos fixos |
| `POST` | `/api/despesas/{id}/gerar-titulo` | Converte previsão em título |
| `GET` | `/api/relatorios/resumo` | Posição financeira do período |
| `GET` | `/api/relatorios/inadimplencia` | Títulos vencidos em aberto |

A lista completa das 23 rotas está na coleção do Postman.

---

## Estrutura do projeto

```
src/main/java/com/ifgoianomih/contas_pagar/
├── pessoa/          Clientes e fornecedores
├── planoconta/      Categorias financeiras hierárquicas
├── contapagar/      Títulos a pagar, rateio e quitação
├── contareceber/    Títulos a receber, rateio e quitação
├── despesa/         Previsão de gastos fixos
├── relatorio/       Consultas financeiras consolidadas
├── dominio/         Tabelas de domínio (situação, tipo, forma de pagamento)
└── shared/
    ├── encargo/     Cálculo de desconto e juros (padrão Strategy)
    └── exception/   Tratamento central de erros

src/main/resources/db/migration/
├── V1__schema_inicial.sql
├── V2__dados_dominio.sql
└── V3__despesa.sql
```

A organização é **por domínio, e não por camada**. Cada pasta de primeiro nível é um candidato natural a microsserviço na segunda etapa.

---

## Comandos úteis

| Objetivo | Comando |
|---|---|
| Testar a API (Windows) | `testar.bat` |
| Compilar | `./mvnw clean compile` |
| Empacotar | `./mvnw clean package` |
| Executar os testes | `./mvnw test` |
| Executar o .jar | `java -jar target/contas_pagar-0.0.1-SNAPSHOT.jar` |

> Use sempre `clean` antes de entregar. A compilação incremental pode reportar sucesso e a aplicação falhar ao subir.

---

## Documentação complementar

- [docs/PADROES-DE-PROJETO.md](docs/PADROES-DE-PROJETO.md) — padrões utilizados, com justificativa
- [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md) — descrição do problema, regras de negócio, requisitos e arquitetura
- [docs/DIAGRAMAS.md](docs/DIAGRAMAS.md) — os seis diagramas exigidos: classes, componentes, pacotes, casos de uso, sequência e DER
- [docs/Projeto-CPR.postman_collection.json](docs/Projeto-CPR.postman_collection.json) — coleção do Postman: 32 requisições em ordem de execução, com verificação automática de cada resposta
- [docs/evidencias/](docs/evidencias/) — bateria de validação da API: 44 verificações cobrindo todas as regras de negócio
- `testar.bat` — bateria de 38 verificações pelo prompt do Windows, usando apenas `curl` (requer a aplicação no ar)

---

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `Port 8080 was already in use` | Outra instância está rodando. Encerre o processo ou mude `server.port` |
| `Communications link failure` | O contêiner do MySQL não está no ar. Rode `docker compose up -d` |
| `Schema validation: missing table` | As migrations não rodaram. Confirme que o banco está acessível |
| `Unresolved compilation problem` | Compilação incremental desatualizada. Rode `./mvnw clean compile` |
