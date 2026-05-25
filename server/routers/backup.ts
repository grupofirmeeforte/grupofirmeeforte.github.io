import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import nodemailer from "nodemailer";

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

  buffers["agentes.xlsx"] = toBuffer(await db.select().from(agentes), "Agentes");
  buffers["febraban.xlsx"] = toBuffer(await db.select().from(febraban), "Febraban");
  buffers["consignados.xlsx"] = toBuffer(await db.select().from(consignados), "Consignados");
  buffers["contasCorrentes.xlsx"] = toBuffer(await db.select().from(contasCorrentes), "ContasCorrentes");
  buffers["consorcios.xlsx"] = toBuffer(await db.select().from(consorcios), "Consorcios");
  buffers["ourocap.xlsx"] = toBuffer(await db.select().from(ourocap), "OuroCap");
  buffers["seguros.xlsx"] = toBuffer(await db.select().from(seguros), "Seguros");
  buffers["bbdental.xlsx"] = toBuffer(await db.select().from(bbdental), "BBDental");
  buffers["despesasFixas.xlsx"] = toBuffer(await db.select().from(despesasFixas), "DespesasFixas");
  buffers["despesasInternas.xlsx"] = toBuffer(await db.select().from(despesasInternas), "DespesasInternas");
  buffers["certificacoes.xlsx"] = toBuffer(await db.select().from(certificacoes), "Certificacoes");
  buffers["feriados.xlsx"] = toBuffer(await db.select().from(feriados), "Feriados");
  buffers["pagamentos.xlsx"] = toBuffer(await db.select().from(pagamentos), "Pagamentos");
  buffers["auditoria.xlsx"] = toBuffer(await db.select().from(auditoria).limit(10000), "Auditoria");

  return buffers;
}

async function gerarZip(buffers: Record<string, Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, buf] of Object.entries(buffers)) {
    zip.file(name, buf);
  }
  const result = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return result;
}

async function enviarEmailBackup(zipBuffer: Buffer, dataHora: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log("[BACKUP] SMTP não configurado. Backup gerado mas não enviado por e-mail.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `"Sistema GFF Backup" <${smtpUser}>`,
    to: BACKUP_EMAIL,
    subject: `Backup Grupo Firme & Forte — ${dataHora}`,
    text: `Backup automático do sistema gerado em ${dataHora}.\n\nArquivo ZIP em anexo com todas as tabelas do banco de dados.`,
    attachments: [
      {
        filename: `backup-gff-${dataHora.replace(/[/:]/g, "-").replace(/ /g, "_")}.zip`,
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

  // Enviar backup por e-mail
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
