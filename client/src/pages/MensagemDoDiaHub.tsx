import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BookMarked, BookOpen, Sparkles, Star, Zap, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";

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
// Função para selecionar mensagem do dia (muda a cada dia)
function getMensagemDoDia<T>(lista: T[]): T {
  const hoje = new Date();
  const diaAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / 86400000);
  return lista[diaAno % lista.length];
}

const ORIXAS_10 = [
  {
    nome: 'Ogum',
    saudacao: 'Ogum Yê!',
    elemento: 'Ferro, Guerra e Caminhos',
    cor: '#1d4ed8',
    gradiente: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    emoji: '⚔️',
    simbolo: '🔱',
    dominio: 'Trabalho, abertura de caminhos e determinação',
    mensagens: [
      { texto: 'Ogum abre os caminhos para quem age com determinação e coragem. Enfrente cada desafio com a força do guerreiro: não recue diante dos obstáculos, pois o sucesso pertence a quem avança.', afirmacao: 'Eu abro meus próprios caminhos com trabalho, coragem e determinação.' },
      { texto: 'O guerreiro de Ogum não teme batalhas, pois sabe que cada dificuldade é uma oportunidade de provar seu valor. Desbrave novos territórios e conquiste seus objetivos.', afirmacao: 'Sou forte, determinado e nenhum obstáculo é grande demais para mim.' },
      { texto: 'Ogum ensina que a persistência é a arma mais poderosa. Mesmo quando o caminho parece bloqueado, continue avançando — cada passo é uma vitória.', afirmacao: 'Persisto com garra e cada passo me aproxima da minha vitória.' },
      { texto: 'A força de Ogum está em suas mãos hoje. Use-a para construir, para criar, para abrir portas que pareciam fechadas. O trabalho é o seu maior aliado.', afirmacao: 'Minhas mãos trabalham com força e meu espírito não conhece a derrota.' },
      { texto: 'Ogum protege quem age com honra e dedicação. Seja íntegro em cada ação, pois a confiança que você constrói hoje é o seu maior patrimônio.', afirmacao: 'Ajo com honra e integridade, e meu caminho está sempre aberto.' },
      { texto: 'O ferro de Ogum transforma o bruto em precioso. Assim como o ferreiro molda o metal, você tem o poder de moldar sua realidade com esforço e persistência.', afirmacao: 'Tenho o poder de transformar minha realidade com trabalho e dedicação.' },
      { texto: 'Ogum é o senhor dos novos começos. Se algo não está funcionando, é hora de abrir um novo caminho. A coragem de recomeçar é o maior sinal de força.', afirmacao: 'Tenho coragem para recomeçar e sabedoria para escolher novos caminhos.' },
    ],
  },
  {
    nome: 'Oxum',
    saudacao: 'Ora Yeyê Ô!',
    elemento: 'Água Doce e Ouro',
    cor: '#d97706',
    gradiente: 'linear-gradient(135deg, #d97706, #fbbf24)',
    emoji: '💛',
    simbolo: '🪙',
    dominio: 'Amor, riqueza e prosperidade',
    mensagens: [
      { texto: 'Oxum é a rainha das águas doces, senhora do amor e da prosperidade. Deixe fluir sua simpatia e charme natural: construa relacionamentos autênticos, pois o ouro de Oxum é a confiança que você conquista.', afirmacao: 'Eu fluo com leveza e charme, atraindo prosperidade e relacionamentos que florescem.' },
      { texto: 'Como as águas de Oxum que nutrem a terra, seu amor e sua generosidade nutrem tudo ao seu redor. Dê com o coração aberto e receba em abundância.', afirmacao: 'Sou abundante em amor e riqueza. Tudo que ofereço retorna multiplicado.' },
      { texto: 'Oxum ensina que a beleza está em cada detalhe da vida. Valorize o que você tem, cuide do que é seu e atraia mais bens com gratidão e alegria.', afirmacao: 'Sou grato pelo que tenho e atraio mais bens com minha alegria.' },
      { texto: 'A doçura de Oxum é sua maior força. Trate cada pessoa com carinho e respeito, pois é assim que se constroem pontes duradouras e oportunidades verdadeiras.', afirmacao: 'Minha doçura e empatia abrem portas que a força sozinha não abre.' },
      { texto: 'Oxum é a senhora da fertilidade e da criação. Seus projetos estão prontos para florescer — regue-os com atenção, paciência e amor.', afirmacao: 'Meus projetos florescem porque os cuido com amor e dedicação.' },
      { texto: 'O espelho de Oxum reflete sua verdadeira beleza interior. Acredite no seu valor, pois quem se reconhece digno atrai as melhores oportunidades.', afirmacao: 'Reconheço meu valor e atraio oportunidades à altura do meu potencial.' },
      { texto: 'Oxum protege os que buscam a prosperidade com honestidade. Seus esforços serão recompensados — continue fluindo com fé e persistência.', afirmacao: 'Meus esforços honestos são recompensados com prosperidade e alegria.' },
    ],
  },
  {
    nome: 'Xangô',
    saudacao: 'Kaô Kabiesilê!',
    elemento: 'Trovão e Fogo',
    cor: '#b91c1c',
    gradiente: 'linear-gradient(135deg, #b91c1c, #f97316)',
    emoji: '⚡',
    simbolo: '🪣',
    dominio: 'Justiça, poder e liderança',
    mensagens: [
      { texto: 'Xangô é o senhor da justiça e do poder. Aja com integridade em cada negociação, seja justo com todos. A verdadeira liderança nasce de quem age com honestidade.', afirmacao: 'Eu lidero com justiça e honestidade, e minha palavra tem o peso do trovão.' },
      { texto: 'O trovão de Xangô anuncia que a justiça sempre prevalece. Não tema os desafios — enfrente-os com a certeza de que quem age com retidão sempre vence.', afirmacao: 'A justiça está do meu lado e minha integridade é minha maior proteção.' },
      { texto: 'Xangô ensina que o poder verdadeiro vem de dentro. Cultive sua autoconfiança, fale com autoridade e lidere pelo exemplo — as pessoas seguem quem inspira.', afirmacao: 'Tenho autoridade natural e inspiro todos ao meu redor com meu exemplo.' },
      { texto: 'Como o fogo de Xangô que purifica, deixe para trás o que não te serve mais. Renove-se, fortaleça-se e siga em frente com mais clareza e propósito.', afirmacao: 'Me liberto do que não me serve e avanço com clareza e propósito.' },
      { texto: 'Xangô é o rei que julga com sabedoria. Tome decisões importantes com calma e equilíbrio — a pressa é inimiga da boa escolha.', afirmacao: 'Tomo decisões sábias e equilibradas que me levam ao sucesso.' },
      { texto: 'O fogo de Xangô aquece e ilumina. Seja a luz que guia sua equipe, sua família e seus clientes. Quem ilumina o caminho dos outros nunca anda no escuro.', afirmacao: 'Sou luz e referência para todos ao meu redor.' },
      { texto: 'Xangô protege os que buscam a verdade. Seja transparente em suas relações, pois a confiança é o alicerce de toda parceria duradoura.', afirmacao: 'Minha transparência e verdade constroem relações sólidas e duradouras.' },
    ],
  },
  {
    nome: 'Oxóssi',
    saudacao: 'Okê Arô!',
    elemento: 'Floresta e Caça',
    cor: '#15803d',
    gradiente: 'linear-gradient(135deg, #15803d, #22c55e)',
    emoji: '🏹',
    simbolo: '🌿',
    dominio: 'Prosperidade, foco e conquista',
    mensagens: [
      { texto: 'Oxóssi é o caçador que nunca erra o alvo. Afie sua mira: identifique suas melhores oportunidades, foque no que traz resultado e não desperdice energia com o que não vale.', afirmacao: 'Eu miro com precisão nas minhas metas e nunca perco o foco do que é importante.' },
      { texto: 'O caçador de Oxóssi conhece a floresta como a palma da mão. Estude seu mercado, conheça seus clientes e esteja sempre um passo à frente da concorrência.', afirmacao: 'Conheço meu terreno e ajo com precisão e inteligência.' },
      { texto: 'Oxóssi ensina que a prosperidade vem para quem é paciente e persistente. O caçador espera o momento certo para agir — e quando age, não erra.', afirmacao: 'Tenho paciência e precisão. Ajo no momento certo e alcanço meus objetivos.' },
      { texto: 'A floresta de Oxóssi é cheia de riquezas para quem sabe onde procurar. Abra os olhos para as oportunidades ao seu redor — elas estão mais próximas do que você imagina.', afirmacao: 'Vejo oportunidades onde outros vêem obstáculos.' },
      { texto: 'Oxóssi é o senhor da abundância natural. Cultive o que você planta com cuidado e dedicação, e a colheita será farta e generosa.', afirmacao: 'Planto com cuidado e colho com abundância.' },
      { texto: 'O arco de Oxóssi simboliza o foco total. Elimine as distrações, concentre-se no que realmente importa e sua produtividade vai disparar.', afirmacao: 'Meu foco é total e minha produtividade é máxima.' },
      { texto: 'Oxóssi protege os que respeitam a natureza e os ciclos da vida. Respeite seus próprios limites, descanse quando preciso e volte mais forte.', afirmacao: 'Respeito meus ciclos e volto sempre mais forte e renovado.' },
    ],
  },
  {
    nome: 'Oxalá',
    saudacao: 'Êpa Babá!',
    elemento: 'Paz e Criação',
    cor: '#6b7280',
    gradiente: 'linear-gradient(135deg, #6b7280, #d1d5db)',
    emoji: '🕊️',
    simbolo: '🌟',
    dominio: 'Paz, sabedoria e criação',
    mensagens: [
      { texto: 'Oxalá é o pai criador, senhor da paz e da sabedoria. Cultive a serenidade nas suas relações: escute mais do que fala, pois a venda mais poderosa nasce da conexão genuína.', afirmacao: 'Ajo com sabedoria e paz, criando conexões verdadeiras que geram resultados duradouros.' },
      { texto: 'A brancura de Oxalá simboliza a pureza de intenções. Aja sempre com sinceridade e boa-fé, pois quem tem a consciência limpa caminha com mais leveza e confiança.', afirmacao: 'Minhas intenções são puras e meu caminho é iluminado.' },
      { texto: 'Oxalá ensina que a paciência é uma virtude divina. Nem tudo acontece no nosso tempo — confie no processo e saiba que cada etapa tem seu propósito.', afirmacao: 'Confio no processo e sei que tudo acontece no tempo certo.' },
      { texto: 'O bastão de Oxalá sustenta e guia. Seja o apoio que as pessoas ao seu redor precisam — quem sustenta os outros é sustentado por forças maiores.', afirmacao: 'Sou apoio e referência para todos ao meu redor.' },
      { texto: 'Oxalá é o criador de todas as coisas. Você também tem o poder de criar — use sua criatividade e imaginação para encontrar soluções inovadoras.', afirmacao: 'Sou criativo e inovador. Encontro soluções onde outros vêem problemas.' },
      { texto: 'A paz de Oxalá não é ausência de conflito, mas presença de equilíbrio. Mantenha a calma nos momentos difíceis — é aí que os verdadeiros líderes se revelam.', afirmacao: 'Mantenho minha paz interior mesmo diante dos maiores desafios.' },
      { texto: 'Oxalá abençoa os que buscam o bem coletivo. Pense no impacto positivo que suas ações têm na vida das pessoas ao seu redor.', afirmacao: 'Minhas ações geram impacto positivo e abençoam a todos ao meu redor.' },
    ],
  },
  {
    nome: 'Iemanjá',
    saudacao: 'Odoyá!',
    elemento: 'Mar e Maternidade',
    cor: '#0369a1',
    gradiente: 'linear-gradient(135deg, #0369a1, #38bdf8)',
    emoji: '🌊',
    simbolo: '🐚',
    dominio: 'Proteção, abundância e emoções',
    mensagens: [
      { texto: 'Iemanjá é a mãe das águas, protetora e abundante como o mar. Celebre cada conquista, aprenda com cada desafio e renove suas forças. Assim como o mar nunca para, sua jornada também não tem fim.', afirmacao: 'Sou protegido e abundante. Cada dia me traz novas ondas de oportunidades.' },
      { texto: 'O mar de Iemanjá é vasto e profundo. Assim como ele, você tem uma capacidade ilimitada de crescer, aprender e se renovar. Não subestime seu próprio potencial.', afirmacao: 'Meu potencial é ilimitado e estou sempre crescendo.' },
      { texto: 'Iemanjá ensina que as marés sobem e descem, mas o mar permanece. Nos momentos difíceis, lembre-se: isso também vai passar, e você sairá mais forte.', afirmacao: 'Supero as marés da vida e sempre emerjo mais forte e sábio.' },
      { texto: 'A proteção de Iemanjá envolve seus filhos como as águas do mar. Sinta-se amparado e seguro para arriscar, criar e crescer sem medo.', afirmacao: 'Sou amparado e protegido. Avanço com confiança em direção aos meus sonhos.' },
      { texto: 'Iemanjá é a rainha da fertilidade e da abundância. Tudo que você semeia com amor e dedicação será colhido em grande quantidade.', afirmacao: 'Colho abundância em tudo que semeio com amor e dedicação.' },
      { texto: 'As águas de Iemanjá limpam e purificam. Liberte-se de mágoas, ressentimentos e pensamentos negativos — a leveza que você sentirá atrairá coisas boas.', afirmacao: 'Me liberto do passado e atraio leveza, alegria e prosperidade.' },
      { texto: 'Iemanjá abençoa os que cuidam dos outros. Sua generosidade e cuidado com as pessoas ao seu redor serão recompensados com lealdade e gratidão.', afirmacao: 'Meu cuidado com os outros retorna para mim em forma de lealdade e abundância.' },
    ],
  },
  {
    nome: 'Iansã',
    saudacao: 'Epà Héi!',
    elemento: 'Vento e Tempestade',
    cor: '#7c3aed',
    gradiente: 'linear-gradient(135deg, #7c3aed, #c026d3)',
    emoji: '🌪️',
    simbolo: '⚡',
    dominio: 'Coragem, transformação e liberdade',
    mensagens: [
      { texto: 'Iansã é a senhora dos ventos e das tempestades, guerreira destemida. Enfrente seus medos de frente — a coragem não é a ausência do medo, mas a decisão de agir apesar dele.', afirmacao: 'Sou corajoso e destemido. Enfrento qualquer tempestade com força e determinação.' },
      { texto: 'Como o vento de Iansã que varre o velho para dar lugar ao novo, é hora de liberar o que já não serve. A transformação que você busca começa com a coragem de mudar.', afirmacao: 'Abraço a mudança com coragem e sei que o novo que chega é melhor.' },
      { texto: 'Iansã ensina que a liberdade é um direito sagrado. Liberte-se das limitações que você mesmo se impõe e voe tão alto quanto seus sonhos permitirem.', afirmacao: 'Sou livre para sonhar alto e realizar tudo que desejo.' },
      { texto: 'A guerreira Iansã nunca recua. Quando a vida apresentar obstáculos, lembre-se: você foi feito para superar, não para se render.', afirmacao: 'Fui feito para superar e nunca me rendo diante dos desafios.' },
      { texto: 'Os ventos de Iansã trazem mudanças necessárias. Abrace as transformações em sua vida — elas estão te levando para um lugar melhor.', afirmacao: 'Abraço as transformações sabendo que elas me levam a um lugar melhor.' },
      { texto: 'Iansã é a senhora da intuição e da percepção aguçada. Confie no que seu coração sente — sua intuição é um guia poderoso.', afirmacao: 'Confio na minha intuição e ela sempre me guia pelo caminho certo.' },
      { texto: 'A tempestade de Iansã purifica e renova. Após cada dificuldade, você emerge mais forte, mais sábio e mais preparado para o que vem pela frente.', afirmacao: 'Cada dificuldade me torna mais forte e mais preparado para o sucesso.' },
    ],
  },
  {
    nome: 'Omolu',
    saudacao: 'Atotô!',
    elemento: 'Terra e Cura',
    cor: '#92400e',
    gradiente: 'linear-gradient(135deg, #92400e, #d97706)',
    emoji: '🌻',
    simbolo: '💀',
    dominio: 'Saúde, cura e renovação',
    mensagens: [
      { texto: 'Omolu é o senhor da cura e da renovação. Cuide do seu corpo, da sua mente e do seu espírito — a saúde é o seu maior bem e o alicerce de todas as suas conquistas.', afirmacao: 'Cuido de mim com amor e minha saúde é minha maior riqueza.' },
      { texto: 'Omolu ensina que toda ferida pode ser curada. Independente dos erros do passado, você tem o poder de se curar, se renovar e recomeçar com mais sabedoria.', afirmacao: 'Tenho o poder de me curar e recomeçar sempre mais forte.' },
      { texto: 'A força de Omolu vem da terra, firme e sólida. Construa suas bases com solidez: invista em conhecimento, em relacionamentos e em sua saúde.', afirmacao: 'Minhas bases são sólidas e construo meu futuro com firmeza.' },
      { texto: 'Omolu é o protetor dos mais humildes. Lembre-se de que a humildade é uma virtude poderosa — quem se mantém humilde continua aprendendo e crescendo.', afirmacao: 'Sou humilde o suficiente para aprender e forte o suficiente para crescer.' },
      { texto: 'A cura de Omolu é profunda e transformadora. Liberte-se de hábitos que te prejudicam e adote práticas que nutram seu corpo, mente e alma.', afirmacao: 'Me liberto de hábitos negativos e adoto práticas que me fortalecem.' },
      { texto: 'Omolu conhece os ciclos da vida e da morte. Cada fim é um novo começo — o que termina em sua vida abre espaço para algo ainda melhor.', afirmacao: 'Cada fim em minha vida abre espaço para um começo ainda mais glorioso.' },
      { texto: 'A sabedoria de Omolu vem da experiência. Cada desafio que você enfrentou te tornou mais sábio — use esse conhecimento para guiar seus próximos passos.', afirmacao: 'Minha experiência é minha maior riqueza e me guia com sabedoria.' },
    ],
  },
  {
    nome: 'Nanã',
    saudacao: 'Saluba Nanã!',
    elemento: 'Água Parada e Lama',
    cor: '#6d28d9',
    gradiente: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
    emoji: '💜',
    simbolo: '🌿',
    dominio: 'Sabedoria ancestral e proteção',
    mensagens: [
      { texto: 'Nanã é a mais velha das águas, guardiã da sabedoria ancestral. Honre suas raízes, aprenda com os mais velhos e carregue com orgulho a herança de quem veio antes de você.', afirmacao: 'Honro minhas raízes e carrego a sabedoria dos meus ancestrais.' },
      { texto: 'A lama de Nanã é a origem de toda vida. Do que parece difícil e pesado, nasce a maior fertilidade — seus desafios são o adubo do seu crescimento.', afirmacao: 'Meus desafios são o adubo que nutre meu crescimento e sucesso.' },
      { texto: 'Nanã ensina que a paciência é a virtude dos sábios. Não se apresse — o que é seu chegará no tempo certo, mais maduro e mais valioso.', afirmacao: 'Tenho paciência sábia e sei que o que é meu chega no tempo perfeito.' },
      { texto: 'A proteção de Nanã é profunda como as águas antigas. Sinta-se amparado pela força dos seus ancestrais — você nunca está sozinho.', afirmacao: 'Sou amparado pela força dos meus ancestrais e nunca estou sozinho.' },
      { texto: 'Nanã guarda os segredos da vida e da morte. Respeite os ciclos naturais e saiba que tudo tem seu tempo — inclusive suas conquistas.', afirmacao: 'Respeito os ciclos da vida e confio que minhas conquistas chegam no tempo certo.' },
      { texto: 'A sabedoria de Nanã é acumulada ao longo de eras. Invista em seu aprendizado contínuo — cada novo conhecimento é uma ferramenta poderosa para o seu sucesso.', afirmacao: 'Invisto em meu crescimento contínuo e cada dia fico mais sábio e capaz.' },
      { texto: 'Nanã é a mãe que acolhe todos os seus filhos. Acolha-se também — trate-se com a mesma compaixão que você oferece aos outros.', afirmacao: 'Me acolho com amor e compaixão, e isso me fortalece para ajudar os outros.' },
    ],
  },
  {
    nome: 'Oxumaré',
    saudacao: 'Arrô Bô!',
    elemento: 'Arco-íris e Serpente',
    cor: '#f97316',
    gradiente: 'linear-gradient(135deg, #f97316, #fbbf24)',
    emoji: '🌈',
    simbolo: '🐍',
    dominio: 'Transformação, renovação e riqueza',
    mensagens: [
      { texto: 'Oxumaré é o arco-íris que conecta o céu e a terra. Assim como ele, você tem o poder de conectar mundos diferentes e criar pontes que geram oportunidades únicas.', afirmacao: 'Eu me renovo a cada desafio e atraio prosperidade com minha perseverança.' },
      { texto: 'A serpente de Oxumaré troca de pele e se renova. Você também tem esse poder — liberte-se do que já não serve e emerge renovado, mais forte e mais brilhante.', afirmacao: 'Me renovo constantemente e cada versão minha é melhor que a anterior.' },
      { texto: 'Oxumaré representa os ciclos eternos da vida. Confie que após cada período difícil vem um arco-íris — a recompensa pelo que você suportou com fé.', afirmacao: 'Confio nos ciclos da vida e sei que após a chuva sempre vem o arco-íris.' },
      { texto: 'As cores de Oxumaré representam a diversidade e a riqueza da vida. Abrace todas as suas facetas — suas diferenças são seus maiores talentos.', afirmacao: 'Abraço minha diversidade e cada aspecto meu é um talento único.' },
      { texto: 'Oxumaré é o senhor da riqueza que circula. O dinheiro, como a serpente, precisa se mover — invista, compartilhe e faça circular sua prosperidade.', afirmacao: 'Minha prosperidade circula e se multiplica a cada dia.' },
      { texto: 'O arco-íris de Oxumaré aparece após a tempestade. Seus melhores momentos estão por vir — cada dificuldade é apenas o prenuncio de algo maravilhoso.', afirmacao: 'Meus melhores momentos estão por vir e estou pronto para recebê-los.' },
      { texto: 'Oxumaré conecta o passado e o futuro em um ciclo eterno. Use as lições do passado para construir um futuro brilhante e cheio de possibilidades.', afirmacao: 'Uso as lições do passado para construir um futuro extraordinário.' },
    ],
  },
];

