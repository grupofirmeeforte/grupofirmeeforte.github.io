import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";

// Função para formatar número como moeda brasileira
const formatarMoeda = (valor: any) => {
  if (!valor && valor !== 0) return "-";
  const num = parseFloat(valor);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export default function Relatorios() {
  const [, navigate] = useLocation();

  // Calcular mês anterior dinamicamente
  const getMesAnterior = () => {
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = String(hoje.getFullYear()).slice(-2);
    
    if (mes === 1) {
      const anoAnterior = String(parseInt(ano) - 1).padStart(2, "0");
      return `12${anoAnterior}`;
    }
    
    const mesAnterior = mes - 1;
    return `${mesAnterior}${ano}`;
  };

  const [filtros, setFiltros] = useState({
    chaveJ: "",
    mesAno: getMesAnterior(),
    nomeAgente: "",
  });

  // Query para buscar todos os registros de Consignado com filtros
  // Atualiza automaticamente a cada 10 segundos para refletir mudanças em Consignado
  const { data: registros = [], isLoading } = trpc.consignado.buscarComFiltros.useQuery(
    {
      chaveJ: filtros.chaveJ || undefined,
      mes: filtros.mesAno || undefined,
      nomeAgente: filtros.nomeAgente || undefined,
    },
    { enabled: true, refetchInterval: 10000, refetchOnWindowFocus: true }
  );

  // Agrupar por Chave J
  const registrosAgrupados = useMemo(() => {
    const grupos: { [key: string]: any } = {};
    
    registros.forEach((reg: any) => {
      if (!grupos[reg.chaveJ]) {
        grupos[reg.chaveJ] = {
          chaveJ: reg.chaveJ,
          empresa: reg.empresa,
          mesAno: reg.mesAno,
          nomeAgente: reg.nomeAgente,
          cidade: reg.cidade,
          vrLiquidoSoma: 0,
          srccSoma: 0,
          vrLiquidoSrccSoma: 0,
          qtdeOperacoes: 0,
        };
      }
      
      const vl = parseFloat(reg.valorLiquido) || 0;
      const restricao = (reg.restricaoSRCC || '').toLowerCase().trim();
      const temRestricao = restricao === 'sim' || restricao === 's';
      
      grupos[reg.chaveJ].vrLiquidoSoma += vl;
      // SRCC = soma dos Vr. Líquido dos registros com Restrição SRCC = Sim
      if (temRestricao) {
        grupos[reg.chaveJ].srccSoma += vl;
      }
      grupos[reg.chaveJ].qtdeOperacoes += 1;
    });
    
    // Calcular Vr. Líquido - SRCC para cada grupo
    Object.values(grupos).forEach((g: any) => {
      g.vrLiquidoSrccSoma = g.vrLiquidoSoma - g.srccSoma;
    });
    
    return Object.values(grupos);
  }, [registros]);

  // Adicionar mesAno aos registros agrupados
  const registrosComMesAno = useMemo(() => {
    return registrosAgrupados.map(reg => ({
      ...reg,
      mesAno: filtros.mesAno,
    }));
  }, [registrosAgrupados, filtros.mesAno]);

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const handleCancel = () => {
    navigate("/");
  };

  // Campos da tabela em ordem
  const campos = [
    { label: "Empresa", key: "empresa" },
    { label: "Mês Ano", key: "mesAno" },
    { label: "Chave J", key: "chaveJ" },
    { label: "Nome Agente", key: "nomeAgente" },
    { label: "Cidade", key: "cidade" },
    { label: "Vr. Líquido", key: "vrLiquidoSoma" },
    { label: "SRCC", key: "srccSoma" },
    { label: "Vr. Líquido-SRCC", key: "vrLiquidoSrccSoma" },
    { label: "Qtde Operações", key: "qtdeOperacoes" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Cálculo</h1>
              <p className="text-sm text-slate-600">Cálculo de comissões por Chave J</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mês/Ano</label>
              <Input
                type="text"
                placeholder={filtros.mesAno}
                value={filtros.mesAno}
                onChange={(e) => handleFiltroChange("mesAno", e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">Mês anterior: {getMesAnterior()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chave J</label>
              <Input
                type="text"
                placeholder="Ex: J9660864"
                value={filtros.chaveJ}
                onChange={(e) => handleFiltroChange("chaveJ", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Agente</label>
              <Input
                type="text"
                placeholder="Ex: João Silva"
                value={filtros.nomeAgente}
                onChange={(e) => handleFiltroChange("nomeAgente", e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Tabela com registros agrupados */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : registrosComMesAno.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum registro encontrado</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-purple-400 to-pink-400">
                  {campos.map((campo) => (
                    <th key={campo.key} className="px-3 py-2 text-left text-xs font-bold text-white whitespace-nowrap">
                      {campo.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosComMesAno.map((registro: any, index: number) => (
                  <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                    {campos.map((campo) => {
                      // Campos que devem ser formatados como moeda
                      const camposMoeda = ['vrLiquidoSoma', 'srccSoma', 'vrLiquidoSrccSoma'];
                      const valor = registro[campo.key];
                      const exibicao = camposMoeda.includes(campo.key) ? formatarMoeda(valor) : (valor || "-");
                      return (
                        <td key={campo.key} className="px-3 py-2 text-sm whitespace-nowrap">
                          {exibicao}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer com totais */}
        {registrosComMesAno.length > 0 && (
          <div className="mt-4 text-sm text-slate-600">
            Total: {registrosComMesAno.length} Chave(s) J única(s) | {registrosComMesAno.reduce((sum: number, r: any) => sum + r.qtdeOperacoes, 0)} operação(ões) total
          </div>
        )}
      </div>
    </div>
  );
}
