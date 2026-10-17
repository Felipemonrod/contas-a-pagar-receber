"""Bateria de validacao da 1a entrega do Projeto CPR.

Exercita cada regra de negocio documentada e cada requisito minimo do
enunciado contra a API em execucao, reportando PASS/FAIL.
"""
import json
import time
import urllib.request
import urllib.error

BASE = "http://localhost:8080/api"
resultados = []

# Sufixo unico por execucao: permite rodar a bateria quantas vezes for
# necessario sem esbarrar nas restricoes de unicidade (documento da pessoa,
# numero do titulo, codigo da conta).
SUF = str(int(time.time()))[-7:]


def req(metodo, caminho, corpo=None):
    url = BASE + caminho
    dados = json.dumps(corpo).encode() if corpo is not None else None
    r = urllib.request.Request(url, data=dados, method=metodo)
    if dados:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r) as resp:
            txt = resp.read().decode()
            return resp.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except json.JSONDecodeError:
            return e.code, txt


def checa(ident, descricao, condicao, detalhe=""):
    resultados.append((ident, descricao, bool(condicao), detalhe))


# =====================================================================
# PREPARACAO
# =====================================================================
st, fornecedor = req("POST", "/pessoas", {
    "nome": "Greensoft Informatica Ltda",
    "documento": f"FORN-{SUF}-01",
    "papeis": ["FORNECEDOR", "CLIENTE"],
    "email": "contato@greensoft.com.br",
    "telefones": [{"numero": "(11) 5585-4975", "ramal": "201"},
                  {"numero": "(11) 5584-2545", "tipo": "FAX"}],
    "enderecos": [{"logradouro": "Av. Paulista", "numero": "1439",
                   "cidade": "Sao Paulo", "uf": "SP", "principal": True}],
})
PESSOA = fornecedor["id"] if st == 201 else None

st_c, cliente = req("POST", "/pessoas", {
    "nome": "Cliente Puro SA", "documento": f"CLI-{SUF}-02",
    "papeis": ["CLIENTE"]})
CLIENTE = cliente["id"] if st_c == 201 else None

st_f, fpuro = req("POST", "/pessoas", {
    "nome": "Fornecedor Puro Ltda", "documento": f"FPURO-{SUF}-03",
    "papeis": ["FORNECEDOR"]})
FORNEC = fpuro["id"] if st_f == 201 else None


# =====================================================================
# REQUISITOS MINIMOS DO ENUNCIADO
# =====================================================================
checa("REQ-CRUD-1", "Cadastro de pessoa (POST) devolve 201", st == 201, f"status {st}")

st2, _ = req("GET", f"/pessoas/{PESSOA}")
checa("REQ-CRUD-2", "Consulta de pessoa (GET) devolve 200", st2 == 200, f"status {st2}")

st3, alterada = req("PUT", f"/pessoas/{PESSOA}", {
    "nome": "Greensoft Informatica Ltda", "documento": f"FORN-{SUF}-01",
    "papeis": ["FORNECEDOR", "CLIENTE"], "contato": "Wilson"})
checa("REQ-CRUD-3", "Alteracao de pessoa (PUT) devolve 200",
      st3 == 200 and alterada.get("contato") == "Wilson", f"status {st3}")

checa("REQ-NN", "N:N de papeis: pessoa e CLIENTE e FORNECEDOR",
      set(fornecedor.get("papeis", [])) == {"FORNECEDOR", "CLIENTE"},
      str(fornecedor.get("papeis")))

checa("REQ-1N-TEL", "1:N telefones: dois telefones gravados",
      len(fornecedor.get("telefones", [])) == 2,
      f"{len(fornecedor.get('telefones', []))} telefone(s)")

checa("REQ-1N-END", "1:N enderecos: endereco com cidade propria",
      len(fornecedor.get("enderecos", [])) == 1
      and fornecedor["enderecos"][0]["cidade"] == "Sao Paulo",
      str(fornecedor.get("enderecos")))


# =====================================================================
# RN01 - conta consolidada nao recebe lancamento
# =====================================================================
st, resp = req("POST", "/contas-pagar", {
    "numeroTitulo": f"ERR-RN01-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "DUPLICATA",
    "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01",
    "rateios": [{"planoContaId": 4, "valor": 100.00}]})
checa("RN01", "Rateio em categoria consolidada e recusado (422)",
      st == 422, f"status {st}: {resp.get('mensagem') if isinstance(resp, dict) else resp}")


# =====================================================================
# RN02 - hierarquia do plano de contas
# =====================================================================
st, resp = req("POST", "/plano-contas", {
    "codigo": f"11.01.{SUF[-3:]}", "descricao": "Caixa Pequeno", "codigoSuperior": "11.01"})
