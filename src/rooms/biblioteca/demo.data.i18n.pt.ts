/**
 * Rama «pt» del año demo de biblioteca. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/biblioteca.pt.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "entradas": [
    {
      "dia": -358,
      "tema": "nat-mecanica",
      "titulo": "As três leis de Newton, relidas sem pressa",
      "resumen": "Vi isso no colégio e jurava que sabia. Não sabia: a primeira não é óbvia, porque diz que o movimento não precisa de causa, quem precisa é a mudança. Ficou clara quando freei a bicicleta e senti a mochila continuar o caminho dela.",
      "puntosClave": [
        "Sem força resultante, o estado de movimento se mantém, não só o repouso",
        "F = ma fala da variação do momento, não da velocidade que você tem",
        "Ação e reação atuam sobre corpos diferentes, por isso não se cancelam"
      ]
    },
    {
      "dia": -348,
      "tema": "mat-analisis",
      "titulo": "A derivada como velocidade instantânea",
      "resumen": "Eu derivava seguindo regras, como quem aplica uma receita. Esta semana entendi o que ela mede: quanto algo muda por unidade de tempo bem naquele instante. Fiz o gráfico da posição da minha bike a caminho da cafeteria, e a inclinação contava toda a história do trajeto.",
      "puntosClave": [
        "É o limite do quociente incremental quando o intervalo tende a zero",
        "A segunda derivada é a aceleração: a curvatura do gráfico",
        "Contínua não implica derivável: num pico não existe uma única inclinação"
      ]
    },
    {
      "dia": -336,
      "tema": "nat-mecanica",
      "titulo": "Trabalho e energia: o atalho que salva problemas",
      "resumen": "Descobri que muitos problemas que eu resolvia com três equações caem sozinhos se eu usar energia. Não preciso saber o detalhe do caminho, só o começo e o fim. É a primeira vez que a física me parece econômica em vez de cansativa.",
      "puntosClave": [
        "Só a componente da força na direção do movimento realiza trabalho",
        "Teorema trabalho-energia: o trabalho líquido é a variação da energia cinética",
        "Com forças conservativas o caminho não importa, e é aí que aparece a energia potencial"
      ]
    },
    {
      "dia": -322,
      "tema": "nat-mecanica",
      "titulo": "Momento linear e colisões",
      "resumen": "O momento é o que se conserva mesmo quando a energia se perde em ruído e calor. No laboratório, trabalhei a colisão de dois carrinhos e o número saiu quase exato; já a energia cinética sumiu um terço. Gostei de ver uma lei se sustentar onde outra se rende.",
      "puntosClave": [
        "p = mv, e a força é a taxa de variação do momento",
        "Em qualquer colisão o momento total do sistema se conserva",
        "O centro de massa segue sua trajetória como se nada tivesse acontecido"
      ]
    },
    {
      "dia": -308,
      "tema": "nat-mecanica",
      "titulo": "Movimento circular: quem curva quem",
      "resumen": "Fazia anos que eu acreditava na força centrífuga porque sinto ela quando faço uma curva de bike. Ela não existe num referencial inercial: o que existe é atrito empurrando para o centro e meu corpo querendo seguir reto. Entender isso mudou até a forma como me inclino nas curvas.",
      "puntosClave": [
        "A aceleração centrípeta aponta para o centro e vale v²/r",
        "A sensação de ser jogado para fora é inércia, não uma força real",
        "Se falta atrito, a trajetória vira reta: é exatamente aí que se derrapa"
      ]
    },
    {
      "dia": -296,
      "tema": "nat-mecanica",
      "titulo": "Momento angular e o truque da patinadora",
      "resumen": "O clássico da patinadora que gira mais rápido ao fechar os braços, mas agora com números. A energia não vem do nada: o trabalho é dela, ao puxar os braços para dentro. Laika faz algo parecido quando cai e se retorce no ar.",
      "puntosClave": [
        "L = Iω, e o momento de inércia depende de como a massa está distribuída",
        "Sem torque externo, o momento angular total se conserva",
        "Girar mais rápido com menos inércia custa energia sim: alguém está pagando essa conta"
      ]
    },
    {
      "dia": -284,
      "tema": "nat-mecanica",
      "titulo": "O oscilador harmônico está em todo lugar",
      "resumen": "Mola, pêndulo, corda, átomo numa rede: perto o bastante do equilíbrio, tudo oscila do mesmo jeito. É o problema que mais resolvi este ano e o que menos me cansa. Foi aqui que comecei a suspeitar que a física repete poucas ideias com muitos disfarces.",
      "puntosClave": [
        "Uma força restauradora proporcional ao deslocamento dá solução senoidal",
        "Para amplitudes pequenas, o período não depende da amplitude",
        "Com atrito surge o amortecimento; com forçamento, a ressonância"
      ]
    },
    {
      "dia": -272,
      "tema": "nat-termodinamica",
      "titulo": "Lei zero: o que a temperatura realmente é",
      "resumen": "Começa termodinâmica e a primeira lei que vejo é a que nem número próprio tem. Ela diz algo simples e necessário: se A está em equilíbrio com C e B também está, então A e B estão em equilíbrio entre si. É isso que faz um termômetro significar alguma coisa.",
      "puntosClave": [
        "O equilíbrio térmico é transitivo, e é isso que define a temperatura",
        "Temperatura não é calor: uma é estado, o outro é energia em trânsito",
        "A escala absoluta em kelvin evita o absurdo de temperaturas negativas"
      ]
    },
    {
      "dia": -258,
      "tema": "nat-termodinamica",
      "titulo": "Primeira lei: a contabilidade da energia",
      "resumen": "ΔU = Q − W é basicamente um livro-caixa onde nada se perde. O que me custou entender foi que U depende só do estado, enquanto Q e W dependem do caminho que você tomou para chegar lá. É como o meu orçamento: o saldo é o saldo, mas como você chegou até ele faz diferença.",
      "puntosClave": [
        "A energia interna é função de estado; o calor e o trabalho não são",
        "Fechar um ciclo devolve U ao ponto de partida, mas não devolve o gasto",
        "Nenhuma máquina entrega mais energia do que consome"
      ]
    },
    {
      "dia": -244,
      "tema": "nat-termodinamica",
      "titulo": "Teoria cinética e a distribuição de velocidades",
      "resumen": "A pressão deixa de ser um número do enunciado e vira milhões de colisões por segundo. O melhor é a cauda da distribuição: sempre existem moléculas muito mais rápidas que a média. É por isso que o café evapora sem precisar ferver.",
      "puntosClave": [
        "A pressão vem da troca de momento nas colisões com a parede",
        "A temperatura é proporcional à energia cinética média, não à de uma molécula isolada",
        "A cauda rápida de Maxwell-Boltzmann explica a evaporação"
      ]
    },
    {
      "dia": -230,
      "tema": "nat-termodinamica",
      "titulo": "Entropia sem misticismo",
      "resumen": "Me neguei a ficar só com o slogan de que entropia é desordem. Com a definição de Boltzmann, passei a ver como contagem: quantas configurações microscópicas dão o mesmo estado que estou vendo. Arrumar meu quarto não viola nada, só exporta a desordem na forma de calor.",
      "puntosClave": [
        "Definição termodinâmica: dS é o calor reversível δQ dividido por T",
        "Definição estatística: S = k ln Ω, uma contagem de microestados",
        "A segunda lei dá uma seta do tempo, não proíbe a ordem local"
      ]
    },
    {
      "dia": -216,
      "tema": "nat-termodinamica",
      "titulo": "Carnot e o teto que ninguém supera",
      "resumen": "Um ciclo impossível de construir que serve para saber até onde qualquer motor real pode chegar. O rendimento depende só das duas temperaturas, e isso é brutalmente limpo. Gostei de saber que a física tem ideias úteis justamente por serem ficções.",
      "puntosClave": [
        "Rendimento máximo: 1 − Tfria/Tquente, com temperaturas absolutas",
        "Nenhuma máquina real supera Carnot entre os mesmos reservatórios",
        "A reversibilidade exige lentidão infinita: por isso é só um limite"
      ]
    },
    {
      "dia": -200,
      "tema": "nat-termodinamica",
      "titulo": "Calor latente, ou por que o vapor esquenta tão rápido",
      "resumen": "Estudei mudanças de fase e de repente meu trabalho ganhou teoria. Ao condensar, o vapor libera uma quantidade absurda de energia sem baixar de temperatura, e é por isso que o leite passa de frio a pronto em vinte segundos. Agora fico de olho no termômetro pensando no diagrama de fases.",
      "puntosClave": [
        "Durante a mudança de fase, a energia é absorvida sem que a temperatura suba",
        "O calor latente de vaporização é muito maior que o de fusão",
        "O diagrama de fases e o ponto triplo organizam todo o panorama"
      ]
    },
    {
      "dia": -190,
      "tema": "mat-stats",
      "titulo": "Incertezas: o que o laboratório me obrigou a aprender",
      "resumen": "Perdi nota por escrever 9,81734 m/s² quando meu cronômetro era o meu polegar. A incerteza não é um enfeite no fim do relatório, é parte do resultado. Desde então começo o laboratório pensando de onde vem o erro, não termino pensando nisso.",
      "puntosClave": [
        "O erro aleatório diminui repetindo a medida; o sistemático, não",
        "Para variáveis independentes, os erros se somam em quadratura",
        "Os algarismos significativos não devem prometer mais precisão do que existe"
      ]
    },
    {
      "dia": -168,
      "tema": "mat-stats",
      "titulo": "Mínimos quadrados: ajustar sem se enganar",
      "resumen": "Três semanas sem correr por causa do joelho me deram tardes longas de escrivaninha. Aprendi que um R² alto pode acompanhar um ajuste péssimo se o modelo estiver torto. O que realmente entrega é olhar os resíduos e ver se eles estão rindo de você em forma de curva.",
      "puntosClave": [
        "Minimiza-se a soma dos quadrados dos resíduos",
        "Um qui-quadrado reduzido próximo de 1 indica erros bem estimados",
        "Os resíduos devem parecer aleatórios: qualquer padrão é uma pista"
      ]
    },
    {
      "dia": -148,
      "tema": "nat-relatividad",
      "titulo": "Os dois postulados e a confusão da simultaneidade",
      "resumen": "Começa relatividade e o estranho não são as fórmulas, é aceitar que dois eventos simultâneos para mim não sejam simultâneos para alguém passando de trem. Os postulados são curtos, quase teimosos, e é deles que sai todo o resto. Passei uma tarde inteira desenhando trens e lanternas.",
      "puntosClave": [
        "As leis da física são as mesmas em qualquer referencial inercial",
        "A velocidade da luz é a mesma para qualquer observador",
        "A simultaneidade não é absoluta: depende do estado de movimento"
      ]
    },
    {
      "dia": -132,
      "tema": "nat-relatividad",
      "titulo": "Dilatação do tempo e os múons que não deveriam chegar",
      "resumen": "O caso dos múons cósmicos me convenceu mais que qualquer dedução. Pela meia-vida deles, deveriam se desintegrar antes de tocar o chão, e mesmo assim a gente os detecta. Depende de quem olha: ou o relógio deles anda devagar, ou a atmosfera encolhe, e as duas versões dão o mesmo número.",
      "puntosClave": [
        "O fator gama só cresce rápido perto da velocidade da luz",
        "Dilatação do tempo e contração do comprimento são a mesma história",
        "Não é uma ilusão de medição: são relógios físicos que marcam horários diferentes"
      ]
    },
    {
      "dia": -90,
      "tema": "nat-relatividad",
      "titulo": "Minkowski: o que todo mundo mede igual",
      "resumen": "Depois da viagem voltei aos apontamentos e o espaço-tempo finalmente se encaixou. Se o tempo e o espaço se esticam conforme o observador, alguma coisa precisa ser invariante, e essa coisa é o intervalo. Com isso, E = mc² deixa de ser frase de camiseta e vira um caso particular.",
      "puntosClave": [
        "O intervalo entre eventos é o mesmo para todos os observadores",
        "Energia e momento formam um único quadrivetor",
        "A massa não se converte em energia: ela é a energia de repouso do sistema"
      ]
    },
    {
      "dia": -72,
      "tema": "nat-mecanica",
      "titulo": "Por que o piano soa como piano",
      "resumen": "Faz dez meses que toco e essa semana estudei o que acontece dentro da corda. O timbre não está na nota, está na mistura de harmônicos e nos primeiros milissegundos da batida do martelo. O melhor foi descobrir que as cordas reais são rígidas, e é por isso que se afinam esticadas.",
      "puntosClave": [
        "Uma corda fixa vibra em modos: fundamental mais harmônicos superiores",
        "O timbre depende da mistura de amplitudes e do ataque, não só da frequência",
        "A inarmonicidade da corda real obriga o afinador a esticar as oitavas"
      ],
      "foto": "ondas"
    },
    {
      "dia": -52,
      "tema": "nat-relatividad",
      "titulo": "Buracos negros: o horizonte não é uma parede",
      "resumen": "Trabalhei a métrica de Schwarzschild com calma e calculei o raio para o Sol, para a Terra e, por diversão, para a Laika. O horizonte não é uma superfície que dá para tocar: é o ponto a partir do qual nenhuma trajetória volta. O que mais me tira do sério é ver alguém caindo e nunca ver essa pessoa chegar.",
      "puntosClave": [
        "O raio de Schwarzschild é proporcional à massa do objeto",
        "O horizonte é uma fronteira causal, não um objeto material",
        "Para um observador distante, a queda parece congelar e ficar avermelhada"
      ],
      "foto": "agujero-negro"
    },
    {
      "dia": -40,
      "tema": "nat-relatividad",
      "titulo": "Vidas estelares num único diagrama",
      "resumen": "O diagrama de Hertzsprung-Russell parece um gráfico feio até você entender que é um censo de destinos. Uma estrela é uma briga longuíssima entre a gravidade que esmaga e a pressão que sustenta. E quem decide o final é a massa, quase nada mais.",
      "puntosClave": [
        "Equilíbrio hidrostático: gravidade para dentro, pressão para fora",
        "A massa inicial determina o ritmo de fusão e o desfecho",
        "A sequência principal é onde as estrelas passam quase toda a vida"
      ]
    },
    {
      "dia": -26,
      "tema": "nat-cuantica",
      "titulo": "Corpo negro: onde a física clássica quebrou",
      "resumen": "Comecei a ler sobre quântica por conta própria, para a inscrição da pós-graduação, e caí no problema do corpo negro. A teoria clássica previa energia infinita no ultravioleta, o que é uma forma elegante de dizer que estava errada. Planck quantizou por desespero e deu certo; me conforta saber que grandes ideias começam como remendos.",
      "puntosClave": [
        "A previsão clássica diverge em alta frequência: a catástrofe do ultravioleta",
        "Planck supôs energia em pacotes proporcionais à frequência",
        "A constante h surgiu medindo espectros térmicos, não filosofando"
      ]
    },
    {
      "dia": -8,
      "tema": "mat-stats",
      "titulo": "Bayes, ou como atualizar no que eu acredito",
      "resumen": "Deixei isso para o final do ano e queria ter visto antes do primeiro laboratório. A ideia é simples: parto do que eu acreditava, confronto com os dados e fico com uma versão atualizada. Em astrofísica usam isso o tempo todo para ajustar modelos com poucos dados e muito ruído.",
      "puntosClave": [
        "A posterior é proporcional à verossimilhança vezes a priori",
        "Declarar a priori não é trapacear: escondê-la, sim",
        "Com muitos dados, a priori pesa cada vez menos"
      ]
    }
  ],
  "charlas": [
    {
      "dia": -300,
      "titulo": "Por que o momento se conserva",
      "pregunta": "Sei de cor que o momento se conserva nas colisões, mas não entendo por quê. É uma lei separada ou se deduz das leis de Newton?",
      "respuesta": "Vem de Newton: se dois corpos só se empurram entre si, as forças são iguais e opostas, então o que um ganha de momento o outro perde. A soma não muda porque não há forças externas ao sistema. O importante é como você escolhe o sistema: se deixar de fora o chão ou a parede, vai aparecer um momento que parece sumir. E existe uma razão mais profunda: a conservação do momento equivale a dizer que as leis da física são as mesmas aqui e um metro mais adiante.",
      "ramas": [
        "Simetrias e o teorema de Noether",
        "Colisões inelásticas"
      ]
    },
    {
      "dia": -226,
      "titulo": "Entropia sem a palavra desordem",
      "pregunta": "Todos os vídeos dizem que entropia é desordem, mas aí não entendo como consigo arrumar meu quarto sem quebrar a segunda lei. O que é de verdade?",
      "respuesta": "Pense em contagem, não em estética: a entropia mede quantas configurações microscópicas são compatíveis com o que você observa em grande escala. Um estado que pode se realizar de muitas formas diferentes é mais provável, e é por isso que os sistemas evoluem para lá. Quando você arruma seu quarto, reduz a entropia dessa pequena região, mas seu corpo dissipa calor no ar e o balanço total sobe. A segunda lei fala do universo inteiro, não de cada cantinho separado.",
      "ramas": [
        "Microestados e probabilidade",
        "Demônio de Maxwell"
      ]
    },
    {
      "dia": -170,
      "titulo": "Saber se o meu ajuste serve",
      "pregunta": "No relatório do laboratório meu R² dá 0,99, mas a reta não passa pela metade das minhas barras de erro. Em qual dos dois números eu devo confiar?",
      "respuesta": "Nenhum dos dois sozinho. O R² só diz quanta variação você explica, e com um intervalo amplo de dados ele dispara mesmo que o modelo esteja torto. O que interessa é o qui-quadrado reduzido, que compara os resíduos com suas incertezas: se estiver bem maior que 1, ou o modelo falha ou você subestimou os erros. E antes de mais nada, faça o gráfico dos resíduos: se eles desenharem uma curva, está faltando um termo.",
      "ramas": [
        "Qui-quadrado reduzido",
        "Ler resíduos"
      ]
    },
    {
      "dia": -85,
      "titulo": "Por que o piano soa como piano",
      "pregunta": "Toco um lá no meu teclado e no piano vertical da escola e soam como coisas diferentes, mesmo sendo a mesma nota. O que está mudando fisicamente?",
      "respuesta": "A frequência fundamental é a mesma, mas o que seu ouvido chama de som é o pacote inteiro: a mistura de harmônicos superiores e como ela evolui no tempo. Num piano de verdade a corda tem rigidez, então os harmônicos não caem em múltiplos exatos, e isso dá aquele brilho característico. O ataque também pesa muito, aqueles primeiros milissegundos do martelo e do ruído da mecânica, que um teclado barato simplifica. Se você gravar as duas notas e olhar o espectro, a diferença aparece antes mesmo de você ouvir.",
      "ramas": [
        "Inarmonicidade da corda",
        "Temperamento igual"
      ]
    },
    {
      "dia": -30,
      "titulo": "O que revisar para a pós-graduação",
      "pregunta": "Quero me inscrever numa pós-graduação em astrofísica e tenho medo de que minha base de relatividade geral seja de amador. Por onde começo a cobrir essa lacuna?",
      "respuesta": "Com o que você já tem dá para começar: relatividade especial sólida, mecânica lagrangiana e estatística de dados são a base real do dia a dia. Antes de partir para tensores na marra, dedique algumas semanas a uma geometria diferencial mínima e a uma métrica de Schwarzschild bem trabalhada. Para a inscrição, pesa mais um projeto pequeno e terminado do que uma lista de temas lidos por cima: o seu ajuste de curvas de luz vale mais do que você pensa. E escolha o grupo pela pessoa que vai te orientar, não só pelo nome do centro.",
      "ramas": [
        "Cálculo tensorial mínimo",
        "Escolher orientador e grupo"
      ]
    }
  ],
  "notasEstudio": [
    {
      "dia": -360,
      "nota": "Duas horas de cinemática depois do turno; dormi em cima do caderno, mas os diagramas de corpo livre ficaram prontos."
    },
    {
      "dia": -330,
      "nota": "Plano inclinado com atrito: entendo a física, os sinais é que me perdem."
    },
    {
      "dia": -310,
      "nota": "Primeira sessão de exercícios com a Marta, da turma: três de cinco certos, bem melhor do que sozinho."
    },
    {
      "dia": -286,
      "nota": "Oscilador harmônico na biblioteca até fecharem; cheguei na solução sem abrir o livro."
    },
    {
      "dia": -262,
      "nota": "Começa termodinâmica: li a lei zero e a primeira duas vezes, na segunda já fez sentido."
    },
    {
      "dia": -240,
      "nota": "Exercícios de gases ideais entre um pedido e outro; o caderno acabou cheirando a café."
    },
    {
      "dia": -212,
      "nota": "Simulado da prova: oito de dez exercícios, e o de Carnot eu errei por aritmética, não por teoria."
    },
    {
      "dia": -195,
      "nota": "Prova de termo entregue; saí com a sensação estranha de ter entendido tudo de verdade."
    },
    {
      "dia": -172,
      "nota": "Com o joelho no gelo, tarde inteira de mínimos quadrados: se não posso correr, pelo menos avanço aqui."
    },
    {
      "dia": -150,
      "nota": "Começa relatividade: meia hora de aula gravada e uma hora desenhando trens e relógios."
    },
    {
      "dia": -130,
      "nota": "Revisei as transformações de Lorentz e fechei a pasta até a volta da viagem."
    },
    {
      "dia": -88,
      "nota": "De volta aos estudos com jet lag: reli meus apontamentos de antes da viagem e não entendi nem a minha própria letra."
    },
    {
      "dia": -70,
      "nota": "Metade da sessão em física do som e metade afinando o teclado; estou contando isso como estudo."
    },
    {
      "dia": -50,
      "nota": "Métrica de Schwarzschild com calma; calculei o raio do Sol e, só por gosto, o da Laika."
    },
    {
      "dia": -30,
      "nota": "Corpo negro e Planck: finalmente vejo onde a termo clássica quebrava."
    },
    {
      "dia": -14,
      "nota": "Revisão geral para a prova final e primeiro rascunho da redação de inscrição."
    },
    {
      "dia": -6,
      "nota": "Sessão curta de estatística bayesiana e lista de artigos para ler nas férias."
    }
  ],
  "metas": {
    "termo": "Fechar termodinâmica antes da prova",
    "posgrado": "Preparar a inscrição da pós-graduação em astrofísica"
  }
}
