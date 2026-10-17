# Evidências de Teste

Bateria de validação da primeira entrega, executada contra a API em funcionamento.

## O que é validado

44 verificações cobrindo:

- **Todas as 13 regras de negócio** documentadas (RN01 a RN13)
- Os **requisitos mínimos** da seção 7 do enunciado: CRUD, registro de pagamento e recebimento, consultas por período e situação, validação e tratamento de erros
- Os **relacionamentos** do modelo: N:N de papéis, 1:N de telefones e endereços, rateio entre categorias
- Os **códigos de status** HTTP: 200, 201, 400, 404 e 422

## Como executar

Com o banco e a aplicação no ar:

```bash
python docs/evidencias/validar-api.py
```

A bateria é **repetível**: cada execução usa identificadores próprios, então pode rodar quantas vezes for necessário sobre a mesma base, sem precisar recriá-la.

## Resultado

O arquivo [resultado-validacao.txt](resultado-validacao.txt) contém a saída da última execução.

> Esta bateria valida o sistema **de fora**, pela API. Ela não substitui os testes unitários e de integração em JUnit, que verificam as regras isoladamente e rodam junto do build.