checa("RN02-a", "Subconta sob conta analitica e recusada (422)", st == 422, f"status {st}")

st, _ = req("POST", "/plano-contas", {
    "codigo": f"21.{SUF[-3:]}", "descricao": "Internet", "codigoSuperior": "21"})
checa("RN02-b", "Subconta sob conta consolidada e aceita (201)", st == 201, f"status {st}")

st, resp = req("POST", "/plano-contas", {
    "codigo": f"21.{SUF[-3:]}", "descricao": "Duplicada", "codigoSuperior": "21"})
checa("RN02-c", "Codigo de conta duplicado e recusado (422)", st == 422, f"status {st}")


# =====================================================================
# RN04 - papel correto exigido
# =====================================================================
st, resp = req("POST", "/contas-pagar", {
    "numeroTitulo": f"ERR-RN04-{SUF}", "pessoaId": CLIENTE, "tipoTitulo": "DUPLICATA",
    "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01"})
checa("RN04-a", "Conta a pagar para quem nao e FORNECEDOR e recusada (422)",
      st == 422, f"status {st}")

st, resp = req("POST", "/contas-receber", {
    "numeroTitulo": f"ERR-RN04b-{SUF}", "pessoaId": FORNEC, "tipoTitulo": "DUPLICATA",
    "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01"})
checa("RN04-b", "Conta a receber para quem nao e CLIENTE e recusada (422)",
      st == 422, f"status {st}")


# =====================================================================
# RN06 - tipo de titulo
# =====================================================================
st, resp = req("POST", "/contas-pagar", {
    "numeroTitulo": f"ERR-RN06-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "INVENTADO",
    "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01"})
checa("RN06", "Tipo de titulo inexistente e recusado (422)", st == 422, f"status {st}")


# =====================================================================
# RN12 - rateio deve fechar com o valor do titulo
# =====================================================================
st, resp = req("POST", "/contas-pagar", {
    "numeroTitulo": f"ERR-RN12-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "DUPLICATA",
    "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01",
    "rateios": [{"planoContaId": 10, "valor": 70.00}]})
checa("RN12", "Rateio que nao fecha com o valor e recusado (422)", st == 422, f"status {st}")


# =====================================================================
# TITULO VALIDO + RN05 (desconto/juros)
# =====================================================================
st, titulo = req("POST", "/contas-pagar", {
    "numeroTitulo": f"DUP-123456-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "DUPLICATA",
    "valor": 1000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10",
    "desconto": 50.00, "validadeDesconto": "2026-10-05", "acrescimoDia": 2.00,
    "rateios": [{"planoContaId": 10, "valor": 600.00},
                {"planoContaId": 13, "valor": 400.00}]})
CP = titulo["id"] if st == 201 else None
checa("REQ-LANC", "Lancamento de titulo com rateio N:N (201)",
      st == 201 and len(titulo.get("rateios", [])) == 2, f"status {st}")
checa("REQ-SIT", "Situacao inicial do titulo e ABERTA",
      st == 201 and titulo.get("situacao") == "ABERTA",
      titulo.get("situacao") if st == 201 else "")

_, s1 = req("GET", f"/contas-pagar/{CP}/simulacao?data=2026-10-03")
checa("RN05-a", "Dentro da validade: desconto de 50,00 aplicado",
      float(s1["descontoAplicado"]) == 50.0 and float(s1["valorDevido"]) == 950.0,
      f"desconto {s1['descontoAplicado']}, devido {s1['valorDevido']}")

_, s2 = req("GET", f"/contas-pagar/{CP}/simulacao?data=2026-10-08")
checa("RN05-b", "Apos a validade e antes do vencimento: sem desconto nem juros",
      float(s2["descontoAplicado"]) == 0 and float(s2["acrescimoAplicado"]) == 0,
      f"devido {s2['valorDevido']}")

_, s3 = req("GET", f"/contas-pagar/{CP}/simulacao?data=2026-10-25")
checa("RN05-c", "15 dias de atraso x 2,00 = 30,00 de juros",
      float(s3["acrescimoAplicado"]) == 30.0 and float(s3["valorDevido"]) == 1030.0,
      f"juros {s3['acrescimoAplicado']}, devido {s3['valorDevido']}")


# =====================================================================
# RN09 / RN10 / RN07 / RN08 - quitacao
# =====================================================================
st, pag1 = req("POST", f"/contas-pagar/{CP}/pagamento",
               {"dataPagamento": "2026-10-03", "formaPagamento": "PIX",
                "valorPago": 400.00})
checa("RN09", "Pagamento parcial deixa o titulo em PARCIAL",
      st == 200 and pag1.get("situacao") == "PARCIAL"
      and float(pag1["saldoDevedor"]) == 550.0,
      f"situacao {pag1.get('situacao')}, saldo {pag1.get('saldoDevedor')}")

