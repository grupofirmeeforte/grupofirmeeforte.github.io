/**
 * Seed: 140 novas mensagens motivacionais
 * Executa via: node scripts/seed-motivacionais.mjs
 */
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não encontrada');
  process.exit(1);
}

const mensagens = [
  // Fé e espiritualidade
  { texto: "Tudo posso naquele que me fortalece. — Filipenses 4:13", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "O Senhor é o meu pastor e nada me faltará. — Salmos 23:1", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento. — Provérbios 3:5", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "Porque Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio. — 2 Timóteo 1:7", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "Buscai primeiro o reino de Deus e a sua justiça, e todas essas coisas vos serão acrescentadas. — Mateus 6:33", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos. — Hebreus 11:1", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus. — Isaías 41:10", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará. — Salmos 37:5", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "O justo viverá pela fé. — Romanos 1:17", autor: "Bíblia Sagrada", categoria: "fé" },
  { texto: "Sede fortes e corajosos. Não temais nem vos assusteis diante deles, pois o Senhor teu Deus vai contigo. — Deuteronômio 31:6", autor: "Bíblia Sagrada", categoria: "fé" },

  // Liderança
  { texto: "Um líder é aquele que conhece o caminho, percorre o caminho e mostra o caminho.", autor: "John C. Maxwell", categoria: "liderança" },
  { texto: "A função do líder é produzir mais líderes, não mais seguidores.", autor: "Ralph Nader", categoria: "liderança" },
  { texto: "Liderar é influenciar pessoas para que ajam de acordo com um propósito.", autor: "Oswald Sanders", categoria: "liderança" },
  { texto: "O maior líder não é necessariamente aquele que faz as maiores coisas. É aquele que faz as pessoas fazerem as maiores coisas.", autor: "Ronald Reagan", categoria: "liderança" },
  { texto: "Antes de ser um líder, o sucesso é sobre crescer a si mesmo. Quando você se torna um líder, o sucesso é sobre crescer os outros.", autor: "Jack Welch", categoria: "liderança" },
  { texto: "Um bom líder leva as pessoas para onde elas querem ir. Um grande líder leva as pessoas para onde elas precisam ir.", autor: "Rosalynn Carter", categoria: "liderança" },
  { texto: "Liderança é a capacidade de transformar visão em realidade.", autor: "Warren Bennis", categoria: "liderança" },
  { texto: "O segredo de uma liderança bem-sucedida é o desempenho, não a popularidade.", autor: "Colin Powell", categoria: "liderança" },
  { texto: "Não espere por líderes; faça você mesmo, pessoa a pessoa.", autor: "Madre Teresa de Calcutá", categoria: "liderança" },
  { texto: "Líderes excepcionais não nascem prontos — eles são forjados na adversidade.", autor: "Desconhecido", categoria: "liderança" },

  // Vendas e negócios
  { texto: "Vender não é empurrar produtos. É ajudar pessoas a resolverem problemas.", autor: "Desconhecido", categoria: "vendas" },
  { texto: "O sucesso em vendas começa com a crença no que você vende.", autor: "Desconhecido", categoria: "vendas" },
  { texto: "Cada 'não' te aproxima de um 'sim'.", autor: "Desconhecido", categoria: "vendas" },
  { texto: "A persistência é o caminho do êxito.", autor: "Charles Chaplin", categoria: "vendas" },
  { texto: "Faça um cliente, não uma venda.", autor: "Katherine Barchetti", categoria: "vendas" },
  { texto: "O melhor vendedor é aquele que ouve mais do que fala.", autor: "Desconhecido", categoria: "vendas" },
  { texto: "Pessoas não compram produtos ou serviços. Elas compram relações, histórias e magia.", autor: "Seth Godin", categoria: "vendas" },
  { texto: "A diferença entre uma boa e uma excelente venda é o relacionamento.", autor: "Desconhecido", categoria: "vendas" },
  { texto: "Venda com entusiasmo. O entusiasmo é contagioso.", autor: "Desconhecido", categoria: "vendas" },
  { texto: "Sua atitude, não sua aptidão, vai determinar sua altitude.", autor: "Zig Ziglar", categoria: "vendas" },
  { texto: "O sucesso não é final, o fracasso não é fatal: é a coragem de continuar que conta.", autor: "Winston Churchill", categoria: "vendas" },
  { texto: "Cada cliente é uma oportunidade de fazer a diferença.", autor: "Desconhecido", categoria: "vendas" },

  // Perseverança
  { texto: "Caia sete vezes, levante-se oito.", autor: "Provérbio Japonês", categoria: "perseverança" },
  { texto: "A diferença entre o impossível e o possível está na determinação de uma pessoa.", autor: "Tommy Lasorda", categoria: "perseverança" },
  { texto: "Não é o mais forte que sobrevive, nem o mais inteligente, mas o que melhor se adapta às mudanças.", autor: "Charles Darwin", categoria: "perseverança" },
  { texto: "Grandes realizações geralmente requerem grande sacrifício e nunca são resultado de egoísmo.", autor: "Napoleon Hill", categoria: "perseverança" },
  { texto: "O caminho para o sucesso e o caminho para o fracasso são quase exatamente os mesmos.", autor: "Colin R. Davis", categoria: "perseverança" },
  { texto: "Não desista. O começo é sempre o mais difícil.", autor: "Desconhecido", categoria: "perseverança" },
  { texto: "A paciência é amarga, mas seu fruto é doce.", autor: "Jean-Jacques Rousseau", categoria: "perseverança" },
  { texto: "Aquele que tem um porquê para viver pode suportar quase qualquer como.", autor: "Friedrich Nietzsche", categoria: "perseverança" },
  { texto: "A persistência é o veículo que você usa para chegar ao sucesso.", autor: "Desconhecido", categoria: "perseverança" },
  { texto: "Sonhos não funcionam a menos que você trabalhe.", autor: "John C. Maxwell", categoria: "perseverança" },
  { texto: "Tudo parece impossível até que seja feito.", autor: "Nelson Mandela", categoria: "perseverança" },
  { texto: "Quando você sentir vontade de desistir, lembre-se por que começou.", autor: "Desconhecido", categoria: "perseverança" },
  { texto: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", autor: "Robert Collier", categoria: "perseverança" },
  { texto: "Não importa o quão devagar você vá, desde que não pare.", autor: "Confúcio", categoria: "perseverança" },
  { texto: "A força não vem da capacidade física. Vem de uma vontade indomável.", autor: "Mahatma Gandhi", categoria: "perseverança" },

  // Crescimento pessoal
  { texto: "Invista em você mesmo. Seu retorno é garantido.", autor: "Desconhecido", categoria: "crescimento" },
  { texto: "Aprenda como se fosse viver para sempre, viva como se fosse morrer amanhã.", autor: "Mahatma Gandhi", categoria: "crescimento" },
  { texto: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.", autor: "Nelson Mandela", categoria: "crescimento" },
  { texto: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", autor: "Vidal Sassoon", categoria: "crescimento" },
  { texto: "Não espere por uma oportunidade. Crie-a.", autor: "George Bernard Shaw", categoria: "crescimento" },
  { texto: "Seja a mudança que você deseja ver no mundo.", autor: "Mahatma Gandhi", categoria: "crescimento" },
  { texto: "O sucesso é ir de fracasso em fracasso sem perder o entusiasmo.", autor: "Winston Churchill", categoria: "crescimento" },
  { texto: "Você não pode voltar atrás e mudar o começo, mas pode começar onde está e mudar o final.", autor: "C.S. Lewis", categoria: "crescimento" },
  { texto: "Acredite que você pode e você está no meio do caminho.", autor: "Theodore Roosevelt", categoria: "crescimento" },
  { texto: "O maior risco é não correr nenhum risco.", autor: "Mark Zuckerberg", categoria: "crescimento" },
  { texto: "Não limite seus desafios. Desafie seus limites.", autor: "Desconhecido", categoria: "crescimento" },
  { texto: "Você é mais corajoso do que acredita, mais forte do que parece e mais inteligente do que pensa.", autor: "A.A. Milne", categoria: "crescimento" },
  { texto: "O sucesso é a melhor vingança.", autor: "Frank Sinatra", categoria: "crescimento" },
  { texto: "Faça hoje o que outros não farão para ter amanhã o que outros não terão.", autor: "Jerry Rice", categoria: "crescimento" },

  // Família e propósito
  { texto: "A família é o primeiro ambiente onde aprendemos a amar e a ser amados.", autor: "Desconhecido", categoria: "família" },
  { texto: "O lar é onde o coração está.", autor: "Plínio, o Velho", categoria: "família" },
  { texto: "Trabalhe duro em silêncio. Deixe o sucesso fazer o barulho.", autor: "Frank Ocean", categoria: "propósito" },
  { texto: "O propósito da vida é uma vida com propósito.", autor: "Robert Byrne", categoria: "propósito" },
  { texto: "Descubra o que você ama e faça isso pelo resto da vida.", autor: "Desconhecido", categoria: "propósito" },
  { texto: "Quando o trabalho é um prazer, a vida é uma alegria.", autor: "Máximo Gorki", categoria: "propósito" },
  { texto: "Faça o que você pode, com o que você tem, onde você está.", autor: "Theodore Roosevelt", categoria: "propósito" },
  { texto: "O sucesso não é a chave para a felicidade. A felicidade é a chave para o sucesso.", autor: "Albert Schweitzer", categoria: "propósito" },

  // Atitude e mentalidade
  { texto: "A vida é 10% o que acontece com você e 90% como você reage a isso.", autor: "Charles R. Swindoll", categoria: "atitude" },
  { texto: "Sua atitude determina sua direção.", autor: "Desconhecido", categoria: "atitude" },
  { texto: "Pense positivo e coisas positivas acontecerão.", autor: "Desconhecido", categoria: "atitude" },
  { texto: "O otimismo é a fé que leva à conquista.", autor: "Helen Keller", categoria: "atitude" },
  { texto: "Mantenha seu rosto voltado para o sol e as sombras ficarão para trás.", autor: "Walt Whitman", categoria: "atitude" },
  { texto: "A mente que se abre a uma nova ideia jamais voltará ao seu tamanho original.", autor: "Albert Einstein", categoria: "atitude" },
  { texto: "Você se torna aquilo em que você pensa.", autor: "Earl Nightingale", categoria: "atitude" },
  { texto: "Mude seus pensamentos e você mudará seu mundo.", autor: "Norman Vincent Peale", categoria: "atitude" },
  { texto: "A felicidade não é algo pronto. Ela vem de suas próprias ações.", autor: "Dalai Lama", categoria: "atitude" },
  { texto: "Não deixe que o medo de perder seja maior do que a emoção de ganhar.", autor: "Robert Kiyosaki", categoria: "atitude" },
  { texto: "Comece onde você está. Use o que você tem. Faça o que você pode.", autor: "Arthur Ashe", categoria: "atitude" },
  { texto: "A vida começa no fim da sua zona de conforto.", autor: "Neale Donald Walsch", categoria: "atitude" },
  { texto: "Seja tão bom que eles não possam te ignorar.", autor: "Steve Martin", categoria: "atitude" },
  { texto: "Acredite em si mesmo e chegará um dia em que os outros não terão outra escolha senão acreditar em você.", autor: "Cynthia Kersey", categoria: "atitude" },
  { texto: "Você não precisa ser ótimo para começar, mas precisa começar para ser ótimo.", autor: "Zig Ziglar", categoria: "atitude" },

  // Disciplina e foco
  { texto: "Disciplina é a ponte entre metas e realizações.", autor: "Jim Rohn", categoria: "disciplina" },
  { texto: "O segredo do sucesso é a consistência de propósito.", autor: "Benjamin Disraeli", categoria: "disciplina" },
  { texto: "Concentre-se em ser produtivo em vez de ocupado.", autor: "Tim Ferriss", categoria: "disciplina" },
  { texto: "A excelência não é um ato, mas um hábito.", autor: "Aristóteles", categoria: "disciplina" },
  { texto: "Pequenas ações diárias levam a grandes resultados.", autor: "Desconhecido", categoria: "disciplina" },
  { texto: "O foco é a chave que abre a porta do sucesso.", autor: "Desconhecido", categoria: "disciplina" },
  { texto: "Quem não tem disciplina para pequenas coisas não terá para as grandes.", autor: "Desconhecido", categoria: "disciplina" },
  { texto: "O sucesso é construído um tijolo de cada vez.", autor: "Desconhecido", categoria: "disciplina" },
  { texto: "Cada manhã temos duas escolhas: continuar a dormir com seus sonhos ou acordar e persegui-los.", autor: "Desconhecido", categoria: "disciplina" },
  { texto: "Trabalhe enquanto eles dormem. Aprenda enquanto eles se divertem. Economize enquanto eles gastam. Então viva como eles sonham.", autor: "Desconhecido", categoria: "disciplina" },

  // Equipe e colaboração
  { texto: "Nenhum de nós é tão inteligente quanto todos nós juntos.", autor: "Ken Blanchard", categoria: "equipe" },
  { texto: "O talento vence jogos, mas trabalho em equipe e inteligência vencem campeonatos.", autor: "Michael Jordan", categoria: "equipe" },
  { texto: "Sozinhos vamos mais rápido. Juntos vamos mais longe.", autor: "Provérbio Africano", categoria: "equipe" },
  { texto: "Uma equipe unida é invencível.", autor: "Desconhecido", categoria: "equipe" },
  { texto: "O sucesso de uma equipe começa com o respeito mútuo.", autor: "Desconhecido", categoria: "equipe" },
  { texto: "Grandes coisas nos negócios nunca são feitas por uma pessoa. Elas são feitas por uma equipe.", autor: "Steve Jobs", categoria: "equipe" },
  { texto: "Colaboração é a chave para transformar visões em realidade.", autor: "Desconhecido", categoria: "equipe" },
  { texto: "Quando a equipe ganha, todos ganham.", autor: "Desconhecido", categoria: "equipe" },

  // Gratidão e positividade
  { texto: "A gratidão transforma o que temos em suficiente.", autor: "Aesop", categoria: "gratidão" },
  { texto: "Comece cada dia com um coração grato.", autor: "Desconhecido", categoria: "gratidão" },
  { texto: "Seja grato pelo que você tem enquanto trabalha pelo que quer.", autor: "Desconhecido", categoria: "gratidão" },
  { texto: "A gratidão é a memória do coração.", autor: "Jean Baptiste Massieu", categoria: "gratidão" },
  { texto: "Quem não é grato pelo pouco, não será grato pelo muito.", autor: "Desconhecido", categoria: "gratidão" },
  { texto: "Cada dia é uma nova oportunidade de ser melhor.", autor: "Desconhecido", categoria: "gratidão" },
  { texto: "Aprecie o que você tem antes que o tempo te ensine a apreciar o que você tinha.", autor: "Desconhecido", categoria: "gratidão" },

  // Inovação e criatividade
  { texto: "A criatividade é a inteligência se divertindo.", autor: "Albert Einstein", categoria: "inovação" },
  { texto: "Inovar é ver o que todo mundo viu e pensar o que ninguém pensou.", autor: "Albert Szent-Gyorgyi", categoria: "inovação" },
  { texto: "A melhor maneira de prever o futuro é criá-lo.", autor: "Peter Drucker", categoria: "inovação" },
  { texto: "Se você sempre faz o que sempre fez, sempre obterá o que sempre obteve.", autor: "Albert Einstein", categoria: "inovação" },
  { texto: "A inovação distingue um líder de um seguidor.", autor: "Steve Jobs", categoria: "inovação" },
  { texto: "Pense diferente. Aja diferente. Seja diferente.", autor: "Desconhecido", categoria: "inovação" },
  { texto: "Não tenha medo de desistir do bom para ir atrás do ótimo.", autor: "John D. Rockefeller", categoria: "inovação" },

  // Banco
  { texto: "O melhor investimento que você pode fazer é em si mesmo.", autor: "Warren Buffett", categoria: "finanças" },
  { texto: "Não é quanto dinheiro você ganha, mas quanto você guarda.", autor: "Robert Kiyosaki", categoria: "finanças" },
  { texto: "Cuide dos centavos e os reais cuidarão de si mesmos.", autor: "Provérbio", categoria: "finanças" },
  { texto: "O planejamento financeiro é a base de uma vida tranquila.", autor: "Desconhecido", categoria: "finanças" },
  { texto: "Dinheiro é uma ferramenta. Usado corretamente, faz algo belo.", autor: "Brad Pitt", categoria: "finanças" },

  // Motivação diária
  { texto: "Hoje é um bom dia para ter um ótimo dia.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Você foi criado para vencer. Configure sua mente para isso.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Acorde com determinação. Vá dormir com satisfação.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Faça hoje o que seu futuro eu vai agradecer.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Cada dia é uma segunda chance.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Sua única limitação é você mesmo.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Seja o motivo pelo qual alguém sorriu hoje.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Você tem tudo o que precisa para ser extraordinário.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Não espere pela inspiração. Comece e a inspiração virá.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "O sucesso é uma jornada, não um destino.", autor: "Arthur Ashe", categoria: "motivação" },
  { texto: "Cada amanhecer traz novas possibilidades. Aproveite-as.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Você é capaz de muito mais do que imagina.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Transforme seus obstáculos em trampolins.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "O esforço de hoje é o resultado de amanhã.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Nunca subestime o poder de um começo.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Sua história ainda não acabou. Continue escrevendo.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Seja a versão mais corajosa de si mesmo.", autor: "Desconhecido", categoria: "motivação" },
  { texto: "Grandes resultados requerem grandes ambições.", autor: "Heráclito", categoria: "motivação" },
  { texto: "Não olhe para o relógio. Faça o que ele faz: continue.", autor: "Sam Levenson", categoria: "motivação" },
  { texto: "Você não falhou. Você encontrou 10.000 maneiras que não funcionam.", autor: "Thomas Edison", categoria: "motivação" },
];

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log(`Inserindo ${mensagens.length} novas mensagens motivacionais...`);
  
  let inseridas = 0;
  let numero = 61; // continua a partir do 61
  for (const msg of mensagens) {
    try {
      await connection.execute(
        'INSERT INTO mensagens_motivacionais (numero, conteudo, autor, ativo, createdAt) VALUES (?, ?, ?, 1, NOW())',
        [numero, msg.texto, msg.autor]
      );
      inseridas++;
      numero++;
    } catch (err) {
      console.error(`Erro ao inserir: ${msg.texto.substring(0, 40)}...`, err.message);
    }
  }
  
  const [rows] = await connection.execute('SELECT COUNT(*) as total FROM mensagens_motivacionais WHERE ativo = 1');
  console.log(`\n✅ ${inseridas} mensagens inseridas com sucesso!`);
  console.log(`📊 Total no banco: ${rows[0].total} mensagens ativas`);
  
  await connection.end();
}

main().catch(console.error);
