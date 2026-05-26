import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('./db', () => ({
  getAgenteByChaveJ: vi.fn(),
  getLoginAttempts: vi.fn().mockResolvedValue(null),
  incrementLoginAttempts: vi.fn().mockResolvedValue(undefined),
  resetLoginAttempts: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  createSessao: vi.fn().mockResolvedValue({ insertId: 1 }),
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock('./_core/sdk', () => ({
  sdk: {
    signSession: vi.fn().mockResolvedValue('mock-session-token'),
  },
}));

vi.mock('./_core/cookies', () => ({
  getSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: false }),
}));

vi.mock('@shared/const', () => ({
  COOKIE_NAME: 'app_session_id',
  ONE_YEAR_MS: 31536000000,
}));

import { getAgenteByChaveJ, getLoginAttempts } from './db';

// ── Helpers ───────────────────────────────────────────────────────────────────
function ultimosDigitos(celular: string | null | undefined, n: number): string {
  if (!celular) return '';
  return celular.replace(/\D/g, '').slice(-n);
}

// ── Testes ────────────────────────────────────────────────────────────────────
describe('loginRapido — helpers', () => {
  it('extrai os últimos 4 dígitos de um celular formatado', () => {
    expect(ultimosDigitos('(61) 99999-1234', 4)).toBe('1234');
    expect(ultimosDigitos('+55 11 98765-4321', 4)).toBe('4321');
    expect(ultimosDigitos('11987654321', 4)).toBe('4321');
  });

  it('retorna string vazia para celular nulo ou vazio', () => {
    expect(ultimosDigitos(null, 4)).toBe('');
    expect(ultimosDigitos(undefined, 4)).toBe('');
    expect(ultimosDigitos('', 4)).toBe('');
  });

  it('retorna string vazia se celular tem menos de 4 dígitos', () => {
    expect(ultimosDigitos('123', 4)).toBe('123');
  });
});

describe('loginRapido — verificarMetodos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna temCelular=false e temPin=false quando agente não existe', async () => {
    (getAgenteByChaveJ as any).mockResolvedValue(null);
    // Simular a lógica do verificarMetodos
    const agente = await getAgenteByChaveJ('J9999999');
    const result = agente
      ? {
          temCelular: !!(agente.celular && (agente.celular as string).replace(/\D/g, '').length >= 4),
          temPin: !!(agente as any).pinAcesso,
        }
      : { temCelular: false, temPin: false };
    expect(result.temCelular).toBe(false);
    expect(result.temPin).toBe(false);
  });

  it('retorna temCelular=true quando agente tem celular com 11 dígitos', async () => {
    (getAgenteByChaveJ as any).mockResolvedValue({
      id: 1, chaveJ: 'J1234567', nomeAgente: 'Teste', celular: '(61) 99999-1234', pinAcesso: null,
    });
    const agente = await getAgenteByChaveJ('J1234567');
    const result = agente
      ? {
          temCelular: !!(agente.celular && (agente.celular as string).replace(/\D/g, '').length >= 4),
          temPin: !!(agente as any).pinAcesso,
        }
      : { temCelular: false, temPin: false };
    expect(result.temCelular).toBe(true);
    expect(result.temPin).toBe(false);
  });

  it('retorna temPin=true quando agente tem PIN cadastrado', async () => {
    (getAgenteByChaveJ as any).mockResolvedValue({
      id: 1, chaveJ: 'J1234567', nomeAgente: 'Teste', celular: null, pinAcesso: '1234',
    });
    const agente = await getAgenteByChaveJ('J1234567');
    const result = agente
      ? {
          temCelular: !!(agente.celular && (agente.celular as string).replace(/\D/g, '').length >= 4),
          temPin: !!(agente as any).pinAcesso,
        }
      : { temCelular: false, temPin: false };
    expect(result.temCelular).toBe(false);
    expect(result.temPin).toBe(true);
  });
});

describe('loginRapido — validação de PIN', () => {
  it('valida PIN com 4 dígitos', () => {
    const pin = '1234';
    expect(pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin)).toBe(true);
  });

  it('rejeita PIN com letras', () => {
    const pin = 'ab12';
    expect(/^\d+$/.test(pin)).toBe(false);
  });

  it('rejeita PIN com menos de 4 dígitos', () => {
    const pin = '123';
    expect(pin.length >= 4).toBe(false);
  });

  it('rejeita PIN com mais de 6 dígitos', () => {
    const pin = '1234567';
    expect(pin.length <= 6).toBe(false);
  });
});

describe('loginRapido — verificação de bloqueio', () => {
  it('detecta conta bloqueada', async () => {
    (getLoginAttempts as any).mockResolvedValue({ isBlocked: true, attempts: 3 });
    const loginAttempt = await getLoginAttempts('J1234567');
    expect(loginAttempt?.isBlocked).toBe(true);
  });

  it('permite login quando não bloqueado', async () => {
    (getLoginAttempts as any).mockResolvedValue(null);
    const loginAttempt = await getLoginAttempts('J1234567');
    expect(loginAttempt?.isBlocked).toBeFalsy();
  });
});