st, pag2 = req("POST", f"/contas-pagar/{CP}/pagamento",
               {"dataPagamento": "2026-10-03", "formaPagamento": "BOLETO"})
total_desc = sum(float(p["descontoAplicado"]) for p in pag2.get("pagamentos", []))
checa("RN08", "Valor efetivo = valor - desconto (1000 - 50 = 950 pagos)",
      float(pag2["totalPago"]) == 950.0, f"total pago {pag2.get('totalPago')}")
checa("RN10", "Desconto concedido UMA unica vez, mesmo em quitacao parcelada",
      total_desc == 50.0, f"soma dos descontos: {total_desc}")
checa("REQ-QUIT", "Quitacao integral zera o saldo e marca PAGA",
      pag2.get("situacao") == "PAGA" and float(pag2["saldoDevedor"]) == 0.0,
      f"situacao {pag2.get('situacao')}, saldo {pag2.get('saldoDevedor')}")

st, resp = req("POST", f"/contas-pagar/{CP}/pagamento",
               {"dataPagamento": "2026-10-03", "formaPagamento": "PIX"})
checa("RN07-a", "Quitar titulo ja quitado e recusado (422)", st == 422, f"status {st}")

st, det = req("GET", f"/contas-pagar/{CP}")
checa("RN07-b", "Titulo quitado permanece na base com historico de pagamentos",
      st == 200 and len(det.get("pagamentos", [])) == 2,
      f"{len(det.get('pagamentos', []))} pagamento(s)")


# =====================================================================
# RN11 - titulo com pagamento nao pode ser alterado nem cancelado
# =====================================================================
st, resp = req("PUT", f"/contas-pagar/{CP}", {
    "numeroTitulo": f"DUP-123456-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "DUPLICATA",
    "valor": 2000.00, "emissao": "2026-09-01", "vencimento": "2026-10-10"})
checa("RN11-a", "Alterar titulo com pagamento e recusado (422)", st == 422, f"status {st}")

st, resp = req("DELETE", f"/contas-pagar/{CP}")
checa("RN11-b", "Cancelar titulo com pagamento e recusado (422)", st == 422, f"status {st}")


# =====================================================================
# CONTAS A RECEBER - espelho
# =====================================================================
st, rec = req("POST", "/contas-receber", {
    "numeroTitulo": f"NF-123456-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "NOTA_PROMISSORIA",
    "valor": 800.00, "emissao": "2026-09-01", "vencimento": "2026-10-20",
    "desconto": 40.00, "validadeDesconto": "2026-10-15", "acrescimoDia": 3.00,
    "rateios": [{"planoContaId": 7, "valor": 800.00}]})
CR = rec["id"] if st == 201 else None
checa("REQ-REC-1", "Lancamento de titulo a receber (201)", st == 201, f"status {st}")

st, rec2 = req("POST", f"/contas-receber/{CR}/recebimento",
               {"dataRecebimento": "2026-10-10", "formaPagamento": "PIX"})
checa("REQ-REC-2", "Registro de recebimento marca RECEBIDA e zera saldo",
      st == 200 and rec2.get("situacao") == "RECEBIDA"
      and float(rec2["saldoDevedor"]) == 0.0,
      f"situacao {rec2.get('situacao')}, recebido {rec2.get('totalRecebido')}")


# =====================================================================
# RN03 - despesa prevista vira titulo
# =====================================================================
st, desp = req("POST", "/despesas", {
    "planoContaId": 10, "descricao": "Conta de Luz - dezembro",
    "valorPrevisto": 150.00, "previsaoPagamento": "2026-12-12"})
DESP = desp["id"] if st == 201 else None
checa("RN03-a", "Despesa prevista nasce como nao realizada",
      st == 201 and desp.get("realizada") is False, f"status {st}")

st, desp2 = req("POST", f"/despesas/{DESP}/gerar-titulo", {
    "numeroTitulo": f"ENEL-778899-{SUF}", "pessoaId": PESSOA, "valor": 187.45,
    "emissao": "2026-12-01", "vencimento": "2026-12-15"})
checa("RN03-b", "Previsao vira titulo com o valor REAL da fatura",
      st == 200 and desp2.get("realizada") is True
      and desp2.get("numeroTitulo") == f"ENEL-778899-{SUF}", f"status {st}")

st, resp = req("POST", f"/despesas/{DESP}/gerar-titulo", {
    "numeroTitulo": f"OUTRO-1-{SUF}", "pessoaId": PESSOA, "valor": 100.00,
    "emissao": "2026-12-01", "vencimento": "2026-12-20"})
