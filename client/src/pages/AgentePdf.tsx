import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

function formatDate(val: string | null | undefined): string {
  if (!val) return "-";
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return val;
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="text-sm text-gray-900 border-b border-gray-200 pb-1 mt-0.5">{value || "-"}</div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider border-b-2 border-blue-200 pb-1 mb-3">{titulo}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {children}
      </div>
    </div>
  );
}

export default function AgentePdf() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const agenteId = parseInt(params.id);

  const { data: agente, isLoading } = trpc.agentes.getById.useQuery({ id: agenteId });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>;
  }

  if (!agente) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Agente não encontrado.</div>;
  }

  const ag = agente as any;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Barra de ações (não aparece na impressão) */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate("/agentes")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button size="sm" onClick={() => window.print()} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Printer className="w-4 h-4 mr-1" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Conteúdo do PDF */}
      <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none my-6 print:my-0 p-8 print:p-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6 border-b-2 border-blue-800 pb-4">
          <div>
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Grupo Firme &amp; Forte — Ficha Cadastral</div>
            <h1 className="text-2xl font-bold text-gray-900">{ag.nomeAgente}</h1>
            <div className="text-sm text-gray-500 mt-1">
              {ag.chaveJ && <span className="mr-3">ChaveJ: <strong>{ag.chaveJ}</strong></span>}
              {ag.numCadastro && <span>Cadastro: <strong>{ag.numCadastro}</strong></span>}
            </div>
          </div>
          <div className="text-right text-xs text-gray-900">
            <div>Emitido em: {new Date().toLocaleDateString('pt-BR')}</div>
            {ag.situacao && (
              <div className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                ag.situacao === 'Ativo' ? 'bg-green-100 text-green-800' :
                ag.situacao === 'Inativo' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-800'
              }`}>{ag.situacao}</div>
            )}
          </div>
        </div>

        {/* Dados Funcionais */}
        <Secao titulo="Dados Funcionais">
          <Campo label="Empresa" value={ag.empresa} />
          <Campo label="Cargo" value={ag.cargo} />
          <Campo label="Área" value={ag.area} />
          <Campo label="Vínculo" value={ag.vinculo} />
          <Campo label="Agência" value={ag.nrAgencia} />
          <Campo label="Supervisor" value={ag.supervisor} />
          <Campo label="Data de Admissão" value={formatDate(ag.dataAdmissao)} />
          <Campo label="Nível" value={ag.nivel} />
        </Secao>

        {/* Dados Pessoais */}
        <Secao titulo="Dados Pessoais">
          <Campo label="CPF" value={ag.cpfAgente} />
          <Campo label="Data de Nascimento" value={formatDate(ag.dataNascimento)} />
          <Campo label="Signo" value={ag.signo} />
          <Campo label="Celular" value={ag.celular} />
          <Campo label="Email" value={ag.email} />
          <Campo label="PIX" value={ag.pix} />
        </Secao>

        {/* Endereço */}
        <Secao titulo="Endereço">
          <Campo label="CEP" value={ag.cep} />
          <Campo label="Endereço" value={ag.endereco} />
          <Campo label="Número" value={ag.numero} />
          <Campo label="Complemento" value={ag.complemento} />
          <Campo label="Bairro" value={ag.bairro} />
          <Campo label="Cidade / UF" value={ag.cidade ? `${ag.cidade}${ag.uf ? `/${ag.uf}` : ''}` : ag.uf} />
        </Secao>

        {/* Dados Bancários */}
        <Secao titulo="Dados Bancários">
          <Campo label="Banco" value={ag.banco} />
          <Campo label="Agência" value={ag.agencia} />
          <Campo label="Conta" value={ag.conta} />
          <Campo label="Tipo de Conta" value={ag.tipo} />
          <Campo label="Favorecido" value={ag.favProprio ? ag.nomeAgente + " (próprio)" : ag.favorecido} />
        </Secao>

        {/* Rodapé */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-900 text-center">
          Documento gerado pelo Sistema de Gestão — Grupo Firme &amp; Forte · {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          @page { margin: 1cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
