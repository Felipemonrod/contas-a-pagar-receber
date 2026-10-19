/**
 * Formulário genérico de cadastro, usado por todas as telas.
 *
 * Não existe um formulário por tela: existe um só, que monta os campos a
 * partir de `form-layouts.json`, onde está o agrupamento extraído do Figma.
 * Cada entrada desse arquivo descreve as linhas do formulário e os campos de
 * cada linha, e é daí que saem os separadores pretos do protótipo.
 *
 * O componente não conhece a API. Ele devolve os valores digitados em
 * `onSave`, e quem traduz para o formato da API é o adapter da tela.
 */

import { useId, useState, type FormEvent } from 'react';
import formLayouts from './form-layouts.json';
import { screens, type Entity, type RecordData } from './data';
import { Button } from './components';
import { TIPOS_DE_TITULO } from './adapters/titulos';

/** Opções de um campo de escolha, indexadas pelo rótulo que a tela usa. */
export type ListasDeEscolha = Record<string, string[]>;

/** Unidades da federação, para o campo Estado. */
const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

/** Campos que, além do principal, a tela exige. */
const OBRIGATORIOS = ['Número do Título', 'Número do Cheque', 'Nova Conta'];

/** Campos desenhados como caixa de marcar, e não como campo de texto. */
const CAIXAS_DE_MARCAR = ['Consolidado', 'Inclusão Contínua'];

/** O rótulo indica um valor em dinheiro? Define o tipo e o passo do campo. */
/**
 * O rotulo indica um valor em dinheiro?
 *
 * 'Desconto' sozinho NAO entra: no cadastro de fornecedor ele e o desconto
 * negociado, um texto livre como '5% a vista'. O desconto em dinheiro dos
 * titulos se chama 'Valor do Desconto' e entra pelo 'Valor'.
 */
const ehDinheiro = (rotulo: string) => /^(Valor|Limite|Acréscimo)/.test(rotulo);

/** O rotulo indica uma quantidade inteira, sem centavos? */
const ehInteiro = (rotulo: string) => rotulo === 'Entrega';

/** O rótulo indica uma data? */
const ehData = (rotulo: string) =>
  /^(Data|Emissão$|Previsão|Validade|Remessa$|Protesto$|Baixa$)/.test(rotulo);

