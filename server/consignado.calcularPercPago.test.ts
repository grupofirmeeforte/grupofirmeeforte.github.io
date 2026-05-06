import { describe, it, expect } from 'vitest';
import { calcularPercPago } from './db';

describe('calcularPercPago', () => {
  it('deve retornar valor numérico entre 0 e 100', async () => {
    const result = await calcularPercPago({
      situacao: 'Ativo',
      juros: '3',
      rbm: '1000',
      valorLiquido: '5000',
      nrOperacao: 'OP001',
    });
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('deve retornar 0 para nrOperacao vazio', async () => {
    const result = await calcularPercPago({
      situacao: 'Ativo',
      juros: '3',
      rbm: '1000',
      valorLiquido: '5000',
      nrOperacao: '',
    });
    expect(result).toBe(0);
  });

  it('deve calcular mesmo com RBM zerado', async () => {
    const result = await calcularPercPago({
      situacao: 'Ativo',
      juros: '3',
      rbm: '0',
      valorLiquido: '5000',
      nrOperacao: 'OP003',
    });
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('deve lidar com valores nulos', async () => {
    const result = await calcularPercPago({
      situacao: 'Ativo',
      juros: '',
      rbm: '',
      valorLiquido: '',
      nrOperacao: 'OP004',
    });
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('deve retornar número para diferentes situações', async () => {
    const situacoes = ['Ativo', 'Ativo01-10', 'CONSIGNADO INSS', 'Inativo'];
    
    for (const situacao of situacoes) {
      const result = await calcularPercPago({
        situacao,
        juros: '2.5',
        rbm: '1000',
        valorLiquido: '5000',
        nrOperacao: `OP_${situacao}`,
      });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    }
  });
});
