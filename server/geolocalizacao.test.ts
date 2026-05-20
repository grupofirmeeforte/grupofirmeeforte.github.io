import { describe, it, expect } from 'vitest';

// Lógica pura de verificação de coordenadas do Brasil (extraída do hook)
function estaNoBrasil(lat: number, lon: number): boolean {
  return lat >= -33.75 && lat <= 5.27 && lon >= -73.99 && lon <= -28.85;
}

describe('Verificação de geolocalização - Brasil', () => {
  it('deve autorizar coordenadas de Brasília-DF', () => {
    expect(estaNoBrasil(-15.7801, -47.9292)).toBe(true);
  });

  it('deve autorizar coordenadas de São Paulo-SP', () => {
    expect(estaNoBrasil(-23.5505, -46.6333)).toBe(true);
  });

  it('deve autorizar coordenadas de Manaus-AM (norte)', () => {
    expect(estaNoBrasil(-3.1190, -60.0217)).toBe(true);
  });

  it('deve autorizar coordenadas de Porto Alegre-RS (sul)', () => {
    expect(estaNoBrasil(-30.0346, -51.2177)).toBe(true);
  });

  it('deve autorizar coordenadas de Recife-PE (leste)', () => {
    expect(estaNoBrasil(-8.0476, -34.8770)).toBe(true);
  });

  it('deve autorizar coordenadas de Rio Branco-AC (oeste)', () => {
    expect(estaNoBrasil(-9.9754, -67.8249)).toBe(true);
  });

  it('deve BLOQUEAR coordenadas de Buenos Aires (Argentina)', () => {
    expect(estaNoBrasil(-34.6037, -58.3816)).toBe(false);
  });

  it('deve BLOQUEAR coordenadas de Lisboa (Portugal)', () => {
    expect(estaNoBrasil(38.7169, -9.1395)).toBe(false);
  });

  it('deve BLOQUEAR coordenadas de Nova York (EUA)', () => {
    expect(estaNoBrasil(40.7128, -74.0060)).toBe(false);
  });

  it('deve BLOQUEAR coordenadas de Bogotá (Colômbia)', () => {
    expect(estaNoBrasil(4.7110, -74.0721)).toBe(false);
  });

  // Nota: bounding box retangular inclui países vizinhos como Paraguai e Uruguai
  // A verificação por bounding box é suficiente para uso interno (Brasil vs exterior)
  it('deve BLOQUEAR coordenadas de Tóquio (Japão)', () => {
    expect(estaNoBrasil(35.6762, 139.6503)).toBe(false);
  });

  it('deve BLOQUEAR coordenadas de Moscou (Rússia)', () => {
    expect(estaNoBrasil(55.7558, 37.6173)).toBe(false);
  });
});
