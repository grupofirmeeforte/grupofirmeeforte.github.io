import { MapPin, ShieldX, AlertTriangle, Loader2, RefreshCw, Globe } from 'lucide-react';
import { StatusGeo } from '@/hooks/useGeolocalizacao';

interface Props {
  status: StatusGeo;
  mensagem: string;
  tentarNovamente: () => void;
}

const logoUrl = '/manus-storage/logo-firme-forte-v2_9bc70f75.png';
const bgUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663564665591/SMgJn6AGQCNfDq7mPzPqc9/coban-bg-972o7wqxPoimymB3vuTFrF.webp';

export default function BloqueioGeolocalizacao({ status, mensagem, tentarNovamente }: Props) {
  const isCarregando = status === 'verificando' || status === 'solicitando';

  const icone = () => {
    if (isCarregando) return <Loader2 className="w-16 h-16 text-yellow-400 animate-spin" />;
    if (status === 'negado') return <ShieldX className="w-16 h-16 text-red-400" />;
    if (status === 'fora_brasil') return <Globe className="w-16 h-16 text-red-400" />;
    return <AlertTriangle className="w-16 h-16 text-yellow-400" />;
  };

  const titulo = () => {
    if (isCarregando) return 'Verificando Localização';
    if (status === 'negado') return 'Permissão Negada';
    if (status === 'fora_brasil') return 'Acesso Não Autorizado';
    return 'Erro de Localização';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Card central */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="rounded-2xl p-8 text-center shadow-2xl border border-yellow-500/30"
          style={{
            background: 'rgba(0, 20, 60, 0.92)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoUrl} alt="Grupo Firme & Forte" className="h-20 object-contain" />
          </div>

          {/* Ícone de status */}
          <div className="flex justify-center mb-4">
            {icone()}
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {titulo()}
          </h2>

          {/* Mensagem */}
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            {mensagem}
          </p>

          {/* Indicador de localização necessária */}
          {!isCarregando && (
            <div className="flex items-center justify-center gap-2 text-yellow-400 text-xs mb-6 bg-yellow-400/10 rounded-lg px-4 py-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>
                {status === 'negado'
                  ? 'Autorize a localização no navegador e clique em Tentar Novamente'
                  : 'A geolocalização é obrigatória para acessar o sistema'}
              </span>
            </div>
          )}

          {/* Instruções para desbloquear no navegador */}
          {status === 'negado' && (
            <div className="text-left bg-white/5 rounded-lg p-4 mb-6 text-xs text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300 mb-2">Como autorizar no navegador:</p>
              <p>🔒 <strong>Chrome/Edge:</strong> Clique no ícone de cadeado na barra de endereço → Localização → Permitir</p>
              <p>🦊 <strong>Firefox:</strong> Clique no ícone de localização na barra → Permitir</p>
              <p>📱 <strong>Celular:</strong> Configurações → Privacidade → Localização → Ativar</p>
            </div>
          )}

          {/* Botão Tentar Novamente */}
          {!isCarregando && (
            <button
              onClick={tentarNovamente}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #c8960c, #f0c040)',
                color: '#001a4d',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          )}

          {/* Rodapé */}
          <p className="mt-6 text-xs text-gray-600">
            Sistema de Gestão — Grupo Firme & Forte · Coban / Banco do Brasil
          </p>
        </div>
      </div>
    </div>
  );
}
