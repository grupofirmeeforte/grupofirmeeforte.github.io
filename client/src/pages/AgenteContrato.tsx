import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import PageHeader from "@/components/PageHeader";

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
            <p className="text-xs text-gray-400">Contratante</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">{ag.nomeAgente || "___________________________________"}</p>
            <p className="text-xs">CPF: {ag.cpfAgente || "___________________________________"}</p>
            <p className="text-xs text-gray-400">Contratado(a)</p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-16">
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs font-semibold">Thales Viana Ultramare</p>
            <p className="text-xs">CPF: 037.012.791-95</p>
            <p className="text-xs text-gray-400">Testemunha 1</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs font-semibold">Sidnei Honorato Ultramare</p>
            <p className="text-xs">CPF: 041.574.758-95</p>
            <p className="text-xs text-gray-400">Testemunha 2</p>
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
        <p>2 - RG (Identidade) / Habilitação</p>
        <p>3 - CPF</p>
        <p className="mb-2">4 - Comprovante de endereço nome do Cliente atualizado último mês.</p>
        <p className="mb-2">5 - Detalhamento de crédito ou contracheque</p>
        <p className="mb-2">D - Documentos exigidos não correntistas:</p>
        <p>1 - Contrato assinado igual identidade</p>
        <p>2 - RG</p>
        <p>3 - CPF</p>
        <p>4 - Comprovante de endereço nome do Cliente atualizado último mês</p>
        <p>5 - Detalhamento de crédito emitido pelo terminal de autoatendimento na data do empréstimo.</p>
        <p>6 - Cartão INSS</p>
        <p>7 - Título de eleitor para conferência no e-título</p>
        <p className="mb-2">8 - Foto Digital com a identidade na mão</p>
        <p className="mb-4">E – Todos os documentos devem serem escaneados de sua via original colorido em 100 dbi com condições de visualização ou impressão do mesmo em qualidade nítida.</p>
        <p className="mb-6">Por estar ciente assino e concordo com esse adendo.</p>

        {/* Assinatura do adendo */}
        <div className="text-right text-xs text-gray-100 mb-6">
          Barreiras (BA) {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
        <div className="flex justify-center">
          <div className="text-center">
            <div className="border-t border-gray-800 pt-1 w-64">
              <p className="text-xs font-semibold">{ag.nomeAgente}</p>
              <p className="text-xs">CPF: {ag.cpfAgente}</p>
              <p className="text-xs text-gray-400">Contratado(a)</p>
            </div>
          </div>
        </div>
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
        <p className="text-xs mt-2 text-gray-100">Firme &amp; Forte Ltda — CNPJ: 32.828.962/0001-20</p>
        <p className="text-xs text-gray-100">Rua 24 de Outubro nº 283, Centro, Barreiras-BA — CEP: 47800-041</p>
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
        <p>O CONTRATADO, por si, seus empregados e/ou prestadores de serviços, deverá cumprir fielmente as determinações da instituição financeira e da CONTRATANTE para a oferta do PRODUTO, não podendo ofertar nada além daquilo que previamente foi especificado e indicado pela CONTRATANTE e instituição financeira.</p>
        <p>O CONTRATADO declara ter amplo conhecimento dos atos normativos que regulamentam a contratação dos correspondentes no país pelas instituições financeiras, notadamente a Resolução do Conselho Monetário Nacional n. 3.954, de 24 de fevereiro de 2011, que tem vigência até 31 de janeiro de 2022, bem como da Resolução do Conselho Monetário Nacional n. 4.935, que irá substituí-la a partir de 1 de fevereiro de 2022, assumindo o compromisso de por si, prepostos, dirigentes, empregados ou terceiros que contratar, a respeitar e a cumprir todos os seus termos e condições.</p>
        <p>O CONTRATADO declara ter amplo conhecimento do contrato firmado entre a CONTRATANTE e a instituição financeira indicada no item I das considerações iniciais deste instrumento, estando sujeita aos seus termos para todos os fins de direito.</p>
        <p>O CONTRATADO declara que está devidamente habilitada para a prestação dos SERVIÇOS, possuindo infraestrutura suficiente para atendimento desta contratação.</p>

        <p><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DA CONTRATADA</strong></p>
        <p>Sem prejuízo das demais obrigações assumidas neste CONTRATO, a CONTRATADA obriga-se a:</p>
        <p>Observar a melhor técnica para a oferta do PRODUTO e atendimento aos clientes;</p>
        <p>Obter, às suas próprias expensas, todos os equipamentos, ferramentas, materiais, insumos e mão de obra necessários à perfeita oferta do PRODUTO aos consumidores, atendendo a todas as exigências legais, da CONTRATANTE e instituição financeira;</p>
        <p>Desfazer e refazer às suas expensas, no prazo determinado pela CONTRATANTE, todos os SERVIÇOS que não atenderem às especificações da CONTRATANTE e da instituição financeira ou que apresentarem erros, falhas ou irregularidades;</p>
        <p>Tomar prontamente todas as providências necessárias para solucionar as dúvidas, solicitações e reclamações suscitadas pela CONTRATANTE, instituição financeira e consumidores, transmitindo as devidas orientações aos seus profissionais;</p>
        <p>Observar e empregar todos os procedimentos ditados pela legislação aplicável e pelas especificações da CONTRATANTE e da instituição financeira na oferta do PRODUTO, cumprindo todas as normas vigentes ou que venham a ser editadas ou transmitidas durante a vigência deste CONTRATO;</p>
        <p>Guardar, conservar e devolver ao término deste CONTRATO ou quando solicitado pela CONTRATANTE quaisquer materiais, dados ou documentos de propriedade da CONTRATANTE, instituição financeira, de clientes das operações intermediadas e das operações em si;</p>
        <p>Observar fielmente todas as políticas da CONTRATANTE e da instituição financeira referentes à segurança da informação e garantir que todos os seus funcionários e subcontratados também observem as referidas políticas;</p>
        <p>Disponibilizar, quando solicitado pela CONTRATANTE, quaisquer informações e/ou documentos que comprovem a idoneidade das atividades exercidas pelo CONTRATADO e no que tange ao cumprimento das obrigações objeto deste CONTRATO;</p>
        <p>Manter os dados obtidos em função deste CONTRATO, seja da CONTRATANTE, instituição financeira, consumidores e respectivas operações isentos de quaisquer acessos compartilhados e/ou por terceiros não autorizados, bem como protegidos de quaisquer vulnerabilidades, respondendo, integralmente, por todas as perdas e danos decorrentes do descumprimento desta condição, inclusive perante terceiros;</p>
        <p>Não fazer uso, ceder e/ou transmitir, a qualquer título e/ou sob qualquer pretexto, os dados e/ou informações que venha a ter conhecimento e/ou acesso em virtude da celebração deste CONTRATO, bem como os dados dos clientes e das operações intermediadas, sob pena de responder, integralmente, por todas as perdas e danos decorrentes do descumprimento desta condição, inclusive perante terceiros;</p>
        <p>Executar os serviços sem qualquer tipo de prejuízo ao ambiente tecnológico de propriedade da CONTRATANTE e instituição financeira;</p>
        <p>Obter todas as licenças, autorizações necessárias para a execução dos fins previstos neste CONTRATO e, se aplicável, credenciar-se e manter-se credenciada, durante todo o prazo do CONTRATO, junto a todos os órgãos competentes, públicos ou privados, de acordo com a legislação aplicável;</p>
        <p>Cumprir todas as normas referentes à segurança e saúde do trabalho, bem como de proteção ao meio ambiente, que estejam em vigor ou que venham a ser aplicáveis a este CONTRATO, incluindo, mas não se limitando a Constituição Federal, leis, medidas provisórias, leis complementares, decretos, decretos-lei, portarias, normas regulamentadoras, instruções normativas, resoluções e quaisquer outras normas federais, estaduais e municipais;</p>
        <p>Realizar todos os treinamentos recomendados pela CONTRATANTE, bem como a cumprir a Política de Relacionamento com Clientes e normas gerais que abordem o tema;</p>
        <p>Gerar e arquivar as gravações de contato telefônico e disponibilizá-las à CONTRATANTE e instituição financeira sempre que solicitado, relacionado ao objeto do contrato de forma segregada de qualquer outro serviço prestado pelo CONTRATADO, sendo que esta obrigação prevalecerá durante a vigência do contrato e pelo prazo de até 5 anos após a sua extinção, por qualquer motivo.</p>
        <p>O CONTRATADO, na oferta do PRODUTO e na vigência deste CONTRATO, assume o compromisso de:</p>
        <p>Assegurar a transparência e confiança nas relações entre cada um dos participantes da cadeia de negócios envolvendo o PRODUTO ofertado (clientes, CONTRATANTE e instituição financeira), respeitando-se valores e diversidades;</p>
        <p>Manter os mais elevados padrões éticos e de credibilidade do Sistema Financeiro Nacional, zelando pelo benefício da coletividade;</p>
        <p>Respeitar e cumprir a legislação vigente, agindo com decoro, responsabilidade, lealdade, dignidade e boa-fé nas relações com clientes, CONTRATANTE, instituição financeira e demais parceiros participantes da cadeia de negócios envolvendo o PRODUTO;</p>
        <p>Propiciar condições para a expansão sustentável do mercado de crédito brasileiro e demais produtos e serviços financeiros;</p>
        <p>Estimular as boas práticas de mercado, evitando ações danosas que possam prejudicar o cliente e a imagem dos correspondentes, instituições financeiras e mercado de crédito e demais produtos e serviços financeiros;</p>
        <p>Seguir sempre padrões éticos na condução de suas atividades, incluindo suas relações com clientes e demais participantes do mercado financeiro;</p>
        <p>Empenhar-se no aprimoramento contínuo da competência e do prestígio da atividade de correspondente, conhecendo e observando todas as resoluções, guias, normas, leis e regulamentos aplicáveis ao exercício de suas atividades, buscando a minimização dos riscos;</p>
        <p>Não participar de negócios ilícitos;</p>
        <p>Não contribuir para a divulgação de notícias ou de informações inverídicas ou imprecisas sobre o produto ofertado;</p>
        <p>Manter-se constantemente atualizado em relação a notícias e normas relacionadas com a sua atividade no mercado financeiro;</p>
        <p>Não participar de qualquer negócio que envolva fraude, simulação, manipulação ou distorção de preços, declarações falsas ou lesão aos direitos de clientes, CONTRATANTE e instituição financeira, evitando comportamento inadequados e errôneos;</p>
        <p>Não fornecer dados imprecisos sobre o PRODUTO, ser prestativo com o cliente, agir com decoro e educação, mostrar-se sempre disponível para atendê-lo e esclarecer dúvidas sempre que indagado;</p>
        <p>Utilizar-se de especial diligência em sua identificação junto ao cliente, priorizando os interesses deste na tomada de um empréstimo consciente e com todos os esclarecimentos pertinentes;</p>
        <p>Não prestar informação falsa ou enganosa que possa comprometer a integridade do processo de análise de crédito e da própria operação intermediada;</p>
        <p>Manter clareza, objetividade na oferta do produto, oferecendo aconselhamento e esclarecimento ao cliente, utilizando de diligência e cuidado na recomendação;</p>
        <p>Não cobrar ou receber qualquer valor, incentivo, presente ou qualquer compensação financeira dos clientes, salvo se permitido por lei e expressamente autorizado, de forma concomitante, pela CONTRATANTE e pela instituição financeira;</p>
        <p>Sempre considerar e observar a situação particular de cada cliente, com relação ao patrimônio, objetivos, prazos e experiência, quando da oferta do produto;</p>
        <p>Agir profissionalmente e de forma íntegra e honesta;</p>
        <p>Prestar total cooperação com eventos e operações suspeitos de fraude, simulação, declarações falsas ou lesão aos direitos de clientes, CONTRATANTE e instituição financeira;</p>
        <p>Deixar claro em sua abordagem comercial, sua condição de pessoa jurídica CONTRATADO e contratada para prestação de serviço, devendo divulgar ao público sua condição de prestador de serviços da CONTRATANTE, identificando esta pelo nome com que é conhecida no mercado, com descrição dos produtos e serviços oferecidos e telefones dos serviços de atendimento e de ouvidoria, por meio de painel visível mantido nos locais onde seja prestado atendimento aos clientes e usuários, e por outras formas caso necessário para esclarecimento do público, tais como em seus sítios eletrônicos e aplicativos para dispositivos móveis;</p>
        <p>Informar à CONTRATANTE, imediatamente, qualquer situação que possa impactar ou comprometer a execução do contrato ou que implique em conflito de interesses com a CONTRATANTE ou instituição financeira;</p>
        <p>Estar preparada para cumprir as exigências caso os Órgãos reguladores resolvam acessar os contratos firmados com base na prestação de serviços objeto deste contrato, bem como a documentação e informações referentes aos produtos e serviços fornecidos, e ainda às suas dependências e sua respectiva documentação relativa aos atos constitutivos, registros, cadastros e licenças requeridos pela legislação;</p>
        <p>Ser considerada apta em exame de certificação organizado por entidade de reconhecida capacidade técnica e indicada pela CONTRATANTE que aborde, no mínimo, os aspectos técnicos das operações, a regulamentação aplicável o código de defesa do Consumidor (CDC), ética e ouvidoria.</p>
        <p>Na oferta do PRODUTO, o CONTRATADO fica expressamente proibida de:</p>
        <p>Valer-se da condição de prestadora de serviços para emitir a seu favor, carnês ou títulos relativos às operações realizadas;</p>
        <p>Cobrar por conta própria, a qualquer título, valor relacionado com os produtos e serviços com as quais a CONTRATANTE possuir relação jurídico-contratual;</p>
        <p>Utilizar o nome ou a marca das empresas representadas no exercício das funções estabelecidas no contrato firmado com a CONTRATANTE;</p>
        <p>Receber intimação, notificação, interpelação ou citação, em nome da CONTRATANTE, vez que não possui poderes para tal fim, devendo, via de consequência, informar ao Oficial de Justiça, encarregado da diligência, o endereço da CONTRATANTE, para o devido cumprimento da intimação, notificação, interpelação ou citação;</p>
        <p>Utilizar, sem prévia e expressa aprovação da CONTRATANTE, materiais publicitários e de apoio às vendas em que forem divulgados os produtos e serviços financeiros a serem oferecidos objeto deste CONTRATO;</p>
        <p>Ofertar aos clientes, produtos e serviços, inclusive por meio de centrais de atendimento, mensagens eletrônicas, meios digitais como aplicativos, websites entre outros, aos clientes que estejam cadastrados em quaisquer listas restritivas (públicas ou privadas) e/ou realizar ofertas de produtos, pelos meios ora indicados, de forma excessiva que possam causar importunação, constrangimento, insistência desmedida, ficando ressalvada as exceções previstas neste Contrato.</p>

        <p><strong>CLÁUSULA TERCEIRA – DAS CONDIÇÕES COMERCIAIS</strong></p>
        <p>A remuneração e a forma de pagamento das operações captadas e intermediadas pela CONTRATADO estão descritas no ANEXO I deste instrumento.</p>
        <p>A CONTRATADA obriga-se a apresentar a nota fiscal/fatura à CONTRATANTE ou a quem está indicar com 5 dias de antecedência da data de pagamento.</p>
        <p>Fica certo e ajustado que o CONTRATADO somente fará jus à remuneração ajustada nas operações efetivamente concluídas e efetivadas, assim consideradas aquelas que o recurso tenha sido liberado e creditado na conta do tomador do serviço financeiro.</p>
        <p>Não serão remuneradas as operações em que o contrato de empréstimo tenha sido firmado, mas o recurso não tenha sido liberado, por qualquer motivo, bem como aquelas em haja impedimento em leis, normativos e autorregulações do setor.</p>
        <p>As notas fiscais/faturas serão emitidas pelo CONTRATADO em inteira conformidade com exigências regulamentares, especialmente as de natureza fiscal, destacando, quando exigível, os percentuais de retenção.</p>
        <p>Cada uma das PARTES efetuará a retenção e o recolhimento dos tributos e contribuições sociais que, de acordo com a legislação em vigor, seja de sua responsabilidade.</p>
        <p>A CONTRATANTE não se responsabilizará por pagamentos incorretamente realizados em decorrência dos dados terem sido erroneamente fornecidos pelo CONTRATADO.</p>
        <p>A CONTRATANTE e/ou instituição financeira deduzirão débitos, indenizações ou multas imputáveis à CONTRATADA de quaisquer créditos decorrentes deste CONTRATO, conforme dispõe o artigo 368 e seguintes do Código Civil Brasileiro, incluindo prejuízos decorrentes de fraude, simulação, declarações falsas ou lesão aos direitos de clientes, CONTRATANTE e instituição financeira.</p>
        <p>O valor mencionado no ANEXO I engloba todos os custos e despesas da CONTRATADO para a consecução dos objetivos previstos neste CONTRATO, inclusive as taxas e impostos incidentes na operação, não podendo ser imputada à CONTRATANTE ou à instituição financeira qualquer outro valor além do especificado no ANEXO I.</p>
        <p>O CONTRATADO declara ter plena ciência de que as condições relativas a comissões, forma de pagamento e especificações técnicas e operacionais de cada operação são impostos pela instituição financeira, de forma que poderão ser alteradas, sem prévio aviso, a qualquer tempo, com o que concorda o CONTRATADO.</p>
        <p>Caso haja alteração nas condições relativas a comissões, forma de pagamento e especificações técnicas e operacionais de qualquer uma das operações, a CONTRATANTE assume o compromisso de informar as respectivas alterações à CONTRATADA.</p>
        <p>O CONTRATADO não está condicionado a qualquer taxa de êxito.</p>
        <p>O CONTRATADO assume o compromisso de prestar os serviços objeto deste CONTRATO em caráter de exclusividade, de modo que não poderá prestar a terceiros serviços objeto do contrato principal firmado entre a CONTRATANTE e a instituição financeira, bem como semelhantes e/ou competitivos aos negócios da CONTRATANTE, mantendo regime de exclusividade no contrato principal firmado entre a CONTRATANTE e a instituição financeira.</p>
        <p>Caso não sejam atingidos os níveis de qualidade determinados para cada produto, ou ainda sejam constatadas inconsistências nas operações geradas e/ou serviços executados, fica certo e ajustado que a CONTRATANTE poderá bloquear o acesso da SUBSTABELECIDA para atendimento.</p>

        <p><strong>CLÁUSULA QUARTA – DA GARANTIA DOS SERVIÇOS</strong></p>
        <p>O CONTRATADO garante que os SERVIÇOS de intermediação e atendimento ao cliente objeto deste CONTRATO e os bens oriundos da prestação de SERVIÇOS ("Bens") estão e permanecerão livres de qualquer erro, defeito, vício, irregularidade, bem como de reivindicação ou reclamação de terceiros e que os SERVIÇOS se encontram em estrita concordância com as especificações e determinações da CONTRATANTE, instituição financeira e/ou previstos na legislação aplicável. O CONTRATADO garante, outrossim, que os SERVIÇOS e BENS são adequados ao propósito particular para o qual foram contratados.</p>
        <p>Mesmo havendo aceitação dos SERVIÇOS e/ou BENS, o CONTRATADO deverá garanti-los na forma da cláusula 4.1.</p>

        <p><strong>CLÁUSULA QUINTA – DA PROPRIEDADE DOS RESULTADOS</strong></p>
        <p>O CONTRATADO reconhece que os BENS resultantes dos SERVIÇOS prestados, passíveis ou não de proteção legal, serão de propriedade exclusiva da CONTRATANTE e/ou instituição financeira, não conferindo à CONTRATADA nenhum direito ou licença de uso, reprodução ou divulgação sobre os BENS acima referidos, comprometendo-se O CONTRATADO a protegê-los contra toda e qualquer violação. Dessa forma, O CONTRATADO não poderá, em nenhuma hipótese, divulgar a terceiros, usar, ceder, transferir, reproduzir, divulgar ou copiar mencionados bens (banco de dados e informações processadas).</p>

        <p><strong>CLÁUSULA SEXTA – DAS DECLARAÇÕES</strong></p>
        <p>O CONTRATADO declara e garante que:</p>
        <p>Todas as informações prestadas à CONTRATANTE, instituição financeira e clientes/consumidores em razão deste CONTRATO ou em qualquer outra oportunidade são verídicas, completas, corretas e exatas;</p>
        <p>Todos os materiais, programas, firmware, software, know-how, métodos e conceitos a eles associados que forem utilizados, direta ou indiretamente, na execução dos SERVIÇOS ora contratados são usados de acordo com a legislação vigente;</p>
        <p>A prestação de SERVIÇOS e os BENS resultantes não infringem quaisquer direitos de terceiros, obrigando-se, portanto, a responder perante a CONTRATANTE e instituição financeira por quaisquer acusações que estas venham a ser acusadas ou condenadas, de tal modo que O CONTRATADO assume, expressamente, a total responsabilidade pelas perdas e danos, lucros cessantes, juros moratórios, bem como toda e qualquer despesa decorrente de tais acusações e/ou eventuais condenações, inclusive custas judiciais e honorários advocatícios, inclusive para a defesa da CONTRATANTE e instituição financeira, sem prejuízo de poder ser denunciada à lide, à critério da CONTRATANTE e instituição financeira;</p>
        <p>Possui todo o conhecimento, experiência, qualificação, mão de obra, infraestrutura, materiais, ferramentas e insumos necessários para a prestação dos SERVIÇOS;</p>
        <p>Adota as melhores práticas relacionadas aos Direitos Humanos, de modo que não emprega, utiliza, ou de alguma forma explora, e se obriga a não empregar, utilizar ou explorar, durante o prazo de vigência do CONTRATO, mão de obra infantil ou trabalho análogo ao escravo na prestação dos seus serviços, bem como também não contrata ou mantém relações com quaisquer empresas que lhe prestem serviços que utilizem, explorem, ou por qualquer meio ou forma empreguem o trabalho análogo ao escravo ou infantil, nos termos previstos na Lei n.º 8.069/1990 e demais normas em vigor;</p>
        <p>O processo de negociação desse instrumento e sua manutenção está baseado nos conceitos e princípios da ética, moralidade e boa-fé na condução dos negócios, bem como nas práticas de mercado;</p>
        <p>Exerce suas atividades em conformidade com a legislação vigente a elas aplicável, e que detêm as aprovações necessárias à celebração deste CONTRATO, e ao cumprimento das obrigações nele previstas;</p>
        <p>Não utiliza práticas de discriminação negativa, e limitativas ao acesso na relação de emprego ou a sua manutenção, tais como, mas não se limitando a motivos de: sexo, origem, raça, cor, condição física, religião, estado civil, idade, situação familiar ou estado gravídico;</p>
        <p>Protege e preserva o meio ambiente, bem como a prevenir e erradicar práticas danosas ao meio ambiente, executando seus serviços em observância à legislação vigente no que tange à Política Nacional do Meio Ambiente e dos Crimes Ambientais, bem como dos atos legais, normativos e administrativos relativos à área ambiental e correlatas, emanados das esferas Federal, Estaduais e Municipais;</p>
        <p>Conhece e cumpre integralmente o disposto nas leis, regulamentos e disposições normativas que tratam do combate à corrupção e suborno, nacionais ou estrangeiras e possui políticas, processos e procedimentos anticorrupção, em conformidade com as leis, regulamentos e disposições normativas que tratam do combate à corrupção e suborno, nacionais ou estrangeiras, e que são cumpridos por seus acionistas/quotistas/sócios, conselheiros, administradores, empregados e prestadores de serviços, inclusive, seus subcontratados e prepostos;</p>
        <p>Se vier a ser envolvida em alguma situação ligada a corrupção ou suborno, em decorrência de ação praticada pela outra Parte ou seus acionistas/quotistas/sócios, conselheiros, administradores, empregados e prestadores de serviços, inclusive, seus subcontratados e prepostos, assumirá o respectivo ônus.</p>

        <p><strong>CLÁUSULA SÉTIMA – DAS RESPONSABILIDADES E PENALIDADES</strong></p>
        <p>O CONTRATADO, em decorrência de atos ou omissões praticados com dolo ou culpa por si ou por seus prepostos, assume integral responsabilidade perante consumidores, CONTRATANTE e instituição financeira por perdas, danos, multas, prejuízos, penalidades contratuais e legais, autuações e quaisquer outras, na ocorrência dos seguintes eventos:</p>
        <p>Má conduta na intermediação das operações objeto deste CONTRATO;</p>
        <p>Divulgação dos dados dos clientes, instituições financeiras e CONTRATANTE;</p>
        <p>Inobservância da legislação aplicável, inclusive da LGPD (Lei Geral de Proteção de Dados);</p>
        <p>Inobservância de quaisquer termos e condições dispostos neste Contrato;</p>
        <p>Ocorrência de fraude, simulação, declarações falsas ou lesão aos direitos de clientes, CONTRATANTE e instituição financeira nas operações que captar e intermediar.</p>

        <p><strong>CLÁUSULA OITAVA – DA INDEPENDÊNCIA DOS NEGÓCIOS DAS PARTES</strong></p>
        <p>Não há qualquer vinculação societária entre as PARTES, respondendo cada qual, de forma individual e exclusiva, pelas obrigações e deveres dos seus respectivos negócios.</p>
        <p>As PARTES reconhecem não existir nenhum vínculo de natureza trabalhista ou de subordinação jurídica e econômica entre elas, bem como entre os empregados e/ou prestadores de serviços contratados por cada uma, assumindo cada qual a integral responsabilidade pelos encargos trabalhistas, securitários, acidentários e previdenciários de toda a mão-de-obra contratada ou subcontratada que tenham contratado para a realização dos seus negócios.</p>
        <p>Se por qualquer motivo uma das PARTES vier a ser compelida a responder por quaisquer obrigações, inclusive de natureza trabalhista, securitária, acidentária e previdenciária dos empregados ou prestadores de serviços da outra PARTE, esta se obriga a indenizar aquela pelo valor que vier a ser despendido, diretamente ou por meio do exercício do direito de regresso. Admite-se, ainda, às PARTES valer-se de quaisquer das modalidades de intervenção de terceiros estabelecidas pela legislação processual civil.</p>

        <p><strong>CLÁUSULA NONA – DA CONFIDENCIALIDADE</strong></p>
        <p>O CONTRATADO declara, por seus representantes:</p>
        <p>Estar ciente de que, em virtude das funções que exercerá, poderá ter acesso a informações de natureza confidencial da CONTRATANTE e/ou empresa representada pela CONTRATANTE (instituição financeira);</p>
        <p>O manuseio inadequado das Informações Confidenciais, o uso para obtenção de vantagens pessoais e/ou de terceiros, sua revelação inadvertida ou não autorizada a quaisquer terceiros, constitui prática ilícita, além de quebra de sigilo profissional, podendo ensejar a rescisão do Contrato firmado por justa causa, além de outras sanções de natureza civil e criminal;</p>
        <p>O CONTRATADO compromete-se a manter o mais absoluto sigilo e confidencialidade sobre todos e quaisquer dados, informações, documentos e conhecimentos sobre as atividades, negócios, finanças, produtos, processos, bancos de dados, listas de clientes e parceiros ou outras informações técnicas, financeiras ou comerciais da CONTRATANTE ou da instituição financeira que venha a ter acesso ou conhecimento, seja por meio verbal, escrito, eletrônico ou por qualquer outra forma de transmissão ("Informações Confidenciais"), devendo restringir o conhecimento das Informações Confidenciais única e exclusivamente aos seus sócios, acionistas, diretores, administradores, funcionários, empregados, contratados, subcontratados, consultores, prepostos, representantes e fornecedores que estiverem diretamente ligados aos objetivos previstos na presente parceria e na exata medida em que se fizer necessário referido conhecimento para a consecução dos objetivos previstos nesta parceria, responsabilizando-se, de qualquer forma, por fazer com que os mesmos mantenham a confidencialidade acima mencionada. As obrigações de confidencialidade, na forma como dispostas no presente item, sobreviverão ao término da vigência deste Contrato;</p>
        <p>Toda e qualquer revelação das Informações Confidenciais em virtude dos Serviços não implicará, sob qualquer forma, cessão ou outorga de licença de direitos de propriedade industrial ou intelectual, bem como outros direitos de qualquer espécie sobre o uso ou a exploração das Informações Confidenciais.</p>

        <p><strong>CLÁUSULA DEZ – DO PRAZO</strong></p>
        <p>Este CONTRATO é firmado por prazo indeterminado e pode ser rescindido por qualquer das Partes, sem ônus, mediante aviso prévio de 30 dias.</p>

        <p><strong>CLÁUSULA ONZE – DA LGPD</strong></p>
        <p>O CONTRATADO, por si, seus empregados, agentes, prepostos e representantes, declara e garante que tratará quaisquer informações relacionadas a uma pessoa natural (física) identificada ou identificável, originada ou coletada pela CONTRATANTE ou pela empresa representada pela CONTRATANTE e transferida para O CONTRATADO em razão da relação comercial estabelecida com a primeira ("Dados Pessoais"), nos termos da legislação aplicável, incluindo mas não se limitando à Lei 13.709/2018 ("Lei Geral de Proteção de Dados" ou "LGPD"), bem como a todas e quaisquer outras legislações e normas aplicáveis ao tratamento de dados pessoais cujos efeitos extraterritoriais atinjam as Partes e/ou as transações contempladas entre as mesmas ("Normas de Proteção de Dados") única e exclusivamente visando: (i) fornecer bens e/ou prestar serviços à CONTRATANTE; e (ii) estritamente dentro dos limites das instruções da CONTRATANTE e/ou da empresa representada pela CONTRATANTE. O CONTRATADO não tratará esses Dados Pessoais em nenhuma outra hipótese ou para qualquer outra finalidade, ou em qualquer outro local diferente do estabelecido entre as Partes, sem a autorização prévia e expressa da CONTRATANTE e da empresa representada pela CONTRATANTE.</p>
        <p>O CONTRATADO encaminhará imediatamente para a CONTRATANTE qualquer solicitação de titular dos Dados Pessoais relativa aos Dados Pessoais. O CONTRATADO dará toda a cooperação razoável necessária para atender à solicitação do Titular, conforme instruções da CONTRATANTE. O CONTRATADO enviará quaisquer comunicados ou notificações exigidas, por escrito, inclusive por e-mail, para a pessoa de contato na CONTRATANTE e para a instituição financeira representada pela CONTRATANTE.</p>
        <p>O CONTRATADO deve informar à CONTRATANTE em até 24 (vinte e quatro) horas da tomada de conhecimento de qualquer incidente real ou potencial envolvendo qualquer acesso não-autorizado ou acidental, ou a coleta, perda, destruição, dano ou alteração dos Dados Pessoais recebidos da CONTRATANTE da empresa representada pela CONTRATANTE, incluindo aquele decorrente de violação efetiva ou de tentativa de violação das medidas de segurança usadas para proteger os Dados Pessoais ("Incidente de Segurança da Informação").</p>
        <p>Em caso de qualquer Incidente de Segurança da Informação, O CONTRATADO deverá tomar imediatamente e na medida em que for possível, todas as medidas razoáveis para investigar, sanar e mitigar os efeitos do Incidente de Segurança da Informação. O CONTRATADO cooperará integralmente com a investigação da CONTRATANTE sobre o Incidente de Segurança da Informação e fornecerá todas as informações, acesso e materiais necessários para atender às investigações da CONTRATANTE e a solução do Incidente de Segurança da Informação, bem como para possibilitar à CONTRATANTE e/ou a empresa representada pela CONTRATANTE, o cumprimento de quaisquer exigências impostas por Normas de Proteção de Dados aplicáveis.</p>
        <p>É responsabilidade única e exclusiva do CONTRATADO garantir que seus empregados, agentes, prepostos e representantes tratem os Dados Pessoais de acordo com os termos deste contrato e dentro dos limites necessários para a prestação dos serviços/fornecimento de bens. O CONTRATADO também é a única responsável por assegurar que eles cumprirão integralmente o disposto neste contrato, inclusive com relação aos deveres de confidencialidade e segurança.</p>
        <p>A CONTRATANTE, mediante notificação com 05 (cinco) dias de antecedência à CONTRATADO, poderá realizar durante horário comercial e às próprias custas, auditorias nas instalações, redes, sistemas e qualquer outro meio relevante ao tratamento e manutenção dos Dados Pessoais e o cumprimento de obrigações previstas neste contrato, devendo O CONTRATADO cooperar oferecendo estes acessos à CONTRATANTE e a autoridades governamentais. Constatado o não cumprimento das obrigações quanto ao tratamento e manutenção dos Dados Pessoais, O CONTRATADO envidará esforços comercialmente razoáveis para efetuar quaisquer alterações necessárias para garantir o cumprimento das obrigações, informando à CONTRATANTE das alterações realizadas.</p>
        <p>O CONTRATADO concorda em indenizar, defender e isentar totalmente o CONTRATANTE, seus diretores, gerentes, funcionários e representantes por e contra toda e qualquer perda, dano, taxa e despesa decorrente de quaisquer reclamações relacionadas a qualquer (i) violação efetiva ou alegada da legislação de proteção de dados aplicável; (ii) culpa ou dolo por parte da Contratada; (iii) perda ou má utilização dos Dados Pessoais ou dos Dados Pessoais da Contratada; e (iv) tratamento inadequado ou em desconformidade com as Normas de Proteção de Dados, por sua parte, dos Dados Pessoais ou dos Dados Pessoais do CONTRATADO. Essas obrigações são independentes de quaisquer outras devidas à CONTRATANTE em razão de disposições legais ou de obrigações especificadas neste Contrato.</p>
        <p>As Partes, por si e por seus administradores, diretores, empregados e agentes, obrigam-se a: (i) conduzir suas práticas comerciais de forma ética e em conformidade com os preceitos legais aplicáveis; (ii) repudiar e não permitir qualquer ação que possa constituir ato lesivo nos termos da Lei nº 12.846, de 1º de agosto de 2013, e legislação correlata; (iii) dispor ou comprometer-se a implementar, durante a vigência deste Contrato, programa de conformidade e treinamento voltado à prevenção e detecção de violações das regras anticorrupção e dos requisitos estabelecidos neste Contrato; (iv) notificar imediatamente a outra parte se tiverem conhecimento ou suspeita de qualquer conduta que constitua ou possa constituir prática de suborno ou corrupção referente à negociação, conclusão ou execução deste Contrato, e declaram, neste ato, que não realizaram e nem realizarão qualquer pagamento, nem forneceram ou fornecerão benefícios ou vantagens a quaisquer autoridades governamentais, ou a consultores, representantes, parceiros ou terceiros a elas ligados, com a finalidade de influenciar qualquer ato ou decisão da administração pública ou assegurar qualquer vantagem indevida, obter ou impedir negócios ou auferir qualquer benefício indevido.</p>

        <p><strong>CLÁUSULA DOZE</strong></p>
        <p>É expressamente vedada a cessão ou transferência deste Contrato a terceiros, salvo de comum acordo entre as Partes.</p>
        <p>Este CONTRATO constitui o entendimento integral entre as PARTES e substitui toda e qualquer declaração, comunicação ou entendimentos anteriores havidos entre as PARTES, orais ou escritos e que sejam relacionados com as matérias aqui tratadas.</p>
        <p>Cada disposição deste CONTRATO será considerada como sendo um acordo separado entre as PARTES, de forma que, se quaisquer de suas disposições forem judicialmente declaradas inválidas, ilegais ou inexequíveis, a validade, legalidade e exequibilidade das demais disposições não serão, de forma alguma, afetadas ou prejudicadas.</p>
        <p>As PARTES concordam em renegociar de boa-fé quaisquer cláusulas deste CONTRATO que possam ser consideradas total ou parcialmente inválidas, ineficazes ou inexequíveis, de tal modo que qualquer nova cláusula assim negociada reproduza o sentido negocial e a intenção original da cláusula.</p>
        <p>Este CONTRATO somente pode ser alterado por meio de instrumento escrito e devidamente assinado pelas PARTES.</p>
        <p>O atraso no exercício, ou não exercício de qualquer direito, não deve ser considerado como renúncia a esse direito ou a novação de qualquer obrigação.</p>
        <p>As PARTES, sempre que necessário, deverão tomar ou providenciar a tomada de todas as ações, fazer ou providenciar a feitura de todas as medidas necessárias, e assinar e enviar ou providenciar a assinatura e envio de todos os documentos necessários para dar total efeito a este CONTRATO e à consumação das operações aqui contempladas.</p>
        <p>Este CONTRATO deve ser regido e interpretado de acordo com a lei brasileira.</p>
        <p>As PARTES comprometem-se a empregar seus melhores esforços para resolver por meio de negociação qualquer controvérsia deste CONTRATO.</p>
        <p>A eventual tolerância de uma das partes com o descumprimento de qualquer obrigação contratual será considerada mera liberalidade, não implicando transação, novação ou renúncia, de modo que a parte inocente pode, a qualquer tempo, exigir da parte culpada o integral cumprimento dessa obrigação.</p>
        <p>A extinção deste Contrato não afetará os direitos ou obrigações das PARTES sobre Responsabilidades Trabalhistas, Indenização e Demais Responsabilidades e Confidencialidade, que subsistirão à referida extinção, permanecendo em vigor e plenamente eficazes com relação a atos, fatos ou danos causados à CONTRATANTE ou a terceiros, decorrentes de culpa ou dolo da CONTRATADA ou de sua equipe de trabalho.</p>
        <p>As PARTES elegem a Comarca de Barreiras-BA, para dirimir qualquer controvérsia oriunda do presente instrumento, renunciando a qualquer outra, por mais privilegiada que seja ou venha a ser.</p>
        <p>Firmam as PARTES o presente instrumento em 2 (duas) vias de igual teor e forma, na presença de duas testemunhas, para que produza seus regulares efeitos jurídicos.</p>
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
            <p className="text-xs text-gray-400">Contratante</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 pt-2">
            <p className="font-semibold">{ag.nomeAgente || "___________________________________"}</p>
            <p className="text-xs">CPF/MF sob Nº {ag.cpfAgente || "___________________"}</p>
            <p className="text-xs text-gray-400">Contratado(a)</p>
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
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando contrato...</div>;
  }

  if (!agente) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Agente não encontrado.</div>;
  }

  const ag = agente as any;
  const empresa = (ag.empresa || "").toUpperCase();
  const isBMF = empresa.includes("BMF") || empresa.includes("BRASIL MAIS FORTE");
  const isFLEX = empresa.includes("FLEX") || empresa.includes("FIRME") || empresa.includes("BEVICRED");
  const tipoContrato = isBMF ? "BMF" : isFLEX ? "FLEX" : null;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Barra de ações */}
      <div className="print:hidden">
        <PageHeader title="Contrato do Agente" onBack={() => navigate("/agentes")} />
        {tipoContrato && (
          <div className="bg-gray-900 border-b border-gray-700 px-6 py-2 flex items-center gap-3">
            <Button size="sm" onClick={() => window.print()} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Printer className="w-4 h-4 mr-1" /> Imprimir / Salvar PDF
            </Button>
            <span className="text-sm text-gray-400">
              Contrato {tipoContrato} — {ag.nomeAgente}
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-700-lg print:shadow-none my-6 print:my-0 p-10 print:p-8">
        {!tipoContrato ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-white mb-2">Empresa não identificada para geração de contrato</p>
            <p className="text-sm text-gray-400">
              A empresa cadastrada é: <strong>{ag.empresa || "não informada"}</strong>
            </p>
            <p className="text-sm text-gray-400 mt-2">
              O contrato é gerado automaticamente para agentes das empresas <strong>BMF</strong> (Brasil Mais Forte) ou <strong>FLEX</strong> (Firme &amp; Forte / Bevicred).
            </p>
            <p className="text-sm text-gray-400 mt-2">
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
          <div className="mt-8 pt-4 border-t border-gray-700 text-xs text-gray-400 text-center print:hidden">
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
