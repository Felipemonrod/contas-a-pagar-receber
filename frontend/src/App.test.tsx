import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import layouts from './form-layouts.json';
import { groups, initialDatabase, nextRecord, readDatabase, screens, STORAGE_KEY, type Entity } from './data';
import { apiFalsaAtual } from './test-utils/apiFalsa';

describe('fluxos do sistema financeiro', () => {
  it('inclui e edita um cliente pela API, no formato do contrato', async () => {
    const api = apiFalsaAtual();
    const user = userEvent.setup(); render(<App />);
    // A tela comeca carregando: a lista vem de GET /api/pessoas?papel=CLIENTE.
    expect(await screen.findByText('Editora Érica Ltda.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    const dialog = screen.getByRole('dialog', { name: 'Cadastro de Cliente' });
    await user.type(within(dialog).getByLabelText(/^Cliente/), 'Cliente de Teste');
    await user.type(within(dialog).getByLabelText(/^CGC/), '99.999.999/0001-99');
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
    expect(api.pessoas()).toHaveLength(4);
  });

  it('mostra a mensagem da API quando a regra de negocio recusa a gravacao', async () => {
    const user = userEvent.setup(); render(<App />);
    expect(await screen.findByText('Editora Érica Ltda.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    const dialog = screen.getByRole('dialog', { name: 'Cadastro de Cliente' });
    await user.type(within(dialog).getByLabelText(/^Cliente/), 'Documento Repetido');
    // Documento que a API falsa ja tem: responde 422, como o back-end real.
    await user.type(within(dialog).getByLabelText(/^CGC/), '11.111.111/0001-11');
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
    const user = userEvent.setup(); render(<App />);
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

  it('exige confirmar a exclusão e preserva o registro ao cancelar', async () => {
    window.location.hash = '#/despesas'; const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Exclusão' }));
    await user.click(screen.getByRole('button', { name: 'Não' }));
    expect(screen.getByText('Conta de Água')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exclusão' }));
    await user.click(screen.getByRole('button', { name: 'Sim, excluir' }));
    expect(screen.queryByText('Conta de Água')).not.toBeInTheDocument();
    expect(readDatabase().despesas).toHaveLength(1);
  });

  it.each(Object.keys(layouts) as Entity[])('vincula %s ao formulário e aos campos correspondentes', async entity => {
    window.location.hash = `#/${entity}`; const user = userEvent.setup(); render(<App />);
    // Nas telas integradas a barra de acoes fica desabilitada enquanto carrega.
    const acao = screen.getByRole('button', { name: screens[entity].actions[0] });
    await waitFor(() => expect(acao).toBeEnabled());
    await user.click(acao);
    const dialog = screen.getByRole('dialog', { name: screens[entity].modal });
    for (const field of layouts[entity].flatMap(row => row.fields)) expect(within(dialog).getByLabelText(new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: \\*)?$`))).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('vincula os relacionamentos aos cadastros e valida as datas de pagamento', async () => {
    window.location.hash = '#/pagamentos'; const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/^Nome do Fornecedor/), 'Fornecedor Brasil S/A');
    await user.type(within(dialog).getByLabelText(/^Número do Título/), 'TESTE-01');
    fireEvent.change(within(dialog).getByLabelText('Data de Emissão'), { target: { value: '2026-10-14' } });
    fireEvent.change(within(dialog).getByLabelText('Data de Vencimento'), { target: { value: '2026-10-01' } });
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('vencimento');
    fireEvent.change(within(dialog).getByLabelText('Data de Vencimento'), { target: { value: '2026-10-30' } });
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(screen.getByText('TESTE-01')).toBeInTheDocument();
    expect(readDatabase().pagamentos.at(-1)?.Situação).toBe('ABERTO');
  });

  it('navega pelas 13 telas e permite voltar ao menu', async () => {
    const user = userEvent.setup(); render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Menu principal' });
    for (const [key, label] of groups.flatMap(g => [...g.items])) {
      await user.click(within(nav).getByRole('link', { name: label }));
      await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(key === 'relatorios' ? 'Relatórios' : screens[key].heading));
    }
    await user.click(screen.getByRole('link', { name: 'Contas a Pagar e a Receber — Menu Principal' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Menu Principal'));
  });

  it('filtra relatórios pelo período e aciona a impressão', async () => {
    window.location.hash = '#/relatorios'; const user = userEvent.setup(); const print = vi.spyOn(window, 'print').mockImplementation(() => {}); render(<App />);
    await user.selectOptions(screen.getByLabelText('Relatório'), 'pagamentos');
    await user.click(screen.getByRole('button', { name: 'Visualizar' }));
    const preview = screen.getByRole('region', { name: 'Prévia do relatório' });
    expect(within(preview).getByText('778899')).toBeInTheDocument();
    expect(within(preview).queryByText('156456454')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Imprimir' })); expect(print).toHaveBeenCalledOnce();
  });

  it('recupera dados inválidos de armazenamento e calcula o estado de recebimento', () => {
    localStorage.setItem(STORAGE_KEY, '{inválido'); expect(readDatabase()).toEqual(initialDatabase);
    const record = nextRecord('recebimentos', { 'Nome do Cliente': 'Cliente Exemplo', 'Data de Pagamento': '2026-10-14' }, []);
    expect(record.Situação).toBe('RECEBIDO');
  });

  it('mantém a inclusão contínua aberta sem sobrescrever a conta anterior', async () => {
    window.location.hash = '#/plano'; const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Inclusão' }));
    await user.selectOptions(screen.getByLabelText('Conta Superior'), '111');
    await user.type(screen.getByLabelText(/^Nova Conta/), '111.04');
    await user.type(screen.getByLabelText(/^Descrição da Conta/), 'Reserva');
    await user.click(screen.getByLabelText('Inclusão Contínua'));
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nova Conta/)).toHaveValue('');
    await user.type(screen.getByLabelText(/^Nova Conta/), '111.05');
    await user.type(screen.getByLabelText(/^Descrição da Conta/), 'Investimentos');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(readDatabase().plano.slice(-2).map(r => r['Nova Conta'])).toEqual(['111.04', '111.05']);
  });

  it('cadastra um banco e o disponibiliza no formulário de agência', async () => {
    window.location.hash = '#/bancos'; const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Incluir Banco' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Número/), '999');
    await user.type(within(dialog).getByLabelText(/^Banco/), 'Banco de Teste');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(screen.getByText('Banco de Teste')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Incluir Agência' }));
    expect(within(screen.getByRole('dialog')).getByRole('option', { name: '999 - Banco de Teste' })).toBeInTheDocument();
  });
});
