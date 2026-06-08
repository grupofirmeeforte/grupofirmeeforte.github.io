import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { usePermissao } from "@/hooks/usePermissao";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

const moeda = (v: number) =>
  v === 0 ? <span className="text-gray-300">R$ -</span> :
  <span>R$ {v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;

const qtdCell = (v: number) =>
  v === 0 ? <span className="text-gray-300">-</span> : <span>{v}</span>;

type TipoOP = "NOVO" | "REFIN" | "CANC";

const TIPO_STYLE: Record<TipoOP, string> = {
  NOVO:  "bg-blue-50 text-blue-800",
  REFIN: "bg-orange-50 text-orange-800",
  CANC:  "bg-red-50 text-red-700",
};

const TIPO_LABEL: Record<TipoOP, string> = {
  NOVO:  "NOVO",
  REFIN: "REFIN",
  CANC:  "CANC",
};

// Anos disponíveis (2026 em diante)
const ANOS = [2026, 2027, 2028, 2029, 2030];

export default function RelatorioChaveJ() {
  useRegistrarModulo('Relatório ChaveJ');
  const [ano, setAno] = useState<number>(2026);
  const [empresa, setEmpresa] = useState<string>("");
  const { cargo } = usePermissao();
  const isPromotor = cargo === 'Promotor';

  const { data, isLoading } = trpc.febraban.relatorioChaveJ.useQuery(
    { ano, empresa: empresa || undefined },
    { staleTime: 60_000 }
  );

  const { data: filtros } = trpc.febraban.filtros.useQuery();

  const rows = data?.rows ?? [];

  // Agrupar por chaveJ para mesclar células
  const grupos = useMemo(() => {
    const map: Record<string, typeof rows> = {};
    for (const r of rows) {
      if (!map[r.chaveJ]) map[r.chaveJ] = [];
      map[r.chaveJ].push(r);
    }
    return map;
  }, [rows]);

  // Totais gerais
  const totais = useMemo(() => {
    const t = { tri1v:0,tri2v:0,tri3v:0,tri4v:0,sem1v:0,sem2v:0,anov:0,tri1q:0,tri2q:0,tri3q:0,tri4q:0,sem1q:0,sem2q:0,anoq:0 };
    for (const r of rows) {
      if (r.tipo === "CANC") continue; // totais só de NOVO+REFIN
      t.tri1v+=r.tri1v; t.tri2v+=r.tri2v; t.tri3v+=r.tri3v; t.tri4v+=r.tri4v;
      t.sem1v+=r.sem1v; t.sem2v+=r.sem2v; t.anov+=r.anov;
      t.tri1q+=r.tri1q; t.tri2q+=r.tri2q; t.tri3q+=r.tri3q; t.tri4q+=r.tri4q;
      t.sem1q+=r.sem1q; t.sem2q+=r.sem2q; t.anoq+=r.anoq;
    }
    return t;
  }, [rows]);

  // Exportar Excel
  const handleExport = () => {
    if (rows.length === 0) { toast.warning("Nenhum dado para exportar."); return; }
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      "CHAVE J": r.chaveJ,
      "TIPO OP": r.tipo,
      "1º TRIMESTRE VALOR": r.tri1v,
      "2º TRIMESTRE VALOR": r.tri2v,
      "3º TRIMESTRE VALOR": r.tri3v,
      "4º TRIMESTRE VALOR": r.tri4v,
      "1º SEMESTRE VALOR": r.sem1v,
      "2º SEMESTRE VALOR": r.sem2v,
      [`ANO ${ano} VALOR`]: r.anov,
      "1º TRIMESTRE OP": r.tri1q,
      "2º TRIMESTRE OP": r.tri2q,
      "3º TRIMESTRE OP": r.tri3q,
      "4º TRIMESTRE OP": r.tri4q,
      "1º SEMESTRE OP": r.sem1q,
      "2º SEMESTRE OP": r.sem2q,
      [`ANO ${ano} OP`]: r.anoq,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Relatório ChaveJ ${ano}`);
    XLSX.writeFile(wb, `relatorio_chavej_${ano}.xlsx`);
    toast.success("Exportado com sucesso!");
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatório por Chave J</h1>
          <p className="text-gray-500 text-sm">
            Produção por trimestre, semestre e ano — {rows.length} registros
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Filtro Empresa */}
          <Select value={empresa || "todas"} onValueChange={v => setEmpresa(v === "todas" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {filtros?.empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Filtro Ano */}
          <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
            <SelectTrigger className="h-8 text-sm w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          {!isPromotor && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 border-green-500 text-green-600 hover:bg-green-50 h-8">
              <Download className="w-3.5 h-3.5" /> Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[1200px]">
          {/* Cabeçalho em 2 níveis */}
          <thead>
            <tr className="bg-[#1a2744] text-white text-center text-[11px] uppercase tracking-wide">
              <th rowSpan={2} className="px-3 py-2.5 text-left border-r border-blue-900 min-w-[110px]">Chave J</th>
              <th rowSpan={2} className="px-2 py-2.5 border-r border-blue-900 min-w-[60px]">Tipo OP</th>
              {/* Trimestre Valores */}
              <th colSpan={4} className="px-2 py-1.5 border-r border-blue-900 bg-[#1e3a6e]">Trimestre Valores</th>
              {/* Semestre Valores */}
              <th colSpan={2} className="px-2 py-1.5 border-r border-blue-900 bg-[#1a4a5e]">Semestre Valores</th>
              {/* Ano Valores */}
              <th colSpan={1} className="px-2 py-1.5 border-r border-blue-900 bg-[#1a5e3a]">Ano Valores</th>
              {/* Trimestre OP */}
              <th colSpan={4} className="px-2 py-1.5 border-r border-blue-900 bg-[#3e2a6e]">Trimestre OP</th>
              {/* Semestre OP */}
              <th colSpan={2} className="px-2 py-1.5 border-r border-blue-900 bg-[#4a3a1a]">Semestre OP</th>
              {/* Ano OP */}
              <th colSpan={1} className="px-2 py-1.5 bg-[#3a1a1a]">Ano OP</th>
            </tr>
            <tr className="bg-[#243050] text-white text-center text-[10px]">
              {/* Trimestre Valores */}
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[100px]">1º Trim</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[100px]">2º Trim</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[100px]">3º Trim</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[100px]">4º Trim</th>
              {/* Semestre Valores */}
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[110px]">1º Sem</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[110px]">2º Sem</th>
              {/* Ano Valores */}
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[110px] font-bold">{ano}</th>
              {/* Trimestre OP */}
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[50px]">1º Trim</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[50px]">2º Trim</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[50px]">3º Trim</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[50px]">4º Trim</th>
              {/* Semestre OP */}
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[50px]">1º Sem</th>
              <th className="px-2 py-1.5 border-r border-blue-900 min-w-[50px]">2º Sem</th>
              {/* Ano OP */}
              <th className="px-2 py-1.5 min-w-[50px] font-bold">{ano}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr><td colSpan={16} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={16} className="text-center py-12 text-gray-400">Nenhum dado encontrado para {ano}.</td></tr>
            ) : (
              Object.entries(grupos).map(([chaveJ, tipoRows], gi) => {
                const bgBase = gi % 2 === 0 ? "bg-white" : "bg-blue-50/30";
                return tipoRows.map((r, ti) => {
                  const tipo = r.tipo as TipoOP;
                  const isFirst = ti === 0;
                  return (
                    <tr
                      key={`${chaveJ}-${tipo}`}
                      className={`border-b border-gray-100 hover:bg-yellow-50/30 transition-colors ${bgBase}`}
                    >
                      {/* Chave J — apenas na primeira linha do grupo */}
                      {isFirst ? (
                        <td
                          rowSpan={tipoRows.length}
                          className="px-3 py-1.5 border-r border-gray-200 font-mono font-bold text-blue-700 text-[12px] align-middle"
                        >
                          {chaveJ}
                        </td>
                      ) : null}

                      {/* Tipo OP */}
                      <td className="px-2 py-1 border-r border-gray-200 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TIPO_STYLE[tipo]}`}>
                          {TIPO_LABEL[tipo]}
                        </span>
                      </td>

                      {/* Trimestre Valores */}
                      <td className="px-2 py-1 border-r border-gray-100 text-right text-gray-700">{moeda(r.tri1v)}</td>
                      <td className="px-2 py-1 border-r border-gray-100 text-right text-gray-700">{moeda(r.tri2v)}</td>
                      <td className="px-2 py-1 border-r border-gray-100 text-right text-gray-700">{moeda(r.tri3v)}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-right text-gray-700">{moeda(r.tri4v)}</td>

                      {/* Semestre Valores */}
                      <td className="px-2 py-1 border-r border-gray-100 text-right font-medium text-gray-800">{moeda(r.sem1v)}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-right font-medium text-gray-800">{moeda(r.sem2v)}</td>

                      {/* Ano Valores */}
                      <td className="px-2 py-1 border-r border-gray-200 text-right font-bold text-blue-800">{moeda(r.anov)}</td>

                      {/* Trimestre OP */}
                      <td className="px-2 py-1 border-r border-gray-100 text-center text-gray-600">{qtdCell(r.tri1q)}</td>
                      <td className="px-2 py-1 border-r border-gray-100 text-center text-gray-600">{qtdCell(r.tri2q)}</td>
                      <td className="px-2 py-1 border-r border-gray-100 text-center text-gray-600">{qtdCell(r.tri3q)}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-center text-gray-600">{qtdCell(r.tri4q)}</td>

                      {/* Semestre OP */}
                      <td className="px-2 py-1 border-r border-gray-100 text-center font-medium text-gray-700">{qtdCell(r.sem1q)}</td>
                      <td className="px-2 py-1 border-r border-gray-200 text-center font-medium text-gray-700">{qtdCell(r.sem2q)}</td>

                      {/* Ano OP */}
                      <td className="px-2 py-1 text-center font-bold text-blue-800">{qtdCell(r.anoq)}</td>
                    </tr>
                  );
                });
              })
            )}

            {/* Linha de totais */}
            {rows.length > 0 && (
              <tr className="bg-[#1a2744] text-white font-bold text-[11px] border-t-2 border-blue-900">
                <td className="px-3 py-2 border-r border-blue-800" colSpan={2}>TOTAL GERAL (NOVO + REFIN)</td>
                <td className="px-2 py-2 border-r border-blue-800 text-right">R$ {totais.tri1v.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-right">R$ {totais.tri2v.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-right">R$ {totais.tri3v.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-right">R$ {totais.tri4v.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-right">R$ {totais.sem1v.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-right">R$ {totais.sem2v.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-right text-yellow-300">R$ {totais.anov.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-center">{totais.tri1q}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-center">{totais.tri2q}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-center">{totais.tri3q}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-center">{totais.tri4q}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-center">{totais.sem1q}</td>
                <td className="px-2 py-2 border-r border-blue-800 text-center">{totais.sem2q}</td>
                <td className="px-2 py-2 text-center text-yellow-300">{totais.anoq}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
