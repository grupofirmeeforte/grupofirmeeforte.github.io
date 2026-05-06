import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { relatorioBB } from '../drizzle/schema';

describe('RelatorioBB - Importar', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (db) {
      await db.delete(relatorioBB);
    }
  });

  it('deve importar dados de relatório BB', async () => {
    const dados = [
      {
        bmf: 'BMF',
        mes: 126,
        proposta: '196088597',
        linha: '3100',
        situacao: 'Contratada',
        operador: 'J9663101',
        solicitacao: new Date('2026-01-02'),
        prazo: '1meses',
      },
      {
        bmf: 'BMF',
        mes: 126,
        proposta: '196088674',
        linha: '3100',
        situacao: 'Contratada',
        operador: 'J9663101',
        solicitacao: new Date('2026-01-02'),
        prazo: '1meses',
      },
    ];

    // Inserir dados
    for (const record of dados) {
      await db.insert(relatorioBB).values(record);
    }

    // Verificar se foram inseridos
    const result = await db.select().from(relatorioBB);
    expect(result).toHaveLength(2);
    expect(result[0].proposta).toBe('196088597');
    expect(result[1].proposta).toBe('196088674');
  });

  it('deve listar dados de relatório BB', async () => {
    // Inserir um dado
    await db.insert(relatorioBB).values({
      bmf: 'BMF',
      mes: 126,
      proposta: '196088597',
      linha: '3100',
      situacao: 'Contratada',
      operador: 'J9663101',
      solicitacao: new Date('2026-01-02'),
      prazo: '1meses',
    });

    // Listar
    const result = await db.select().from(relatorioBB);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('proposta');
  });

  it('deve filtrar por situação', async () => {
    // Inserir dados com situações diferentes
    await db.insert(relatorioBB).values({
      bmf: 'BMF',
      mes: 126,
      proposta: '123456789',
      linha: '3100',
      situacao: 'Pendente',
      operador: 'J9663101',
      solicitacao: new Date('2026-01-02'),
      prazo: '1meses',
    });

    // Filtrar
    const result = await db.select().from(relatorioBB).where((r: any) => r.situacao === 'Pendente');
    expect(result.length).toBeGreaterThan(0);
  });
});
