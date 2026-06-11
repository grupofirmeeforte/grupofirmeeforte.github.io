import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { BookOpen, Share2 } from "lucide-react";

const SALMOS = [
  { numero: 1, titulo: "O Homem Feliz", texto: "Bem-aventurado o homem que não anda no conselho dos ímpios, nem se detém no caminho dos pecadores, nem se assenta na roda dos escarnecedores. Antes tem o seu prazer na lei do Senhor, e na sua lei medita de dia e de noite. Será como a árvore plantada junto a ribeiros de águas, a qual dá o seu fruto no tempo certo; as suas folhas não cairão, e tudo quanto fizer prosperará." },
  { numero: 8, titulo: "A Glória de Deus e a Dignidade do Homem", texto: "Ó Senhor, Senhor nosso, quão admirável é o teu nome em toda a terra, pois puseste a tua glória sobre os céus! Quando vejo os teus céus, obra dos teus dedos, a lua e as estrelas que preparaste, que é o homem para que te lembres dele? E o filho do homem, para que o visites? Pois o fizeste por um pouco menor do que os anjos, e de glória e de honra o coroaste." },
  { numero: 19, titulo: "A Criação e a Lei de Deus", texto: "Os céus declaram a glória de Deus, e o firmamento anuncia as obras das suas mãos. Um dia discursa a outro dia, e uma noite revela conhecimento a outra noite. Não há linguagem nem palavras; deles não se ouve nenhum som. No entanto, por toda a terra se faz ouvir a sua voz, e as suas palavras chegam até ao fim do mundo." },
  { numero: 22, titulo: "Clamor de Angústia e Louvor de Libertação", texto: "Deus meu, Deus meu, por que me abandonaste? Por que te alongas do meu auxílio, e das palavras do meu bramido? Deus meu, de dia clamo, e não respondes; e de noite, e não há silêncio para mim. Mas tu és santo, tu que habitas entre os louvores de Israel. Em ti confiaram os nossos pais; confiaram, e tu os livraste." },
  { numero: 23, titulo: "O Senhor é meu Pastor", texto: "O Senhor é o meu pastor; nada me faltará. Ele me faz repousar em pastos verdejantes. Leva-me para junto das águas tranquilas. Refrigera a minha alma. Guia-me pelas veredas da justiça por amor do seu nome. Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; o teu bordão e o teu cajado me consolam." },
  { numero: 27, titulo: "Confiança em Deus", texto: "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei? Quando os malignos se aproximaram de mim para comer a minha carne, foram eles mesmos, meus adversários e meus inimigos, que tropeçaram e caíram. Ainda que um exército se acampasse contra mim, o meu coração não temeria." },
  { numero: 34, titulo: "Louvor pela Libertação", texto: "Bendirei ao Senhor em todo o tempo; o seu louvor estará sempre na minha boca. A minha alma se gloriará no Senhor; os mansos ouvirão isso e se alegrarão. Magnificai o Senhor comigo, e exaltemos o seu nome juntos. Busquei o Senhor, e ele me ouviu, e livrou-me de todos os meus temores. Os que olharam para ele foram iluminados, e os seus rostos não foram envergonhados." },
  { numero: 37, titulo: "Não Invejes os Maus", texto: "Não te indignes por causa dos malfeitores, nem tenhas inveja dos que praticam a iniquidade. Porque serão ceifados como a erva, e murcharão como a erva verde. Confia no Senhor e faz o bem; habitarás na terra e serás alimentado com fidelidade. Deleita-te também no Senhor, e ele te concederá os desejos do teu coração. Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará." },
  { numero: 46, titulo: "Deus é Nosso Refúgio", texto: "Deus é o nosso refúgio e força, socorro bem presente na angústia. Portanto não temeremos, ainda que a terra se mude, e ainda que os montes se transportem para o meio dos mares. Ainda que as suas águas rujam e se perturbem, e os montes se abalam com a sua braveza. Há um rio cujas correntes alegram a cidade de Deus, o santuário das moradas do Altíssimo." },
  { numero: 51, titulo: "Oração de Arrependimento", texto: "Tem misericórdia de mim, ó Deus, segundo a tua benignidade; apaga as minhas transgressões, segundo a multidão das tuas misericórdias. Lava-me completamente da minha iniquidade, e purifica-me do meu pecado. Cria em mim, ó Deus, um coração puro, e renova em mim um espírito reto. Não me lances fora da tua presença, e não retires de mim o teu Espírito Santo." },
  { numero: 62, titulo: "Repouso em Deus", texto: "A minha alma repousa somente em Deus; dele vem a minha salvação. Somente ele é a minha rocha e a minha salvação; ele é o meu alto refúgio; não serei muito abalado. Repousa somente em Deus, ó minha alma, porque dele vem a minha esperança. Somente ele é a minha rocha e a minha salvação; ele é o meu alto refúgio; não serei abalado." },
  { numero: 91, titulo: "Proteção Divina", texto: "Aquele que habita no esconderijo do Altíssimo, e descansa à sombra do Onipotente, diz ao Senhor: Ele é o meu refúgio, o meu Deus, em quem confio. Porque ele te livrará do laço do passarinheiro, e da peste perniciosa. Ele te cobrirá com as suas penas, e debaixo das suas asas te refugiarás; a sua verdade será o teu escudo e broquel." },
  { numero: 100, titulo: "Louvor ao Senhor", texto: "Celebrai ao Senhor com alegria, toda a terra. Servi ao Senhor com alegria; entrai na sua presença com cântico. Sabei que o Senhor é Deus; foi ele quem nos fez, e não nós a nós mesmos; somos o seu povo e ovelhas do seu pasto. Entrai pelas suas portas com ação de graças, e nos seus átrios com louvor; dai-lhe graças e bendizei o seu nome." },
  { numero: 103, titulo: "Louvor pela Bondade de Deus", texto: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome. Bendize, ó minha alma, ao Senhor, e não te esqueças de nenhum dos seus benefícios. Ele é quem perdoa todas as tuas iniquidades, quem sara todas as tuas enfermidades, quem redime a tua vida da cova, quem te coroa de benignidade e de misericórdias." },
  { numero: 121, titulo: "O Senhor é o Nosso Guarda", texto: "Levantarei os meus olhos para os montes; de onde me virá o socorro? O meu socorro vem do Senhor, que fez os céus e a terra. Não deixará vacilar o teu pé; aquele que te guarda não tosquenejará. Eis que não tosquenejará nem dormirá o guarda de Israel. O Senhor é o teu guarda; o Senhor é a tua sombra à tua mão direita." },
  { numero: 139, titulo: "A Onisciência de Deus", texto: "Senhor, tu me sondas e me conheces. Tu sabes quando me sento e quando me levanto; de longe entendes o meu pensamento. Esquadrinhas o meu andar e o meu deitar, e conheces todos os meus caminhos. Pois não há palavra na minha língua que tu, Senhor, não conheças inteiramente. Tu me cercas por detrás e pela frente, e sobre mim pões a tua mão." },
  { numero: 145, titulo: "Louvor à Grandeza de Deus", texto: "Exaltar-te-ei, ó meu Deus e Rei, e bendirei o teu nome para sempre e sempre. Cada dia te bendirei, e louvarei o teu nome para sempre e sempre. Grande é o Senhor, e mui digno de louvor; e a sua grandeza é insondável. Uma geração louvará as tuas obras à outra geração, e anunciará os teus atos poderosos." },
  { numero: 150, titulo: "Louvor Final", texto: "Louvai a Deus no seu santuário; louvai-o no firmamento do seu poder. Louvai-o pelos seus atos poderosos; louvai-o segundo a sua excelente grandeza. Louvai-o com o som de trombeta; louvai-o com saltério e harpa. Louvai-o com adufes e danças; louvai-o com instrumentos de cordas e flauta. Tudo quanto tem fôlego louve ao Senhor! Aleluia!" },
];

function getDailyIndex(total: number): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return dayOfYear % total;
}

export default function MensagemSalmos() {
  const [, navigate] = useLocation();

  const idx = getDailyIndex(SALMOS.length);
  const salmo = SALMOS[idx];
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      <PageHeader title="Salmos" onBack={() => navigate("/")} />
      <div className="shadow-lg" style={{ background: 'linear-gradient(135deg, #002776 0%, #003d99 60%, #c8960c 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-yellow-300" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-slate-600"
                onClick={() => {
                  const txt = `Salmo ${salmo.numero} — ${salmo.titulo}\n\n"${salmo.texto}"`;
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
          O salmo muda automaticamente a cada novo dia
        </p>
      </div>
    </div>
  );
}
