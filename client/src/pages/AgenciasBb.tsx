import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Building2, Hash } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import PageHeader from "@/components/PageHeader";
import { useRegistrarModulo } from '@/hooks/useRegistrarModulo';

export default function AgenciasBb() {
  useRegistrarModulo('Agências BB');
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca, 300);

  const { data: totalData } = trpc.agenciasBb.total.useQuery();
  const { data, isLoading } = trpc.agenciasBb.buscar.useQuery(
    { busca: buscaDebounced, limit: 100 },
    { placeholderData: (prev: any) => prev }
  );

  const agencias = data?.agencias ?? [];
  const total = totalData?.total ?? 0;

  const limpar = useCallback(() => setBusca(""), []);

  const isBuscaNumero = busca.trim().match(/^\d+$/);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader title="Agências BB" />

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-800">{total.toLocaleString("pt-BR")} agências cadastradas</span>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-gray-800" />
            <span className="text-sm text-gray-800">
              Buscar por <strong className="text-white">número do prefixo</strong> ou <strong className="text-white">nome da agência</strong>
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ex: 1234 ou BRASILIA"
                className="pr-10"
                autoFocus
              />
              {busca && (
                <button
                  onClick={limpar}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-800 hover:text-gray-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {busca && (
              <Button variant="outline" size="sm" onClick={limpar}>
                Limpar
              </Button>
            )}
          </div>

          {busca.trim() && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-800">
              {isBuscaNumero ? (
                <>
                  <Hash className="w-3 h-3 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">Buscando por prefixo numérico</span>
                </>
              ) : (
                <>
                  <Search className="w-3 h-3 text-blue-500" />
                  <span className="text-blue-600 font-medium">Buscando por nome da agência</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabela de resultados */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[120px_1fr] bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-800 uppercase tracking-wider border-b border-gray-700">
            <span>Prefixo</span>
            <span>Nome da Agência</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-800">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mr-3" />
              Carregando...
            </div>
          ) : agencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-800">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p>Nenhuma agência encontrada para "{busca}"</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {agencias.map((ag, idx) => (
                <div
                  key={ag.id}
                  className={`grid grid-cols-[120px_1fr] px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                    idx % 2 === 0 ? "bg-gray-900" : "bg-gray-850"
                  }`}
                >
                  <span className="font-mono text-yellow-400 font-semibold">
                    {String(ag.prefixo).padStart(4, "0")}
                  </span>
                  <span className="text-gray-800">{ag.nome}</span>
                </div>
              ))}
            </div>
          )}

          {!isLoading && agencias.length > 0 && (
            <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-800 flex justify-between">
              <span>
                {busca.trim()
                  ? `${agencias.length} resultado${agencias.length !== 1 ? "s" : ""} encontrado${agencias.length !== 1 ? "s" : ""}`
                  : `Exibindo ${agencias.length} de ${total.toLocaleString("pt-BR")} agências`}
              </span>
              {agencias.length >= 100 && busca.trim() && (
                <span className="text-yellow-600 font-medium">Máximo de 100 resultados — refine a busca</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
