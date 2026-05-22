import { ArrowLeft } from 'lucide-react';

// Logo embutida como base64 para garantir carregamento em todas as páginas
const LOGO_B64 = '/manus-storage/logo-firme-forte-v2_bac9b5e6.png';

interface PageHeaderProps {
  onBack?: () => void;
}

export default function PageHeader({ onBack }: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div
      className="flex flex-col items-center py-6 px-4"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
        borderBottom: '2px solid #d4a017',
        boxShadow: '0 4px 24px 0 rgba(212,160,23,0.18)',
      }}
    >
      {/* Moldura dourada ao redor da logo — clicável para voltar */}
      <button
        onClick={handleBack}
        title="Clique para voltar"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(212,160,23,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
          padding: '10px',
          marginBottom: '12px',
          boxShadow: '0 0 32px 8px rgba(212,160,23,0.22), 0 0 0 2px rgba(212,160,23,0.35)',
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.06)';
          e.currentTarget.style.boxShadow = '0 0 48px 12px rgba(212,160,23,0.38), 0 0 0 2px rgba(212,160,23,0.6)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 0 32px 8px rgba(212,160,23,0.22), 0 0 0 2px rgba(212,160,23,0.35)';
        }}
      >
        <img
          src={LOGO_B64}
          alt="Grupo Firme & Forte — clique para voltar"
          style={{
            height: '90px',
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 12px rgba(212,160,23,0.7))',
            display: 'block',
          }}
        />
      </button>

      {/* Nome do grupo */}
      <div
        style={{
          fontWeight: 800,
          fontSize: '0.85rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#d4a017',
          marginBottom: '14px',
          textShadow: '0 0 10px rgba(212,160,23,0.5)',
        }}
      >
        Grupo Firme &amp; Forte
      </div>

      {/* Botão Voltar */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 px-7 py-2.5 rounded-full font-semibold text-sm transition-all"
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
          color: '#ffffff',
          border: '1.5px solid #3b82f6',
          boxShadow: '0 2px 12px rgba(59,130,246,0.35)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(59,130,246,0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(59,130,246,0.35)';
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
    </div>
  );
}
