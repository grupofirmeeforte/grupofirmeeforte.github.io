import { useState } from "react";
import { useLocation } from "wouter";
import { BookMarked, BookOpen, Sparkles, Star, Zap, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";

// ─── TIPOS DE ABAS ────────────────────────────────────────────────────────────
type Aba = 'horoscopo' | 'minutos-sabedoria' | 'motivacional' | 'salmos' | 'versiculos' | 'orixas';

const ABAS: { id: Aba; label: string; icon: React.ElementType; cor: string }[] = [
  { id: 'horoscopo',        label: 'Horóscopo',           icon: Star,      cor: 'bg-blue-600'   },
  { id: 'minutos-sabedoria',label: 'Minutos de Sabedoria', icon: Sparkles,  cor: 'bg-purple-600' },
  { id: 'motivacional',     label: 'Motivacional',         icon: Zap,       cor: 'bg-amber-600'  },
  { id: 'salmos',           label: 'Salmos',               icon: BookOpen,  cor: 'bg-emerald-600'},
  { id: 'versiculos',       label: 'Versículos',           icon: BookMarked,cor: 'bg-rose-600'   },
  { id: 'orixas',           label: 'Mensagem dos Orixás',  icon: Sparkles,  cor: 'bg-orange-600' },
];

// ─── DADOS LOCAIS ─────────────────────────────────────────────────────────────
const VERSICULOS = [
  { texto: "Tudo posso naquele que me fortalece.", referencia: "Filipenses 4:13" },
  { texto: "O Senhor é o meu pastor; nada me faltará.", referencia: "Salmos 23:1" },
  { texto: "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.", referencia: "Jeremias 29:11" },
  { texto: "Confia no Senhor de todo o teu coração e não te apoies em teu próprio entendimento.", referencia: "Provérbios 3:5" },
  { texto: "Busca primeiro o reino de Deus e a sua justiça, e todas essas coisas serão acrescentadas a você.", referencia: "Mateus 6:33" },
  { texto: "Não te mandei eu? Sê forte e corajoso! Não te apavores nem desanimes, pois o Senhor, o teu Deus, estará contigo por onde quer que andares.", referencia: "Josué 1:9" },
  { texto: "Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos.", referencia: "Filipenses 4:4" },
  { texto: "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.", referencia: "1 Coríntios 13:4" },
  { texto: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias; correrão e não se cansarão; caminharão e não se fatigarão.", referencia: "Isaías 40:31" },
  { texto: "Porque Deus tanto amou o mundo que deu o seu Filho Unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna.", referencia: "João 3:16" },
  { texto: "Não se preocupem com nada, mas em tudo, pela oração e súplicas, com ação de graças, apresentem seus pedidos a Deus.", referencia: "Filipenses 4:6" },
  { texto: "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei?", referencia: "Salmos 27:1" },
  { texto: "Porque eu, o Senhor teu Deus, te seguro pela tua mão direita e te digo: Não temas, eu te ajudo.", referencia: "Isaías 41:13" },
  { texto: "Sede fortes e corajosos. Não temais nem vos assusteis diante deles, pois o Senhor teu Deus é quem vai contigo; não te deixará nem te abandonará.", referencia: "Deuteronômio 31:6" },
  { texto: "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos darei descanso.", referencia: "Mateus 11:28" },
  { texto: "Mas, em todas essas coisas, somos mais que vencedores por meio daquele que nos amou.", referencia: "Romanos 8:37" },
  { texto: "O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.", referencia: "Provérbios 16:9" },
  { texto: "Deus é o nosso refúgio e força, socorro bem presente na angústia.", referencia: "Salmos 46:1" },
  { texto: "Porque nada é impossível para Deus.", referencia: "Lucas 1:37" },
  { texto: "Aquele que habita no esconderijo do Altíssimo, e descansa à sombra do Onipotente, diz ao Senhor: Ele é o meu refúgio, o meu Deus, em quem confio.", referencia: "Salmos 91:1-2" },
];

const SALMOS = [
  { numero: 1, titulo: "O Homem Feliz", texto: "Bem-aventurado o homem que não anda no conselho dos ímpios, nem se detém no caminho dos pecadores, nem se assenta na roda dos escarnecedores. Antes tem o seu prazer na lei do Senhor, e na sua lei medita de dia e de noite. Será como a árvore plantada junto a ribeiros de águas, a qual dá o seu fruto no tempo certo; as suas folhas não cairão, e tudo quanto fizer prosperará." },
  { numero: 23, titulo: "O Senhor é meu Pastor", texto: "O Senhor é o meu pastor; nada me faltará. Ele me faz repousar em pastos verdejantes. Leva-me para junto das águas tranquilas. Refrigera a minha alma. Guia-me pelas veredas da justiça por amor do seu nome. Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; o teu bordão e o teu cajado me consolam." },
  { numero: 27, titulo: "Confiança em Deus", texto: "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei? Quando os malignos se aproximaram de mim para comer a minha carne, foram eles mesmos, meus adversários e meus inimigos, que tropeçaram e caíram. Ainda que um exército se acampasse contra mim, o meu coração não temeria." },
  { numero: 34, titulo: "Louvor pela Libertação", texto: "Bendirei ao Senhor em todo o tempo; o seu louvor estará sempre na minha boca. A minha alma se gloriará no Senhor; os mansos ouvirão isso e se alegrarão. Magnificai o Senhor comigo, e exaltemos o seu nome juntos. Busquei o Senhor, e ele me ouviu, e livrou-me de todos os meus temores." },
  { numero: 46, titulo: "Deus é Nosso Refúgio", texto: "Deus é o nosso refúgio e força, socorro bem presente na angústia. Portanto não temeremos, ainda que a terra se mude, e ainda que os montes se transportem para o meio dos mares. Ainda que as suas águas rujam e se perturbem, e os montes se abalam com a sua braveza." },
  { numero: 91, titulo: "Proteção Divina", texto: "Aquele que habita no esconderijo do Altíssimo, e descansa à sombra do Onipotente, diz ao Senhor: Ele é o meu refúgio, o meu Deus, em quem confio. Porque ele te livrará do laço do passarinheiro, e da peste perniciosa. Ele te cobrirá com as suas penas, e debaixo das suas asas te refugiarás; a sua verdade será o teu escudo e broquel." },
  { numero: 100, titulo: "Louvor ao Senhor", texto: "Celebrai ao Senhor com alegria, toda a terra. Servi ao Senhor com alegria; entrai na sua presença com cântico. Sabei que o Senhor é Deus; foi ele quem nos fez, e não nós a nós mesmos; somos o seu povo e ovelhas do seu pasto." },
  { numero: 103, titulo: "Louvor pela Bondade de Deus", texto: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome. Bendize, ó minha alma, ao Senhor, e não te esqueças de nenhum dos seus benefícios. Ele é quem perdoa todas as tuas iniquidades, quem sara todas as tuas enfermidades." },
  { numero: 121, titulo: "O Senhor é o Nosso Guarda", texto: "Levantarei os meus olhos para os montes; de onde me virá o socorro? O meu socorro vem do Senhor, que fez os céus e a terra. Não deixará vacilar o teu pé; aquele que te guarda não tosquenejará. Eis que não tosquenejará nem dormirá o guarda de Israel." },
  { numero: 139, titulo: "A Onisciência de Deus", texto: "Senhor, tu me sondas e me conheces. Tu sabes quando me sento e quando me levanto; de longe entendes o meu pensamento. Esquadrinhas o meu andar e o meu deitar, e conheces todos os meus caminhos. Pois não há palavra na minha língua que tu, Senhor, não conheças inteiramente." },
];

const SIGNO_EMOJIS: Record<string, string> = {
  "Áries": "♈", "Touro": "♉", "Gêmeos": "♊", "Câncer": "♋",
  "Leão": "♌", "Virgem": "♍", "Libra": "♎", "Escorpião": "♏",
  "Sagitário": "♐", "Capricórnio": "♑", "Aquário": "♒", "Peixes": "♓",
};
const TODOS_SIGNOS = ["Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem", "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"];

function getDailyIndex(total: number): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return dayOfYear % total;
}

// ─── ABA VERSÍCULOS ───────────────────────────────────────────────────────────
function AbaVersiculos() {
  const idx = getDailyIndex(VERSICULOS.length);
  const versiculo = VERSICULOS[idx];
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="border-0 shadow-2xl overflow-hidden">
        <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #9f1239, #c8960c)' }}>
          <p className="text-yellow-200 text-xs font-bold tracking-widest uppercase">Versículo do Dia</p>
        </div>
        <CardContent className="p-10 bg-white text-center">
          <BookMarked className="w-12 h-12 text-rose-400 mx-auto mb-6" />
          <blockquote className="text-2xl font-serif text-slate-800 leading-relaxed mb-6 italic">
            "{versiculo.texto}"
          </blockquote>
          <p className="text-rose-600 font-bold text-lg">{versiculo.referencia}</p>
          <div className="mt-8 flex justify-center">
            <Button variant="outline" size="sm" className="gap-2 text-slate-600"
              onClick={() => {
                const txt = `"${versiculo.texto}" — ${versiculo.referencia}`;
                if (navigator.share) navigator.share({ text: txt });
                else navigator.clipboard.writeText(txt);
              }}>
              <Share2 className="w-4 h-4" /> Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-slate-400 text-xs mt-6">O versículo muda automaticamente a cada novo dia</p>
    </div>
  );
}

// ─── ABA SALMOS ───────────────────────────────────────────────────────────────
function AbaSalmos() {
  const idx = getDailyIndex(SALMOS.length);
  const salmo = SALMOS[idx];
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="border-0 shadow-2xl overflow-hidden">
        <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #92400e, #c8960c)' }}>
          <p className="text-yellow-200 text-xs font-bold tracking-widest uppercase">Salmo do Dia</p>
        </div>
        <CardContent className="p-10 bg-white">
          <div className="text-center mb-6">
            <BookOpen className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-amber-700">Salmo {salmo.numero}</h2>
            <p className="text-slate-500 font-medium mt-1">{salmo.titulo}</p>
          </div>
          <blockquote className="text-lg font-serif text-slate-700 leading-relaxed italic text-center border-l-4 border-amber-400 pl-6 py-2">
            {salmo.texto}
          </blockquote>
          <div className="mt-8 flex justify-center">
            <Button variant="outline" size="sm" className="gap-2 text-slate-600"
              onClick={() => {
                const txt = `Salmo ${salmo.numero} — ${salmo.titulo}\n\n"${salmo.texto}"`;
                if (navigator.share) navigator.share({ text: txt });
                else navigator.clipboard.writeText(txt);
              }}>
              <Share2 className="w-4 h-4" /> Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-slate-400 text-xs mt-6">O salmo muda automaticamente a cada novo dia</p>
    </div>
  );
}

