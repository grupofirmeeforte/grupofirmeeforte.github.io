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

function dataExtenso(date: Date): string {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
}

function Linha({ label, value, sublinhado = true }: { label?: string; value?: string | null; sublinhado?: boolean }) {
  return (
    <span className={sublinhado ? "border-b border-gray-800 inline-block min-w-[120px]" : ""}>
      {value || (label ? `[${label}]` : "___________________")}
    </span>
  );
}

function ContratoBMF({ ag }: { ag: any }) {
  const hoje = new Date();
  const enderecoCompleto = [ag.endereco, ag.numero, ag.complemento, ag.bairro].filter(Boolean).join(", ");

  return (
    <div className="contrato-texto text-sm text-gray-900 leading-relaxed">
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <h1 className="text-base font-bold uppercase tracking-wide">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PARA PROMOÇÃO VENDAS DE AGENTE DE NEGOCIOS</h1>
      </div>

      {/* Tabela de identificação */}
      <table className="w-full border border-gray-400 mb-6 text-xs">
        <tbody>
          <tr className="bg-gray-100">
            <td colSpan={4} className="border border-gray-400 px-2 py-1 font-bold text-center">I - CONTRATANTE</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">Nome</td>
            <td colSpan={3} className="border border-gray-400 px-2 py-1">Brasil Mais Forte Ltda</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">CNPJ</td>
            <td colSpan={3} className="border border-gray-400 px-2 py-1">24.541.627/0001-18</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">ENDEREÇO</td>
            <td className="border border-gray-400 px-2 py-1">Rua 24 de Outubro 283, Centro</td>
            <td className="border border-gray-400 px-2 py-1 font-semibold">CEP</td>
            <td className="border border-gray-400 px-2 py-1">47.800-041</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">CIDADE</td>
            <td colSpan={3} className="border border-gray-400 px-2 py-1">BARREIRAS — BA</td>
          </tr>

          <tr className="bg-gray-100">
            <td colSpan={4} className="border border-gray-400 px-2 py-1 font-bold text-center">II - CONTRATADA</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">Nome</td>
            <td colSpan={3} className="border border-gray-400 px-2 py-1 font-semibold">{ag.nomeAgente || "___________________________________"}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">CPF/CNPJ</td>
            <td colSpan={3} className="border border-gray-400 px-2 py-1">{ag.cpfAgente || "___________________________________"}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">ENDEREÇO</td>
            <td className="border border-gray-400 px-2 py-1">{enderecoCompleto || "___________________________________"}</td>
            <td className="border border-gray-400 px-2 py-1 font-semibold">CEP</td>
            <td className="border border-gray-400 px-2 py-1">{ag.cep || "___________"}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">CIDADE</td>
            <td className="border border-gray-400 px-2 py-1">{ag.cidade || "___________________"}</td>
            <td className="border border-gray-400 px-2 py-1 font-semibold">ESTADO</td>
            <td className="border border-gray-400 px-2 py-1">{ag.uf || "___"}</td>
          </tr>

          <tr className="bg-gray-100">
            <td colSpan={4} className="border border-gray-400 px-2 py-1 font-bold text-center">III - DADOS BANCÁRIOS</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">BANCO</td>
            <td className="border border-gray-400 px-2 py-1">{ag.banco || "___________________"}</td>
            <td className="border border-gray-400 px-2 py-1 font-semibold">AGÊNCIA</td>
            <td className="border border-gray-400 px-2 py-1">{ag.agencia || "___________"}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1 font-semibold">CONTA</td>
            <td className="border border-gray-400 px-2 py-1">{ag.conta || "___________________"}</td>
            <td className="border border-gray-400 px-2 py-1 font-semibold">TITULAR</td>
            <td className="border border-gray-400 px-2 py-1">{ag.favProprio ? ag.nomeAgente : (ag.favorecido || ag.nomeAgente)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-4 text-justify">As partes acima identificadas têm, entre si, justas e acertadas o presente Contrato de Prestação de Serviços de promoção de vendas que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.</p>

      {/* Cláusulas */}
      <div className="space-y-3 text-justify">
        <div><strong>I - DO OBJETO</strong></div>
        <p><strong>Cláusula 1ª.</strong> O presente tem como objetivo, a prestação de serviços de Promoção de vendas, sem vínculo empregatício, especificamente, para oferecimento e negociação sobre a produção contratual de serviços voltados à captação de créditos consignados, através de Bancos Credenciados pela CONTRATANTE, perante os convênios por ela autorizados. Sendo que, em sua vigência, o Contratado deve manter seu registro regularizado perante seu órgão de classe e cumprir as formalidades legais de sua profissão, se o exercício da função assim exigir, sob pena de ser considerado extinto o presente contrato.</p>

        <div><strong>II - DAS OBRIGAÇÕES DA CONTRATADA</strong></div>
        <p><strong>Cláusula 2ª.</strong> A CONTRATADA se compromete a prestar à CONTRATANTE ou a empresa por esta indicada os seguintes serviços:</p>
        <p>a) Cumprir o estipulado nos termos do presente instrumento contratual;</p>
        <p>b) Seguir às instruções da Contratante, sobre os termos dos serviços a serem prestados aos clientes;</p>
        <p>c) Prestar informações à Contratante, sempre que está lhe solicitar, informando sobre a execução de seus serviços e demais detalhes sobre a execução de suas atividades;</p>
        <p>d) Não revelar detalhes de suas atividades a terceiros, bem como informações sobre seus clientes;</p>
        <p>e) Sem a presença de subordinação jurídica, atender às demandas do serviço no tocante a prazos, realização de visitas, entre outras exigências do Contratante, conforme §4º, art. 452-B, CLT;</p>
        <p>f) Prospectar e encaminhar clientela para a modalidade de empréstimo, consórcio e ou abertura de contas oferecida pela CONTRATANTE;</p>
        <p>g) Encaminhar pedidos de consórcios, abertura de contas, financiamentos e empréstimos, acompanhados de fichas cadastrais, contratos e documentos pessoais dos tomadores de créditos;</p>
        <p>h) Atender diretamente os clientes, mantendo-os informados sobre todas as condições da operação;</p>
        <p>i) Manter a CONTRATANTE devidamente informada sobre qualquer alteração cadastral dos clientes que tiverem seu crédito concedido;</p>
        <p>j) Adotar todas as providências necessárias para o perfeito fluxo de documentos e informações entre os clientes e a CONTRATANTE;</p>
        <p>k) Materializar os empréstimos em contratos padronizados da CONTRATANTE, bem como conferir a veracidade dos documentos apresentados pelo tomador;</p>
        <p>l) Organizar e guardar os contratos pertinentes aos empréstimos concedidos, acompanhados dos documentos correspondentes a cada cliente, e encaminhá-los à CONTRATANTE no mínimo de dias, subsequente à sua assinatura.</p>
        <p><em>Parágrafo Único.</em> A CONTRATADA assume as consequências civis e criminais de eventual infidelidade no cumprimento de suas obrigações.</p>

        <div><strong>III - DAS OBRIGAÇÕES DA CONTRATANTE</strong></div>
        <p><strong>Cláusula 3ª.</strong> Informar a CONTRATADA, para seu controle interno, sobre a data e forma de liberação do crédito ao cliente.</p>

        <div><strong>IV - DOS PAGAMENTOS DOS EMPRÉSTIMOS PELOS TOMADORES</strong></div>
        <p><strong>Cláusula 4ª.</strong> Os empréstimos contratados serão pagos pelos tomadores sempre diretamente em benefício da CONTRATANTE ou à empresa por ela indicada, não havendo qualquer participação da CONTRATADA para o seu recebimento.</p>

        <div><strong>V - DA REMUNERAÇÃO</strong></div>
        <p><strong>Cláusula 5ª.</strong> O pagamento da comissão da CONTRATADA será feito conforme sua produção, demonstrada através de relatório, mediante negociação da comissão vigente no ato da digitalização do contrato e produto / serviço a ser comissionado.</p>
        <p><strong>Cláusula 6ª.</strong> A CONTRATADA fica ciente, neste ato, de que o pagamento da comissão só será efetuado em conta bancária, junto ao Banco do Brasil, vinculada ao CNPJ da CONTRATADA cadastrada.</p>
        <p><em>Parágrafo único.</em> Caso a CONTRATADA seja remunerada por um empréstimo que venha a ser cancelado ou não digitalizado e enviado o físico corretamente, o valor pago será abatido da remuneração devida no próximo pagamento.</p>

        <div><strong>VI - DO VÍNCULO EMPREGATÍCIO</strong></div>
        <p><strong>Cláusula 7ª.</strong> A CONTRATADA tem conhecimento de que não há entre as partes qualquer relação de Subordinação. Além disso, a CONTRATANTE não se responsabiliza por obrigações de ordem Trabalhista ou previdenciária seja a que título for. Pois a presente contratação é regida pelo disposto no art. 442-B, da CLT, alterada pela Lei 13.467/17, não estabelecendo entre as partes qualquer vínculo de emprego.</p>

        <div><strong>VII - DOS ENCARGOS FISCAIS</strong></div>
        <p><strong>Cláusula 8ª.</strong> Todos e quaisquer encargos e tributos federais, estaduais ou municipais que incidam ou venham a incidir sobre o presente contrato ou sobre os serviços nele previstos correrão por conta da CONTRATADA, ficando a CONTRATANTE, desde já, autorizada a reter eventual crédito da CONTRATADA para efeito de reembolso dos valores correspondentes aos encargos e/ou tributos que a CONTRATANTE for eventualmente compelida a recolher na qualidade de responsável tributário ou na condição de devedor solidário da CONTRATADA.</p>

        <div><strong>VIII - DAS PENALIDADES</strong></div>
        <p>Para a preservação da qualidade e dos serviços prestados ao CONTRATANTE, caso haja atraso na entrega da documentação/contrato pela CONTRATADA, por prazo superior ao combinando de dias, fica resguardado ao CONTRATANTE o direito de bloquear as comissões da CONTRATADA até regularização das pendências, mediante aviso prévio por escrito via e-mail.</p>
        <p><em>Parágrafo único.</em> Caso a CONTRATADA não cumpra com as obrigações estipuladas no contrato, fica facultado ao CONTRATANTE comunicar a ocorrência aos órgãos de proteção ao crédito SPC, SERASA, assim como aos demais órgãos responsáveis e cartório para o devido protesto.</p>
        <p><strong>Cláusula 10ª.</strong> Caso a CONTRATANTE seja obrigada a recorrer a meios judiciais ou a processos administrativos ou preparatórios para receber qualquer quantia não pela CONTRATADA por força deste contrato, sujeitar-se à CONTRATADA, o pagamento do débito, das custas do processo e dos honorários advocatícios, desde já convencionados em 20% (vinte por cento) do valor total da condenação.</p>
        <p><strong>Cláusula 11ª.</strong> Sem prejuízo das demais penalidades específicas estabelecidas neste Contrato, a CONTRATADA pagará à CONTRATANTE multa de 30% (trinta por cento) sobre o valor total do Contrato em caso de inadimplemento de suas obrigações, sem que tal penalidade ilida o direto da CONTRATANTE a indenização por eventuais perdas, danos e lucros cessantes sofridos.</p>

        <div><strong>IX - DO SIGILO</strong></div>
        <p>A CONTRATADA declara conhecer as normas que regem o sigilo bancário, consubstanciadas na Lei Complementar 105/2001, no Art. 18 da Lei 7.492/86 e nos demais normativos pertinentes, obrigando-se a não divulgar, comunicar e nem fazer uso de quaisquer das informações relativas ao próprio, e eventuais Tomadores dos Empréstimos, sob pena de arcar com as perdas e danos decorrentes desses atos e de responder perante terceiros e perante os poderes públicos competentes pela infringência às disposições desta cláusula.</p>

        <div><strong>X - DA CONFIDENCIALIDADE</strong></div>
        <p>O Parceiro I declara por seus representantes, estar ciente de que, em virtude das funções que exercerá, poderá ter acesso a informações de natureza confidencial do Parceiro II. Considerar-se-ão "informações confidenciais ou comerciais" todas as informações e dados de natureza técnica, operacional, econômica ou comercial, bem como quaisquer outros dados, incluídos os dados pessoais, materiais, pormenores, informações, documentos, especificações técnicas, logins e senhas de acesso, e outras que as partes venham a ter conhecimento ou acesso, ou que venha a lhe ser confiado em razão deste instrumento, sendo eles de interesse exclusivo de uma das partes, não podendo a parte, sob qualquer pretexto, utilizar ou deles dar conhecimento a terceiros estranhos a este instrumento, sob as penas da lei, exceto com a anuência por escrito da outra parte. As obrigações aqui contidas perdurarão mesmo após o término da prestação de serviços ou após o término do Contrato por qualquer razão, pelo prazo de 10 (dez) anos.</p>

        <div><strong>XI - DAS DISPOSIÇÕES GERAIS</strong></div>
        <p>As partes declaram neste ato e na melhor forma de direito que na celebração deste instrumento não houve lesão, dolo, coação física ou moral, erro, e nenhum outro vício de consentimento que possa afetar a sua existência ou validade, estando as Partes em total conformidade com os termos e condições neste ato ajustadas.</p>
        <p>Este Contrato foi redigido dentro dos princípios da boa-fé e probidade, sem nenhum vício de consentimento. As partes declaram para todos os efeitos legais que: a) as prestações e obrigações aqui assumidas estão dentro de suas condições econômico-financeiras; b) estão habituados a esse tipo de operação; c) o presente Contrato espelha fielmente a tudo o que foi ajustado; d) tiveram prévio conhecimento do conteúdo do presente instrumento e entenderam perfeitamente todas as obrigações nele contidas.</p>

        <div><strong>XII - DA PROTEÇÃO DE DADOS PESSOAIS</strong></div>
        <p>O Parceiro II, por si, eventuais empregados, agentes, prepostos e representantes, declara e garante que tratará quaisquer informações relacionadas a uma pessoa natural (física) identificada ou identificável, originada ou coletada pelo Parceiro I ou pela empresa representada pelo Parceiro I e transferida para o Parceiro II em razão da relação comercial estabelecida com a primeira ("Dados Pessoais"), nos termos da legislação aplicável, incluindo mas não se limitando à Lei 13.709/2018 ("Lei Geral de Proteção de Dados" ou "LGPD").</p>

        <div><strong>XIII - DO PRAZO DE DURAÇÃO</strong></div>
        <p>O presente contrato terá vigência por prazo indeterminado conforme versa o artigo 451 da Consolidação das Leis Trabalhistas, porém, havendo interesse em sua rescisão, a parte interessada notificará a parte contraria, por escrito, com antecedência mínima de trinta (30) dias.</p>
        <p><em>Parágrafo Único:</em> A rescisão do presente instrumento de contrato não extingue os direitos e obrigações que as partes tenham entre si, e para com terceiros.</p>

        <div><strong>XIV - DO USO DA MARCA</strong></div>
        <p><strong>Cláusula 14ª.</strong> O uso da logomarca em anúncios publicitários e/ou fachadas fica expressamente condicionado à prévia autorização do Departamento de Marketing da CONTRATANTE, devendo a CONTRATADA respeitar as condições do uso de propaganda oferecido pelo CONTRATANTE.</p>
        <p><strong>Cláusula 15ª.</strong> A CONTRATANTE disponibilizará os materiais gráficos e promocionais para que a CONTRATADA possa realizar a sua atividade.</p>

        <div><strong>XV - DAS DISPOSIÇÕES GERAIS</strong></div>
        <p><strong>Cláusula 16ª.</strong> A CONTRATADA se compromete a respeitar as normas contratuais legais e estabelecidas quando da utilização dos produtos / serviços ora disponibilizados, assumindo qualquer operação que extrapole as normas contidas neste contrato.</p>
        <p><strong>Cláusula 17ª.</strong> A CONTRATADA se compromete a realizar um trabalho de forma criteriosa e com a máxima honestidade, se comprometendo trazer uma produção, livre de vícios e fraudes.</p>
        <p><strong>Cláusula 18ª.</strong> A CONTRATADA declara que os dados e informações contidas na ficha cadastral, possuem total veracidade, responsabilizando-se por todo e qualquer prejuízo que a CONTRATANTE venha a sofrer em consequência da omissão dessas informações.</p>
        <p><strong>Cláusula 19ª.</strong> A CONTRATADA responderá por qualquer ato lesivo ao CONTRATANTE, aos BANCOS CREDENCIADOS aos CLIENTES, ou que venham a ferir as normas do BANCO CENTRAL DO BRASIL.</p>
        <p><strong>Cláusula 20ª.</strong> A CONTRATADA compromete-se a respeitar as normas e regulamentos da empresa.</p>
        <p><strong>Cláusula 21ª.</strong> A CONTRATADA não poderá, em nenhuma hipótese, ceder ou, por qualquer forma, transferir, no todo ou em parte, os direitos e obrigações decorrentes deste contrato, bem como não poderá transmitir a terceiros a utilização de sua chave J.</p>
        <p><strong>Cláusula 22ª.</strong> A CONTRATADA deve afixar em painel em local visível ao público, a informação de que se trata de uma prestadora de serviços à instituição Financeira CONTRATANTE.</p>
        <p><strong>Cláusula 23ª.</strong> A CONTRATADA poderá acompanhar e fiscalizar a execução da presente prestação de serviços, devendo a CONTRATADA, permite-lhe o acesso a toda documentação pertinente e exigida.</p>
        <p><strong>Cláusula 24ª.</strong> Este instrumento ou qualquer outro a ele relacionado somente poderá ser alterado mediante documento escrito e assinado pelas partes.</p>
        <p><strong>Cláusula 25ª.</strong> Este contrato deve ser registrado em Cartório.</p>

        <div><strong>XVI - DO FORO</strong></div>
        <p><strong>Cláusula 26ª.</strong> Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da Comarca de Barreiras – BA.</p>
        <p>Por estarem assim justos e contratados, firmam o presente instrumento, em 02 (duas) vias de igual teor, juntamente com 02 (duas) testemunhas.</p>
      </div>

      {/* Data e Assinaturas */}
      <div className="mt-10 text-center">
        <p>Barreiras (BA), {dataExtenso(hoje)}</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-16">
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">BRASIL MAIS FORTE LTDA.</p>
            <p className="text-xs">CNPJ: 24.541.627/0001-18</p>
            <p className="text-xs">THIAGO VIANA ULTRAMARE</p>
            <p className="text-xs">CPF: 046.219.855-31</p>
            <p className="text-xs text-gray-500">Contratante</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">{ag.nomeAgente || "___________________________________"}</p>
            <p className="text-xs">CPF: {ag.cpfAgente || "___________________________________"}</p>
            <p className="text-xs text-gray-500">Contratado(a)</p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-16">
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs font-semibold">Thales Viana Ultramare</p>
            <p className="text-xs">CPF: 037.012.791-95</p>
            <p className="text-xs text-gray-500">Testemunha 1</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs font-semibold">Sidnei Honorato Ultramare</p>
            <p className="text-xs">CPF: 041.574.758-95</p>
            <p className="text-xs text-gray-500">Testemunha 2</p>
          </div>
        </div>
      </div>

      {/* Adendo */}
      <div className="mt-10 border-t-2 border-gray-400 pt-4">
        <p className="font-bold mb-2">ADENDO – 01</p>
        <p className="mb-2">A - Entrega dos documentos físicos são obrigatórios junto as agências do Banco do Brasil com protocolo de entrega, caso tenha algum problema ou fraude no contrato e não tenha cópia documentação completa, é de total responsabilidade do promotor de vendas.</p>
        <p className="mb-2">B – Relação de documentos a serem escanados e arquivados nos equipamentos até solicitação de envio para nosso servidor, e físico a serem entregues nas agências do Banco do Brasil.</p>
        <p className="mb-2">C - Documentos exigidos Correntistas:</p>
        <p>1 - Contrato assinado igual identidade</p>
      </div>
    </div>
  );
}

