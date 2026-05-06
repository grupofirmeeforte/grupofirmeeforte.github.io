import { describe, it, expect, beforeEach } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';

const mockUser = {
  id: 1,
  openId: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  loginMethod: 'manus' as const,
  role: 'admin' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const createMockContext = (): TrpcContext => ({
  user: mockUser,
  req: {
    protocol: 'https',
    headers: {},
  } as any,
  res: {} as any,
});

describe('Calculo Router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  it('deve listar cálculos (pode estar vazio)', async () => {
    const result = await caller.calculo.listar();
    expect(Array.isArray(result)).toBe(true);
  });

  it('deve criar um novo cálculo', async () => {
    const result = await caller.calculo.criar({
      empresa: 'BMF',
      mesRef: '426',
      chaveJ: 'TEST001',
      nomeAgente: 'Agente Teste',
      cidade: 'São Paulo',
      situacao: 'Ativo',
      percentual: 15.5,
      comissaoTotal: 1000,
      rbmTotal: 155,
      comissaoConsig: 500,
      comissaoConsorcio: 300,
      comissaoOurocap: 100,
      comissaoCc: 100,
      ajudaCusto: 50,
      creditosDebitos: 0,
      adiantamento: 100,
      reajuste: 0,
      comissaoSupervisor: 50,
      rbmCreditoC2: 100,
      rbmContaCorrente: 30,
      rbmConsorcioC2: 15,
      rbmOurocap: 10,
      qtdeContas: 5,
      vrLiquidoC2: 900,
      srccC2: 50,
      vrLiquidoSrcc: 850,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it('deve buscar cálculo por chaveJ e mesRef', async () => {
    // Primeiro criar um cálculo
    const created = await caller.calculo.criar({
      empresa: 'BMF',
      mesRef: '427',
      chaveJ: 'TEST002',
      nomeAgente: 'Agente Teste 2',
      cidade: 'Rio de Janeiro',
      percentual: 12.5,
      comissaoTotal: 800,
      rbmTotal: 100,
      rbmCreditoC2: 50,
      rbmContaCorrente: 30,
      rbmConsorcioC2: 10,
      rbmOurocap: 10,
      qtdeContas: 3,
      vrLiquidoC2: 750,
      srccC2: 30,
      vrLiquidoSrcc: 720,
    });

    // Depois buscar
    const result = await caller.calculo.buscarPorChaveJ({
      chaveJ: 'TEST002',
      mesRef: '427',
    });

    expect(result).toBeDefined();
    if (result) {
      expect(result.chaveJ).toBe('TEST002');
      expect(result.mesRef).toBe('427');
    }
  });

  it('deve retornar null ao buscar cálculo inexistente', async () => {
    const result = await caller.calculo.buscarPorChaveJ({
      chaveJ: 'INEXISTENTE',
      mesRef: '999',
    });

    expect(result).toBeNull();
  });

  it('deve editar um cálculo existente', async () => {
    // Criar um cálculo
    const created = await caller.calculo.criar({
      empresa: 'BMF',
      mesRef: '428',
      chaveJ: 'TEST003',
      nomeAgente: 'Agente Teste 3',
      percentual: 10,
      comissaoTotal: 500,
      rbmTotal: 50,
    });

    expect(created.id).toBeDefined();

    // Editar
    const result = await caller.calculo.editar({
      id: created.id!,
      percentual: 15,
      comissaoTotal: 600,
    });

    expect(result.success).toBe(true);
  });

  it('deve deletar um cálculo', async () => {
    // Criar um cálculo
    const created = await caller.calculo.criar({
      empresa: 'BMF',
      mesRef: '429',
      chaveJ: 'TEST004',
      nomeAgente: 'Agente Teste 4',
    });

    expect(created.id).toBeDefined();

    // Deletar
    const result = await caller.calculo.deletar({
      id: created.id!,
    });

    expect(result.success).toBe(true);
  });
});
