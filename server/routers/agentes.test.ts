import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const mockUser = {
  id: 1,
  openId: "test-user",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "manus",
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const createMockContext = (): TrpcContext => ({
  user: mockUser,
  req: {
    protocol: "https",
    headers: {},
  } as any,
  res: {} as any,
});

describe("agentes router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should list agentes with default parameters", async () => {
    const result = await caller.agentes.list({
      limit: 10,
      offset: 0,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should count agentes", async () => {
    const count = await caller.agentes.count({});

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should get empresas list", async () => {
    const empresas = await caller.agentes.getEmpresas();

    expect(Array.isArray(empresas)).toBe(true);
  });

  it("should get cidades list", async () => {
    const cidades = await caller.agentes.getCidades();

    expect(Array.isArray(cidades)).toBe(true);
  });

  it("should get supervisores list", async () => {
    const supervisores = await caller.agentes.getSupervisores();

    expect(Array.isArray(supervisores)).toBe(true);
  });

  it("should create an agente", async () => {
    const timestamp = Date.now();
    const result = await caller.agentes.create({
      numCadastro: `TEST${timestamp}`,
      empresa: "Test Company",
      chaveJ: `KEY${timestamp}`,
      senha: "pass123",
      nomeAgente: "Test Agent",
      dataAdmissao: new Date().toISOString(),
      cargo: "Agente",
      area: "Vendas",
      vinculo: "CLT",
      situacao: "Ativo",
      nrAgencia: "001",
      cidade: "São Paulo",
      uf: "SP",
      supervisor: "Supervisor Name",
      email: "agent@test.com",
      favorecido: "Favorecido Name",
      banco: "001",
      agencia: "0001",
      conta: "123456",
      tipo: "CC",
      cpfAgente: `${String(timestamp).padEnd(14, '0').slice(0, 14)}`,
      pix: "pix@test.com",
      dataNascimento: new Date("1990-01-01").toISOString(),
      celular: "11999999999",
    });

    expect(result).toHaveProperty("id");
    expect(result.nomeAgente).toBe("Test Agent");
    expect(result.situacao).toBe("Ativo");
  });

  it("should update an agente", async () => {
    const timestamp = Date.now() + 1;
    const created = await caller.agentes.create({
      numCadastro: `TEST${timestamp}`,
      empresa: "Test Company",
      chaveJ: `KEY${timestamp}`,
      senha: "pass123",
      nomeAgente: "Test Agent 2",
      dataAdmissao: new Date().toISOString(),
      cargo: "Agente",
      area: "Vendas",
      vinculo: "CLT",
      situacao: "Ativo",
      nrAgencia: "001",
      cidade: "São Paulo",
      uf: "SP",
      supervisor: "Supervisor Name",
      email: "agent2@test.com",
      favorecido: "Favorecido Name",
      banco: "001",
      agencia: "0001",
      conta: "123456",
      tipo: "CC",
      cpfAgente: "12345678902",
      pix: "pix@test.com",
      dataNascimento: new Date("1990-01-01").toISOString(),
      celular: "11999999999",
    });

    const updated = await caller.agentes.update({
      id: created.id,
      nomeAgente: "Updated Agent Name",
      situacao: "Inativo",
    });

    expect(updated.nomeAgente).toBe("Updated Agent Name");
    expect(updated.situacao).toBe("Inativo");
  });

  it("should delete an agente", async () => {
    const timestamp = Date.now() + 2;
    const created = await caller.agentes.create({
      numCadastro: `TEST${timestamp}`,
      empresa: "Test Company",
      chaveJ: `KEY${timestamp}`,
      senha: "pass123",
      nomeAgente: "Test Agent 3",
      dataAdmissao: new Date().toISOString(),
      cargo: "Agente",
      area: "Vendas",
      vinculo: "CLT",
      situacao: "Ativo",
      nrAgencia: "001",
      cidade: "São Paulo",
      uf: "SP",
      supervisor: "Supervisor Name",
      email: "agent3@test.com",
      favorecido: "Favorecido Name",
      banco: "001",
      agencia: "0001",
      conta: "123456",
      tipo: "CC",
      cpfAgente: "12345678903",
      pix: "pix@test.com",
      dataNascimento: new Date("1990-01-01").toISOString(),
      celular: "11999999999",
    });

    const result = await caller.agentes.delete({ id: created.id });

    expect(result.success).toBe(true);
  });

  it("should search agentes by name", async () => {
    const timestamp = Date.now() + 3;
    const created = await caller.agentes.create({
      numCadastro: `TEST${timestamp}`,
      empresa: "Test Company",
      chaveJ: `KEY${timestamp}`,
      senha: "pass123",
      nomeAgente: "Unique Agent Name",
      dataAdmissao: new Date().toISOString(),
      cargo: "Agente",
      area: "Vendas",
      vinculo: "CLT",
      situacao: "Ativo",
      nrAgencia: "001",
      cidade: "São Paulo",
      uf: "SP",
      supervisor: "Supervisor Name",
      email: "agent4@test.com",
      favorecido: "Favorecido Name",
      banco: "001",
      agencia: "0001",
      conta: "123456",
      tipo: "CC",
      cpfAgente: "12345678904",
      pix: "pix@test.com",
      dataNascimento: new Date("1990-01-01").toISOString(),
      celular: "11999999999",
    });

    const results = await caller.agentes.list({
      search: "Unique Agent",
      limit: 10,
      offset: 0,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((a) => a.id === created.id)).toBe(true);
  });
});
