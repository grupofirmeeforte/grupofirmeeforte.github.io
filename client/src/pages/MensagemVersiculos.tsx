import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { BookMarked, Share2 } from "lucide-react";

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
  { texto: "Portanto, não vos preocupeis com o dia de amanhã, pois o amanhã cuidará de si mesmo. A cada dia basta o seu mal.", referencia: "Mateus 6:34" },
  { texto: "Sede bons uns para com os outros, compassivos, perdoando-vos mutuamente, assim como Deus vos perdoou em Cristo.", referencia: "Efésios 4:32" },
  { texto: "Não te canses de fazer o bem, pois no tempo certo colherás, se não desanimares.", referencia: "Gálatas 6:9" },
  { texto: "Honra ao Senhor com os teus bens e com as primícias de toda a tua renda.", referencia: "Provérbios 3:9" },
  { texto: "A paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.", referencia: "Filipenses 4:7" },
  { texto: "Porque o Senhor é bom; a sua misericórdia dura para sempre, e a sua fidelidade, de geração em geração.", referencia: "Salmos 100:5" },
  { texto: "Porque a palavra de Deus é viva e eficaz, e mais afiada do que qualquer espada de dois gumes.", referencia: "Hebreus 4:12" },
  { texto: "Mas a sabedoria que vem do alto é, antes de tudo, pura; depois, pacífica, moderada, tratável, plena de misericórdia e de bons frutos.", referencia: "Tiago 3:17" },
  { texto: "O Senhor abençoe você e te guarde; o Senhor faça resplandecer o seu rosto sobre você e tenha misericórdia de você.", referencia: "Números 6:24-25" },
  { texto: "Pois o Senhor teu Deus está contigo aonde quer que fores.", referencia: "Josué 1:9" },
];

function getDailyIndex(total: number): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return dayOfYear % total;
}

export default function MensagemVersiculos() {
  const [, navigate] = useLocation();

  const idx = getDailyIndex(VERSICULOS.length);
  const versiculo = VERSICULOS[idx];
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <PageHeader title="Versículos" onBack={() => navigate("/")} />
      <div className="shadow-lg" style={{ background: 'linear-gradient(135deg, #002776 0%, #003d99 60%, #c8960c 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookMarked className="w-6 h-6 text-yellow-300" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-slate-600"
                onClick={() => {
                  const txt = `"${versiculo.texto}" — ${versiculo.referencia}`;
                  if (navigator.share) navigator.share({ text: txt });
                  else navigator.clipboard.writeText(txt);
                }}
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-700 text-xs mt-6">
          O versículo muda automaticamente a cada novo dia
        </p>
      </div>
    </div>
  );
}
