# Sistema de Contas a Pagar e a Receber

Projeto Integrador — Instituto Federal Goiano, Campus Morrinhos.

O sistema informatiza o controle financeiro de uma organização. As funcionalidades e regras de negócio foram extraídas do livro **Delphi 4 — Contas a Pagar e a Receber**, de Kazuhiro Shiraishi e Pedro Luiz Côrtes (Editora Érica), adaptadas de uma aplicação desktop de 1999.

O repositório atende a duas disciplinas:

| Pasta | Disciplina | Tecnologias |
|---|---|---|
| [`backend/`](backend/) | Sistemas Distribuídos | Java 21, Spring Boot 4.1, MySQL 8.4, Flyway |
| [`frontend/`](frontend/) | Front-End | React 19, TypeScript, CSS, Vite |

---

## Como executar

### 1. Back-end

```bash
cd backend
docker compose up -d
mvnw.cmd spring-boot:run
```

Sobe em `http://localhost:8080`. O Flyway cria o schema e carrega os dados de domínio na primeira execução.

### 2. Front-end

```bash
cd frontend
npm install
npm run dev
```

Sobe em `http://localhost:5173`. O CORS do back-end já está liberado para essa origem.

> Os dois precisam estar no ar para as telas integradas funcionarem.

### 3. Testar a API pelo Postman

Importe [`backend/docs/Projeto-CPR.postman_collection.json`](backend/docs/Projeto-CPR.postman_collection.json) e use o *Run collection*. São 58 requisições em ordem de execução, cada uma verificando o próprio retorno. As pastas são independentes entre si, mas a ordem importa dentro de cada uma: a primeira requisição guarda o id que as seguintes usam.

Com o banco recém-criado as 58 passam. Para repetir a execução do zero:

```bash
cd backend
docker compose down -v && docker compose up -d
```

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [backend/docs/CONTRATO-API.md](backend/docs/CONTRATO-API.md) | **Contrato da API** — endpoints, exemplos reais, regras de negócio |
| [backend/docs/Projeto-CPR.postman_collection.json](backend/docs/Projeto-CPR.postman_collection.json) | Coleção do Postman — 58 requisições prontas para executar |
| [backend/docs/DOCUMENTACAO.md](backend/docs/DOCUMENTACAO.md) | Problema, regras, requisitos, arquitetura, persistência |
| [backend/docs/DIAGRAMAS.md](backend/docs/DIAGRAMAS.md) | Classes, componentes, pacotes, casos de uso, sequência, DER |
| [backend/docs/PADROES-DE-PROJETO.md](backend/docs/PADROES-DE-PROJETO.md) | Padrões usados, e os descartados com justificativa |
| [backend/docs/evidencias/testes.md](backend/docs/evidencias/testes.md) | Evidências dos testes executados |
| [frontend/docs/RELATORIO-IA.md](frontend/docs/RELATORIO-IA.md) | Registro do uso de IA no front-end |
| [frontend/docs/relatorio/RELATORIO.pdf](frontend/docs/relatorio/RELATORIO.pdf) | Relatório do trabalho de front-end |
| [backend/README.md](backend/README.md) | Instruções detalhadas do back-end |

---

## Estrutura

```
contas-a-pagar-receber/
├── backend/           API REST em Spring Boot
│   ├── src/
│   ├── docs/
│   └── docker-compose.yml
└── frontend/          Interface em React + TypeScript
    └── src/
```

Um único repositório Git cobre as duas partes. O histórico do back-end anterior à reorganização está preservado — use `git log --follow <arquivo>` para acompanhá-lo.