export function RecordForm({
  entity,
  record,
  listas = {},
  onSave,
  onClose,
  bankOnly = false,
  mensagemErro = '',
  salvando = false,
  camposSomenteLeitura = [],
}: {
  entity: Entity;
  record?: RecordData;
  /**
   * Opções dos campos de escolha, indexadas pelo rótulo do campo.
   *
   * Cada tela passa só o que o seu formulário precisa, já vindo da API.
   * Antes isto era um `Database` inteiro, de quando os dados moravam no
   * navegador; as telas montavam um objeto de mentira só para preencher
   * dois campos.
   */
  listas?: ListasDeEscolha;
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
  /** Modo reduzido do cadastro de banco, com apenas número e nome. */
  bankOnly?: boolean;
  /** Erro vindo da API, exibido junto com os erros de validação locais. */
  mensagemErro?: string;
  /** Enquanto true, a gravação está em andamento e os botões ficam travados. */
  salvando?: boolean;
  /**
   * Campos exibidos, mas que o usuário não pode alterar.
   *
   * Serve para o caso em que a API aceita o campo no corpo e simplesmente
   * o ignora: deixá-lo editável faria o usuário acreditar numa alteração
   * que nunca acontece.
   */
  camposSomenteLeitura?: string[];
}) {
  // `useId` gera um prefixo único por formulário, para que dois formulários
  // abertos não produzam dois campos com o mesmo id.
  const prefixo = useId();
  const [values, setValues] = useState<Record<string, string>>({
    Tipo: TIPOS_DE_TITULO.DUPLICATA,
    ...record,
  });
  const [error, setError] = useState('');

  const layout = bankOnly
    ? [{ fields: ['Número', 'Banco'], separatorAfter: false }]
    : formLayouts[entity];
  const principal = bankOnly ? 'Banco' : screens[entity].primary;

  /**
   * Devolve as opções de um campo de escolha, ou `null` quando o campo é de
   * digitação livre.
   *
   * Há dois tipos de lista. As fixas, que não dependem de nada — as unidades
   * da federação e os tipos de título que a API aceita. E as que vêm da API,
   * que a tela carrega e passa em `listas`, indexadas pelo rótulo do campo.
   *
   * É isso que liga as telas entre si: o fornecedor escolhido num título é um
   * fornecedor cadastrado, e não um texto digitado à mão.
   */
  function opcoes(rotulo: string): string[] | null {
    if (rotulo === 'Estado') return ESTADOS;
    // A API aceita apenas estes três tipos (migration V2 do back-end).
    if (rotulo === 'Tipo') return Object.values(TIPOS_DE_TITULO);

    return listas[rotulo] ?? null;
  }

  /**
   * Validações feitas aqui, antes de chamar a API.
   *
   * São as que não dependem do servidor para serem respondidas: evitam uma
   * ida à rede para receber de volta um erro previsível. As regras de negócio
   * continuam sendo do back-end, e as mensagens dele chegam em `mensagemErro`.
   */
  function validar(): string {
    if (!values[principal]?.trim()) return `Preencha o campo ${principal}.`;

    if (values['Conta de Crédito'] && values['Conta de Crédito'] === values['Conta de Débito']) {
      return 'Escolha contas de crédito e débito diferentes.';
    }

    const emissao = values['Data de Emissão'];
    const vencimento = values['Data de Vencimento'];
    if (emissao && vencimento && vencimento < emissao) {
      return 'O vencimento deve ser igual ou posterior à emissão.';
    }

    return '';
  }

  function submit(evento: FormEvent) {
    evento.preventDefault();

    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }

    const limpos = Object.entries(values).map(([chave, valor]) => [chave, valor.trim()]);
    onSave(Object.fromEntries(limpos));

    // "Inclusão Contínua" mantém a janela aberta para o próximo registro,
    // preservando só a conta superior, que costuma se repetir.
    if (values['Inclusão Contínua'] === 'Sim') {
      setValues({
        'Conta Superior': values['Conta Superior'] || '',
        'Inclusão Contínua': 'Sim',
      });
    }
  }

  /** Decide o tipo do `<input>` a partir do rótulo do campo. */
  function tipoDoCampo(rotulo: string): string {
    if (ehData(rotulo)) return 'date';
    if (ehDinheiro(rotulo)) return 'number';
    if (ehInteiro(rotulo)) return 'number';
    if (rotulo === 'Telefone') return 'tel';
    return 'text';
  }

  /** Limite de caracteres de alguns campos, por causa do banco do back-end. */
  function limiteDoCampo(rotulo: string): number | undefined {
    if (rotulo === 'CEP') return 9;
    if (rotulo === 'Ramal') return 6;
    if (rotulo === 'Pagamento (dias)' || rotulo === 'Desconto') return 20;
    if (rotulo === 'Vendedor') return 50;
    return undefined;
  }

  /** Desenha um campo, escolhendo entre caixa de marcar, lista e digitação. */
  function campo(rotulo: string) {
    const id = `${prefixo}-${rotulo}`;
    const escolhas = opcoes(rotulo);
    const obrigatorio =
      rotulo === principal ||
      OBRIGATORIOS.includes(rotulo) ||
      (bankOnly && rotulo === 'Número');
    const ehCaixa = CAIXAS_DE_MARCAR.includes(rotulo);
    const travado = camposSomenteLeitura.includes(rotulo);

    /** Guarda o valor e limpa o erro anterior, que deixou de valer. */
    const guardar = (valor: string) => {
      setValues(anteriores => ({ ...anteriores, [rotulo]: valor }));
      setError('');
    };

    return (
      <div className={`field ${ehCaixa ? 'checkbox-field' : ''}`} key={rotulo}>
        <label htmlFor={id}>
          {rotulo}
          {obrigatorio && (
            <span className="required-mark" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>

        {ehCaixa && (
          <input
            id={id}
            type="checkbox"
            checked={values[rotulo] === 'Sim'}
            onChange={evento => guardar(evento.target.checked ? 'Sim' : 'Não')}
          />
        )}

        {!ehCaixa && escolhas && (
          <select
            id={id}
            value={values[rotulo] || ''}
            required={obrigatorio}
            disabled={travado}
            onChange={evento => guardar(evento.target.value)}
          >
            <option value="">Selecione…</option>
            {/* O valor já gravado entra na lista mesmo que não esteja mais
                entre as opções, para a edição não perdê-lo em silêncio. */}
            {[...new Set([...escolhas, ...(values[rotulo] ? [values[rotulo]] : [])])].map(
              valor => (
                <option key={valor}>{valor}</option>
              ),
            )}
          </select>
        )}

        {!ehCaixa && !escolhas && (
          <input
            id={id}
            name={rotulo}
            required={obrigatorio}
            type={tipoDoCampo(rotulo)}
            step={ehDinheiro(rotulo) ? '0.01' : ehInteiro(rotulo) ? '1' : undefined}
            min={ehDinheiro(rotulo) || ehInteiro(rotulo) ? '0' : undefined}
            maxLength={limiteDoCampo(rotulo)}
            readOnly={travado}
            value={values[rotulo] || ''}
            onChange={evento => guardar(evento.target.value)}
          />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="form-body">
        {layout.map((linha, indice) => (
          <div
            className={`form-group ${linha.separatorAfter ? 'group-divider' : ''}`}
            key={indice}
          >
            {/* Os campos de uma linha dividem a largura em partes iguais. */}
            <div
              className="field-row"
              style={{ gridTemplateColumns: `repeat(${linha.fields.length}, minmax(0, 1fr))` }}
            >
              {linha.fields.map(campo)}
            </div>
          </div>
        ))}

        {(error || mensagemErro) && (
          <p className="form-error" role="alert">
            {error || mensagemErro}
          </p>
        )}
      </div>

      <footer className="modal-footer">
        <Button onClick={onClose} type="button" disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" primary disabled={salvando}>
          {salvando
            ? 'Gravando…'
            : entity === 'clientes' || entity === 'fornecedores'
              ? 'Gravar'
              : 'OK'}
        </Button>
      </footer>
    </form>
  );
}
