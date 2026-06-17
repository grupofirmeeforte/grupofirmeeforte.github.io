import { describe, it, expect } from 'vitest';
import { formatMesAno, mesAnoToNum } from './mesano';

describe('formatMesAno', () => {
  it('deve converter formato AAAAMM (6 dígitos)', () => {
    expect(formatMesAno(202605)).toBe('05/2026');
    expect(formatMesAno(202601)).toBe('01/2026');
    expect(formatMesAno(202612)).toBe('12/2026');
    expect(formatMesAno('202605')).toBe('05/2026');
  });

  it('deve converter formato MMA (3 dígitos)', () => {
    expect(formatMesAno(526)).toBe('05/2026');
    expect(formatMesAno(126)).toBe('01/2026');
    expect(formatMesAno(1226)).toBe('12/2026');
  });

  it('deve converter formato MMAA (4 dígitos)', () => {
    expect(formatMesAno(1025)).toBe('10/2025');
    expect(formatMesAno(525)).toBe('05/2025');
  });

  it('deve aceitar formato já formatado MM/AAAA', () => {
    expect(formatMesAno('05/2026')).toBe('05/2026');
    expect(formatMesAno('12/2025')).toBe('12/2025');
  });

  it('deve retornar "-" para valores inválidos', () => {
    expect(formatMesAno(null)).toBe('-');
    expect(formatMesAno(undefined)).toBe('-');
    expect(formatMesAno('')).toBe('-');
    expect(formatMesAno('NULL')).toBe('-');
    expect(formatMesAno(0)).toBe('-');
    expect(formatMesAno(-1)).toBe('-');
  });

  it('não deve confundir 202605 com 2026/05', () => {
    // O bug anterior convertia 202605 para 26/2005 (mês 26, ano 2005)
    // Agora deve converter para 05/2026
    expect(formatMesAno(202605)).not.toBe('26/2005');
    expect(formatMesAno(202605)).toBe('05/2026');
  });
});

describe('mesAnoToNum', () => {
  it('deve converter MM/AAAA para AAAAMM', () => {
    expect(mesAnoToNum('05/2026')).toBe(202605);
    expect(mesAnoToNum('01/2026')).toBe(202601);
    expect(mesAnoToNum('12/2025')).toBe(202512);
  });

  it('deve retornar undefined para valores inválidos', () => {
    expect(mesAnoToNum(null)).toBeUndefined();
    expect(mesAnoToNum(undefined)).toBeUndefined();
    expect(mesAnoToNum('')).toBeUndefined();
  });

  it('deve fazer round-trip com formatMesAno', () => {
    const original = '05/2026';
    const num = mesAnoToNum(original);
    const formatted = formatMesAno(num);
    expect(formatted).toBe(original);
  });
});