function ContratoFLEX({ ag }: { ag: any }) {
  const hoje = new Date();
  const enderecoCompleto = [ag.endereco, ag.numero, ag.complemento].filter(Boolean).join(", ");

  return (
    <div className="contrato-texto text-sm text-gray-900 leading-relaxed">
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <h1 className="text-base font-bold uppercase tracking-wide">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
        <p className="text-xs mt-2 text-gray-600">Firme &amp; Forte Ltda — CNPJ: 32.828.962/0001-20</p>
        <p className="text-xs text-gray-600">Rua 24 de Outubro nº 283, Centro, Barreiras-BA — CEP: 47800-041</p>
      </div>

      <p className="mb-4 text-justify">Pelo presente instrumento particular e na melhor forma de direito, de um lado,</p>

      <p className="mb-4 text-justify">
        <strong>FIRME &amp; FORTE LTDA</strong>, inscrita no CNPJ/MF sob o nº 32.828.962/0001-20, com sede na RUA 24 DE OUTUBRO nº283, Centro, Barreiras-Ba CEP:47800-041, representada, neste ato, na forma de seu estatuto social, doravante denominada (<strong>"CONTRATANTE"</strong>), e, de outro lado;
      </p>

      <p className="mb-6 text-justify">
        <strong>{ag.nomeAgente || "___________________________________"}</strong>,{" "}
        {ag.nacionalidade || "brasileiro(a)"},{" "}
        {ag.estadoCivil || "___________"}, inscrito(a) no CPF/MF sob Nº{" "}
        <strong>{ag.cpfAgente || "___________________"}</strong>, portador(a) da Cédula de Identidade de nº{" "}
        <strong>{ag.rg || "___________________"}</strong>, residente e domiciliado(a) na{" "}
        {enderecoCompleto ? <strong>{enderecoCompleto}</strong> : "___________________________________"},{" "}
        CEP: <strong>{ag.cep || "___________"}</strong>, representado, neste ato, doravante denominado (<strong>"CONTRATADO"</strong>), e, em conjunto, (<strong>"PARTES"</strong>).
      </p>

      <div className="space-y-3 text-justify">
        <p><strong>CONSIDERANDO QUE:</strong></p>
        <p>I. O CONTRATANTE firmou com a BEVICRED contrato para a prestação serviços de correspondentes no país, cujo escopo é a prospecção de interessados na tomada de operações de crédito, em especial, Empréstimo Consignado, Conta Corrente, Crédito Pessoal, Crédito Imobiliário, Consórcio e Seguros, doravante denominado simplesmente ("PRODUTO"), mediante atendimento ao público e recepção e encaminhamento das propostas intermediadas.</p>
        <p>II. As PARTES desejam firmar uma parceria comercial para que o CONTRATADO possa oferecer o PRODUTO objeto do contrato firmado pela CONTRATANTE em sua área de atuação, mediante observação das cláusulas e condições previstas no presente instrumento e nas regras impostas pela instituição financeira ao CONTRATANTE.</p>
        <p>RESOLVEM, na melhor forma de direito, firmar o presente INSTRUMENTO PARTICULAR DE SERVIÇOS, doravante denominado simplesmente ("CONTRATO"), que será regido pelas cláusulas e condições abaixo descritas.</p>

        <p><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
        <p>Por meio deste CONTRATO, o CONTRATADO fica autorizado(a) a ofertar o PRODUTO objeto do contrato firmado pela CONTRATANTE com a instituição financeira indicada no item I das considerações iniciais do presente instrumento, mediante intermediação de operações, encaminhamento de propostas e coleta de documentos a elas inerentes, que deverão ser digitadas e encaminhadas à instituição financeira, por meio de login e senha a serem fornecidas pela CONTRATANTE, para o devido processamento da operação junto à instituição financeira.</p>
        <p>O login e a senha disponibilizados pela CONTRATANTE são intransferíveis e para uso exclusivo do CONTRATADO, não podendo ser divulgadas a terceiros, sob qualquer hipótese ou motivo, ficando o CONTRATADO integralmente responsável por sua guarda e sigilo, bem por todo e qualquer acesso que venha a ocorrer na plataforma com o login e senha disponibilizados e pelas operações ali digitadas.</p>
        <p>O CONTRATADO empregará todo os meios e a mão-de-obra que julgar necessários e adequados para a consecução dos objetivos previstos neste instrumento, sem qualquer ingerência da CONTRATANTE.</p>
        <p>O CONTRATADO não poderá, sob qualquer hipótese, substabelecer ou ceder, no todo ou em parte, os poderes que lhe são conferidos pela CONTRATANTE por meio deste CONTRATO.</p>

        <p><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DA CONTRATADA</strong></p>
        <p>Sem prejuízo das demais obrigações assumidas neste CONTRATO, a CONTRATADA obriga-se a observar a melhor técnica para a oferta do PRODUTO e atendimento aos clientes; obter, às suas próprias expensas, todos os equipamentos, ferramentas, materiais, insumos e mão de obra necessários à perfeita oferta do PRODUTO aos consumidores; desfazer e refazer às suas expensas, no prazo determinado pela CONTRATANTE, todos os SERVIÇOS que não atenderem às especificações; tomar prontamente todas as providências necessárias para solucionar as dúvidas, solicitações e reclamações suscitadas pela CONTRATANTE, instituição financeira e consumidores; observar e empregar todos os procedimentos ditados pela legislação aplicável e pelas especificações da CONTRATANTE e da instituição financeira na oferta do PRODUTO.</p>

        <p><strong>CLÁUSULA TERCEIRA – DAS CONDIÇÕES COMERCIAIS</strong></p>
        <p>A remuneração e a forma de pagamento das operações captadas e intermediadas pela CONTRATADO estão descritas no ANEXO I deste instrumento. A CONTRATADA obriga-se a apresentar a nota fiscal/fatura à CONTRATANTE com 5 dias de antecedência da data de pagamento. Fica certo e ajustado que o CONTRATADO somente fará jus à remuneração ajustada nas operações efetivamente concluídas e efetivadas, assim consideradas aquelas que o recurso tenha sido liberado e creditado na conta do tomador do serviço financeiro.</p>

        <p><strong>CLÁUSULA QUARTA – DA GARANTIA DOS SERVIÇOS</strong></p>
        <p>O CONTRATADO garante que os SERVIÇOS de intermediação e atendimento ao cliente objeto deste CONTRATO estão e permanecerão livres de qualquer erro, defeito, vício, irregularidade, bem como de reivindicação ou reclamação de terceiros e que os SERVIÇOS se encontram em estrita concordância com as especificações e determinações da CONTRATANTE, instituição financeira e/ou previstos na legislação aplicável.</p>

        <p><strong>CLÁUSULA QUINTA – DA PROPRIEDADE DOS RESULTADOS</strong></p>
        <p>O CONTRATADO reconhece que os BENS resultantes dos SERVIÇOS prestados, passíveis ou não de proteção legal, serão de propriedade exclusiva da CONTRATANTE e/ou instituição financeira, não conferindo à CONTRATADA nenhum direito ou licença de uso, reprodução ou divulgação sobre os BENS acima referidos.</p>

        <p><strong>CLÁUSULA SEXTA – DAS DECLARAÇÕES</strong></p>
        <p>O CONTRATADO declara e garante que: todas as informações prestadas à CONTRATANTE, instituição financeira e clientes/consumidores em razão deste CONTRATO são verídicas, completas, corretas e exatas; possui todo o conhecimento, experiência, qualificação, mão de obra, infraestrutura, materiais, ferramentas e insumos necessários para a prestação dos SERVIÇOS; adota as melhores práticas relacionadas aos Direitos Humanos, de modo que não emprega, utiliza, ou de alguma forma explora trabalho análogo ao escravo ou infantil.</p>

        <p><strong>CLÁUSULA SÉTIMA – DA RESPONSABILIDADES E PENALIDADES</strong></p>
        <p>O CONTRATADO, em decorrência de atos ou omissões praticados com dolo ou culpa por si ou por seus prepostos, assume integral responsabilidade perante consumidores, CONTRATANTE e instituição financeira por perdas, danos, multas, prejuízos, penalidades contratuais e legais, autuações e quaisquer outras.</p>

        <p><strong>CLÁUSULA OITAVA – DA INDEPENDÊNCIA DO NEGÓCIOS DAS PARTES</strong></p>
        <p>Não há qualquer vinculação societária entre as PARTES, respondendo cada qual, de forma individual e exclusiva, pelas obrigações e deveres dos seus respectivos negócios. As PARTES reconhecem não existir nenhum vínculo de natureza trabalhista ou de subordinação jurídica e econômica entre elas.</p>

        <p><strong>CLÁUSULA NONA – DA CONFIDENCIALIDADE</strong></p>
        <p>O CONTRATADO declara estar ciente de que, em virtude das funções que exercerá, poderá ter acesso a informações de natureza confidencial da CONTRATANTE e/ou empresa representada pela CONTRATANTE (instituição financeira). O CONTRATADO compromete-se a manter o mais absoluto sigilo e confidencialidade sobre todos e quaisquer dados, informações, documentos e conhecimentos sobre as atividades, negócios, finanças, produtos, processos, bancos de dados, listas de clientes e parceiros ou outras informações técnicas, financeiras ou comerciais da CONTRATANTE ou da instituição financeira. As obrigações de confidencialidade sobreviverão ao término da vigência deste Contrato.</p>

        <p><strong>CLÁUSULA DEZ – DO PRAZO</strong></p>
        <p>Este CONTRATO é firmado por prazo indeterminado e pode ser rescindido por qualquer das Partes, sem ônus, mediante aviso prévio de 30 dias.</p>

        <p><strong>CLÁUSULA ONZE – DA LGPD</strong></p>
        <p>O CONTRATADO, por si, seus empregados, agentes, prepostos e representantes, declara e garante que tratará quaisquer informações relacionadas a uma pessoa natural (física) identificada ou identificável, nos termos da legislação aplicável, incluindo mas não se limitando à Lei 13.709/2018 ("Lei Geral de Proteção de Dados" ou "LGPD"), única e exclusivamente visando fornecer bens e/ou prestar serviços à CONTRATANTE.</p>

        <p><strong>CLÁUSULA DOZE – DO FORO</strong></p>
        <p>Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da Comarca de Barreiras – BA.</p>
      </div>

      {/* Data e Assinaturas */}
      <div className="mt-10 text-center">
        <p>Barreiras-Ba, {dataExtenso(hoje)}</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-16">
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">FIRME &amp; FORTE LTDA</p>
            <p className="text-xs">CNPJ/MF sob o nº 32.828.962/0001-20</p>
            <p className="text-xs text-gray-500">Contratante</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">{ag.nomeAgente || "___________________________________"}</p>
            <p className="text-xs">CPF/MF sob Nº {ag.cpfAgente || "___________________"}</p>
            <p className="text-xs text-gray-500">Contratado(a)</p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-16">
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs font-semibold">Testemunha 1</p>
            <p className="text-xs">CPF/MF sob Nº 059.081.625-07</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs font-semibold">Testemunha 2</p>
            <p className="text-xs">CPF/MF sob Nº 037.012.791-95</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgenteContrato() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const agenteId = parseInt(params.id);

  const { data: agente, isLoading } = trpc.agentes.getById.useQuery({ id: agenteId });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Carregando contrato...</div>;
  }

  if (!agente) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Agente não encontrado.</div>;
  }

  const ag = agente as any;
  const empresa = (ag.empresa || "").toUpperCase();
  const isBMF = empresa.includes("BMF") || empresa.includes("BRASIL MAIS FORTE");
  const isFLEX = empresa.includes("FLEX") || empresa.includes("FIRME") || empresa.includes("BEVICRED");
  const tipoContrato = isBMF ? "BMF" : isFLEX ? "FLEX" : null;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Barra de ações */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate("/agentes")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {tipoContrato && (
          <Button size="sm" onClick={() => window.print()} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Printer className="w-4 h-4 mr-1" /> Imprimir / Salvar PDF
          </Button>
        )}
        <span className="text-sm text-gray-500 ml-2">
          {tipoContrato ? `Contrato ${tipoContrato} — ${ag.nomeAgente}` : `Empresa: ${ag.empresa || "não identificada"}`}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none my-6 print:my-0 p-10 print:p-8">
        {!tipoContrato ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-gray-700 mb-2">Empresa não identificada para geração de contrato</p>
            <p className="text-sm text-gray-500">
              A empresa cadastrada é: <strong>{ag.empresa || "não informada"}</strong>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              O contrato é gerado automaticamente para agentes das empresas <strong>BMF</strong> (Brasil Mais Forte) ou <strong>FLEX</strong> (Firme &amp; Forte / Bevicred).
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Verifique o campo "Empresa" no cadastro do agente.
            </p>
          </div>
        ) : tipoContrato === "BMF" ? (
          <ContratoBMF ag={ag} />
        ) : (
          <ContratoFLEX ag={ag} />
        )}

        {/* Rodapé */}
        {tipoContrato && (
          <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center print:hidden">
            Documento gerado pelo Sistema de Gestão — Grupo Firme &amp; Forte · {new Date().toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11pt; }
          .contrato-texto p { margin-bottom: 8pt; }
        }
      `}</style>
    </div>
  );
}
