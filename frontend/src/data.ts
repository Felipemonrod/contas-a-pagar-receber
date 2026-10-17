import formLayouts from './form-layouts.json';

export const groups = [
  { title: 'CADASTRO', items: [['clientes', 'Clientes'], ['fornecedores', 'Fornecedores'], ['bancos', 'Bancos'], ['cartorios', 'Cartórios']] },
  { title: 'PLANO DE CONTAS', items: [['plano', 'Manutenção'], ['lancamentos', 'Lançamentos']] },
  { title: 'CONTAS A PAGAR', items: [['despesas', 'Despesas'], ['pagamentos', 'Pagamentos']] },
  { title: 'CONTAS A RECEBER', items: [['recebimentos', 'Recebimentos'], ['cheques', 'Cheque Pré-Datado'], ['remessas', 'Remessa p/ Cartório']] },
  { title: 'RELATÓRIOS', items: [['relatorios', 'Relatórios']] },
] as const;

export type Entity = keyof typeof formLayouts;
export type Route = Entity | 'inicio' | 'relatorios';
export type RecordData = { id: string; [key: string]: string };
export type Database = Record<Entity, RecordData[]>;
export type Column = { key: string; label: string; width?: number; format?: 'money' | 'date' };
export type ScreenConfig = {
  title: string; heading: string; description: string; modal: string;
  actions: string[]; columns: Column[]; primary: string;
};
const col = (key: string, width?: number, label = key, format?: Column['format']): Column => ({ key, label, width, format });
export const screens: Record<Entity, ScreenConfig> = {
  clientes: { title: 'Cadastro de Clientes', heading: 'Clientes', description: 'Cadastro e manutenção de clientes.', modal: 'Cadastro de Cliente', primary: 'Cliente', actions: ['Incluir', 'Editar', 'Localizar', 'Relatório'], columns: [col('Registro', 90), col('Cliente', 250), col('Endereço', 280), col('Cidade', 180), col('Estado', 70, 'UF'), col('Telefone', 180)] },
  fornecedores: { title: 'Cadastro de Fornecedores', heading: 'Fornecedores', description: 'Cadastro e manutenção de fornecedores.', modal: 'Cadastro de Fornecedor', primary: 'Fornecedor', actions: ['Incluir', 'Editar', 'Localizar', 'Relatório'], columns: [col('Registro', 90), col('Fornecedor', 250), col('Endereço', 250), col('Cidade', 170), col('Telefone', 160), col('Vendedor', 130)] },
  bancos: { title: 'Cadastro de Bancos', heading: 'Bancos', description: 'Cadastro de bancos, agências e contas correntes.', modal: 'Banco / Agência / Conta Corrente', primary: 'Banco', actions: ['Incluir Agência', 'Editar Agência', 'Excluir Agência', 'Incluir Conta'], columns: [col('Banco', 220), col('Agência', 160), col('Nome da Agência', 230, 'Nome'), col('Conta Corrente', 200, 'Conta'), col('Limite', 180, 'Limite', 'money')] },
  cartorios: { title: 'Cadastro de Cartórios', heading: 'Cartórios', description: 'Cadastro de cartórios utilizados para remessa de títulos.', modal: 'Cadastro de Cartório', primary: 'Nome do Cartório', actions: ['Incluir', 'Editar', 'Deletar'], columns: [col('Nome do Cartório', 360, 'Nome'), col('Contato', 250), col('Telefone', 260)] },
  plano: { title: 'Plano de Contas', heading: 'Plano de Contas', description: 'Manutenção da estrutura hierárquica das contas.', modal: 'Plano de Contas', primary: 'Descrição da Conta', actions: ['Inclusão'], columns: [col('Nova Conta', 160, 'Conta'), col('Descrição da Conta', 500, 'Descrição')] },
  lancamentos: { title: 'Lançamento', heading: 'Lançamento', description: 'Lançamento contábil entre contas.', modal: 'Lançamento', primary: 'Descrição', actions: ['Incluir', 'Editar', 'Excluir'], columns: [col('Registro', 90), col('Data', 160, 'Data', 'date'), col('Conta de Crédito', 280, 'Crédito'), col('Conta de Débito', 280, 'Débito'), col('Valor', 180, 'Valor', 'money')] },
  despesas: { title: 'Contas a Pagar — Despesas', heading: 'Despesas', description: 'Cadastro das despesas previstas.', modal: 'Despesa', primary: 'Descrição', actions: ['Inclusão', 'Edição', 'Exclusão'], columns: [col('Número', 90), col('Lançamento', 150), col('Data Lanç.', 140, 'Data Lanç.', 'date'), col('Previsão de Pagamento', 170, 'Prev. Pagamento', 'date'), col('Valor Previsto', 160, 'Valor Previsto', 'money'), col('Descrição', 280)] },
  pagamentos: { title: 'Contas a Pagar — Pagamentos', heading: 'Pagamentos', description: 'Registro e manutenção de títulos pagos.', modal: 'Pagamento', primary: 'Nome do Fornecedor', actions: ['Incluir', 'Editar', 'Fim'], columns: [col('Número do Título', 150, 'Título'), col('Nome do Fornecedor', 250, 'Fornecedor'), col('Valor do Título', 150, 'Valor', 'money'), col('Data de Emissão', 150, 'Emissão', 'date'), col('Data de Vencimento', 150, 'Vencimento', 'date'), col('Data de Pagamento', 150, 'Pagamento', 'date'), col('Situação', 120)] },
  recebimentos: { title: 'Contas a Receber — Recebimentos', heading: 'Recebimentos', description: 'Registro de títulos recebidos de clientes.', modal: 'Recebimento', primary: 'Nome do Cliente', actions: ['Incluir', 'Editar', 'Fim'], columns: [col('Número do Título', 150, 'Título'), col('Nome do Cliente', 250, 'Cliente'), col('Valor do Título', 150, 'Valor', 'money'), col('Data de Emissão', 150, 'Emissão', 'date'), col('Data de Vencimento', 150, 'Vencimento', 'date'), col('Data de Pagamento', 150, 'Recebimento', 'date'), col('Situação', 120)] },
  cheques: { title: 'Cheque Pré-Datado', heading: 'Cheque Pré-Datado', description: 'Cadastro e acompanhamento de cheques.', modal: 'Cheque Pré-Datado', primary: 'Cliente', actions: ['Incluir', 'Editar', 'Excluir'], columns: [col('Cliente', 240), col('Número do Cheque', 130, 'Cheque'), col('Emissão', 140, 'Emissão', 'date'), col('Data para Depósito', 140, 'Depósito', 'date'), col('Banco', 180), col('Agência', 120), col('Conta Corrente', 130, 'Conta'), col('Valor', 140, 'Valor', 'money')] },
  remessas: { title: 'Remessa de Títulos para Cartório', heading: 'Remessa de Títulos para Cartório', description: 'Controle dos títulos enviados a cartório.', modal: 'Remessa', primary: 'Cartório', actions: ['Enviar', 'Alterar', 'Fim'], columns: [col('Nome', 300), col('Número do Título', 170, 'Título'), col('Remessa', 170, 'Remessa', 'date'), col('Protesto', 170, 'Protesto', 'date'), col('Baixa', 170, 'Baixa', 'date')] },
};

