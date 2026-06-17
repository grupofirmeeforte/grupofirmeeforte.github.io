import { describe, it, expect } from 'vitest';
import { calcularPercPago } from './db';

describe('calcularPercPago - regras de negócio', () => {
  it('deve retornar 0 quando RBM é zero', async () => {
    const result = await calcularPercPago(0, 'Ativo01', 'J1234567', 'FLEX', '60', 'CONVENIOS BANCO DO BRASIL', '2.40', '05/2026');
    expect(result).toBe(0);
  });

  it('deve retornar 0 quando mês é anterior a 05/2026', async () => {
    const result = await calcularPercPago(5000, 'Ativo01', 'J1234567', 'FLEX', '60', 'CONVENIOS BANCO DO BRASIL', '2.40', '04/2026');
    expect(result).toBe(0);
  });

  it('deve retornar 0 quando mês é 12/2025', async () => {
    const result = await calcularPercPago(5000, 'Ativo01', 'J1234567', 'FLEX', '60', 'CONVENIOS BANCO DO BRASIL', '2.40', '12/2025');
    expect(result).toBe(0);
  });

  it('deve retornar número >= 0 para mês 05/2026 (mesmo sem dados no banco)', async () => {
    const result = await calcularPercPago(5000, 'Ativo01', 'JNAOEXISTE', 'FLEX', '60', 'CONVENIOS BANCO DO BRASIL', '2.40', '05/2026');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('deve retornar número >= 0 para mês 06/2026', async () => {
    const result = await calcularPercPago(5000, 'Ativo01', 'JNAOEXISTE', 'FLEX', '60', 'CONVENIOS BANCO DO BRASIL', '2.40', '06/2026');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('deve retornar número >= 0 para situação vazia (pode usar ativo01 como padrão)', async () => {
    const result = await calcularPercPago(5000, '', 'JNAOEXISTE', 'FLEX', '60', 'CONVENIOS BANCO DO BRASIL', '2.40', '05/2026');
    // Quando situação é vazia, pode usar ativo01 como padrão se encontrar na tabela
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('não deve lançar exceção para qualquer combinação de parâmetros', async () => {
    await expect(
      calcularPercPago(1000, 'Ativo', 'JNAOEXISTE', 'EMPRESA_TESTE', '48', 'INSS', '1.80', '05/2026')
    ).resolves.not.toThrow();
  });
});
