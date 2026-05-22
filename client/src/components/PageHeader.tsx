import { ArrowLeft } from 'lucide-react';

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
    <div className="flex flex-col items-center pt-6 pb-2 px-4">
      {/* Logo centralizada */}
      <img
        src="/manus-storage/logo-firme-forte-v2_9bc70f75.png"
        alt="Grupo Firme & Forte"
        className="h-16 w-auto object-contain drop-shadow-lg mb-4"
      />
      {/* Botão Voltar */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 px-6 py-2 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
          color: '#ffffff',
          border: '1px solid #3b82f6',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)')}
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
    </div>
  );
}
