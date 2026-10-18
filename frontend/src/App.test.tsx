/**
 * Testes dos fluxos do sistema.
 *
 * As telas integradas conversam com a API falsa instalada em test-setup.ts,
 * que responde como a de verdade: mesmos corpos, mesmos erros, mesmas
 * regras de negocio. Por isso estes testes valem como prova do contrato,
 * sem precisar do back-end nem do banco rodando.
 */

import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import layouts from './form-layouts.json';
import {
  groups,
  initialDatabase,
  nextRecord,
  readDatabase,
  screens,
  STORAGE_KEY,
  type Entity,
} from './data';
import { apiFalsaAtual, instalarApiFalsa } from './test-utils/apiFalsa';
import { PESSOAS_DE_EXEMPLO } from './test-setup';

/**
 * Preenche um campo de data ou de numero.
 *
 * Campos `type="date"` e `type="number"` nao aceitam bem a digitacao tecla
 * a tecla do userEvent, entao o valor e colocado de uma vez. Como isso se
 * repete em quase todo teste, fica numa funcao so.
 */
function preencher(dentro: HTMLElement, rotulo: string, valor: string) {
  fireEvent.change(within(dentro).getByLabelText(rotulo), { target: { value: valor } });
}

/** O mesmo, para um campo que esta fora de uma janela. */
function preencherNaTela(rotulo: string, valor: string) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

/**
 * Casa com o rotulo exato de um campo, com ou sem o asterisco que a tela
 * acrescenta nos campos obrigatorios.
 *
 * E uma funcao de comparacao, e nao uma expressao regular, porque varios
 * rotulos tem caracteres especiais ("Data Lanç.", "Pagamento (dias)") que
 * precisariam ser escapados um a um.
 */
function rotuloExato(campo: string) {
  return (texto: string) => texto === campo || texto === `${campo} *`;
}

