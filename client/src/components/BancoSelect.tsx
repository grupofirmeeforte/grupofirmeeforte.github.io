import { useState, useRef, useEffect } from "react";

const BANCOS = [
  "001-B Brasil","003-Amazônia","004-BNB","007-BNDES","010-Credicoamo",
  "012-Inbursa","014-Natixis","017-BRB","018-Tricury","021-Banestes",
  "024-Bandepe","025-Alfa","029-Itaú BBA","033-Santander","036-Bradesco BBI",
  "037-Pará","040-Cargill","041-Banrisul","047-Sergipe","060-Confidence",
  "062-Hipercard","063-Ibibank","064-Goldman Sachs","065-Andbank","066-Morgan Stanley",
  "069-Crefisa","070-BRB","074-J. Safra","075-ABN AMRO","076-KDB",
  "077-Intermedium","078-Haitong","079-Original Agronegócio","080-B&T","081-BBN",
  "082-Topázio","083-Cresol","084-Uniprime","085-Cecred","089-CCR Reg Mogiana",
  "091-Unicred","092-BRK","093-Polocred","094-Finaxis","095-Travelex",
  "096-B3","097-Credisis","098-Credialiança","099-Uniprime Norte do Paraná",
  "100-Planner","101-Renascença","102-XP","104-Caixa","105-Lecca",
  "107-BBM","108-PortoCred","111-Oliveira Trust","113-Magliano","114-Central Cooperativas ES",
  "117-Advanced","119-Western Union","120-Rodobens","121-Agiplan","122-Berj",
  "124-Woori","125-Plural","126-BR Partners","127-Codepe","128-MS Bank",
  "129-UBS","130-Caruana","131-Tullett Prebon","132-ICBC","133-Cresol Central",
  "134-BGC Liquidez","136-Unicred","137-Multimoney","138-GB Assessores","139-Intesa Sanpaolo",
  "140-Easynvest","142-Broker Brasil","143-Treviso","144-Bexs","145-Levycam",
  "146-Guitta","149-Facta","157-ICAP","159-Casa Credito","163-Commerzbank",
  "173-BRL Trust","174-Pernambucanas","177-Guide","180-CM Capital","182-Dacasa",
  "183-Socred","184-Itaú BBA","188-Ativa","189-HS Financeira","190-Servicoop",
  "191-Nova Futura","194-Parmetal","196-Fair","197-Stone","208-BTG Pactual",
  "212-Banco Original","213-Arbi","217-John Deere","218-BS2","222-Credit Agricole",
  "224-Fibra","233-Cifra","237-Bradesco","241-Classico","243-Máxima",
  "246-ABC Brasil","249-Investcred Unibanco","250-BCV","253-Bexs Corretora","254-Paraná",
  "259-Moneycorp","260-Nu Pagamentos","265-Fator","266-Cédula","268-Barigui",
  "269-HSBC","270-Sagitur","271-IB","272-AGK","273-CCR Abcd",
  "274-Money Plus","276-Senff","278-Genial","279-CCR Primavera","280-Avista",
  "281-CCR Coopavel","283-RB Capital","285-Frente","286-CCR Sulcredi","288-Will",
  "289-EFX","290-Pagseguro","292-BS2 Distribuidora","293-Lastro","296-Fomento Paraná",
  "298-Vips","299-Sorocred","300-Banco La Nacion Argentina","301-BPP","306-Portopar",
  "307-Terra","309-Cambionet","310-VORTX","315-PI","318-Banco BMG",
  "320-China Union Pay","321-Crefaz","322-CCR Ouro","323-Mercado Pago","324-Lavra",
  "325-Órama","326-Parana","328-Cecap","329-QI Tech","330-Banco Bari",
  "331-Fram Capital","332-Acesso","335-Banco Digio","336-C6 Bank","340-Super Pagamentos",
  "341-Itaú","342-Creditas","343-FFA","348-XP","349-AL5",
  "350-Crehnor Laranjeiras","352-Toro","354-Necton","355-Ótimo","358-Midway",
  "359-Zema","360-Trinus","362-Cielo","363-Singulare","364-Gerencianet",
  "365-Simpaul","366-Banco Societe Generale","368-Banco CSF","370-Banco Mizuho","371-Warren",
  "373-UP.P","374-Realize","376-BB Americas","377-BMS","378-BBC Digital",
  "379-Cecap","380-PicPay","381-Banco Mercedes-Benz","382-Fiducia","383-Ebanx",
  "384-Global SCM","385-Abanca","386-Nu Financeira","387-Banco Toyota","389-Mercantil",
  "390-GM","391-CCR Zé Pereira","393-Banco Volkswagen","394-Banco Bradesco Financiamentos","395-F D'Gold",
  "396-Hub Pagamentos","397-Letsbank","398-Ideal","399-Kirton","400-Coop Central Ailos",
  "401-Iugu","402-Cobuccio","403-Cora","404-Sumup","406-Accredito",
  "408-Bonuspago","410-Planner Corretora","411-Via Certa","412-Social Bank","413-BV",
  "414-Work","416-Lamara","418-Zipdin","419-Numbrs","421-Celcoin",
  "422-Safra","423-Coluna","425-Socinal","426-Biorc","427-Cresol",
  "428-Credsystem","429-Crediare","430-RJI","433-Br4","435-Delcred",
  "438-Planner Sociedade de Crédito","439-ID","440-Credibelo","441-Magnetis","443-Credihome",
  "444-Trinus Capital","445-Plantae","447-Mirae Asset","448-Hemera","449-Dmcard",
  "450-Fitbank","452-Credifit","453-Mérito","454-Mérito Distribuidora","455-Fênix",
  "456-Mérito Corretora","457-UY3","458-Hedge","459-CCR Seara","460-F&M",
  "461-Asaas","462-Stark","463-Azumi","464-Parati","465-Capital Consig",
  "467-Master S/A","468-Portoseg","469-Leve","470-CDC","471-Cecm Cooperforte",
  "473-Tribanco","475-Banco Yamaha Motor","477-Citibank","478-Gazincred","479-RP",
  "480-Vortx","481-Superlógica","482-SBCASH","484-Mestre","487-Deutsche",
  "488-JPMorgan","492-ING","494-Banco Rep Oriental Uruguay","495-La Provincia Buenos Aires","505-Credit Suisse",
  "506-Senso","507-Intercam","508-Avenue","509-Celcoin","510-Ffcred",
  "511-Magnum","512-Mapfre","513-Ativos S.A","514-Frente CF","516-Qista",
  "518-Mercado Crédito","519-Ewally","520-Somapay","521-Cartos","522-Red",
  "523-HR Digital","524-Woop","527-Aticca","528-Reag","529-Pinbank",
  "530-Ser Educacional","531-BMP","532-Eagle","533-SRM","534-Ewally",
  "535-Opea","536-Neon","537-Microcash","538-Sudacred","539-Santinvest",
  "540-Neon Financeira","541-Fundo de Pensão Sicoob","542-Cloud Walk","543-Vortx","544-Multicred",
  "545-Senso","546-U4C","547-BRL Trust","548-RPW","549-Intra",
  "550-Beeteller","552-Num","556-Agi","600-Luso Brasileiro","604-Industrial",
  "610-VR","611-Paulista","612-Guanabara","613-Omni","623-Pan",
  "626-C6 Consignado","630-Intercap","633-Rendimento","634-Triângulo","637-Sofisa",
  "643-Pine","652-Itaú Unibanco","653-Indusval","654-A.J. Renner","655-Votorantim",
  "707-Daycoval","712-Ourinvest","719-Banif","720-Credcrea","724-Porto Seguro",
  "735-Neon","739-Cetelem","741-Ribeirão Preto","743-Semear","745-Citibank",
  "746-Modal","747-Rabobank","748-Sicredi","751-Scotiabank","752-BNP Paribas",
  "753-NBC","754-Novo","755-Bank of America","756-Sicoob","757-KEB Hana",
  "Sá Teles","PIX","Outros",
];

