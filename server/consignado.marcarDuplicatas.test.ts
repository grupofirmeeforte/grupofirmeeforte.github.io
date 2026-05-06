import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { consignados } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

describe('marcarDuplicatas', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('DB indisponível');
  });

  it('deve marcar registros com nrOperacao duplicado', async () => {
    // Limpar dados de teste
    await db.delete(consignados).where(eq(consignados.empresa, 'TEST_DUPLICATAS'));

    // Inserir registros de teste com valores mínimos
    const testData = [
      {
        empresa: 'TEST_DUPLICATAS',
        mes: '2026-05',
        nrOperacao: 'DUP001',
        nomeAgente: 'Agente 1',
      },
      {
        empresa: 'TEST_DUPLICATAS',
        mes: '2026-05',
        nrOperacao: 'DUP001', // Duplicado
        nomeAgente: 'Agente 2',
      },
      {
        empresa: 'TEST_DUPLICATAS',
        mes: '2026-05',
        nrOperacao: 'UNICO001',
        nomeAgente: 'Agente 3',
      },
    ];

    for (const data of testData) {
      await db.insert(consignados).values(data);
    }

    // Executar lógica de marcar duplicatas
    // 1. Limpar isDuplicate anterior
    await db.update(consignados).set({ isDuplicate: false });

    // 2. Buscar todos os registros com nrOperacao duplicado
    const result = await db.execute(sql`
      SELECT nrOperacao, COUNT(*) as cnt
      FROM consignados
      WHERE nrOperacao IS NOT NULL AND nrOperacao != ''
      GROUP BY nrOperacao
      HAVING cnt > 1
    `);
    
    // Extrair dados do resultado
    const duplicatas = Array.isArray(result[0]) ? result[0] : [];
    console.log('Duplicatas processadas:', duplicatas);

    // 3. Marcar como duplicado
    for (const row of duplicatas) {
      const nrOp = (row as any).nrOperacao;
      console.log('Marcando como duplicado:', nrOp);
      await db.update(consignados)
        .set({ isDuplicate: true })
        .where(eq(consignados.nrOperacao, nrOp));
    }

    // Verificar resultados
    const registros = await db.select().from(consignados).where(eq(consignados.empresa, 'TEST_DUPLICATAS'));
    console.log('Registros após marcar duplicatas:', registros);
    console.log('Duplicatas encontradas:', duplicatas);

    const duplicados = registros.filter((r: any) => r.isDuplicate);
    const unicos = registros.filter((r: any) => !r.isDuplicate);

    console.log('Duplicados:', duplicados.length, 'Únicos:', unicos.length);
    expect(duplicados.length).toBe(2); // DUP001 aparece 2 vezes
    expect(unicos.length).toBe(1); // UNICO001 aparece 1 vez
    expect(duplicados.every((r: any) => r.nrOperacao === 'DUP001')).toBe(true);
    expect(unicos[0].nrOperacao).toBe('UNICO001');

    // Limpar dados de teste
    await db.delete(consignados).where(eq(consignados.empresa, 'TEST_DUPLICATAS'));
  });

  it('deve lidar com nrOperacao vazio', async () => {
    // Limpar dados de teste
    await db.delete(consignados).where(eq(consignados.empresa, 'TEST_EMPTY'));

    // Inserir registros com nrOperacao vazio
    const testData = [
      {
        empresa: 'TEST_EMPTY',
        mes: '2026-05',
        nrOperacao: '',
        nomeAgente: 'Agente 1',
      },
      {
        empresa: 'TEST_EMPTY',
        mes: '2026-05',
        nrOperacao: '',
        nomeAgente: 'Agente 2',
      },
    ];

    for (const data of testData) {
      await db.insert(consignados).values(data);
    }

    // Executar lógica de marcar duplicatas
    // 1. Limpar isDuplicate anterior
    await db.update(consignados).set({ isDuplicate: false });

    // 2. Buscar todos os registros com nrOperacao duplicado
    const result = await db.execute(sql`
      SELECT nrOperacao, COUNT(*) as cnt
      FROM consignados
      WHERE nrOperacao IS NOT NULL AND nrOperacao != ''
      GROUP BY nrOperacao
      HAVING cnt > 1
    `);
    
    // Extrair dados do resultado
    const duplicatas = Array.isArray(result[0]) ? result[0] : [];
    console.log('Duplicatas processadas:', duplicatas);

    // 3. Marcar como duplicado
    for (const row of duplicatas) {
      const nrOp = (row as any).nrOperacao;
      console.log('Marcando como duplicado:', nrOp);
      await db.update(consignados)
        .set({ isDuplicate: true })
        .where(eq(consignados.nrOperacao, nrOp));
    }

    // Verificar que registros com nrOperacao vazio NÃO foram marcados
    const registros = await db.select().from(consignados).where(eq(consignados.empresa, 'TEST_EMPTY'));
    const duplicados = registros.filter((r: any) => r.isDuplicate);

    expect(duplicados.length).toBe(0); // Nenhum deve ser marcado

    // Limpar dados de teste
    await db.delete(consignados).where(eq(consignados.empresa, 'TEST_EMPTY'));
  });
});
