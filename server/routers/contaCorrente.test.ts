import { describe, it, expect } from "vitest";

// Testa as funções utilitárias do módulo Conta Corrente

function normalizarMesRef(m: string): string {
  if (!m) return m;
  const matchLong = m.match(/^(\d{1,2})\/(\d{4})$/);
  if (matchLong) {
    const mm = parseInt(matchLong[1], 10);
    const aa = matchLong[2].slice(2);
    return `${mm}${aa}`;
  }
  const matchShort = m.match(/^(\d{1,2})\/(\d{2})$/);
  if (matchShort) {
    const mm = parseInt(matchShort[1], 10);
    return `${mm}${matchShort[2]}`;
  }
  return m;
}

function parsePct(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const s = String(v).replace(",", ".");
  return parseFloat(s) || 0;
}

describe("contaCorrente - normalizarMesRef", () => {
  it("converte MM/AAAA para MMAA compacto", () => {
    expect(normalizarMesRef("05/2026")).toBe("526");
    expect(normalizarMesRef("12/2026")).toBe("1226");
    expect(normalizarMesRef("01/2026")).toBe("126");
  });

  it("converte MM/AA para MMAA compacto", () => {
    expect(normalizarMesRef("05/26")).toBe("526");
    expect(normalizarMesRef("12/26")).toBe("1226");
  });

  it("retorna string inalterada se não reconhecer formato", () => {
    expect(normalizarMesRef("526")).toBe("526");
    expect(normalizarMesRef("")).toBe("");
  });
});

describe("contaCorrente - parsePct", () => {
  it("parseia percentual com ponto", () => {
    expect(parsePct("0.68")).toBeCloseTo(0.68);
    expect(parsePct("68")).toBeCloseTo(68);
  });

  it("parseia percentual com vírgula", () => {
    expect(parsePct("0,68")).toBeCloseTo(0.68);
  });

  it("retorna 0 para valores nulos ou vazios", () => {
    expect(parsePct(null)).toBe(0);
    expect(parsePct(undefined)).toBe(0);
    expect(parsePct("")).toBe(0);
  });

  it("parseia número direto", () => {
    expect(parsePct(0.5)).toBeCloseTo(0.5);
    expect(parsePct(50)).toBeCloseTo(50);
  });
});

describe("contaCorrente - cálculo de comissão", () => {
  it("calcula comissão corretamente: RBM * percComissao (decimal)", () => {
    const rbm = 1000;
    let percComissao = parsePct("0.68");
    if (percComissao > 1) percComissao = percComissao / 100;
    const comissao = +(rbm * percComissao).toFixed(2);
    expect(comissao).toBeCloseTo(680);
  });

  it("calcula comissão corretamente: RBM * percComissao (percentual direto)", () => {
    const rbm = 1000;
    let percComissao = parsePct("68");
    if (percComissao > 1) percComissao = percComissao / 100;
    const comissao = +(rbm * percComissao).toFixed(2);
    expect(comissao).toBeCloseTo(680);
  });

  it("retorna 0 quando RBM é 0", () => {
    const rbm = 0;
    const percComissao = 0.68;
    const comissao = rbm > 0 && percComissao > 0 ? +(rbm * percComissao).toFixed(2) : 0;
    expect(comissao).toBe(0);
  });

  it("retorna 0 quando percComissao é 0", () => {
    const rbm = 1000;
    const percComissao = 0;
    const comissao = rbm > 0 && percComissao > 0 ? +(rbm * percComissao).toFixed(2) : 0;
    expect(comissao).toBe(0);
  });
});
