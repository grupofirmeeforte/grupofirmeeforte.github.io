import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTodasSessoesAtivas, createSessao, updateSessaoUltimoAcesso, encerrarSessao } from "../db";

describe("Sessões", () => {
  let sessaoId: number;

  it("deve criar uma nova sessão", async () => {
    const result = await createSessao({
      agenteId: 1,
      chaveJ: "TEST001",
      nomeAgente: "Teste Agent",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    expect(result).toBeDefined();
    sessaoId = (result as any).insertId;
    expect(sessaoId).toBeGreaterThan(0);
  });

  it("deve listar todas as sessões ativas", async () => {
    const sessoes = await getTodasSessoesAtivas();
    expect(Array.isArray(sessoes)).toBe(true);
    expect(sessoes.length).toBeGreaterThan(0);
  });

  it("deve atualizar o último acesso de uma sessão", async () => {
    if (!sessaoId) {
      const result = await createSessao({
        agenteId: 1,
        chaveJ: "TEST002",
        nomeAgente: "Teste Agent 2",
      });
      sessaoId = (result as any).insertId;
    }

    const result = await updateSessaoUltimoAcesso(sessaoId, "Agentes");
    expect(result).toBeDefined();
  });

  it("deve encerrar uma sessão", async () => {
    if (!sessaoId) {
      const result = await createSessao({
        agenteId: 1,
        chaveJ: "TEST003",
        nomeAgente: "Teste Agent 3",
      });
      sessaoId = (result as any).insertId;
    }

    const result = await encerrarSessao(sessaoId);
    expect(result).toBeDefined();

    // Verificar que a sessão foi encerrada
    const sessoes = await getTodasSessoesAtivas();
    const sessaoAtiva = sessoes.find((s) => s.id === sessaoId);
    expect(sessaoAtiva).toBeUndefined();
  });
});
