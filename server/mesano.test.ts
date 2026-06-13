import { describe, it, expect } from 'vitest';
import { mesanoToStr } from './routers/febraban';

describe('mesanoToStr - Conversão de formato AAAAMM', () => {
  it('deve converter 202605 para 05/2026', () => {
    expect(mesanoToStr(202605)).toBe('05/2026');
  });

  it('deve converter 202601 para 01/2026', () => {
    expect(mesanoToStr(202601)).toBe('01/2026');
  });

  it('deve converter 202612 para 12/2026', () => {
    expect(mesanoToStr(202612)).toBe('12/2026');
  });

  it('deve converter 202512 para 12/2025', () => {
    expect(mesanoToStr(202512)).toBe('12/2025');
  });

  it('deve converter 202501 para 01/2025', () => {
    expect(mesanoToStr(202501)).toBe('01/2025');
  });

  it('não deve retornar 2026/2006 (bug anterior)', () => {
    // O bug anterior convertia 202605 para 26/2005 ou 2026/2006
    expect(mesanoToStr(202605)).not.toBe('26/2005');
    expect(mesanoToStr(202605)).not.toBe('2026/2006');
    expect(mesanoToStr(202605)).toBe('05/2026');
  });

  it('deve lidar com números com menos de 6 dígitos (padding)', () => {
    // Quando recebe 2605 (sem o primeiro 20), deve fazer padding
    expect(mesanoToStr(2605)).toBe('05/0026');
  });
});

describe('getMes - Extração de mês de mesano', () => {
  // Não podemos testar getMes diretamente pois é uma função local
  // Mas podemos testar através de mesanoToStr que usa a mesma lógica
  it('mesanoToStr extrai corretamente o mês de 202605', () => {
    const resultado = mesanoToStr(202605);
    const mes = resultado.split('/')[0];
    expect(mes).toBe('05');
  });

  it('mesanoToStr extrai corretamente o mês de 202612', () => {
    const resultado = mesanoToStr(202612);
    const mes = resultado.split('/')[0];
    expect(mes).toBe('12');
  });

  it('mesanoToStr extrai corretamente o mês de 202601', () => {
    const resultado = mesanoToStr(202601);
    const mes = resultado.split('/')[0];
    expect(mes).toBe('01');
  });
});
