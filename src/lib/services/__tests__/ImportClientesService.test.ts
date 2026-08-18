import { describe, it, expect } from 'vitest';
import {
  resolveImportGroups,
  type ResolveImportContext,
  type CsvRow,
} from '../ImportClientesService';

function baseContext(overrides: Partial<ResolveImportContext> = {}): ResolveImportContext {
  return {
    membersByEmail: new Map([['ctv@metacampo.com', { userId: 'user-1', email: 'ctv@metacampo.com' }]]),
    culturasAtivas: new Map([
      ['SOJA', 'Soja'],
      ['MILHO', 'Milho'],
    ]),
    clientesExistentes: [],
    areasExistentes: [],
    gruposExistentes: new Map(),
    ...overrides,
  };
}

function row(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    documento: '',
    nome_cliente: 'Fazenda Teste',
    cidade: 'Sinop',
    uf: 'mt',
    email_ctv: 'ctv@metacampo.com',
    cultivo: 'Soja',
    hectares: '100',
    ...overrides,
  };
}

describe('resolveImportGroups — agrupamento', () => {
  it('funde linhas com o mesmo documento em um único cliente com várias áreas', () => {
    const rows = [
      row({ documento: '123', cultivo: 'Soja', hectares: 100 }),
      row({ documento: '123', cultivo: 'Milho', hectares: 50 }),
    ];
    const results = resolveImportGroups(rows, baseContext());

    expect(results).toHaveLength(1);
    expect(results[0].areas).toHaveLength(2);
    expect(results[0].areas.map((a) => a.cultivo).sort()).toEqual(['Milho', 'Soja']);
  });

  it('NÃO funde duas linhas sem documento, mesmo com nome/cidade/uf/ctv iguais', () => {
    const rows = [row({ documento: '' }), row({ documento: '' })];
    const results = resolveImportGroups(rows, baseContext());

    expect(results).toHaveLength(2);
  });

  it('rejeita o grupo se linhas do mesmo documento têm e-mails de CTV diferentes', () => {
    const rows = [
      row({ documento: '123', email_ctv: 'ctv@metacampo.com' }),
      row({ documento: '123', email_ctv: 'outro@metacampo.com' }),
    ];
    const results = resolveImportGroups(rows, baseContext());

    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('e-mails de CTV diferentes');
  });
});

describe('resolveImportGroups — resolução create vs update', () => {
  it('vira "create" quando não há documento nem cliente existente compatível', () => {
    const results = resolveImportGroups([row()], baseContext());
    expect(results[0].action).toBe('create');
    expect(results[0].clienteExistenteId).toBeNull();
  });

  it('vira "update" por documento batendo com cliente existente', () => {
    const ctx = baseContext({
      clientesExistentes: [
        { id: 'cli-1', document: '123', name: 'Fazenda X', city: 'Sinop', state: 'MT', ctv_id: 'user-1' },
      ],
    });
    const results = resolveImportGroups([row({ documento: '123' })], ctx);

    expect(results[0].action).toBe('update');
    expect(results[0].clienteExistenteId).toBe('cli-1');
  });

  it('vira "update" por nome+cidade+uf+ctv batendo, mesmo sem documento', () => {
    const ctx = baseContext({
      clientesExistentes: [
        { id: 'cli-2', document: null, name: 'Fazenda Teste', city: 'Sinop', state: 'MT', ctv_id: 'user-1' },
      ],
    });
    const results = resolveImportGroups([row({ documento: '' })], ctx);

    expect(results[0].action).toBe('update');
    expect(results[0].clienteExistenteId).toBe('cli-2');
  });

  it('NÃO casa com cliente existente de outro CTV mesmo com nome/cidade/uf iguais', () => {
    const ctx = baseContext({
      clientesExistentes: [
        { id: 'cli-3', document: null, name: 'Fazenda Teste', city: 'Sinop', state: 'MT', ctv_id: 'outro-user' },
      ],
    });
    const results = resolveImportGroups([row({ documento: '' })], ctx);

    expect(results[0].action).toBe('create');
  });
});