function AbaOrixas() {
  const [orixaSelecionado, setOrixaSelecionado] = useState(0);
  const orixa = ORIXAS_10[orixaSelecionado];
  const mensagemHoje = getMensagemDoDia(orixa.mensagens);

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">

      {/* Seletor dos 10 Orixás */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Escolha seu Orixá</p>
        <div className="grid grid-cols-5 gap-2">
          {ORIXAS_10.map((o, idx) => (
            <button
              key={idx}
              onClick={() => setOrixaSelecionado(idx)}
              className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                orixaSelecionado === idx ? 'shadow-md scale-105' : 'border-gray-100 hover:border-gray-300 opacity-70 hover:opacity-100'
              }`}
              style={orixaSelecionado === idx ? { borderColor: o.cor, background: `${o.cor}18` } : {}}
            >
              <span className="text-2xl">{o.emoji}</span>
              <span className="text-[10px] font-semibold mt-1 leading-tight text-center" style={orixaSelecionado === idx ? { color: o.cor } : { color: '#64748b' }}>
                {o.nome}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Card da mensagem do Orixá selecionado */}
      <Card className="border-0 shadow-2xl overflow-hidden">
        <div className="px-8 py-5 text-center" style={{ background: orixa.gradiente }}>
          <p className="text-white text-xs font-bold tracking-widest uppercase opacity-80">Mensagem dos Orixás</p>
          <p className="text-white text-2xl font-bold mt-1">{orixa.saudacao}</p>
        </div>
        <CardContent className="p-0">
          <div className="p-6 pb-4" style={{ background: `${orixa.cor}15` }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg flex-shrink-0"
                style={{ background: orixa.gradiente }}>
                {orixa.emoji}
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: orixa.cor }}>{orixa.nome}</h2>
                <p className="text-slate-500 text-sm mt-0.5">{orixa.elemento}</p>
                <p className="text-slate-600 text-xs mt-1 font-medium">{orixa.dominio}</p>
              </div>
              <div className="ml-auto text-3xl">{orixa.simbolo}</div>
            </div>
          </div>
          <div className="px-6 py-5 bg-white">
            <div className="w-full h-0.5 rounded-full mb-4" style={{ background: orixa.gradiente }} />
            <p className="text-slate-700 text-base leading-relaxed">{mensagemHoje.texto}</p>
            <div className="mt-5 p-4 rounded-xl border-l-4" style={{ borderColor: orixa.cor, background: `${orixa.cor}10` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: orixa.cor }}>Afirmação do Dia</p>
              <p className="text-slate-700 font-medium italic">"{mensagemHoje.afirmacao}"</p>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" size="sm" className="gap-2 text-slate-600"
                onClick={() => {
                  const txt = `${orixa.saudacao}\n\n${orixa.nome} — ${orixa.dominio}\n\n${mensagemHoje.texto}\n\nAfirmação: "${mensagemHoje.afirmacao}"`;
                  if (navigator.share) navigator.share({ text: txt });
                  else navigator.clipboard.writeText(txt);
                }}>
                <Share2 className="w-4 h-4" /> Compartilhar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ABA HORÓSCOPO ────────────────────────────────────────────────────────────
function AbaHoroscopo() {
  const { user } = useAuth();
  const signoDoAgente = (user as any)?.signo || "";
  const [signoSelecionado, setSignoSelecionado] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // Inicializar automaticamente com o signo do agente logado quando carregar
  useEffect(() => {
    if (signoDoAgente && !signoSelecionado) {
      setSignoSelecionado(signoDoAgente);
    }
  }, [signoDoAgente]);

  const { data: horoscopo, isLoading, error } = trpc.horoscopo.getHoroscopo.useQuery(
    { signo: signoSelecionado },
    { enabled: !!signoSelecionado, refetchOnWindowFocus: false }
  );
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="border-0 shadow-2xl overflow-hidden">
        <div className="px-8 py-3 text-center" style={{ background: 'linear-gradient(135deg, #1e3a5f, #c8960c)' }}>
          {signoDoAgente ? (
            <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">✨ Seu Horóscopo — {signoDoAgente} {SIGNO_EMOJIS[signoDoAgente]}</p>
          ) : (
            <p className="text-yellow-300 text-xs font-bold tracking-widest uppercase">✨ Selecione seu signo</p>
          )}
        </div>
        <CardContent className="p-8 bg-white">
          {/* Botão para trocar signo */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setMostrarTodos(!mostrarTodos)}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              {mostrarTodos ? "Ocultar seletor" : "Trocar signo"}
            </button>
          </div>

          {/* Seletor de signos (expandível) */}
          {mostrarTodos && (
            <div className="mb-6">
              <div className="grid grid-cols-4 gap-2">
                {TODOS_SIGNOS.map((signo) => (
                  <button key={signo} onClick={() => { setSignoSelecionado(signo); setMostrarTodos(false); }}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all text-xs font-medium ${
                      signoSelecionado === signo ? "border-yellow-500 bg-yellow-50 text-yellow-800" : "border-gray-200 hover:border-blue-300 text-slate-600"
                    }`}>
                    <span className="text-xl">{SIGNO_EMOJIS[signo]}</span>
                    <span className="mt-1 leading-tight text-center">{signo}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!signoSelecionado && !signoDoAgente && (
            <div className="flex flex-col items-center gap-3 py-6 text-slate-400">
              <Star className="w-12 h-12 text-yellow-200" />
              <p className="text-sm">Clique em "Trocar signo" acima para ver o horóscopo de hoje</p>
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