const rows = (items: Omit<RecordData, 'id'>[]): RecordData[] => items.map((item, i) => ({ ...item, id: String(i + 1) }));
export const initialDatabase: Database = {
  clientes: rows([
    { Registro: '001', Cliente: 'Editora Érica Ltda.', Endereço: 'Rua Jarinu, 594', Cidade: 'São Paulo', Estado: 'SP', Telefone: '(11) 0000-0000' },
    { Registro: '002', Cliente: 'Cliente Exemplo', Endereço: 'Av. Principal, 100', Cidade: 'Morrinhos', Estado: 'GO', Telefone: '(64) 0000-0000' },
    { Registro: '003', Cliente: 'Comercial Goiás', Endereço: 'Rua 7, 40', Cidade: 'Goiânia', Estado: 'GO', Telefone: '(62) 0000-0000' },
  ]),
  fornecedores: rows([
    { Registro: '001', Fornecedor: 'Fornecedor Brasil S/A', Endereço: 'Rua das Flores, 123', Cidade: 'Goiânia', Telefone: '(62) 0000-0000', Vendedor: 'João' },
    { Registro: '002', Fornecedor: 'Distribuidora Central', Endereço: 'Av. Goiás, 450', Cidade: 'Anápolis', Telefone: '(62) 0000-1111', Vendedor: 'Carlos' },
  ]),
  bancos: rows([
    { Banco: '001 - Banco do Brasil', Agência: '0300-9', 'Nome da Agência': 'Boa Vista', 'Conta Corrente': '001145', Limite: '1500' },
    { Banco: '237 - Banco Bradesco', Agência: '1050-2', 'Nome da Agência': 'Centro', 'Conta Corrente': '009821', Limite: '3000' },
  ]),
  cartorios: rows([{ 'Nome do Cartório': 'Cartório de Títulos', Contato: 'Jorge', Telefone: '011-5555-4975' }, { 'Nome do Cartório': 'Cartório de Protesto', Contato: 'Wilson', Telefone: '011-5584-2545' }]),
  plano: rows([
    { 'Nova Conta': '111.01', 'Conta Superior': '111', 'Descrição da Conta': 'Caixa' },
    { 'Nova Conta': '111.02', 'Conta Superior': '111', 'Descrição da Conta': 'Banco' },
    { 'Nova Conta': '111.03', 'Conta Superior': '111', 'Descrição da Conta': 'Aplicações' },
    { 'Nova Conta': '112.01', 'Conta Superior': '112', 'Descrição da Conta': 'Clientes' },
    { 'Nova Conta': '112.02', 'Conta Superior': '112', 'Descrição da Conta': 'Duplicatas a Receber' },
  ]),
  lancamentos: rows([
    { Registro: '1', Data: '1998-05-03', 'Conta de Crédito': 'Caixa', 'Conta de Débito': 'Fornecedores', Valor: '511.45', Descrição: 'Pagamento a fornecedores' },
    { Registro: '2', Data: '1998-05-04', 'Conta de Crédito': 'Caixa', 'Conta de Débito': 'Duplicatas a Pagar', Valor: '5471', Descrição: 'Liquidação de duplicatas' },
  ]),
  despesas: rows([{ Número: '1', Lançamento: '125', 'Data Lanç.': '1998-07-31', 'Previsão de Pagamento': '1999-12-12', 'Valor Previsto': '150', Descrição: 'Conta de Água' }, { Número: '2', Lançamento: '156', 'Data Lanç.': '1998-07-31', 'Previsão de Pagamento': '1999-12-12', 'Valor Previsto': '120', Descrição: 'Conta de Luz' }]),
  pagamentos: rows([
    { 'Número do Título': '156456454', 'Nome do Fornecedor': 'Fornecedor Brasil S/A', 'Valor do Título': '200', 'Data de Emissão': '1999-12-12', 'Data de Vencimento': '1999-12-12', 'Data de Pagamento': '1999-12-12', Situação: 'PAGO', Tipo: 'Duplicata' },
    { 'Número do Título': '778899', 'Nome do Fornecedor': 'Distribuidora Central', 'Valor do Título': '850', 'Data de Emissão': '2026-10-05', 'Data de Vencimento': '2026-10-20', Situação: 'ABERTO', Tipo: 'Duplicata' },
  ]),
  recebimentos: rows([
    { 'Número do Título': '123456', 'Nome do Cliente': 'Cliente Exemplo', 'Valor do Título': '100', 'Data de Emissão': '1998-06-25', 'Data de Vencimento': '1998-06-25', 'Data de Pagamento': '1998-06-25', Situação: 'RECEBIDO', Tipo: 'Duplicata' },
    { 'Número do Título': '998812', 'Nome do Cliente': 'Comercial Goiás', 'Valor do Título': '950', 'Data de Emissão': '2026-10-02', 'Data de Vencimento': '2026-10-18', Situação: 'ABERTO', Tipo: 'Duplicata' },
  ]),
  cheques: rows([{ Cliente: 'Cliente Exemplo', 'Número do Cheque': '002354', Emissão: '2026-10-01', 'Data para Depósito': '2026-10-15', Banco: '001 - Banco do Brasil', Agência: '0300-9', 'Conta Corrente': '001145', Valor: '1500' }]),
  remessas: rows([{ Nome: 'Cliente Exemplo', Cartório: 'Cartório de Protesto', 'Número do Título': '012345', Remessa: '2026-10-01', Protesto: '2026-10-10' }]),
};