checa("RN03-c", "Gerar titulo de despesa ja realizada e recusado (422)",
      st == 422, f"status {st}")

st, resp = req("POST", f"/despesas/{DESP}/gerar-titulo", {
    "numeroTitulo": f"ERR-PAPEL-{SUF}", "pessoaId": CLIENTE, "valor": 100.00,
    "emissao": "2026-12-01", "vencimento": "2026-12-20"})
checa("RN03-d", "RN04 herdada: despesa nao gera titulo para nao-fornecedor",
      st == 422, f"status {st}")


# =====================================================================
# RN13 - exclusao logica de pessoa
# =====================================================================
st, inativa = req("DELETE", f"/pessoas/{CLIENTE}")
checa("RN13", "Pessoa e inativada, nao excluida",
      st == 200 and inativa.get("ativo") is False, f"status {st}")
st, _ = req("GET", f"/pessoas/{CLIENTE}")
checa("RN13-b", "Pessoa inativada continua consultavel", st == 200, f"status {st}")


# =====================================================================
# CONSULTAS POR PERIODO E SITUACAO
# =====================================================================
st, lista = req("GET", "/contas-pagar?de=2026-09-01&ate=2026-10-31")
checa("REQ-FILTRO-1", "Consulta por periodo devolve 200 e filtra",
      st == 200 and isinstance(lista, list), f"status {st}, {len(lista) if isinstance(lista, list) else 0} titulo(s)")

st, lista2 = req("GET", "/contas-pagar?situacao=PAGA&de=2026-09-01&ate=2026-10-31")
checa("REQ-FILTRO-2", "Consulta por periodo + situacao filtra corretamente",
      st == 200 and len(lista2) > 0 and all(t["situacao"] == "PAGA" for t in lista2),
      f"{len(lista2)} titulo(s) PAGA")


# =====================================================================
# RELATORIOS
# =====================================================================
st, res = req("GET", "/relatorios/resumo?de=2026-09-01&ate=2026-12-31")
checa("REQ-REL-1", "Relatorio de resumo financeiro responde 200",
      st == 200 and "contasAPagar" in res, f"status {st}")

st, cat = req("GET", "/relatorios/por-categoria?de=2026-09-01&ate=2026-12-31")
checa("REQ-REL-2", "Relatorio por categoria agrega os rateios",
      st == 200 and len(cat) >= 3, f"{len(cat) if st == 200 else 0} categoria(s)")

st, inad = req("GET", "/relatorios/inadimplencia")
checa("REQ-REL-3", "Relatorio de inadimplencia responde 200",
      st == 200 and "titulos" in inad, f"status {st}")


# =====================================================================
# TRATAMENTO DE ERROS
# =====================================================================
st, err = req("POST", "/contas-pagar", {"valor": -5})
checa("REQ-ERR-400", "Dados invalidos devolvem 400 com a lista de campos",
      st == 400 and len(err.get("campos", [])) >= 5,
      f"status {st}, {len(err.get('campos', []))} campo(s)")

st, err = req("GET", "/contas-pagar/999999")
checa("REQ-ERR-404", "Recurso inexistente devolve 404",
      st == 404 and err.get("erro") == "NAO_ENCONTRADO", f"status {st}")

st, err = req("POST", "/contas-pagar", {
    "numeroTitulo": f"DUP-123456-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "DUPLICATA",
    "valor": 100.00, "emissao": "2026-09-01", "vencimento": "2026-10-01"})
checa("REQ-ERR-422", "Numero de titulo duplicado devolve 422",
      st == 422, f"status {st}")

st, err = req("POST", "/contas-pagar", {
    "numeroTitulo": f"ERR-DATA-{SUF}", "pessoaId": PESSOA, "tipoTitulo": "DUPLICATA",
    "valor": 100.00, "emissao": "2026-10-01", "vencimento": "2026-09-01"})
checa("REQ-ERR-DATA", "Vencimento anterior a emissao e recusado (422)",
      st == 422, f"status {st}")


# =====================================================================
# RELATORIO FINAL
# =====================================================================
print("=" * 78)
print("VALIDACAO DA 1a ENTREGA - PROJETO CPR")
print("=" * 78)
ok = 0
for ident, desc, passou, det in resultados:
    marca = "PASS" if passou else "FALHOU"
    print(f"[{marca:6s}] {ident:14s} {desc}")
    if not passou:
        print(f"{'':9s}{'':14s} -> {det}")
    ok += passou
print("=" * 78)
print(f"RESULTADO: {ok}/{len(resultados)} verificacoes passaram")
if ok < len(resultados):
    print("\nFALHAS:")
    for ident, desc, passou, det in resultados:
        if not passou:
            print(f"  {ident}: {desc} ({det})")
print("=" * 78)
