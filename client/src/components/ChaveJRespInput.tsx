import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

type Sugestao = {
  chaveJ: string | null;
  nomeAgente: string | null;
  favorecido: string | null;
  empresa: string | null;
  cidade: string | null;
  uf: string | null;
};

type Props = {
  value: string;
  onChange: (chaveJ: string, agente?: Sugestao) => void;
  placeholder?: string;
  className?: string;
  label?: string;
};

export function ChaveJRespInput({ value, onChange, placeholder = "Chave J ou nome...", className = "", label }: Props) {
  const [termo, setTermo] = useState(value);
  const [aberto, setAberto] = useState(false);
  const [agenteConfirmado, setAgenteConfirmado] = useState<Sugestao | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: sugestoes = [], isFetching } = trpc.pagamentos.buscarAgenteResp.useQuery(
    { termo },
    { enabled: termo.length >= 2 }
  );

  // Sincronizar valor externo
  useEffect(() => {
    setTermo(value);
  }, [value]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(v: string) {
    setTermo(v);
    setAgenteConfirmado(null);
    onChange(v);
    setAberto(v.length >= 2);
  }

  function selecionar(s: Sugestao) {
    const chave = s.chaveJ ?? "";
    setTermo(chave);
    setAgenteConfirmado(s);
    setAberto(false);
    onChange(chave, s);
  }

  const nomeMostrado = agenteConfirmado
    ? (agenteConfirmado.favorecido || agenteConfirmado.nomeAgente || "")
    : "";

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-xs text-gray-400 mb-1">
          {label}
          {isFetching && <span className="ml-1 text-yellow-400 text-xs">(buscando...)</span>}
          {agenteConfirmado && <span className="ml-1 text-green-400 text-xs">✓ {nomeMostrado}</span>}
        </label>
      )}
      <input
        type="text"
        value={termo}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => termo.length >= 2 && setAberto(true)}
        placeholder={placeholder}
        className={`w-full bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-sm h-8 font-mono focus:outline-none focus:border-blue-500 ${className}`}
      />
      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl max-h-48 overflow-y-auto">
          {sugestoes.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => selecionar(s)}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-blue-300 text-xs font-bold min-w-[70px]">{s.chaveJ}</span>
                <span className="text-white text-xs truncate">{s.favorecido || s.nomeAgente}</span>
                {s.empresa && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-semibold ${
                    s.empresa === "FLEX" ? "bg-blue-900/60 text-blue-300" : "bg-green-900/60 text-green-300"
                  }`}>{s.empresa}</span>
                )}
              </div>
              {(s.cidade || s.uf) && (
                <div className="text-xs text-gray-400 mt-0.5 pl-[78px]">{s.cidade}{s.uf ? `/${s.uf}` : ""}</div>
              )}
            </button>
          ))}
        </div>
      )}
      {aberto && termo.length >= 2 && sugestoes.length === 0 && !isFetching && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl px-3 py-2 text-xs text-gray-400">
          Nenhum agente encontrado para "{termo}"
        </div>
      )}
    </div>
  );
}