describe('fluxos do sistema financeiro', () => {
  it('inclui e edita um cliente pela API, no formato do contrato', async () => {
    const api = apiFalsaAtual();
    const user = userEvent.setup();
    render(<App />);
    // A tela comeca carregando: a lista vem de GET /api/pessoas?papel=CLIENTE.
    expect(await screen.findByText('Editora Érica Ltda.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    const dialog = screen.getByRole('dialog', { name: 'Cadastro de Cliente' });
    await user.type(within(dialog).getByLabelText(/^Cliente/), 'Cliente de Teste');
    await user.type(within(dialog).getByLabelText('CPF / CNPJ'), '99.999.999/0001-99');
    await user.type(within(dialog).getByLabelText('Endereço'), 'Rua Nova, 42');
    await user.type(within(dialog).getByLabelText('Cidade'), 'Curitiba');
    await user.selectOptions(within(dialog).getByLabelText('Estado'), 'PR');
    await user.click(within(dialog).getByRole('button', { name: 'Gravar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Cliente de Teste')).toBeInTheDocument();

    // O adapter traduziu os nomes do livro para os nomes do contrato.
    expect(api.ultimoCorpo()).toMatchObject({
      nome: 'Cliente de Teste',
      documento: '99.999.999/0001-99',
      papeis: ['CLIENTE'],
      enderecos: [{ logradouro: 'Rua Nova', numero: '42', cidade: 'Curitiba', uf: 'PR' }],
    });
    expect(api.pessoas().some(p => p.nome === 'Cliente de Teste')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const field = within(screen.getByRole('dialog')).getByLabelText(/^Cliente/);
    await user.clear(field); await user.type(field, 'Cliente Atualizado');
    await user.click(screen.getByRole('button', { name: 'Gravar' }));

    expect(await screen.findByText('Cliente Atualizado')).toBeInTheDocument();
    // A edicao foi um PUT, e nao um segundo POST.
    expect(api.chamadas().some(c => c.metodo === 'PUT')).toBe(true);
    // Tres clientes de exemplo mais o que acabou de ser cadastrado.
    expect(api.pessoas().filter(p => p.papeis.includes('CLIENTE'))).toHaveLength(4);
  });

  it('mostra a mensagem da API quando a regra de negocio recusa a gravacao', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Editora Érica Ltda.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    const dialog = screen.getByRole('dialog', { name: 'Cadastro de Cliente' });
    await user.type(within(dialog).getByLabelText(/^Cliente/), 'Documento Repetido');
    // Documento que a API falsa ja tem: responde 422, como o back-end real.
    await user.type(within(dialog).getByLabelText('CPF / CNPJ'), '11.111.111/0001-11');
    await user.click(within(dialog).getByRole('button', { name: 'Gravar' }));

    // A janela fica aberta com a mensagem da API, para o usuario corrigir.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Documento ja cadastrado para outra pessoa.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('mostra o estado de erro quando a API esta fora do ar', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Nao foi possivel falar com o servidor/,
    );
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('busca sem distinguir acentos e limpa os resultados', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Editora Érica Ltda.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Localizar' }));
    await user.type(screen.getByLabelText('Entre com uma parte do nome'), 'erica');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Localizar' }));
    // A busca vai para a API no parametro nome, e nao filtra no navegador.
    expect(await screen.findByText('Editora Érica Ltda.')).toBeInTheDocument();
    expect(screen.queryByText('Comercial Goiás')).not.toBeInTheDocument();
    expect(apiFalsaAtual().chamadas().some(c => c.url.includes('nome=erica'))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(await screen.findByText('Comercial Goiás')).toBeInTheDocument();
  });

  it('cadastra, exige confirmar a exclusão e gera título a partir da despesa', async () => {
    const api = apiFalsaAtual();
    window.location.hash = '#/despesas';
    const user = userEvent.setup();
    render(<App />);

    // Cadastra uma despesa prevista, escolhendo uma categoria analítica.
    const incluir = screen.getByRole('button', { name: 'Inclusão' });
    await waitFor(() => expect(incluir).toBeEnabled());
    await user.click(incluir);
    let dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Descrição/), 'Conta de Água');
    await user.selectOptions(
      within(dialog).getByLabelText(/^Lançamento/),
      '21.03 - Energia Eletrica',
    );
    preencher(dialog, 'Valor Previsto', '150');
    preencher(dialog, 'Previsão de Pagamento', '2026-12-12');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));

    expect(await screen.findByText('Conta de Água')).toBeInTheDocument();
    // O adapter trocou o nome da categoria pelo seu id.
    expect(api.ultimoCorpo()).toMatchObject({ planoContaId: 7, valorPrevisto: 150 });

    // Cancelar a exclusão preserva o registro.
    await user.click(screen.getByRole('button', { name: /Selecionar/ }));
    await user.click(screen.getByRole('button', { name: 'Exclusão' }));
    await user.click(screen.getByRole('button', { name: 'Não' }));
    expect(screen.getByText('Conta de Água')).toBeInTheDocument();
    expect(api.despesas()).toHaveLength(1);

    // Gerar título converte a previsão num título a pagar.
    await user.click(screen.getByRole('button', { name: 'Gerar Título' }));
    dialog = await screen.findByRole('dialog', { name: 'Gerar Título a Pagar' });
    await user.selectOptions(
      within(dialog).getByLabelText('Nome do Fornecedor'),
      'Fornecedor Brasil S/A',
    );
    await user.type(within(dialog).getByLabelText('Número do Título'), 'ENEL-001');
    preencher(dialog, 'Valor Real da Fatura', '187.45');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar Título' }));

    await waitFor(() => expect(api.despesas()[0].realizada).toBe(true));
    expect(api.despesas()[0].numeroTitulo).toBe('ENEL-001');
    // O título nasceu em contas a pagar, com o valor real da fatura.
    expect(api.contas().at(-1)).toMatchObject({ numeroTitulo: 'ENEL-001', valor: 187.45 });
  });

  it.each(Object.keys(layouts) as Entity[])('monta o formulário de %s', async entity => {
    window.location.hash = `#/${entity}`; const user = userEvent.setup(); render(<App />);
    // Nas telas integradas a barra de acoes fica desabilitada enquanto carrega.
    const acao = screen.getByRole('button', { name: screens[entity].actions[0] });
    await waitFor(() => expect(acao).toBeEnabled());
    await user.click(acao);
    const dialog = screen.getByRole('dialog', { name: screens[entity].modal });
    for (const campo of layouts[entity].flatMap(linha => linha.fields)) {
      expect(within(dialog).getByLabelText(rotuloExato(campo))).toBeInTheDocument();
    }
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lança um título a pagar pela API, trocando o fornecedor pelo id', async () => {
    const api = apiFalsaAtual();
    window.location.hash = '#/pagamentos';
    const user = userEvent.setup();
    render(<App />);

    const incluir = screen.getByRole('button', { name: 'Incluir' });
    await waitFor(() => expect(incluir).toBeEnabled());
    await user.click(incluir);
    const dialog = screen.getByRole('dialog');

    // O campo de fornecedor é preenchido com a lista vinda de /api/pessoas.
    await user.selectOptions(
      within(dialog).getByLabelText(/^Nome do Fornecedor/),
      'Fornecedor Brasil S/A',
    );
    await user.type(within(dialog).getByLabelText(/^Número do Título/), 'TESTE-01');
    preencher(dialog, 'Valor do Título', '1000');
    preencher(dialog, 'Data de Emissão', '2026-10-14');

    // A validação local barra vencimento anterior à emissão antes de chamar a API.
    preencher(dialog, 'Data de Vencimento', '2026-10-01');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('vencimento');

    preencher(dialog, 'Data de Vencimento', '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));

    expect(await screen.findByText('TESTE-01')).toBeInTheDocument();
    // O adapter trocou o nome escolhido pelo id, e o rótulo pelo código da API.
    expect(api.ultimoCorpo()).toMatchObject({
      numeroTitulo: 'TESTE-01',
      pessoaId: 4,
      tipoTitulo: 'DUPLICATA',
      valor: 1000,
      emissao: '2026-10-14',
      vencimento: '2026-10-30',
    });
    expect(api.contas()[0].situacao).toBe('ABERTA');
  });

it('Localizar filtra os títulos sem sair da tela', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pagamentos';
    render(<App />);

    const incluir = screen.getByRole('button', { name: 'Incluir' });
    await waitFor(() => expect(incluir).toBeEnabled());

    // Dois títulos de fornecedores diferentes.
    for (const [numero, fornecedor] of [
      ['ALFA-1', 'Fornecedor Brasil S/A'],
      ['BETA-2', 'Distribuidora Central'],
    ]) {
      await user.click(screen.getByRole('button', { name: 'Incluir' }));
      const dialog = screen.getByRole('dialog');
      await user.selectOptions(within(dialog).getByLabelText(/^Nome do Fornecedor/), fornecedor);
      await user.type(within(dialog).getByLabelText(/^Número do Título/), numero);
      preencher(dialog, 'Valor do Título', '100');
      preencher(dialog, 'Data de Emissão', '2026-10-01');
      preencher(dialog, 'Data de Vencimento', '2026-10-30');
      await user.click(within(dialog).getByRole('button', { name: 'OK' }));
      expect(await screen.findByText(numero)).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Localizar' }));

    // Abre a busca, em vez de navegar para os relatórios.
    const busca = await screen.findByRole('dialog', { name: 'Localizar' });
    expect(window.location.hash).toBe('#/pagamentos');

    await user.type(
      within(busca).getByLabelText('Entre com parte do número ou do nome'),
      'beta',
    );
    await user.click(within(busca).getByRole('button', { name: 'Localizar' }));

    expect(await screen.findByText('BETA-2')).toBeInTheDocument();
    expect(screen.queryByText('ALFA-1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(await screen.findByText('ALFA-1')).toBeInTheDocument();
  });

  it('recusa editar título com rateio, em vez de apagá-lo em silêncio', async () => {
    // A API não consegue alterar um título com rateio: o PUT limpa e
    // reinsere na mesma transação, e a UNIQUE (conta, categoria) recusa.
    const api = instalarApiFalsa(PESSOAS_DE_EXEMPLO, [
      {
        numeroTitulo: 'RAT-01',
        pessoaId: 4,
        tipoTitulo: 'DUPLICATA',
        valor: 1000,
        emissao: '2026-10-01',
        vencimento: '2026-10-30',
        rateios: [{ planoContaId: 7, valor: 1000 }],
      },
    ]);
    const user = userEvent.setup();
    window.location.hash = '#/pagamentos';
    render(<App />);

    expect(await screen.findByText('RAT-01')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Selecionar/ }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    // Nada é aberto, e o usuário recebe o motivo.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('rateio');
    // O rateio continua intacto: nenhuma requisição de alteração saiu.
    expect(api.contas()[0].rateios).toHaveLength(1);
    expect(api.chamadas().some(c => c.metodo === 'PUT')).toBe(false);
  });

  it('edita título sem rateio e trava os campos que a API ignora', async () => {
    const api = instalarApiFalsa(PESSOAS_DE_EXEMPLO, [
      {
        numeroTitulo: 'SEM-RAT',
        pessoaId: 4,
        tipoTitulo: 'DUPLICATA',
        valor: 500,
        emissao: '2026-10-01',
        vencimento: '2026-10-30',
      },
    ]);
    const user = userEvent.setup();
    window.location.hash = '#/pagamentos';
    render(<App />);

    expect(await screen.findByText('SEM-RAT')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Selecionar/ }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pagamento' });

    // O PUT da API ignora estes dois campos, então não podem ser editados.
    expect(within(dialog).getByLabelText(/^Número do Título/)).toHaveAttribute('readonly');
    expect(within(dialog).getByLabelText(/^Nome do Fornecedor/)).toBeDisabled();
    // Os demais seguem editáveis.
    expect(within(dialog).getByLabelText('Valor do Título')).not.toHaveAttribute('readonly');

    await user.type(within(dialog).getByLabelText(/^Observação/), 'revisado');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.contas()[0].observacao).toBe('revisado');
    expect(api.contas()[0].numeroTitulo).toBe('SEM-RAT');
  });

  it('quita um título mostrando antes a prévia vinda da API', async () => {
    const api = apiFalsaAtual();
    window.location.hash = '#/pagamentos';
    const user = userEvent.setup();
    render(<App />);

    const incluir = screen.getByRole('button', { name: 'Incluir' });
    await waitFor(() => expect(incluir).toBeEnabled());
    await user.click(incluir);
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(
      within(dialog).getByLabelText(/^Nome do Fornecedor/),
      'Fornecedor Brasil S/A',
    );
    await user.type(within(dialog).getByLabelText(/^Número do Título/), 'QUIT-01');
    preencher(dialog, 'Valor do Título', '500');
    preencher(dialog, 'Data de Emissão', '2026-10-01');
    preencher(dialog, 'Data de Vencimento', '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(await screen.findByText('QUIT-01')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Selecionar/ }));
    await user.click(screen.getByRole('button', { name: 'Quitar' }));

    const quitacao = await screen.findByRole('dialog', { name: 'Quitação de Título' });
    // A prévia vem de GET /simulacao, que não grava nada.
    await waitFor(() =>
      expect(api.chamadas().some(c => c.url.includes('/simulacao'))).toBe(true),
    );
    await user.click(within(quitacao).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(api.contas()[0].situacao).toBe('PAGA'));
    expect(api.contas()[0].pagamentos).toHaveLength(1);
  });

  it('mostra a mensagem da API ao tentar quitar um título já quitado', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pagamentos';
    render(<App />);

    const incluir = screen.getByRole('button', { name: 'Incluir' });
    await waitFor(() => expect(incluir).toBeEnabled());
    await user.click(incluir);
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(
      within(dialog).getByLabelText(/^Nome do Fornecedor/),
      'Distribuidora Central',
    );
    await user.type(within(dialog).getByLabelText(/^Número do Título/), 'DUP-9');
    preencher(dialog, 'Valor do Título', '100');
    preencher(dialog, 'Data de Emissão', '2026-10-01');
    preencher(dialog, 'Data de Vencimento', '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(await screen.findByText('DUP-9')).toBeInTheDocument();

    // Primeira quitação: integral.
    await user.click(screen.getByRole('button', { name: /Selecionar/ }));
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    let janela = await screen.findByRole('dialog', { name: 'Quitação de Título' });
    await user.click(within(janela).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Segunda tentativa: a API recusa com 422 (regra RN07).
    await user.click(screen.getByRole('button', { name: /Selecionar/ }));
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    janela = await screen.findByRole('dialog', { name: 'Quitação de Título' });
    await user.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    expect(await within(janela).findByRole('alert')).toHaveTextContent(
      'Este titulo ja esta quitado.',
    );
  });


  it('navega pelas 13 telas e permite voltar ao menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Menu principal' });
    for (const [key, label] of groups.flatMap(g => [...g.items])) {
      await user.click(within(nav).getByRole('link', { name: label }));
      const esperado = key === 'relatorios' ? 'Relatórios' : screens[key].heading;
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(esperado),
      );
    }
    await user.click(
      screen.getByRole('link', { name: 'Contas a Pagar e a Receber — Menu Principal' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Menu Principal'),
    );
  });

  it('mostra a posição financeira vinda da API e aciona a impressão', async () => {
    const api = apiFalsaAtual();
    window.location.hash = '#/relatorios';
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<App />);

    // A tela consulta os três relatórios consolidados da API.
    await waitFor(() => {
      const urls = api.chamadas().map(c => c.url);
      expect(urls.some(u => u.includes('/relatorios/resumo'))).toBe(true);
      expect(urls.some(u => u.includes('/relatorios/por-categoria'))).toBe(true);
      expect(urls.some(u => u.includes('/relatorios/inadimplencia'))).toBe(true);
    });

    const preview = await screen.findByRole('region', { name: 'Prévia do relatório' });
    expect(within(preview).getByText('Contas a Pagar')).toBeInTheDocument();
    expect(within(preview).getByText('Contas a Receber')).toBeInTheDocument();
    expect(within(preview).getByText('Saldo projetado')).toBeInTheDocument();

    // O período informado vai para a API como de= e ate=.
    preencherNaTela('Período Inicial', '2026-03-01');
    await user.click(screen.getByRole('button', { name: 'Visualizar' }));
    await waitFor(() =>
      expect(api.chamadas().some(c => c.url.includes('de=2026-03-01'))).toBe(true),
    );

    await user.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('recusa período invertido antes de chamar a API', async () => {
    window.location.hash = '#/relatorios';
    const user = userEvent.setup();
    render(<App />);

    preencherNaTela('Período Inicial', '2026-12-31');
    preencherNaTela('Período Final', '2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Visualizar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('posterior ao inicial');
  });

  it('recupera dados inválidos de armazenamento e calcula o estado de recebimento', () => {
    // Conteúdo corrompido no navegador volta aos exemplos iniciais.
    localStorage.setItem(STORAGE_KEY, '{inválido');
    expect(readDatabase()).toEqual(initialDatabase);

    const record = nextRecord(
      'recebimentos',
      { 'Nome do Cliente': 'Cliente Exemplo', 'Data de Pagamento': '2026-10-14' },
      [],
    );
    expect(record.Situação).toBe('RECEBIDO');
  });

  it('mantém a inclusão contínua aberta e grava as contas na API', async () => {
    const api = apiFalsaAtual();
    window.location.hash = '#/plano';
    const user = userEvent.setup();
    render(<App />);

    // A árvore vem de GET /api/plano-contas, com a estrutura do back-end.
    expect(await screen.findByText(/ATIVO CIRCULANTE/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Inclusão' }));
    await user.selectOptions(screen.getByLabelText('Conta Superior'), '21');
    await user.type(screen.getByLabelText(/^Nova Conta/), '21.07');
    await user.type(screen.getByLabelText(/^Descrição da Conta/), 'Internet');
    await user.click(screen.getByLabelText('Inclusão Contínua'));
    await user.click(screen.getByRole('button', { name: 'OK' }));

    // A janela continua aberta e com o campo limpo para a próxima conta.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/^Nova Conta/)).toHaveValue(''));

    await user.type(screen.getByLabelText(/^Nova Conta/), '21.08');
    await user.type(screen.getByLabelText(/^Descrição da Conta/), 'Limpeza');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() =>
      expect(api.planoContas().map(c => c.codigo)).toEqual(
        expect.arrayContaining(['21.07', '21.08']),
      ),
    );
    // O adapter mandou o código e a conta superior separados, como no contrato.
    expect(api.ultimoCorpo()).toMatchObject({
      codigo: '21.08',
      descricao: 'Limpeza',
      codigoSuperior: '21',
      consolidada: false,
    });
  });

  it('desenha a árvore do plano por recursão, com a profundidade da API', async () => {
    window.location.hash = '#/plano';
    render(<App />);

    // Três níveis: 1 ATIVO > 11 ATIVO CIRCULANTE > 11.01 Caixa.
    expect(await screen.findByText(/ATIVO CIRCULANTE/)).toBeInTheDocument();
    expect(screen.getByText(/Caixa/)).toBeInTheDocument();
    expect(screen.getByText(/Energia Eletrica/)).toBeInTheDocument();
  });

  it('cadastra um banco e o disponibiliza no formulário de agência', async () => {
    window.location.hash = '#/bancos';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Incluir Banco' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Número/), '999');
    await user.type(within(dialog).getByLabelText(/^Banco/), 'Banco de Teste');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(screen.getByText('Banco de Teste')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Incluir Agência' }));
    const janela = within(screen.getByRole('dialog'));
    expect(janela.getByRole('option', { name: '999 - Banco de Teste' })).toBeInTheDocument();
  });
});