// ─── ABA MINUTOS DE SABEDORIA ─────────────────────────────────────────────────
function AbaMinutosSabedoria() {
  const { data: pensamento, isLoading } = trpc.minutosSabedoria.getDoDia.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: total } = trpc.minutosSabedoria.getCount.useQuery();
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="border-0 shadow-2xl overflow-hidden">
        <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #6d28d9, #c8960c)' }}>
          <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">
            {pensamento ? `Pensamento Nº ${pensamento.numero}` : 'Minutos de Sabedoria'}
          </p>
        </div>
        <CardContent className="p-10 text-center bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Sparkles className="w-16 h-16 text-purple-200 animate-pulse" />
              <p className="text-slate-400">Carregando reflexão...</p>
            </div>
          ) : pensamento ? (
            <>
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #6d28d9, #c8960c)' }} />
              </div>
              {pensamento.titulo && <h2 className="text-xl font-bold text-purple-800 mb-6">{pensamento.titulo}</h2>}
              <div className="text-slate-700 text-base leading-relaxed text-left whitespace-pre-line mb-8 px-2">{pensamento.conteudo}</div>
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #c8960c, #6d28d9)' }} />
              </div>
              <p className="text-xs text-slate-400 italic mb-2">C. Torres Pastorino — <em>Minutos de Sabedoria</em></p>
              {total != null && total > 0 && <p className="text-xs text-slate-300 mt-1">{total} pensamento{total !== 1 ? 's' : ''} disponíve{total !== 1 ? 'is' : 'l'}</p>}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <Sparkles className="w-16 h-16 text-purple-200" />
              <p className="text-slate-500">Nenhum pensamento disponível no momento.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ABA MOTIVACIONAL ─────────────────────────────────────────────────────────
function AbaMotivacional() {
  const { data: mensagem, isLoading } = trpc.mensagensMotivacionais.getDoDia.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: total } = trpc.mensagensMotivacionais.getCount.useQuery();
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="border-0 shadow-2xl overflow-hidden" style={{ background: '#1e293b' }}>
        <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #b45309, #f59e0b)' }}>
          <p className="text-white text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" />
            {mensagem ? `Mensagem Nº ${mensagem.numero}` : 'Mensagem Motivacional'}
            <Trophy className="w-4 h-4" />
          </p>
        </div>
        <CardContent className="p-10 text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Zap className="w-16 h-16 text-amber-400 animate-pulse" />
              <p className="text-slate-400">Carregando sua mensagem do dia...</p>
            </div>
          ) : mensagem ? (
            <>
              <div className="mb-8 flex justify-center">
                <div className="w-20 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #b45309, #f59e0b)' }} />
              </div>
              <div className="text-6xl font-serif text-amber-500/30 leading-none mb-2 text-left">"</div>
              <p className="text-white text-xl font-medium leading-relaxed text-center px-4 mb-4" style={{ fontStyle: 'italic' }}>{mensagem.conteudo}</p>
              <div className="text-6xl font-serif text-amber-500/30 leading-none text-right">"</div>
              <div className="my-6 flex justify-center">
                <div className="w-20 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #b45309)' }} />
              </div>
              {mensagem.autor && <p className="text-amber-400 font-bold text-base tracking-wide uppercase">— {mensagem.autor}</p>}
              {total != null && total > 0 && <p className="text-xs text-slate-500 mt-4">{total} mensagem{total !== 1 ? 's' : ''} disponíve{total !== 1 ? 'is' : 'l'}</p>}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <Zap className="w-16 h-16 text-amber-400/30" />
              <p className="text-slate-400">Nenhuma mensagem disponível no momento.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ABA ORIXÁS ──────────────────────────────────────────────────────────────
const ORIXAS_SEMANA = [
  {
    diaSemana: 0, // Domingo
    nome: 'Oxumaré',
    saudacao: 'Arrô Bô!',
    elemento: 'Arco-íris e Serpente',
    cor: '#f97316',
    corSecundaria: '#fbbf24',
    gradiente: 'linear-gradient(135deg, #f97316, #fbbf24)',
    emoji: '🌈',
    simbolo: '🐍',
    dominio: 'Transformação, renovação e riqueza',
    mensagem: 'Hoje é dia de renovação. Assim como o arco-íris surge após a tempestade, cada dificuldade que você supera abre espaço para novas conquistas. Renove suas metas, sua energia e sua determinação. O ciclo de abundância começa com a sua transformação interior.',
    afirmacao: 'Eu me renovo a cada desafio e atraio prosperidade com minha perseverança.',
  },
  {
    diaSemana: 1, // Segunda-feira
    nome: 'Ogum',
    saudacao: 'Ogum Yê!',
    elemento: 'Ferro e Guerra',
    cor: '#1d4ed8',
    corSecundaria: '#3b82f6',
    gradiente: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    emoji: '⚔️',
    simbolo: '🔱',
    dominio: 'Trabalho, abertura de caminhos e determinação',
    mensagem: 'Ogum abre os caminhos para quem age com determinação e coragem. Na segunda-feira, o início da semana, carregue a força do guerreiro: enfrente cada cliente com confiança, desbrave novos territórios e não recue diante dos obstáculos. O sucesso pertence a quem avança.',
    afirmacao: 'Eu abro meus próprios caminhos com trabalho, coragem e determinação.',
  },
  {
    diaSemana: 2, // Terça-feira
    nome: 'Xangô',
    saudacao: 'Kaô Kabiesilê!',
    elemento: 'Trovão e Fogo',
    cor: '#b91c1c',
    corSecundaria: '#f97316',
    gradiente: 'linear-gradient(135deg, #b91c1c, #f97316)',
    emoji: '⚡',
    simbolo: '🪓',
    dominio: 'Justiça, poder e liderança',
    mensagem: 'Xangô é o senhor da justiça e do poder. Hoje, aja com integridade em cada negociação, seja justo com seus clientes e com você mesmo. A verdadeira liderança nasce de quem age com honestidade. Seu poder de persuasão é maior quando vem da transparência.',
    afirmacao: 'Eu lidero com justiça e honestidade, e minha palavra tem o peso do trovão.',
  },
  {
    diaSemana: 3, // Quarta-feira
    nome: 'Oxóssi',
    saudacao: 'Okê Arô!',
    elemento: 'Floresta e Caça',
    cor: '#15803d',
    corSecundaria: '#22c55e',
    gradiente: 'linear-gradient(135deg, #15803d, #22c55e)',
    emoji: '🏹',
    simbolo: '🌿',
    dominio: 'Prosperidade, foco e conquista',
    mensagem: 'Oxóssi é o caçador que nunca erra o alvo. Na quarta-feira, afie sua mira: identifique seus melhores prospects, foque nas oportunidades certas e não desperdice energia com o que não traz resultado. Um bom caçador conhece o terreno e escolhe o momento certo para agir.',
    afirmacao: 'Eu miro com precisão nas minhas metas e nunca perco o foco do que é importante.',
  },
  {
    diaSemana: 4, // Quinta-feira
    nome: 'Oxalá',
    saudacao: 'Êpa Babá!',
    elemento: 'Paz e Criação',
    cor: '#6b7280',
    corSecundaria: '#e5e7eb',
    gradiente: 'linear-gradient(135deg, #6b7280, #d1d5db)',
    emoji: '🕊️',
    simbolo: '🌟',
    dominio: 'Paz, sabedoria e criação',
    mensagem: 'Oxalá é o pai criador, senhor da paz e da sabedoria. Na quinta-feira, cultive a serenidade nas suas relações: escute mais do que fala, compreenda as necessidades do cliente antes de oferecer soluções. A venda mais poderosa nasce da conexão genuína e da paz no coração.',
    afirmacao: 'Eu ajo com sabedoria e paz, criando conexões verdadeiras que geram resultados duradouros.',
  },
  {
    diaSemana: 5, // Sexta-feira
    nome: 'Oxum',
    saudacao: 'Ora Yeyê Ô!',
    elemento: 'Água Doce e Ouro',
    cor: '#d97706',
    corSecundaria: '#fbbf24',
    gradiente: 'linear-gradient(135deg, #d97706, #fbbf24)',
    emoji: '💛',
    simbolo: '🪙',
    dominio: 'Amor, riqueza e fertilidade',
    mensagem: 'Oxum é a rainha das águas doces, senhora do amor e da prosperidade. Na sexta-feira, deixe fluir sua simpatia e charme natural: construa relacionamentos com seus clientes, mostre que você se importa genuinamente com o bem-estar deles. O ouro de Oxum é a confiança que você conquista.',
    afirmacao: 'Eu fluo com leveza e charme, atraindo prosperidade e relacionamentos que florescem.',
  },
  {
    diaSemana: 6, // Sábado
    nome: 'Iemanjá',
    saudacao: 'Odoyá!',
    elemento: 'Mar e Maternidade',
    cor: '#0369a1',
    corSecundaria: '#38bdf8',
    gradiente: 'linear-gradient(135deg, #0369a1, #38bdf8)',
    emoji: '🌊',
    simbolo: '🐚',
    dominio: 'Proteção, abundância e emoções',
    mensagem: 'Iemanjá é a mãe das águas, protetora e abundante como o mar. No sábado, reflita sobre sua semana: celebre cada conquista, aprenda com cada desafio e renove suas forças para a próxima semana. Assim como o mar nunca para, sua jornada de crescimento também não tem fim.',
    afirmacao: 'Eu sou protegido e abundante. Cada semana me traz novas ondas de oportunidades.',
  },
];

function AbaOrixas() {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const orixa = ORIXAS_SEMANA[diaSemana];
  const [diaSelecionado, setDiaSelecionado] = useState(diaSemana);
  const orixaExibido = ORIXAS_SEMANA[diaSelecionado];
  const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Card principal do Orixá */}
      <Card className="border-0 shadow-2xl overflow-hidden mb-6">
        <div className="px-8 py-4 text-center" style={{ background: orixaExibido.gradiente }}>
          <p className="text-white text-xs font-bold tracking-widest uppercase opacity-80">Mensagem dos Orixás</p>
          <p className="text-white text-2xl font-bold mt-1">{orixaExibido.saudacao}</p>
        </div>
        <CardContent className="p-0">
          {/* Cabeçalho do Orixá */}
          <div className="p-8 pb-4" style={{ background: `${orixaExibido.cor}15` }}>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg flex-shrink-0"
                style={{ background: orixaExibido.gradiente }}>
                {orixaExibido.emoji}
              </div>
              <div>
                <h2 className="text-3xl font-bold" style={{ color: orixaExibido.cor }}>{orixaExibido.nome}</h2>
                <p className="text-slate-500 text-sm mt-0.5">{orixaExibido.elemento}</p>
                <p className="text-slate-600 text-xs mt-1 font-medium">{orixaExibido.dominio}</p>
              </div>
              <div className="ml-auto text-4xl">{orixaExibido.simbolo}</div>
            </div>
          </div>
          {/* Mensagem */}
          <div className="px-8 py-6 bg-white">
            <div className="w-full h-0.5 rounded-full mb-5" style={{ background: orixaExibido.gradiente }} />
            <p className="text-slate-700 text-base leading-relaxed">{orixaExibido.mensagem}</p>
            <div className="mt-6 p-4 rounded-xl border-l-4" style={{ borderColor: orixaExibido.cor, background: `${orixaExibido.cor}10` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: orixaExibido.cor }}>Afirmação do Dia</p>
              <p className="text-slate-700 font-medium italic">"{orixaExibido.afirmacao}"</p>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {diaSelecionado === diaSemana && (
                  <span className="text-xs px-2 py-1 rounded-full font-medium text-white" style={{ background: orixaExibido.cor }}>
                    Hoje
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {diasNomes[diaSelecionado] === diasNomes[diaSemana] ? hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : `${['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][diaSelecionado]}`}
                </span>
              </div>
              <Button variant="outline" size="sm" className="gap-2 text-slate-600"
                onClick={() => {
                  const txt = `${orixaExibido.saudacao}\n\n${orixaExibido.nome} — ${orixaExibido.dominio}\n\n${orixaExibido.mensagem}\n\nAfirmação: "${orixaExibido.afirmacao}"`;
                  if (navigator.share) navigator.share({ text: txt });
                  else navigator.clipboard.writeText(txt);
                }}>
                <Share2 className="w-4 h-4" /> Compartilhar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de dias da semana */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Ver outros dias</p>
        <div className="grid grid-cols-7 gap-1">
          {ORIXAS_SEMANA.map((o, idx) => (
            <button
              key={idx}
              onClick={() => setDiaSelecionado(idx)}
              className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                diaSelecionado === idx
                  ? 'border-current shadow-md scale-105'
                  : idx === diaSemana
                  ? 'border-dashed opacity-80'
                  : 'border-gray-100 hover:border-gray-300 opacity-60 hover:opacity-100'
              }`}
              style={diaSelecionado === idx ? { borderColor: o.cor, background: `${o.cor}15`, color: o.cor } : {}}
            >
              <span className="text-lg">{o.emoji}</span>
              <span className="text-xs font-medium mt-0.5" style={diaSelecionado === idx ? { color: o.cor } : { color: '#64748b' }}>
                {diasNomes[idx]}
              </span>
              {idx === diaSemana && (
                <span className="text-xs font-bold" style={{ color: o.cor }}>•</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-center text-slate-400 text-xs mt-3">• indica o dia de hoje</p>
      </div>
    </div>
  );
}

// ─── ABA HORÓSCOPO ────────────────────────────────────────────────────────────
function AbaHoroscopo() {
  const [signoSelecionado, setSignoSelecionado] = useState("");
  const { data: horoscopo, isLoading, error } = trpc.horoscopo.getHoroscopo.useQuery(
    { signo: signoSelecionado },
    { enabled: !!signoSelecionado, refetchOnWindowFocus: false }
  );
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="border-0 shadow-2xl overflow-hidden">
        <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #1e3a5f, #c8960c)' }}>
          <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">✨ Selecione seu signo</p>
        </div>
        <CardContent className="p-8 bg-white">
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-2">
              {TODOS_SIGNOS.map((signo) => (
                <button key={signo} onClick={() => setSignoSelecionado(signo)}
                  className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all text-xs font-medium ${
                    signoSelecionado === signo ? "border-yellow-500 bg-yellow-50 text-yellow-800" : "border-gray-200 hover:border-blue-300 text-slate-600"
                  }`}>
                  <span className="text-xl">{SIGNO_EMOJIS[signo]}</span>
                  <span className="mt-1 leading-tight text-center">{signo}</span>
                </button>
              ))}
            </div>
          </div>
          {!signoSelecionado && (
            <div className="flex flex-col items-center gap-3 py-6 text-slate-400">
              <Star className="w-12 h-12 text-yellow-200" />
              <p className="text-sm">Escolha seu signo acima para ver o horóscopo de hoje</p>
            </div>
          )}
          {signoSelecionado && isLoading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full" />
              <p className="text-slate-400 text-sm">Buscando e traduzindo horóscopo...</p>
              <p className="text-slate-300 text-xs">Isso pode levar alguns segundos na primeira vez</p>
            </div>
          )}
          {signoSelecionado && error && !isLoading && (
            <div className="text-center py-6 text-red-500 text-sm">Não foi possível carregar o horóscopo. Tente novamente mais tarde.</div>
          )}
          {signoSelecionado && horoscopo && !isLoading && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{SIGNO_EMOJIS[signoSelecionado]}</span>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{signoSelecionado}</h2>
                  <p className="text-xs text-slate-400 capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="w-full h-0.5 rounded-full mb-5" style={{ background: 'linear-gradient(90deg, #1e3a5f, #c8960c)' }} />
              <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">{horoscopo.texto}</p>
              <p className="text-xs text-slate-300 mt-6 text-right">Fonte: Horóscopo Diário</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MensagemDoDiaHub() {
  const params = new URLSearchParams(window.location.search);
  const abaParam = params.get('aba') as Aba | null;
  const abaInicial: Aba = ABAS.find(a => a.id === abaParam) ? abaParam! : 'horoscopo';
  const [aba, setAba] = useState<Aba>(abaInicial);

  const abaInfo = ABAS.find(a => a.id === aba);
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />

      {/* Cabeçalho */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Mensagem do Dia</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{abaInfo?.label} — {hoje}</p>
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
        {aba === 'horoscopo'         && <AbaHoroscopo />}
        {aba === 'minutos-sabedoria' && <AbaMinutosSabedoria />}
        {aba === 'motivacional'      && <AbaMotivacional />}
        {aba === 'salmos'            && <AbaSalmos />}
        {aba === 'versiculos'        && <AbaVersiculos />}
        {aba === 'orixas'            && <AbaOrixas />}
      </div>
    </div>
  );
}
