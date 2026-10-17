import { useId, useState, type FormEvent } from 'react';
import formLayouts from './form-layouts.json';
import { screens, type Database, type Entity, type RecordData } from './data';
import { Button } from './components';

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const isMoney = (label: string) => /^(Valor|Limite|Desconto$)/.test(label);
const isDate = (label: string) => /^(Data|Emissão$|Previsão|Validade|Remessa$|Protesto$|Baixa$)/.test(label);
export function RecordForm({ entity, record, database, onSave, onClose, bankOnly = false }: { entity: Entity; record?: RecordData; database: Database; onSave: (values: Record<string, string>) => void; onClose: () => void; bankOnly?: boolean }) {
  const prefix = useId();
  const [values, setValues] = useState<Record<string, string>>({ Tipo: 'Duplicata', ...record });
  const [error, setError] = useState('');
  const layout = bankOnly ? [{ fields: ['Número', 'Banco'], separatorAfter: false }] : formLayouts[entity];
  const primary = bankOnly ? 'Banco' : screens[entity].primary;
  function options(label: string): string[] | null {
    if (label === 'Estado') return states;
    if (label === 'Tipo') return ['Duplicata', 'Boleto', 'Nota Fiscal', 'Recibo', 'Outros'];
    if (bankOnly) return null;
    if (label === 'Banco') return [...new Set(['001 - Banco do Brasil', '237 - Banco Bradesco', '104 - Caixa Econômica Federal', ...database.bancos.map(b => b.Banco)])];
    if (label === 'Cartório') return database.cartorios.map(c => c['Nome do Cartório']);
    if (label === 'Nome do Fornecedor') return database.fornecedores.map(c => c.Fornecedor);
    if (label === 'Nome do Cliente' || (label === 'Cliente' && entity === 'cheques')) return database.clientes.map(c => c.Cliente);
    if (label.startsWith('Conta de ')) return [...new Set([...database.plano.map(c => c['Descrição da Conta']), 'Fornecedores', 'Duplicatas a Pagar'])];
    if (label === 'Conta Superior') return ['111', '112', '21', '22'];
    return null;
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!values[primary]?.trim()) { setError(`Preencha o campo ${primary}.`); return; }
    if (values['Conta de Crédito'] && values['Conta de Crédito'] === values['Conta de Débito']) { setError('Escolha contas de crédito e débito diferentes.'); return; }
    if (values['Data de Emissão'] && values['Data de Vencimento'] && values['Data de Vencimento'] < values['Data de Emissão']) { setError('O vencimento deve ser igual ou posterior à emissão.'); return; }
    onSave(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])));
    if (values['Inclusão Contínua'] === 'Sim') setValues({ 'Conta Superior': values['Conta Superior'] || '', 'Inclusão Contínua': 'Sim' });
  }
  return <form onSubmit={submit}>
    <div className="form-body">{layout.map((row, index) => <div className={`form-group ${row.separatorAfter ? 'group-divider' : ''}`} key={index}>
      <div className="field-row" style={{ gridTemplateColumns: `repeat(${row.fields.length}, minmax(0, 1fr))` }}>
        {row.fields.map(label => {
          const id = `${prefix}-${label}`;
          const choices = options(label);
          const required = label === primary || ['Número do Título', 'Número do Cheque', 'Nova Conta'].includes(label) || bankOnly && label === 'Número';
          const setValue = (value: string) => { setValues(v => ({ ...v, [label]: value })); setError(''); };
          const checkbox = ['Consolidado', 'Inclusão Contínua'].includes(label);
          return <div className={`field ${checkbox ? 'checkbox-field' : ''}`} key={label}>
            <label htmlFor={id}>{label}{required && <span className="required-mark" aria-hidden="true"> *</span>}</label>
            {checkbox ? <input id={id} type="checkbox" checked={values[label] === 'Sim'} onChange={e => setValue(e.target.checked ? 'Sim' : 'Não')} /> : choices ?
              <select id={id} value={values[label] || ''} required={required} onChange={e => setValue(e.target.value)}><option value="">Selecione…</option>{[...new Set([...choices, ...(values[label] ? [values[label]] : [])])].map(value => <option key={value}>{value}</option>)}</select> :
              <input id={id} name={label} required={required} type={isDate(label) ? 'date' : isMoney(label) || label === 'Pagamento (dias)' ? 'number' : label === 'Telefone' ? 'tel' : 'text'} step={isMoney(label) ? '0.01' : undefined} min={isMoney(label) || label === 'Pagamento (dias)' ? '0' : undefined} value={values[label] || ''} onChange={e => setValue(e.target.value)} maxLength={label === 'CEP' ? 9 : undefined} />}
          </div>;
        })}
      </div>
    </div>)}
    {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer className="modal-footer"><Button onClick={onClose} type="button">Cancelar</Button><Button type="submit" primary>{entity === 'clientes' || entity === 'fornecedores' ? 'Gravar' : 'OK'}</Button></footer>
  </form>;
}
