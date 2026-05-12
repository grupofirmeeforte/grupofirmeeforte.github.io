import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileText, CreditCard, Users, Star, Shield, Smile } from 'lucide-react';

// ─── TIPOS DE SUBABAS ────────────────────────────────────────────────────────
type Aba = 'consignado' | 'cc' | 'consorcio' | 'ourocap' | 'seguros' | 'bbdental';

const ABAS: { id: Aba; label: string; icon: React.ElementType; cor: string }[] = [
  { id: 'consignado', label: 'Extrato Consignado',  icon: FileText,   cor: 'bg-blue-600'   },
  { id: 'cc',         label: 'Extrato C/C',          icon: CreditCard, cor: 'bg-green-600'  },
  { id: 'consorcio',  label: 'Extrato Consórcio',    icon: Users,      cor: 'bg-purple-600' },
  { id: 'ourocap',    label: 'Extrato Ourocap',       icon: Star,       cor: 'bg-yellow-600' },
  { id: 'seguros',    label: 'Extrato Seguros',       icon: Shield,     cor: 'bg-red-600'    },
  { id: 'bbdental',   label: 'Extrato BB Dental',     icon: Smile,      cor: 'bg-teal-600'   },
];

// ─── COMPONENTE PLACEHOLDER POR ABA ─────────────────────────────────────────
function ConteudoAba({ aba }: { aba: Aba }) {
  const info = ABAS.find(a => a.id === aba)!;
  const Icon = info.icon;
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
        <div className={`w-16 h-16 rounded-2xl ${info.cor} flex items-center justify-center`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700">{info.label}</h2>
        <p className="text-gray-400 text-sm">Módulo em desenvolvimento. Em breve disponível.</p>
      </CardContent>
    </Card>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ExtratosPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const abaParam = params.get('aba') as Aba | null;
  const abaInicial: Aba = ABAS.find(a => a.id === abaParam) ? abaParam! : 'consignado';
  const [aba, setAba] = useState<Aba>(abaInicial);

  const abaAtual = ABAS.find(a => a.id === aba)!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extratos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Extratos bancários e financeiros</p>
        </div>
        <Button variant="default" className="bg-gray-900 hover:bg-gray-800" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Navegação por abas */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          {ABAS.map(a => {
            const Icon = a.icon;
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  ativa
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da aba selecionada */}
      <div className="p-6">
        <ConteudoAba aba={aba} />
      </div>
    </div>
  );
}