export const STORAGE_KEY = 'contas-financeiro-v1';
export function readDatabase(): Database {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return structuredClone(initialDatabase);
    return Object.fromEntries((Object.keys(initialDatabase) as Entity[]).map(key => {
      const value = (saved as Record<string, unknown>)[key];
      const valid = Array.isArray(value) && value.every(row => row && typeof row === 'object' && typeof row.id === 'string' && Object.values(row).every(v => typeof v === 'string'));
      return [key, valid ? value : structuredClone(initialDatabase[key])];
    })) as Database;
  } catch { return structuredClone(initialDatabase); }
}
export const isEntity = (value: string): value is Entity => Object.hasOwn(screens, value);
export function routeFromHash(): Route {
  const value = window.location.hash.replace(/^#\/?/, '');
  return isEntity(value) || value === 'relatorios' ? value : 'inicio';
}
export function displayValue(value: string | undefined, format?: Column['format']): string {
  if (!value) return '–';
  if (format === 'money') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  if (format === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  return value;
}
export function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); }
export function nextRecord(entity: Entity, values: Record<string, string>, records: RecordData[], original?: RecordData): RecordData {
  const next = String(Math.max(0, ...records.map(r => Number(r.Registro || r.Número || r.id) || 0)) + 1);
  const record: RecordData = { ...original, ...values, id: original?.id || crypto.randomUUID() };
  record.Registro ||= ['clientes', 'fornecedores'].includes(entity) ? next.padStart(3, '0') : next;
  if (entity === 'despesas') { record.Número ||= next; record['Data Lanç.'] ||= new Date().toLocaleDateString('sv-SE'); }
  if (entity === 'pagamentos' || entity === 'recebimentos') record.Situação = record['Data de Pagamento'] ? entity === 'pagamentos' ? 'PAGO' : 'RECEBIDO' : 'ABERTO';
  return record;
}
