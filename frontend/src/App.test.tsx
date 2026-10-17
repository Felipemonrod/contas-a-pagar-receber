import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import layouts from './form-layouts.json';
import { groups, initialDatabase, nextRecord, readDatabase, screens, STORAGE_KEY, type Entity } from './data';

describe('fluxos do sistema financeiro', () => {
  it('inclui, edita e persiste um cliente com todos os campos organizados', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    const dialog = screen.getByRole('dialog', { name: 'Cadastro de Cliente' });
    await user.type(within(dialog).getByLabelText(/^Cliente/), 'Cliente de Teste');
    await user.type(within(dialog).getByLabelText('Cidade'), 'Curitiba');
    await user.selectOptions(within(dialog).getByLabelText('Estado'), 'PR');
    await user.click(within(dialog).getByRole('button', { name: 'Gravar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Cliente de Teste')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const field = within(screen.getByRole('dialog')).getByLabelText(/^Cliente/); await user.clear(field); await user.type(field, 'Cliente Atualizado');
    await user.click(screen.getByRole('button', { name: 'Gravar' }));
    expect(screen.getByText('Cliente Atualizado')).toBeInTheDocument();
    expect(readDatabase().clientes.at(-1)?.Cidade).toBe('Curitiba');
    expect(readDatabase().clientes.at(-1)?.Estado).toBe('PR');
  });

  it('busca sem distinguir acentos e limpa os resultados', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Localizar' }));
    await user.type(screen.getByLabelText('Entre com uma parte do nome'), 'erica');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Localizar' }));
    expect(screen.getByText('Editora Érica Ltda.')).toBeInTheDocument();
    expect(screen.queryByText('Comercial Goiás')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(screen.getByText('Comercial Goiás')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: screens[entity].actions[0] }));
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
