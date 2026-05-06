import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

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

export default function Calculo() {
  const [, navigate] = useLocation();

  // Calcular mês anterior dinamicamente
  const getMesAnterior = () => {
    const hoje = new Date();
    const mes = hoje.getMonth() + 1; // 1-12
    const ano = String(hoje.getFullYear()).slice(-2); // 2026 → 26
    
    // Se janeiro (1), volta para dezembro (12) do ano anterior
    if (mes === 1) {
      const anoAnterior = String(parseInt(ano) - 1).padStart(2, "0");
      return `12${anoAnterior}`;
    }
    
    const mesAnterior = mes - 1;
    return `${mesAnterior}${ano}`;
  };

  // Filtros - pré-preencher com mês anterior
  const [filtros, setFiltros] = useState({
    chaveJ: "",
    mesAno: getMesAnterior(),
    nomeAgente: "",
  });

  // Query para buscar todos os registros de Consignado com filtros
  const { data: registros = [], isLoading } = trpc.consignado.buscarComFiltros.useQuery(
    {
      chaveJ: filtros.chaveJ || undefined,
      mes: filtros.mesAno || undefined,
      nomeAgente: filtros.nomeAgente || undefined,
    },
    { enabled: true }
  );

  // Mutations para atualizar Consignado
  const atualizarConsignado = trpc.consignado.atualizar.useMutation();
  const deletarConsignado = trpc.consignado.excluir.useMutation();

  // Agrupar por Chave J e remover duplicatas
  const registrosAgrupados = useMemo(() => {
    const grupos: { [key: string]: any } = {};
    
    registros.forEach((registro: any) => {
      const chaveJ = registro.chaveJ || "SEM_CHAVE";
      
      if (!grupos[chaveJ]) {
        // Primeira ocorrência - salvar como está
        grupos[chaveJ] = {
          ...registro,
          qtdeOperacoes: 1,
          // Agregados
          percentualSoma: parseFloat(registro.percentual) || 0,
          comissaoTotalSoma: parseFloat(registro.comissaoTotal) || 0,
          rbmTotalSoma: parseFloat(registro.rbmTotal) || 0,
          comissaoConsigSoma: parseFloat(registro.comissaoConsig) || 0,
          comissaoConsorcioSoma: parseFloat(registro.comissaoConsorcio) || 0,
          comissaoOurocapSoma: parseFloat(registro.comissaoOurocap) || 0,
          comissaoCcSoma: parseFloat(registro.comissaoCc) || 0,
          comissaoSegurosSoma: parseFloat(registro.comissaoSeguros) || 0,
          ajudaCustoSoma: parseFloat(registro.ajudaCusto) || 0,
          creditosDebitosSoma: parseFloat(registro.creditosDebitos) || 0,
          adiantamentoSoma: parseFloat(registro.adiantamento) || 0,
          reajusteSoma: parseFloat(registro.reajuste) || 0,
          comissaoSupervisorSoma: parseFloat(registro.comissaoSupervisor) || 0,
          rbmCreditoSoma: parseFloat(registro.rbmCredito) || 0,
          rbmCcSoma: parseFloat(registro.rbmCc) || 0,
          rbmConsorcioSoma: parseFloat(registro.rbmConsorcio) || 0,
          rbmOurocapSoma: parseFloat(registro.rbmOurocap) || 0,
          rbmSegurosSoma: parseFloat(registro.rbmSeguros) || 0,
          qtdeContasSoma: parseFloat(registro.qtdeContas) || 0,
          vrLiquidoSoma: parseFloat(registro.valorLiquido) || 0,
          srccSoma: parseFloat(registro.restricaoSRCC) || 0,
          vrLiquidoSrccSoma: 0, // Calcular depois
        };
      } else {
        // Incrementar contador de operações e somar TODOS os campos
        grupos[chaveJ].qtdeOperacoes = (grupos[chaveJ].qtdeOperacoes || 1) + 1;
        grupos[chaveJ].percentualSoma = (grupos[chaveJ].percentualSoma || 0) + (parseFloat(registro.percentual) || 0);
        grupos[chaveJ].comissaoTotalSoma = (grupos[chaveJ].comissaoTotalSoma || 0) + (parseFloat(registro.comissaoTotal) || 0);
        grupos[chaveJ].rbmTotalSoma = (grupos[chaveJ].rbmTotalSoma || 0) + (parseFloat(registro.rbmTotal) || 0);
        grupos[chaveJ].comissaoConsigSoma = (grupos[chaveJ].comissaoConsigSoma || 0) + (parseFloat(registro.comissaoConsig) || 0);
        grupos[chaveJ].comissaoConsorcioSoma = (grupos[chaveJ].comissaoConsorcioSoma || 0) + (parseFloat(registro.comissaoConsorcio) || 0);
        grupos[chaveJ].comissaoOurocapSoma = (grupos[chaveJ].comissaoOurocapSoma || 0) + (parseFloat(registro.comissaoOurocap) || 0);
        grupos[chaveJ].comissaoCcSoma = (grupos[chaveJ].comissaoCcSoma || 0) + (parseFloat(registro.comissaoCc) || 0);
        grupos[chaveJ].comissaoSegurosSoma = (grupos[chaveJ].comissaoSegurosSoma || 0) + (parseFloat(registro.comissaoSeguros) || 0);
        grupos[chaveJ].ajudaCustoSoma = (grupos[chaveJ].ajudaCustoSoma || 0) + (parseFloat(registro.ajudaCusto) || 0);
        grupos[chaveJ].creditosDebitosSoma = (grupos[chaveJ].creditosDebitosSoma || 0) + (parseFloat(registro.creditosDebitos) || 0);
        grupos[chaveJ].adiantamentoSoma = (grupos[chaveJ].adiantamentoSoma || 0) + (parseFloat(registro.adiantamento) || 0);
        grupos[chaveJ].reajusteSoma = (grupos[chaveJ].reajusteSoma || 0) + (parseFloat(registro.reajuste) || 0);
        grupos[chaveJ].comissaoSupervisorSoma = (grupos[chaveJ].comissaoSupervisorSoma || 0) + (parseFloat(registro.comissaoSupervisor) || 0);
        grupos[chaveJ].rbmCreditoSoma = (grupos[chaveJ].rbmCreditoSoma || 0) + (parseFloat(registro.rbmCredito) || 0);
        grupos[chaveJ].rbmCcSoma = (grupos[chaveJ].rbmCcSoma || 0) + (parseFloat(registro.rbmCc) || 0);
        grupos[chaveJ].rbmConsorcioSoma = (grupos[chaveJ].rbmConsorcioSoma || 0) + (parseFloat(registro.rbmConsorcio) || 0);
        grupos[chaveJ].rbmOurocapSoma = (grupos[chaveJ].rbmOurocapSoma || 0) + (parseFloat(registro.rbmOurocap) || 0);
        grupos[chaveJ].rbmSegurosSoma = (grupos[chaveJ].rbmSegurosSoma || 0) + (parseFloat(registro.rbmSeguros) || 0);
        grupos[chaveJ].qtdeContasSoma = (grupos[chaveJ].qtdeContasSoma || 0) + (parseFloat(registro.qtdeContas) || 0);
        grupos[chaveJ].vrLiquidoSoma = (grupos[chaveJ].vrLiquidoSoma || 0) + (parseFloat(registro.valorLiquido) || 0);
        grupos[chaveJ].srccSoma = (grupos[chaveJ].srccSoma || 0) + (parseFloat(registro.restricaoSRCC) || 0);
        grupos[chaveJ].vrLiquidoSrccSoma = (grupos[chaveJ].vrLiquidoSrccSoma || 0) + 0;
      }
    });
    
    return Object.values(grupos);
  }, [registros]);

  // Preencher mesAno automaticamente para todos os registros
  const registrosComMesAno = useMemo(() => {
    return registrosAgrupados.map(reg => ({
      ...reg,
      mesAno: filtros.mesAno || reg.mesAno,
    }));
  }, [registrosAgrupados, filtros.mesAno]);

  const handleFiltroChange = (field: string, value: string) => {
    setFiltros(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleEditar = async (registro: any, novosDados: any) => {
    try {
      // Atualizar TODOS os registros com a mesma Chave J em Consignado
      const registrosPorChave = registros.filter(r => r.chaveJ === registro.chaveJ);
      
      for (const reg of registrosPorChave) {
        await atualizarConsignado.mutateAsync({
          id: reg.id,
          ...novosDados,
        });
      }
      
      alert(`${registrosPorChave.length} registro(s) atualizado(s) em Consignado`);
    } catch (error) {
      alert("Erro ao atualizar registros");
    }
  };

  const handleDeletar = async (registro: any) => {
    try {
      // Deletar TODOS os registros com a mesma Chave J em Consignado
      const registrosPorChave = registros.filter(r => r.chaveJ === registro.chaveJ);
      
      for (const reg of registrosPorChave) {
        await deletarConsignado.mutateAsync({ id: reg.id });
      }
      
      alert(`${registrosPorChave.length} registro(s) deletado(s) de Consignado`);
    } catch (error) {
      alert("Erro ao deletar registros");
    }
  };

  const handleSalvar = () => {
    console.log("Salvando cálculos");
    alert("Cálculos salvos com sucesso");
  };

  // Campos da tabela em ordem
  const campos = [
    { label: "Empresa", key: "empresa" },
    { label: "Mês Ano", key: "mesAno" },
    { label: "Chave J", key: "chaveJ" },
    { label: "Nome Agente", key: "nomeAgente" },
    { label: "Cidade", key: "cidade" },
    { label: "Percentual", key: "percentual" },
    { label: "Comissão Total", key: "comissaoTotal" },
    { label: "RBM Total", key: "rbmTotal" },
    { label: "Comissão Consig", key: "comissaoConsig" },
    { label: "Comissão Consórcio", key: "comissaoConsorcio" },
    { label: "Comissão Ourocap", key: "comissaoOurocap" },
    { label: "Comissão C/C", key: "comissaoCC" },
    { label: "Comissão Seguros", key: "comissaoSeguros" },
    { label: "Ajuda de Custo", key: "ajudaCusto" },
    { label: "Créditos/Débitos", key: "creditosDebitos" },
    { label: "Adiantamento", key: "adiantamento" },
    { label: "Reajuste", key: "reajuste" },
    { label: "Comissão Supervisor", key: "comissaoSupervisor" },
    { label: "RBM Crédito", key: "rbmCredito" },
    { label: "RBM C/C", key: "rbmCC" },
    { label: "RBM Consórcio", key: "rbmConsorcio" },
    { label: "RBM OuroCap", key: "rbmOurocap" },
    { label: "RBM Seguros", key: "rbmSeguros" },
    { label: "Qtde Contas", key: "qtdeContas" },
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
            <button onClick={handleCancel} className="p-2 hover:bg-slate-200 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Cálculo</h1>
              <p className="text-sm text-slate-600">Comissões, Pagamentos e Relatórios</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700">Salvar Cálculo</Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mês/Ano</label>
              <Input
                type="text"
                placeholder={getMesAnterior()}
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

        {/* Tabela com registros agrupados (uma linha por Chave J) */}
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
                  <th className="px-3 py-2 text-left text-xs font-bold text-white whitespace-nowrap">Ações</th>
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
                    
                    <td className="px-3 py-2 text-sm whitespace-nowrap">
                      <button
                        onClick={() => handleDeletar(registro)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
            Total: {registrosComMesAno.length} Chave(s) J única(s) | {registros.length} operação(ões) total
          </div>
        </div>
      </div>
    </div>
  );
}
