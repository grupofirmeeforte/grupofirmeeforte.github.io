import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import archiver from "archiver";
import nodemailer from "nodemailer";
import { PassThrough } from "stream";

const BACKUP_EMAIL = "ultramare@gmail.com";

// Chaves autorizadas para backup (admin, CEO, Sidnei, Thiago)
function isAuthorized(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const cargo = (user.cargo ?? "").toUpperCase();
  if (["CEO", "ADM", "ADMIN"].includes(cargo)) return true;
  if ((user.permissoes ?? "") === "admin") return true;
  const CHAVES_CEO = ["J1234568", "J1234569", "J9624265", "JG701582", "JBMF1234"];
  if (CHAVES_CEO.includes(user.chaveJ ?? "")) return true;
  return false;
}

async function gerarBuffersExcel(db: any): Promise<Record<string, Buffer>> {
  const buffers: Record<string, Buffer> = {};

  // Helper para converter rows em buffer Excel
  function toBuffer(rows: any[], sheetName: string): Buffer {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  const {
    agentes, febraban, consignados, contasCorrentes, consorcios,
    ourocap, seguros, bbdental, despesasFixas, despesasInternas,
    certificacoes, feriados, pagamentos, auditoria,
  } = await import("../../drizzle/schema");

  // Agentes
  const rowsAgentes = await db.select().from(agentes);
  buffers["agentes.xlsx"] = toBuffer(rowsAgentes, "Agentes");

  // Febraban
  const rowsFebraban = await db.select().from(febraban);
  buffers["febraban.xlsx"] = toBuffer(rowsFebraban, "Febraban");

  // Consignados
  const rowsConsignados = await db.select().from(consignados);
  buffers["consignados.xlsx"] = toBuffer(rowsConsignados, "Consignados");

  // Contas Correntes
  const rowsCC = await db.select().from(contasCorrentes);
  buffers["contasCorrentes.xlsx"] = toBuffer(rowsCC, "ContasCorrentes");

  // Consórcios
  const rowsConsorcios = await db.select().from(consorcios);
  buffers["consorcios.xlsx"] = toBuffer(rowsConsorcios, "Consorcios");

  // OuroCap
  const rowsOurocap = await db.select().from(ourocap);
  buffers["ourocap.xlsx"] = toBuffer(rowsOurocap, "OuroCap");

  // Seguros
  const rowsSeguros = await db.select().from(seguros);
  buffers["seguros.xlsx"] = toBuffer(rowsSeguros, "Seguros");

  // BB Dental
  const rowsBBDental = await db.select().from(bbdental);
  buffers["bbdental.xlsx"] = toBuffer(rowsBBDental, "BBDental");

  // Despesas Fixas
  const rowsDespFixas = await db.select().from(despesasFixas);
  buffers["despesasFixas.xlsx"] = toBuffer(rowsDespFixas, "DespesasFixas");

  // Despesas Internas
  const rowsDespInternas = await db.select().from(despesasInternas);
  buffers["despesasInternas.xlsx"] = toBuffer(rowsDespInternas, "DespesasInternas");

  // Certificações
  const rowsCertif = await db.select().from(certificacoes);
  buffers["certificacoes.xlsx"] = toBuffer(rowsCertif, "Certificacoes");

  // Feriados
  const rowsFeriados = await db.select().from(feriados);
  buffers["feriados.xlsx"] = toBuffer(rowsFeriados, "Feriados");

  // Pagamentos
  const rowsPagamentos = await db.select().from(pagamentos);
  buffers["pagamentos.xlsx"] = toBuffer(rowsPagamentos, "Pagamentos");

  // Auditoria (últimos 10.000 registros)
  const rowsAuditoria = await db.select().from(auditoria).limit(10000);
  buffers["auditoria.xlsx"] = toBuffer(rowsAuditoria, "Auditoria");

  return buffers;
}

async function gerarZip(buffers: Record<string, Buffer>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const passThrough = new PassThrough();
    passThrough.on("data", (chunk) => chunks.push(chunk));
    passThrough.on("end", () => resolve(Buffer.concat(chunks)));
    passThrough.on("error", reject);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(passThrough);

    for (const [name, buf] of Object.entries(buffers)) {
      archive.append(buf, { name });
    }
    archive.finalize();
  });
}

async function enviarEmailBackup(zipBuffer: Buffer, dataHora: string): Promise<void> {
  // Usa SMTP do Gmail via variável de ambiente ou fallback para ethereal
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  let transporter: any;
  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtpUser, pass: smtpPass },
    });
  } else {
    // Sem SMTP configurado: apenas loga
    console.log("[BACKUP] SMTP não configurado. Backup gerado mas não enviado por e-mail.");
    return;
  }

  await transporter.sendMail({
    from: `"Sistema GFF Backup" <${smtpUser}>`,
    to: BACKUP_EMAIL,
    subject: `Backup Grupo Firme & Forte — ${dataHora}`,
    text: `Backup automático do sistema gerado em ${dataHora}.\n\nArquivo ZIP em anexo com todas as tabelas do banco de dados.`,
    attachments: [
      {
        filename: `backup-gff-${dataHora.replace(/[/:]/g, "-")}.zip`,
        content: zipBuffer,
        contentType: "application/zip",
      },
    ],
  });
}

// Função exportada para uso no cron (sem autenticação — chamada internamente)
export async function executarBackupAutomatico(): Promise<{ tabelas: number; tamanhoKB: number; emailEnviado: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const buffers = await gerarBuffersExcel(db);
  const zipBuffer = await gerarZip(buffers);
  const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  await enviarEmailBackup(zipBuffer, dataHora);
  return {
    tabelas: Object.keys(buffers).length,
    tamanhoKB: Math.round(zipBuffer.length / 1024),
    emailEnviado: true,
  };
}

export const backupRouter = router({
  // Gerar backup manual — retorna base64 do ZIP para download no browser
  gerar: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!isAuthorized(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const buffers = await gerarBuffersExcel(db);
      const zipBuffer = await gerarZip(buffers);
      const base64 = zipBuffer.toString("base64");
      const tabelas = Object.keys(buffers).length;
      const tamanhoKB = Math.round(zipBuffer.length / 1024);

      return { base64, tabelas, tamanhoKB };
    }),

  // Enviar backup por e-mail (manual ou automático)
  enviarEmail: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!isAuthorized(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const buffers = await gerarBuffersExcel(db);
      const zipBuffer = await gerarZip(buffers);
      const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

      await enviarEmailBackup(zipBuffer, dataHora);

      return { ok: true, email: BACKUP_EMAIL, dataHora };
    }),
});