interface BancoSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function BancoSelect({ value, onChange, className = "" }: BancoSelectProps) {
  const [search, setSearch] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar quando o valor externo muda (ex: ao abrir modal de edição)
  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filtered = search.length === 0
    ? BANCOS
    : BANCOS.filter(b => b.toLowerCase().includes(search.toLowerCase()));

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (banco: string) => {
    onChange(banco);
    setSearch(banco);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true); return; }
    if (e.key === "ArrowDown") { setHighlighted(h => Math.min(h + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setHighlighted(h => Math.max(h - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter") { if (filtered[highlighted]) select(filtered[highlighted]); e.preventDefault(); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={search}
        placeholder="Digite para buscar banco..."
        onFocus={() => { setOpen(true); setHighlighted(0); }}
        onChange={e => { setSearch(e.target.value); setOpen(true); setHighlighted(0); onChange(e.target.value); }}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder-gray-500"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-0.5 bg-[#1a1a2e] border border-gray-600 rounded shadow-xl max-h-48 overflow-y-auto text-xs">
          {filtered.map((b, i) => (
            <li
              key={b}
              onMouseDown={() => select(b)}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-2 py-1.5 cursor-pointer ${i === highlighted ? "bg-purple-700 text-white" : "text-gray-200 hover:bg-gray-700"}`}
            >
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