describe('resolveImportGroups — validação de linhas', () => {
  it('exige nome_cliente, cidade, uf e email_ctv', () => {
    const results = resolveImportGroups(
      [row({ nome_cliente: '', cidade: '', uf: '', email_ctv: '' })],
      baseContext()
    );
    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('nome_cliente');
    expect(results[0].erro).toContain('cidade');
    expect(results[0].erro).toContain('uf');
    expect(results[0].erro).toContain('email_ctv');
  });

  it('rejeita e-mail de CTV que não existe no tenant', () => {
    const results = resolveImportGroups([row({ email_ctv: 'fantasma@metacampo.com' })], baseContext());
    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('fantasma@metacampo.com');
    expect(results[0].ctvId).toBeNull();
  });

  it('marca a linha de cultivo como inválida quando o cultivo não está cadastrado no tenant', () => {
    const results = resolveImportGroups([row({ cultivo: 'Algodão' })], baseContext());
    expect(results[0].areas[0].valida).toBe(false);
    expect(results[0].areas[0].motivo).toContain('não cadastrado');
    // Sem nenhuma linha válida, o grupo inteiro vira erro.
    expect(results[0].action).toBe('error');
  });

  it('marca a linha de cultivo como inválida quando hectares é zero ou ausente', () => {
    const results = resolveImportGroups([row({ hectares: 0 })], baseContext());
    expect(results[0].areas[0].valida).toBe(false);
    expect(results[0].areas[0].motivo).toContain('hectares');
  });

  it('cliente com uma área válida e outra inválida ainda é "create"/"update" (best-effort por área)', () => {
    const rows = [
      row({ documento: '9', cultivo: 'Soja', hectares: 100 }),
      row({ documento: '9', cultivo: 'CulturaFantasma', hectares: 50 }),
    ];
    const results = resolveImportGroups(rows, baseContext());

    expect(results[0].action).toBe('create');
    expect(results[0].areas.find((a) => a.cultivo === 'Soja')?.valida).toBe(true);
    expect(results[0].areas.find((a) => a.motivo?.includes('não cadastrado'))?.valida).toBe(false);
  });
});

describe('resolveImportGroups — grupo econômico e área anterior', () => {
  it('resolve grupoEconomicoId quando o nome do grupo já existe (case-insensitive por normalização upper)', () => {
    const ctx = baseContext({
      gruposExistentes: new Map([['FAMILIA LIMA', { id: 'grupo-1', nome: 'Familia Lima' }]]),
    });
    const results = resolveImportGroups([row({ grupo_economico: 'Familia Lima' })], ctx);

    expect(results[0].grupoEconomicoId).toBe('grupo-1');
  });

  it('deixa grupoEconomicoId nulo quando o grupo ainda não existe (get-or-create acontece na gravação, não aqui)', () => {
    const results = resolveImportGroups([row({ grupo_economico: 'Grupo Novo' })], baseContext());
    expect(results[0].grupoEconomicoId).toBeNull();
    expect(results[0].grupoEconomicoNome).toBe('Grupo Novo');
  });

  it('reporta areaAnteriorHa quando o cliente já tem área cadastrada daquele cultivo', () => {
    const ctx = baseContext({
      clientesExistentes: [
        { id: 'cli-4', document: '77', name: 'Fazenda Y', city: 'Sorriso', state: 'MT', ctv_id: 'user-1' },
      ],
      areasExistentes: [{ id: 'area-1', customer_id: 'cli-4', crop_name: 'Soja', area_ha: 800 }],
    });
    const results = resolveImportGroups([row({ documento: '77', cultivo: 'Soja', hectares: 999 })], ctx);

    expect(results[0].areas[0].areaAnteriorHa).toBe(800);
    expect(results[0].areas[0].hectares).toBe(999);
  });
});
