import type { Dict } from './dict'

/**
 * Textos de PASO de los tutoriales en pt. Capa aparte porque solo hacen
 * falta con un tour corriendo.
 *
 * Lo monta `traducir-a-mano.mjs meter-dict` — no lo edites a mano.
 */

export const PT_TUT: Dict = {
  'tut.app-computo--formulario.1.titulo': 'Fica pendurado na calculadora',
  'tut.app-computo--formulario.1.texto':
    'O formulário inteiro vive neste menu, a um toque de onde você calcula. Matemática, Física e Química já vêm carregadas e agrupadas por temas, em pastas que você pode aninhar como quiser. Pep@ ainda tem Física II com suas provas, as contas da cafeteria e as da corrida.',
  'tut.app-computo--formulario.2.titulo': 'Tudo é seu',
  'tut.app-computo--formulario.2.texto':
    'Não existe «de fábrica» nem «minhas»: qualquer fórmula se abre, se edita e se apaga igual. A busca de cima procura em todas.',
  'tut.app-computo--formulario.3.titulo': 'Mude do seu jeito',
  'tut.app-computo--formulario.3.texto':
    'Editar uma fórmula deixa você mudar a expressão, renomear as variáveis ou fixar um valor que você sempre usa.',
  'tut.app-computo--formulario.4.texto':
    'A curva aparece entre a fórmula e as variáveis, e arrastar a barra de qualquer uma a move na hora. «Ver em grande» manda ela para o modo Gráfico, e o botão de imprimir gera a pasta inteira em PDF com as fórmulas bem compostas.',
  'tut.app-computo--calculadora.1.titulo': 'Escreva a operação',
  'tut.app-computo--calculadora.1.texto':
    'O resultado é calculado enquanto você escreve. O teclado de baixo evita o do celular, e o científico já não fica ali: está nas notações.',
  'tut.app-computo--calculadora.2.titulo': 'As notações',
  'tut.app-computo--calculadora.2.texto':
    'Aqui está tudo o que é científico e bem mais: você escolhe o grupo —básicas, cálculo, matrizes, trigonometria, símbolos— e os botões mudam. Eles são escritos onde estiver o cursor e o espaço fica pronto para digitar.',
  'tut.app-computo--calculadora.3.titulo': 'Modos especiais',
  'tut.app-computo--calculadora.3.texto':
    'A calculadora muda de tela inteira: o gráfico, as bases do 2 ao 16, matrizes, sistemas de equações, conversão de unidades, a conta com gorjeta e a regra de três. O histórico continua embaixo em todos.',
  'tut.app-computo--calculadora.3b.titulo': 'Bases',
  'tut.app-computo--calculadora.3b.texto':
    'O que você escreve é lido na base escolhida e mostrado nas quinze ao mesmo tempo, do 2 ao 16, ao vivo. Traz operações bit a bit, e com os prefixos 0b, 0o e 0x dá para misturar bases numa mesma conta.',
  'tut.app-computo--calculadora.3c.titulo': 'Matrizes e sistemas',
  'tut.app-computo--calculadora.3c.texto':
    'Matrizes opera com A e B até 6×6: soma, produto, determinante, inversa, transposta e traço. Seu vizinho Sistemas resolve equações lineares lendo as incógnitas do que você escrever, até seis equações.',
  'tut.app-computo--calculadora.3d.titulo': 'Unidades',
  'tut.app-computo--calculadora.3d.texto':
    'Oito categorias —de comprimento a dados— que convertem enquanto você escreve; cada uma lembra seu último par e «Inverter» troca o sentido da conversão. A temperatura sai certa: 100 °C são 212 °F.',
  'tut.app-computo--calculadora.3e.titulo': 'Gorjeta e regra de três',
  'tut.app-computo--calculadora.3e.texto':
    'As duas de fazer de cabeça: Gorjeta calcula sobre a conta —não sobre o total— e divide entre quantos forem; Regra de 3, direta ou inversa, preenche o x sozinha.',
  'tut.app-computo--calculadora.4.titulo': 'O formulário, à mão',
  'tut.app-computo--calculadora.4.texto':
    'Suas fórmulas ficam penduradas neste menu, com as variáveis prontas para preencher: é o que faz valer a pena guardá-las.',
  'tut.app-computo--calculadora.5.titulo': 'Gráficos',
  'tut.app-computo--calculadora.5.texto':
    'Por aqui passa tudo o que é desenhado, com o gráfico em cima e o teclado embaixo para escrever as funções. Arraste para mover, pince para aproximar e toque para ler um ponto.',
  'tut.app-computo--calculadora.6.titulo': 'Quatro formas de desenhar',
  'tut.app-computo--calculadora.6.texto':
    'Funções de x, curvas polares como esta rosa (r em função do ângulo), paramétricas onde x e y dependem de um mesmo parâmetro, e superfícies de duas variáveis que você gira com o dedo.',
  'tut.app-computo--calculadora.7.titulo': 'Resolver equações',
  'tut.app-computo--calculadora.7.texto':
    'Escreva a equação com o sinal de igual. Se for um polinômio, você recebe as raízes exatas; se não, ele busca dentro do intervalo que você está vendo e diz qual foi.',
  'tut.app-computo--hojas.1.titulo': 'Suas planilhas',
  'tut.app-computo--hojas.1.texto':
    'Cada planilha é um documento à parte. Pep@ tem o orçamento do Japão, o plano das 18 semanas da maratona e as notas de Física II.',
  'tut.app-computo--hojas.2.titulo': 'Começar com algo',
  'tut.app-computo--hojas.2.texto':
    'O app vem com três planilhas já montadas com suas fórmulas — orçamento, média ponderada e registro de medições — para você não começar do zero. São suas: mude ou apague.',
  'tut.app-computo--hojas.3.titulo': 'A barra de fórmulas',
  'tut.app-computo--hojas.3.texto':
    'A célula se edita aqui em cima, não na grade: no celular é a única forma de escrever sem briga. Enquanto você escreve uma fórmula, tocar numa célula insere a referência dela.',
  'tut.app-computo--hojas.4.titulo': 'Fazer gráfico do que você seleciona',
  'tut.app-computo--hojas.4.texto':
    'Marque um intervalo e toque no botão do gráfico: barras, linhas, área, pizza ou dispersão. O gráfico guarda o INTERVALO, então ele se atualiza sozinho quando um número muda.',
  'tut.app-computo--hojas.5.titulo': 'Exportar',
  'tut.app-computo--hojas.5.texto':
    'Para Excel sai um .xlsx de verdade, com as fórmulas vivas e os gráficos como gráficos do Excel. Em PDF sai pela impressora do navegador.',
  'tut.casa.1.texto': 'Esta é a sua casa: cada cômodo guarda um app. Vou te mostrar os controles básicos.',
  'tut.casa.2.titulo': 'O menu principal',
  'tut.casa.2.texto': 'Este botão abre o menu: seus cômodos, o catálogo de modelos (apps) e o inventário de objetos.',
  'tut.casa.3.titulo': 'Mover-se',
  'tut.casa.3.texto':
    'Ande com o joystick, com WASD ou com as setas do teclado. Ao cruzar a porta de um cômodo, você entra e o app dele abre sozinho.',
  'tut.casa.4.titulo': 'Três formas de olhar',
  'tut.casa.4.texto':
    'Isométrica, terceira e primeira pessoa (ou a tecla V). Tocar em Iso também centraliza a câmera de novo no seu personagem: a saída rápida se você foi longe demais explorando.',
  'tut.casa.5.titulo': 'Um canto, vários donos',
  'tut.casa.5.texto':
    'Esse canto não é só o cubo de vistas: ao chegar perto de algo com que dá para interagir — uma cadeira, um veículo, uma quadra — ele muda sozinho conforme o que está por perto. Nada é ativado sem você se aproximar.',
  'tut.casa.6.titulo': 'A roda de ferramentas',
  'tut.casa.6.texto':
    'Movimentos, brinquedos, veículos e construção, até 3 equipados por vez. Abre aqui ou naquele mesmo canto quando você está de mãos livres.',
  'tut.casa.7.titulo': 'O relógio',
  'tut.casa.7.texto':
    'A hora da casa: toque nela e o calendário completo se abre, com as Missões do dia. O sol ou a lua ao lado controlam a passagem do tempo e a luz da cena.',
  'tut.casa.8.titulo': 'A música da casa',
  'tut.casa.8.texto':
    'Cada cômodo pode ter seu próprio tema, ou deixar tocar o ambiente geral da casa. Dá para desligar tudo se você preferir silêncio.',
  'tut.casa.9.titulo': 'O chat',
  'tut.casa.9.texto':
    'O chat do arquiteto: conte o que você fez e ele registra no app certo, ou peça mudanças na casa.',
  'tut.casa.10.texto':
    'Isso é o básico. O botão Editor lá em cima abre a personalização completa, e cada menu e cada app têm seu próprio botão ? com seu tutorial.',
  'tut.primeros.1.texto': 'Primeiro: como a casa é montada. Tudo começa na aba Cômodos.',
  'tut.primeros.2.titulo': 'Criar cômodo',
  'tut.primeros.2.texto':
    'Com este botão você desenha cômodos novos no mapa. Para mostrar o resto do caminho, vou criar um para você agora…',
  'tut.primeros.3.titulo': 'Seu cômodo novo',
  'tut.primeros.3.texto': 'Aqui está! Um cômodo recém-criado, ainda sem app: por isso o cartão dele diz + Atribuir.',
  'tut.primeros.4.titulo': 'Atribuir um app',
  'tut.primeros.4.texto':
    'Com + Atribuir eu dei o app a ele: veja como o cômodo assumiu seu nome, seu ícone e seus móveis. De agora em diante o cartão inteiro dele é o botão de entrar.',
  'tut.primeros.5.titulo': 'Entrar',
  'tut.primeros.5.texto':
    'Entramos: este é o app do cômodo. Ao passear, você também entra atravessando a porta, e sai com ‹ Voltar para a casa.',
  'tut.primeros.6.texto':
    'O cômodo fica na sua casa, com o app pronto. É assim que você monta o resto: um cômodo para cada coisa que quiser trazer.',
  'tut.menu-cuartos.1.texto': 'A aba Cômodos lista todos os cômodos da sua casa, agrupados por categoria.',
  'tut.menu-cuartos.2.titulo': 'Seu resumo',
  'tut.menu-cuartos.2.texto':
    'Seu personagem vive da sua atividade real: aqui você vê o humor, o nível e a sequência dele. Registre algo em qualquer app e ele fica contente; alguns dias sem nada e ele fica triste — nunca se castiga nem se reinicia.',
  'tut.menu-cuartos.3.titulo': 'Os cartões',
  'tut.menu-cuartos.3.texto':
    'Cada cartão é um cômodo: seu ícone, seu nome e o progresso do app, agrupados em Corpo, Mente, Complemento e Configuração. Os cômodos sem app atribuído ficam bem no final.',
  'tut.menu-cuartos.4.titulo': 'Opções do cômodo',
  'tut.menu-cuartos.4.texto':
    'A engrenagem desdobra as opções do cômodo em uma fileira: subi-lo ou descê-lo na lista, apagá-lo, e Editar, que abre seu editor de forma, cores, paredes e objetos.',
  'tut.menu-cuartos.5.titulo': 'O cartão inteiro entra',
  'tut.menu-cuartos.5.texto':
    'O cartão completo é o botão: toque em qualquer parte e você entra no app do cômodo. Se ainda não tem app, esse mesmo cartão diz + Atribuir e abre o catálogo para escolher um.',
  'tut.menu-cuartos.6.titulo': 'Criar cômodo',
  'tut.menu-cuartos.6.texto':
    'Criar cômodo abre o editor de mapa com o pincel pronto para desenhar o novo cômodo: forma, tamanho e posição ficam nas suas mãos. No celular é mais prático o atalho da roda de ferramentas › Construção › Cômodos, que desenha direto no mapa sem abrir o painel.',
  'tut.menu-cuartos.7.texto':
    'Resumindo: Editar para personalizar, Entrar para usar o app. As outras abas deste menu têm o próprio tutorial.',
  'tut.menu-plantillas.1.texto':
    'Um modelo é um app (Cozinha, Exercício, Finanças…). Ele é atribuído a um objeto de um cômodo e abre quando você entra.',
  'tut.menu-plantillas.2.titulo': 'Duas vistas',
  'tut.menu-plantillas.2.texto':
    'Cômodos são os apps de sempre, cada um no seu objeto. Infraestrutura é diferente: pistas, quadras, horta, fazenda ou paintball se constroem direto no terreno, sem ocupar um cômodo.',
  'tut.menu-plantillas.3.titulo': 'O catálogo',
  'tut.menu-plantillas.3.texto':
    'Os apps que já vêm prontos e os seus, organizados por grupos. Toque em um para atribuí-lo a um cômodo ou, em Infraestrutura, para construí-lo no mapa.',
  'tut.menu-plantillas.4.titulo': 'Modelos próprios',
  'tut.menu-plantillas.4.texto':
    'Crie modelos próprios montando-os com blocos: notas, checklists, contadores, hábitos, galerias… Este botão abre o editor dele, com o próprio tutorial.',
  'tut.menu-plantillas.5.texto':
    'Um mesmo cômodo pode ter vários apps: ao entrar aparece um lançador para escolher qual abrir.',
  'tut.plantillas-custom.1.texto':
    'Este editor monta um app seu do zero: você dá forma com nome, emoji e blocos, e ele fica no catálogo junto com os que já vêm prontos.',
  'tut.plantillas-custom.2.titulo': 'Nome, emoji e cor',
  'tut.plantillas-custom.2.texto':
    'Como vai se chamar e de que cor aparece no menu, no catálogo e no calendário, se você agendar algo dele.',
  'tut.plantillas-custom.3.titulo': 'As ferramentas',
  'tut.plantillas-custom.3.texto':
    'Doze tipos de bloco: notas, checklist, contador, hábito, sessões, contagem regressiva, galeria, diário de bordo, avaliação, progresso, lista e links. Cada um que você adicionar vira uma seção do seu app.',
  'tut.plantillas-custom.4.titulo': 'A ordem importa',
  'tut.plantillas-custom.4.texto':
    'Os blocos adicionados se reordenam com as setas e se removem com o ✕ — remover um apaga os dados dele ao salvar, então confira antes de confirmar. Com o menu suspenso «Menu» eles passam de uma aba para outra sem perder nada.',
  'tut.plantillas-custom.5.titulo': 'Salvar',
  'tut.plantillas-custom.5.texto':
    'Com nome e pelo menos um bloco, Salvar deixa ele pronto no catálogo. De lá você atribui a um objeto igual a qualquer modelo que já vem pronto.',
  'tut.plantillas-custom.6.texto':
    'Você pode editar de novo quando quiser: os blocos e os dados ficam no lugar, só muda o que você editar.',
  'tut.menu-inventario.1.texto':
    'O inventário: todos os objetos que você pode colocar na sua casa, prontos para arrastar.',
  'tut.menu-inventario.2.titulo': 'Objetos',
  'tut.menu-inventario.2.texto':
    'Sua biblioteca de objetos por categorias e pastas. Você pode renomear e organizar para achar rápido na próxima vez.',
  'tut.menu-inventario.3.titulo': 'Objetos especiais',
  'tut.menu-inventario.3.texto':
    'Os que fazem algo, não só decoram: veículos para andar, pistolas de brinquedo, fontes, brinquedos de parquinho e luzes.',
  'tut.menu-inventario.4.titulo': 'Colocar',
  'tut.menu-inventario.4.texto':
    'Com este menu aberto, arraste uma miniatura direto para a cena 3D e coloque onde quiser.',
  'tut.menu-inventario.5.texto':
    'Para mover, pintar ou apagar o que já está colocado, use o Editor (aba Objetos) — este menu serve só para trazer coisas novas para a cena.',
  'tut.editor-mapa.1.texto':
    'O editor da casa tem 4 abas: Mapa, Personagens, Objetos e Configurações. Este tour é o do Mapa; os outros três têm o seu.',
  'tut.editor-mapa.2.titulo': 'O croqui',
  'tut.editor-mapa.2.texto':
    'Você desenha sobre uma grade vista de cima: cômodos, paredes, portas, janelas e pisos, com os modos e pincéis da barra de cima. O que você traça aparece na hora no 3D, sem recarregar nada.',
  'tut.editor-mapa.3.texto':
    'Os telhados são por célula: cada uma pode ter sua própria forma ou material, então um mesmo cômodo pode combinar águas diferentes em vez de um telhado só, plano.',
  'tut.editor-mapa.4.texto':
    'A casa também tem níveis: andares empilháveis para cima e um porão para baixo. Cada nível novo nasce com seu próprio jeito de subir —uma escada ou um vão na laje— que perfura o piso de cima.',
  'tut.editor-mapa.5.titulo': 'Pronto',
  'tut.editor-mapa.5.texto':
    'Tudo é salvo sozinho enquanto você edita. Pronto fecha o editor e te leva de volta ao jogo com a casa do jeito que você deixou.',
  'tut.editor-personajes.1.texto':
    'Seu personagem principal e seus assistentes vivem no mesmo editor: escolha quem editar lá em cima e as ferramentas mudam conforme o que faz sentido para cada um.',
  'tut.editor-personajes.2.titulo': 'Rosto e foto',
  'tut.editor-personajes.2.texto':
    'Expressão, penteado e cor do cabelo, ou direto uma foto sua para o personagem ficar parecido com você. Não todos os corpos aceitam rosto próprio.',
  'tut.editor-personajes.3.titulo': 'Roupas por categoria',
  'tut.editor-personajes.3.texto':
    'Cada peça se coloca, se tira e muda de cor separadamente: camisa, calça, calçado, acessórios. Combinam livremente.',
  'tut.editor-personajes.4.titulo': 'Looks salvos',
  'tut.editor-personajes.4.texto':
    'Salve uma combinação completa de roupas como um look e troque tudo com um toque, sem remontar peça por peça cada vez.',
  'tut.editor-personajes.5.titulo': 'Guarda-roupa por cômodo',
  'tut.editor-personajes.5.texto':
    'Atribua um look diferente a cada cômodo: seu avatar entra vestido para correr no Exercício e troca sozinho ao passar para a cozinha.',
  'tut.editor-personajes.6.texto':
    'Corpo, cor e tamanho se editam como sempre; com a IA ativada, você também pode gerar um modelo 3D próprio em vez de escolher um dos presets.',
  'tut.editor-objetos.1.texto':
    'Toque em um objeto da cena (ou da lista) para editá-lo: cor, tamanho e rotação são os três ajustes que todos compartilham.',
  'tut.editor-objetos.2.texto':
    'Os objetos com app atribuído abrem seu modelo ao entrar no cômodo; os outros são só decoração — os dois se editam igual.',
  'tut.editor-objetos.3.texto':
    'A engrenagem ⚙️ de um objeto o torna editável por peças: monte seus próprios modelos combinando formas básicas, ou peça um à IA descrevendo-o.',
  'tut.editor-config.1.texto':
    'Oito seções dobráveis, não uma lista longa: toque no título para abrir só a que te interessa.',
  'tut.editor-config.2.titulo': 'Conta e IA',
  'tut.editor-config.2.texto':
    'Entrar, seu plano e quanto de IA você já gastou neste mês; ao lado, a tabela de preços de cada operação. Os dois têm seu próprio tutorial detalhado.',
  'tut.editor-config.3.titulo': 'Estilo visual',
  'tut.editor-config.3.texto':
    'O tema do mapa (luz, névoa, iluminação) e os estilos de pós-processamento, tudo carregado sob demanda para não pesar mais.',
  'tut.editor-config.4.titulo': 'Interface e idioma',
  'tut.editor-config.4.texto':
    'Idioma, tema da interface (claro/escuro/automático), estilo de ícones e densidade — tudo o que muda COMO a casa se vê, não o que ela contém.',
  'tut.editor-config.5.titulo': 'Notificações',
  'tut.editor-config.5.texto':
    'Quais avisos chegam e quais ficam quietos: rotinas, avisos de plano e lembretes podem ser desligados separadamente.',
  'tut.editor-config.6.texto':
    'Música e Tutoriais têm seu próprio percurso; Backup de dados também, e é o que mais vale revisar antes de trocar de aparelho.',
  'tut.respaldo.1.titulo': 'Onde a sua casa mora',
  'tut.respaldo.1.texto':
    'Sem conta nem sincronização, seus dados ficam só neste aparelho. O aviso acima diz se o navegador tem permissão para protegê-los de uma limpeza automática.',
  'tut.respaldo.2.titulo': 'Exportar',
  'tut.respaldo.2.texto':
    'Baixa um único arquivo JSON com todas as suas tabelas: cômodos, metas, registros, tudo. É o seu backup manual.',
  'tut.respaldo.3.titulo': 'Restaurar',
  'tut.respaldo.3.texto':
    'Restaurar SUBSTITUI todos os dados atuais pelos do arquivo — pede confirmação antes e mostra quantos registros ele traz, então não tem surpresa.',
  'tut.respaldo.4.texto':
    'Vale fazer backup antes de trocar de aparelho, de navegador, ou só de vez em quando: é a única cópia que você tem sem conta.',
  'tut.editor-cuarto.1.texto':
    'Você está editando um cômodo específico: a planta e a câmera focam nele, não na casa inteira.',
  'tut.editor-cuarto.2.titulo': 'O que se edita',
  'tut.editor-cuarto.2.texto':
    'Forma, piso, paredes, portas, cor e nome do cômodo, e seus objetos. O app atribuído também muda por aqui: é o que mais traz gente a este painel.',
  'tut.editor-cuarto.3.titulo': 'Voltar ao mapa',
  'tut.editor-cuarto.3.texto':
    'Esta seta volta ao mapa completo sem fechar o editor, para você seguir trabalhando em outro cômodo.',
  'tut.editor-cuarto.4.texto':
    'Também tem um botão flutuante «Sair do cômodo» sobre o próprio cômodo no 3D, se preferir tocar ali.',
  'tut.inicio.1.texto':
    'O botão com o nome da sua casa abre a tela inicial: seus apps em uma grade, com a mecânica de um celular.',
  'tut.inicio.2.titulo': 'Um toque, um app',
  'tut.inicio.2.texto':
    'Aqui aparecem só os cômodos que já têm app, com seu nível, sua sequência e suas listas cumpridas. O contador vermelho do canto são as missões pendentes de hoje, e tocar no cartão entra direto.',
  'tut.inicio.3.titulo': 'Mantenha um cartão pressionado',
  'tut.inicio.3.texto':
    'O toque longo levanta o cartão e todos tremem, como num celular: arraste-o para reordenar, ou toque no lápis do canto para editar a ficha dele.',
  'tut.inicio.4.titulo': 'Seu desafio, à vista',
  'tut.inicio.4.texto':
    'Os dois anéis são a Montanha de Sísifo: a patente do ano e os emblemas ganhos. Tocar neles abre a montanha completa, a mesma do menu lateral.',
  'tut.inicio.5.titulo': 'Papel de parede e vista 3D',
  'tut.inicio.5.texto':
    'Este botão põe um papel de parede na grade, atenuado para os cartões continuarem legíveis. O do lado alterna entre o ícone de cada cômodo e sua miniatura mobiliada em 3D.',
  'tut.inicio.6.texto':
    'Criar cômodos, apagá-los ou atribuir apps continua sendo coisa do menu lateral: esta tela é para entrar rápido. Fecha tocando fora.',
  'tut.herramientas.1.texto': 'Este botão abre a roda de ferramentas do seu personagem.',
  'tut.herramientas.2.titulo': 'Dois níveis',
  'tut.herramientas.2.texto':
    'Primeiro você escolhe a categoria e depois a ferramenta específica dentro dela. Pode equipar até 3 ferramentas ao mesmo tempo, de categorias diferentes ou repetidas.',
  'tut.herramientas.3.titulo': 'A quarta categoria',
  'tut.herramientas.3.texto':
    'Construção não equipa um brinquedo: ativa o modo de desenho do mapa (cômodos, paredes, portas, janelas, pisos, telhados) sem passar pelo editor completo. É a mesma planta, só que se chega mais rápido.',
  'tut.herramientas.4.titulo': 'O centro',
  'tut.herramientas.4.texto':
    'O centro solta tudo o que está equipado e devolve o espaço do canto ao normal (o cubo de vistas ou outro contextual, conforme o que estiver perto).',
  'tut.herramientas.5.texto':
    'Fecha tocando fora da roda. Teste quando quiser: nada disso fica salvo como permanente, vale só enquanto você a usa.',
  'tut.navegacion.1.texto':
    'Três câmeras: Iso (vista de casa de bonecas), 3ª e 1ª pessoa. Troque aqui ou com a tecla V.',
  'tut.navegacion.2.titulo': 'Se orientar',
  'tut.navegacion.2.texto':
    'No iso você comanda a câmera com o cubo: os cantos dão os ângulos isométricos e as faces, as vistas planas. Em 3ª/1ª, o lugar dele é ocupado por um pad que você arrasta para olhar em volta.',
  'tut.navegacion.3.titulo': 'Quando tem algo perto',
  'tut.navegacion.3.texto':
    'Esse mesmo espaço deixa de ser câmera quando você se aproxima de algo interativo: uma quadra oferece o botão de jogar, um veículo o de subir, uma cadeira o de sentar. Só uma coisa por vez, e sempre por proximidade — nunca automático.',
  'tut.navegacion.4.titulo': 'Girar e centralizar',
  'tut.navegacion.4.texto':
    'Cada seta gira um quarto de volta: o mapa no iso, seu olhar em 3ª/1ª. O terceiro botão só aparece com o mapa à frente, e o centraliza de novo se você se perdeu explorando.',
  'tut.navegacion.5.titulo': 'Mover-se',
  'tut.navegacion.5.texto':
    'Caminhe com o joystick, WASD ou as setas. Na água você nada; em um veículo, você dirige com os mesmos controles.',
  'tut.navegacion.6.texto':
    'O botão Editor lá em cima funciona em qualquer visão: abra-o em 3ª/1ª pessoa e você edita caminhando, tocando objetos, paredes ou personagens bem onde eles estão.',
  'tut.chat.1.texto':
    'O chat do arquiteto: registra seu dia, edita a casa e responde suas dúvidas, tudo na mesma caixa.',
  'tut.chat.2.titulo': 'Escrever',
  'tut.chat.2.texto':
    'Escreva livremente: «corri 20 min», «gastei 250 no mercado»… O chip ao lado mostra para qual app vai. Use @cômodo para forçar o destino se ele errar o palpite.',
  'tut.chat.3.titulo': 'Ditar por voz',
  'tut.chat.3.texto':
    'O microfone transcreve o que você disser na caixa de texto — útil para registrar sem soltar o que está nas suas mãos.',
  'tut.chat.4.titulo': 'Anexar',
  'tut.chat.4.texto':
    'O + abre cinco opções: enviar uma imagem ou um PDF e tirar uma foto —com a IA ativa, um recibo ou a balança são interpretados sozinhos— e mais duas que não pedem IA: a máscara AR e o chat AR.',
  'tut.chat.4b.titulo': 'A máscara AR',
  'tut.chat.4b.texto':
    'Liga a câmera e põe a máscara sobre o seu rosto, seguindo você ao vivo — a mesma do vídeo de apresentação da casa. Funciona sem IA e sem conta.',
  'tut.chat.4c.titulo': 'O chat AR',
  'tut.chat.4c.texto':
    'A mesma conversa de sempre, mas com a sua câmera ao fundo e o assistente em 3D na frente, com emoções que acompanham o que ele responde.',
  'tut.chat.5.titulo': 'Assistentes',
  'tut.chat.5.texto':
    'Seu assistente dá rosto e voz às respostas. Toque nele para ver a conversa, trocar de assistente ou criar mais.',
  'tut.chat.6.titulo': 'O manual',
  'tut.chat.6.texto': 'O manual lista os comandos: adicionar ou remover cômodos, criar objetos, lembrar coisas…',
  'tut.chat.7.titulo': 'O modelo de IA',
  'tut.chat.7.texto':
    'Este ícone escolhe qual IA responde e guarda sua chave se você usar a sua. Sem nenhuma configurada, o chat continua funcionando por palavras-chave, sem entender linguagem livre.',
  'tut.chat.8.texto':
    'Você também pode perguntar «como funciona a cozinha?» ou pedir «tutorial de exercício» aqui mesmo, e o que ficou salvo você revisa no tour de Registros.',
  'tut.chat-registros.1.texto': 'Chats mostra com quem você conversou; Registros, o que ficou salvo dessas conversas.',
  'tut.chat-registros.2.titulo': 'O que ele lembra de você',
  'tut.chat-registros.2.texto':
    'Dados que o assistente decidiu que valia a pena lembrar entre sessões —uma alergia, uma meta, uma preferência— para não perguntar de novo. Você os apaga tocando no ✕.',
  'tut.chat-registros.3.texto':
    'O que você registrou nos seus apps (refeições, gastos, sessões) vive em cada app, não aqui: esta aba é só a memória da conversa em si.',
  'tut.app-generica.1.texto':
    'O cabeçalho mostra o cômodo e o app aberto. Se o cômodo tiver vários apps, a seta ‹ volta ao lançador.',
  'tut.app-generica.2.titulo': 'Missões',
  'tut.app-generica.2.texto':
    'O botão Missões abre o de hoje neste app: seus objetivos, o agendado e o que suas metas pedirem. Cada passo se risca sozinho assim que você registra, e cumprir a lista inteira é o que dá o XP do dia.',
  'tut.app-generica.3.titulo': 'Os blocos',
  'tut.app-generica.3.texto':
    'Este modelo é montado com blocos (notas, listas, contadores, hábitos…). Você pode mudá-los em Menu › Modelos › editar.',
  'tut.app-generica.4.titulo': 'Sair',
  'tut.app-generica.4.texto':
    '«Voltar para a casa» fecha o app e leva você de novo ao 3D. O que você registrou aqui já está salvo.',
  'tut.enlaces.1.titulo': 'Da meta ao seu app',
  'tut.enlaces.1.texto':
    'Qualquer meta ou passo de plano pode levar um chip com o ícone de um app: é a resposta para «e isso, onde eu anoto?».',
  'tut.enlaces.2.titulo': 'Definir ou mudar',
  'tut.enlaces.2.texto':
    'Vincular app abre o seletor: primeiro você escolhe o app, depois qual parte dele (se tiver várias seções onde registrar).',
  'tut.enlaces.3.titulo': 'O chip já definido',
  'tut.enlaces.3.texto':
    'Com o chip no lugar, tocar nele abre esse app direto naquela seção. Removê-lo não apaga a meta nem suas datas: só solta o vínculo.',
  'tut.enlaces.4.texto':
    'Só os apps atribuídos a um objeto de um cômodo aparecem como destino: vincular a um sem cômodo seria um chip que não leva a lugar nenhum.',
  'tut.musica.1.texto': 'Este botão abre o controle de música da casa.',
  'tut.musica.2.titulo': 'Ligar ou desligar',
  'tut.musica.2.texto':
    'Um interruptor para toda a música ambiente da casa. Desligado, a casa fica em silêncio, exceto os sons de ações específicas.',
  'tut.musica.3.titulo': 'Tema por cômodo',
  'tut.musica.3.texto':
    'Cada cômodo pode soar diferente: automático conforme seu app, um escolhido à mão, ou silêncio total nesse cômodo sem mexer no resto da casa.',
  'tut.musica.4.titulo': 'De onde vem o som',
  'tut.musica.4.texto':
    'Gerada (compõe sozinha conforme o ambiente), Minhas faixas (o que você subiu) ou Sistema (o que você já está tocando fora do app, sem ser interrompido).',
  'tut.musica.5.titulo': 'Volumes separados',
  'tut.musica.5.texto':
    'A música e os sons de ações (passos, cliques, conquistas) se ajustam separadamente — você pode baixar a música e manter os efeitos, ou o contrário.',
  'tut.musica.6.texto':
    'O botão do HUD pode ser removido da tela principal; continua disponível em Editor › Configurações › Música.',
  'tut.cuenta-ia.1.texto':
    'Aqui se liga a IA da casa: sem isso, o chat continua funcionando por palavras-chave, e recursos como gerar uma receita, um plano ou uma imagem ficam desligados.',
  'tut.cuenta-ia.2.titulo': 'Com ou sem conta',
  'tut.cuenta-ia.2.texto':
    'Você pode usar a IA com sua própria chave de provedor (sem conta, sem créditos) ou com uma conta que vem com créditos e sincroniza entre dispositivos.',
  'tut.cuenta-ia.3.titulo': 'Preços da IA',
  'tut.cuenta-ia.3.texto':
    'Esta tabela é informativa mesmo sem conta: é justo o que você precisa para decidir se vale a pena. Aparece por cômodo, operação por operação.',
  'tut.cuenta-ia.4.titulo': 'A única alavanca',
  'tut.cuenta-ia.4.texto':
    'A qualidade de imagem é o único fator que muda o preço da tabela inteira: Rápida é boa e barata (a usada por padrão); Boa dá mais detalhe e melhor texto dentro da imagem.',
  'tut.cuenta-ia.5.titulo': 'Uma unidade, muitas operações',
  'tut.cuenta-ia.5.texto':
    'Uma resposta custa 1 crédito, um plano longo 4, uma imagem ou um modelo 3D 10 — a regra é a mesma em todos os cômodos, esta tabela só a detalha uma por uma.',
  'tut.ejemplos.1.texto':
    'Esta barra aparece em quase todos os apps enquanto ainda não têm dados seus: um botão para vê-lo cheio de exemplo, em vez de começar diante de uma tela vazia.',
  'tut.ejemplos.2.texto':
    'Ver um exemplo não apaga nem mistura nada seu: são linhas próprias, marcadas como exemplo, que ficam ocultas (não apagadas) ao desligá-lo. Ligar de novo traz tudo de volta como estava.',
  'tut.ejemplos.3.texto':
    'Dentro da casa demo esta barra não aparece: o ano inteiro de Pep@ já cumpre esse papel, então não precisa de um exemplo à parte.',
  'tut.hoy.1.texto':
    'As missões não moram em um lugar à parte: moram DENTRO de cada app. No cabeçalho de cada cômodo está o botão Missões, com a lista do que esse app pede de você HOJE.',
  'tut.hoy.2.titulo': 'Três fontes, uma lista',
  'tut.hoy.2.texto':
    'Os objetivos próprios do app (a água, as calorias), o que você agendou para hoje no calendário e os passos das suas metas em curso: tudo junto, agrupado sob o plano ou a meta de onde vem cada passo.',
  'tut.hoy.2b.titulo': 'O que você se propôs, em cima',
  'tut.hoy.2b.texto':
    'Acima do checklist vivem as metas deste app, com seu avanço e seu prazo. Tocar em uma abre o plano dela aqui mesmo, sem sair do painel, e com «+ meta» você se propõe outra.',
  'tut.hoy.3.titulo': 'Risca porque o dado existe',
  'tut.hoy.3.texto':
    'O botão da linha registra o dado REAL no app — um copo de água, uma refeição — e o passo se risca sozinho porque esse registro já está ali, não porque alguém o marcou. Apertar de novo com o passo cumprido não duplica nada: o botão desaparece.',
  'tut.hoy.4.titulo': 'Seu número de cada dia',
  'tut.hoy.4.texto':
    'Os passos com número ajustável mudam aqui mesmo. Colocar em 0 desliga esse objetivo do dia sem apagar o histórico dos dias anteriores.',
  'tut.hoy.5.titulo': 'De um objetivo a uma rotina',
  'tut.hoy.5.texto':
    'O calendário agenda esse mesmo objetivo com hora fixa: abre o mesmo editor das rotinas do relógio, então fica registrado nos dois lugares ao mesmo tempo.',
  'tut.hoy.6.titulo': 'O cumprido não desaparece',
  'tut.hoy.6.texto':
    'Desce para «Feitos», recolhido: ver o registro surtir efeito é parte da recompensa, e de lá dá para desfazer se entrou um a mais.',
  'tut.hoy.6b.titulo': 'A lista inteira é o que pontua',
  'tut.hoy.6b.texto':
    'Completar todas as missões do dia acende a celebração e soma o XP do app: o nível cresce por listas cumpridas, não por registros soltos.',
  'tut.hoy.7.texto':
    'E se faltar algo, «Novo checklist» cria o seu: uma lista própria deste app que se repete todo dia. As metas de onde saem esses passos são planejadas no cômodo Metas.',
  'tut.hoy.8.titulo': 'Os orbes vermelhos',
  'tut.hoy.8.texto':
    'Aquele balão vermelho sobre um cômodo é a conta de missões pendentes de HOJE: o que falta fazer ali. O mesmo número aparece na tela inicial, no balão de entrar e no orbe que flutua sobre o móvel do cômodo — e fica âmbar quando algo já passou da hora. Sem balão, esse cômodo está em dia.',
  'tut.hoy.9.titulo': 'E todas juntas, no calendário',
  'tut.hoy.9.texto':
    'O botão Missões do relógio junta o que há para fazer hoje na casa INTEIRA, um cartão por app: à esquerda o que falta, à direita o que já está feito. Aqui não se registra nada — cada linha leva você ao app, que é onde o dado é anotado.',
  'tut.progreso.1.texto':
    'A carta do seu personagem: Pep@ tem um ano inteiro de atividade real por trás, então cada número aqui tem uma história real que o explica.',
  'tut.progreso.2.titulo': 'O personagem',
  'tut.progreso.2.texto':
    'Tocar nele abre o editor de personagens. O humor dele —feliz, contente, triste ou dormindo— sobe com cada registro novo e só cai se passarem dias sem nenhum; nunca zera de uma vez.',
  'tut.progreso.3.titulo': 'A patente de Sísifo',
  'tut.progreso.3.texto':
    'Doze patentes de subida: cada dia com atividade sobe um degrau de 365. Pep@ já tem várias patentes conquistadas; toque para ver a montanha completa.',
  'tut.progreso.4.titulo': 'Degraus e dias de graça',
  'tut.progreso.4.texto':
    'A cada 7 degraus chega um emblema, e cada trecho de semanas sobe a patente. Falhar um dia não quebra nada: você tem 2 dias de graça por mês antes de voltar ao início da patente atual.',
  'tut.progreso.5.titulo': '52 emblemas por família',
  'tut.progreso.5.texto':
    'Agrupados por família geológica, em mistério até serem conquistados: sem nome nem descrição visíveis até desbloquear.',
  'tut.progreso.6.titulo': 'Seu resumo',
  'tut.progreso.6.texto':
    'O Wrapped monta o resumo da sua semana, mês ou ano em telas — tem seu próprio tour, com dados de sobra em um ano como o de Pep@.',
  'tut.progreso.7.titulo': 'O radar por cômodo',
  'tut.progreso.7.texto':
    'Cada vértice é um cômodo da casa, e seu tamanho é a soma de XP dos apps atribuídos a ele. Um cômodo sem atividade se nota na hora: seu vértice afunda para o centro.',
  'tut.wrapped.1.texto':
    'Estilo stories: toque no lado direito para avançar, no esquerdo para voltar, e mantenha pressionado para pausar em uma tela.',
  'tut.wrapped.2.titulo': 'Semana, mês ou ano',
  'tut.wrapped.2.texto':
    'Cada tipo monta suas próprias telas com seus próprios dados — o resumo anual de Pep@ é o mais longo, com os momentos mais altos e mais baixos do ano inteiro.',
  'tut.wrapped.3.titulo': 'Navegar entre períodos',
  'tut.wrapped.3.texto':
    'As setas ‹ › percorrem períodos já encerrados: não é possível passar de hoje, então você sempre compara com algo real.',
  'tut.wrapped.4.titulo': 'Compartilhar uma tela',
  'tut.wrapped.4.texto': 'Copia o texto da tela que você está vendo, pronto para colar onde quiser — sem prints.',
  'tut.wrapped.5.texto':
    'Um ponto ao lado do botão que o abre avisa quando há um resumo novo sem ver; abri-lo apaga o ponto.',
  'tut.infra-huerto--ciclo.8.texto':
    'Este é o santuário de Pep@: de um lado os cercados e do outro a horta que os alimenta. Vamos às parcelas.',
  'tut.infra-huerto--ciclo.1.texto':
    'Esta é a horta do santuário de Pep@: canteiros reais com um ano de trabalho em cima. Nada disso é exemplo — está vivo, cresce em tempo real e você pode mexer.',
  'tut.infra-huerto--ciclo.2.texto':
    'Comida e Fazenda dividem o mesmo editor: o que se colhe aqui enche a despensa dos animais ao lado. É uma só corrente.',
  'tut.infra-huerto--ciclo.3.titulo': 'A rega manda',
  'tut.infra-huerto--ciclo.3.texto':
    'Olhe os canteiros: uma semente recém-plantada, plantas a meio crescer, um girassol pronto… e uma cenoura murcha que Pep@ deixou sem água de propósito. A gota azul avisa a sede; o que murcha não se salva.',
  'tut.infra-huerto--ciclo.4.titulo': 'Rega automática',
  'tut.infra-huerto--ciclo.4.texto':
    'O tomate tem aspersor: rega a célula dele e as oito vizinhas para sempre. Assim você deixa a horta sozinha sem que nada murche.',
  'tut.infra-huerto--ciclo.5.titulo': 'Colher',
  'tut.infra-huerto--ciclo.5.texto':
    'O girassol está pronto: um toque e vai para a cesta. Também dá para colher andando por cima do que está pronto, sem abrir este editor.',
  'tut.infra-huerto--ciclo.6.titulo': 'Um ano na cesta',
  'tut.infra-huerto--ciclo.6.texto':
    'Cada canteiro guarda a conta das suas colheitas e a cesta acumula as do ano inteiro — mais de 400 unidades. É daqui que comem os animais do santuário.',
  'tut.infra-huerto--ciclo.7.texto':
    'Tudo continua rodando quando você sai. Na demo você pode regar, colher e plantar de verdade: experimente antes de ir.',
  'tut.infra-huerto--parcelas.1.titulo': 'Primeiro, a terra',
  'tut.infra-huerto--parcelas.1.texto':
    'Com Canteiro você toca uma célula do mapa e a terra fica pronta. No santuário há dois canteiros vazios esperando você.',
  'tut.infra-huerto--parcelas.2.titulo': 'Escolher o que plantar',
  'tut.infra-huerto--parcelas.2.texto':
    'Seis espécies e, embaixo de cada uma, quanto tempo leva e de quanto em quanto tempo pede água: a cenoura em 3 minutos, a abóbora em 2 horas.',
  'tut.infra-huerto--parcelas.3.titulo': 'A rápida',
  'tut.infra-huerto--parcelas.3.texto':
    'Para ver o ciclo completo hoje, plante cenoura num canteiro livre: vai estar pronta antes de você terminar o passeio.',
  'tut.infra-huerto--parcelas.4.titulo': 'Desfazer',
  'tut.infra-huerto--parcelas.4.texto':
    'Remover vai um por um na mesma célula: primeiro a planta, depois o aspersor e por último o canteiro.',
  'tut.infra-huerto--parcelas.5.texto':
    'É isso: terra, espécie e paciência. O que você plantar na demo cresce de verdade enquanto explora o resto.',
  'tut.infra-granja--cuidar.8.texto':
    'Este é o santuário de Pep@: os cercados dos resgatados e, ao sul, a horta de onde eles comem. Vamos descer com eles.',
  'tut.infra-granja--cuidar.1.texto':
    'Estes são os resgatados do santuário de Pep@: cada um com seu nome, sua fome e seu ânimo rodando em tempo real. Nada é exemplo — você pode cuidar deles de verdade.',
  'tut.infra-granja--cuidar.2.titulo': 'A despensa do ano',
  'tut.infra-granja--cuidar.2.texto':
    'Alimentar consome da cesta, e a cesta se enche colhendo a horta ao lado. Pep@ deixou reservas de um ano: use-as.',
  'tut.infra-granja--cuidar.3.titulo': 'Alimentar',
  'tut.infra-granja--cuidar.3.texto':
    'Um toque no cercado dá comida a todos os que estiverem com fome, começando pelo mais faminto. A galinha pede a cada 4 horas; a vaca aguenta 12.',
  'tut.infra-granja--cuidar.4.titulo': 'Mimar',
  'tut.infra-granja--cuidar.4.texto':
    'Seis horas sem carinho e eles ficam entediados (duas vezes mais rápido se o cercado estiver sujo). Um toque acaricia o cercado inteiro.',
  'tut.infra-granja--cuidar.5.titulo': 'O cercado sujo',
  'tut.infra-granja--cuidar.5.texto':
    'O cercado pequeno está há oito dias sem limpeza — dá para ver pela palha. Toque nele com Limpar e deixe como novo: na demo pode.',
  'tut.infra-granja--cuidar.6.titulo': 'O recém-chegado',
  'tut.infra-granja--cuidar.6.texto':
    'O porco chegou doente ao santuário hoje de manhã. Um animal doente para de comer e só Curar o levanta — ele tem uma semana antes que seja tarde. Cure você mesmo.',
  'tut.infra-granja--cuidar.7.texto':
    'No dia a dia não precisa abrir isto: ao caminhar ao lado de um cercado aparece a bolha com Alimentar e Acariciar, e você também pode me pedir pelo chat.',
  'tut.infra-granja--corrales.1.titulo': 'O cercado',
  'tut.infra-granja--corrales.1.texto':
    'Toque em uma célula livre e nasce um cercado de 1×1; toque em uma vizinha e ele se estica. Cabem três animais por célula: veja os dois do santuário, um grande de pastoreio e um pequeno de aves.',
  'tut.infra-granja--corrales.2.titulo': 'As espécies',
  'tut.infra-granja--corrales.2.texto':
    'Seis espécies, cada uma com sua janela de fome. Toque dentro de um cercado com vaga e ela aparece já com nome.',
  'tut.infra-granja--corrales.3.titulo': 'Brinquedos',
  'tut.infra-granja--corrales.3.texto':
    'Lama, banheira e bola, um por célula: os animais vão sozinhos e brincar melhora o humor deles. O santuário já tem os três espalhados.',
  'tut.infra-granja--corrales.4.titulo': 'Nomes',
  'tut.infra-granja--corrales.4.texto':
    'Com Nomear você toca um cercado e vê a lista dele com as vagas usadas; toque em um animal para renomeá-lo.',
  'tut.infra-granja--corrales.5.texto':
    'É esse o ofício todo: cercado, vagas, brinquedos e carinho. Na demo você pode ampliar o santuário, se quiser.',
  'tut.infra-caminos--carrera.1.texto':
    'Esta é a pista de Pep@: um oval de asfalto com linha de meta quadriculada. É a única meta do mapa — todo o modo corrida gira em volta dela.',
  'tut.infra-caminos--carrera.2.texto':
    'Ali está a meta. Chegue perto da bicicleta ou do carro do pátio e suba com o botão dele; com o veículo, pise nesta linha e aparece o semáforo.',
  'tut.infra-caminos--carrera.3.texto':
    'Cole no oval e derrape nas curvas para não perder velocidade. Você também pode correr contra um assistente, com itens no meio: banana, turbo e bomba.',
  'tut.infra-caminos--carrera.4.texto':
    'Ao lado da meta fica a tabela de tempos: a bike de Pep@ soma 38 vitórias e uma melhor volta de 41,8 s. Supere isso — os recordes que você fizer na demo ficam salvos.',
  'tut.infra-caminos--carrera.5.texto':
    'O trilho que dá a volta no mapa e a montanha-russa do parque também são caminhos: ande sobre a via e aparece «Andar». Cada traço é uma rede própria.',
  'tut.infra-caminos--trazos.1.texto':
    'Existem três traços, e daqui se veem os três: pista (para corridas), trilho (o trem que dá a volta no mapa) e coaster (a montanha-russa, com alturas por célula). Eles não se misturam nem se tocando: cada um procura vizinhos do seu próprio tipo.',
  'tut.infra-caminos--trazos.2.texto':
    'A montanha-russa do parque sobe até seis níveis e as rampas entre uma célula e outra se interpolam sozinhas. Suba: o carrinho percorre o circuito fechado.',
  'tut.infra-caminos--trazos.3.texto':
    'Na sua própria casa você os desenha célula por célula com o editor de Circuitos, ou à mão livre com o traço livre por setores. Aqui na demo o mapa já vem traçado.',
  'tut.infra-canchas--jugar.1.texto':
    'Este é o complexo esportivo de Pep@: futebol, basquete, tênis e beisebol, um ao lado do outro. Cada quadra é um retângulo sobre o mapa — entrar nele caminhando inicia o jogo.',
  'tut.infra-canchas--jugar.2.texto':
    'O botão de carga aparece no espaço do cubo de navegação e atira para onde seu personagem está olhando: primeiro mire, depois carregue.',
  'tut.infra-canchas--jugar.3.texto':
    'Embaixo, o campo de beisebol e a quadra de tênis: o tênis tem rebote e troca de bola, e o beisebol é puro rebatida, contra máquina ou arremessador.',
  'tut.infra-canchas--jugar.5.texto':
    'Em cima, a quadra de futebol e a de basquete. O futebol se joga com drible e chute; o basquete, medindo a força do arremesso.',
  'tut.infra-canchas--jugar.4.texto':
    'O placar é salvo por quadra: Pep@ deixou um 21-15 no basquete e uma sequência de 18 trocas de bola no tênis. Na demo as partidas contam — melhore esses números.',
  'tut.infra-paintball--batalla.1.texto':
    'Abra a roda de ferramentas: é ali que fica o Paintball, na categoria de construção e jogos, junto aos veículos.',
  'tut.infra-paintball--batalla.2.texto':
    'Escolha o modo: 1v1, 2v2 ou todos contra todos. Seus rivais são os assistentes do mapa — Laika conta — e se joga no andar de baixo.',
  'tut.infra-paintball--batalla.3.texto':
    'A casa inteira é o campo: proteja-se atrás das paredes, apareça para atirar e cuide das costas. Os respingos ficam pintados durante a batalha.',
  'tut.infra-paintball--batalla.4.texto':
    'O placar de Pep@ está em 47 vitórias contra 23 derrotas. Na demo as batalhas contam de verdade: melhore isso antes de sair.',
  'tut.app-anecdotario--diario.1.texto':
    'Este é o diário de Pep@: um ano inteiro, duas ou três entradas por semana. Aqui está TODO o arco — do cansaço do começo à maratona de duas semanas atrás.',
  'tut.app-anecdotario--diario.2.titulo': 'Como se escreve',
  'tut.app-anecdotario--diario.2.texto':
    'Escolha o humor do dia, coloque um título se quiser, escreva e anexe fotos. Uma foto já basta: não precisa de texto.',
  'tut.app-anecdotario--diario.3.titulo': 'O ano em cores',
  'tut.app-anecdotario--diario.3.texto':
    'Cada dia é pintado com seu humor. Veja a queda do mês 7 (a lesão) e como o Japão aparece brilhante. Toque num dia para filtrar suas entradas.',
  'tut.app-anecdotario--diario.4.titulo': 'O arquivo',
  'tut.app-anecdotario--diario.4.texto':
    'As entradas se organizam sozinhas em pastas por ano, mês e semana. Abra as semanas do Japão e leia a viagem completa.',
  'tut.app-anecdotario--fotos.1.texto':
    'Os marcos do ano de Pep@ têm foto: o teclado usado, a chegada da Laika, dois cartões-postais do Japão e a medalha da maratona.',
  'tut.app-anecdotario--fotos.2.titulo': 'Procure no histórico',
  'tut.app-anecdotario--fotos.2.texto':
    'Abra o mês 2 (o teclado), o mês 9 (Japão) ou duas semanas atrás (a medalha). Toque em qualquer foto e ela abre em tela cheia.',
  'tut.app-anecdotario--fotos.3.texto':
    'Cada entrada alimenta a sequência e desperta o personagem: escrever aqui também é cuidar da casa.',
  'tut.app-jardin--practicar.1.titulo': 'A calma acumulada',
  'tut.app-jardin--practicar.1.texto':
    'Cada minuto de prática rega este jardim. O de Pep@ cresceu um ano inteiro: de semente a floresta.',
  'tut.app-jardin--practicar.2.titulo': 'Meditar com som',
  'tut.app-jardin--practicar.2.texto':
    'Escolha uma faixa (floresta, mar, chuva, tigelas) e uma duração, ou medite em silêncio com sino. A sessão se salva sozinha ao terminar.',
  'tut.app-jardin--practicar.3.titulo': 'Um ano de sessões',
  'tut.app-jardin--practicar.3.texto':
    'Aqui está o ano de Pep@: começou com três por semana e no mês 7 — a lesão, o gasto do carro — a prática ficou quase diária. Foi o que sustentou a queda.',
  'tut.app-jardin--practicar.4.titulo': 'Respirar',
  'tut.app-jardin--practicar.4.texto':
    'Dois padrões guiados: a caixa 4-4-4-4 para se centrar e o 4-7-8 para soltar o dia. A tela respira com você.',
  'tut.app-jardin--gratitud.1.titulo': 'Hoje agradeço…',
  'tut.app-jardin--gratitud.1.texto':
    'Três linhas por dia. Uma já basta; três, melhor. Salva uma entrada por dia e dá para corrigir na hora.',
  'tut.app-jardin--gratitud.2.titulo': 'As de Pep@',
  'tut.app-jardin--gratitud.2.texto':
    'Noventa dias de agradecimentos reais: o teclado, a Laika dormindo em cima das anotações, o joelho sarando, voltar do Japão. Leia com calma.',
  'tut.app-jardin--gratitud.3.texto':
    'Este cômodo não tem sequências nem cobra por faltar: é de propósito. A calma não se compete.',
  'tut.app-hobbies--piano.1.titulo': 'Dois hobbies, um ano',
  'tut.app-hobbies--piano.1.texto':
    'Pep@ registrou dois: o piano (seu projeto do ano, meta de 4 dias por semana) e a astrofotografia. Cada cartão mostra a semana em curso e a sequência.',
  'tut.app-hobbies--piano.2.titulo': 'Dentro do piano',
  'tut.app-hobbies--piano.2.texto':
    'Sequência, melhor sequência, total praticado, dias ativos e média. Um ano de teclado — com a pausa honesta do Japão.',
  'tut.app-hobbies--piano.3.titulo': 'O heatmap',
  'tut.app-hobbies--piano.3.texto':
    'Cada quadradinho é um dia. Dá para ver o arranque do mês 2, como o piano SUSTENTOU a queda do mês 7 e o vazio das três semanas no Japão.',
  'tut.app-hobbies--piano.4.titulo': 'As sessões',
  'tut.app-hobbies--piano.4.texto':
    'Cada prática com seus minutos e, muitas, com nota: de «minhas mãos doem» a tirar «Clair de Lune» inteira.',
  'tut.app-hobbies--piano.5.titulo': 'Projetos',
  'tut.app-hobbies--piano.5.texto':
    'A prática com rumo: a primeira peça (concluída no mês 5) e «Clair de Lune», tocada para a família há uma semana.',
  'tut.app-hobbies--proyectos.1.titulo': 'Os projetos do piano',
  'tut.app-hobbies--proyectos.1.texto':
    'Um projeto junta as sessões que você dedicou a ele: aqui você vê quantas são e quantos minutos cada um acumula.',
  'tut.app-hobbies--proyectos.2.titulo': 'O avanço em fotos',
  'tut.app-hobbies--proyectos.2.texto':
    '«Clair de Lune» guarda a partitura anotada. Na astrofotografia, o projeto das doze luas cheias reúne as melhores fotos do ano.',
  'tut.app-hobbies--proyectos.3.texto':
    'Você também pode registrar sessões por chat («praticei piano 30 min») e planejar metas do projeto com o planejador.',
  'tut.app-hobbies--gestion.1.titulo': 'Cadastrar um hobby',
  'tut.app-hobbies--gestion.1.texto':
    'Nome, emoji, cor e —opcional— uma meta semanal em dias. Esse formulário é tudo o que precisa para começar a acompanhar.',
  'tut.app-hobbies--gestion.2.titulo': 'A meta semanal',
  'tut.app-hobbies--gestion.2.texto':
    'O piano ficou com 4 dias por semana: a linha da semana se pinta com cada dia praticado, e em cima aparece quantos você já tem em relação à meta.',
  'tut.app-hobbies--gestion.3.titulo': 'Registrar uma prática',
  'tut.app-hobbies--gestion.3.texto':
    'Minutos rápidos com um toque, ou o número exato; o projeto é opcional e a nota é para o que você quiser lembrar dessa sessão.',
  'tut.app-hobbies--gestion.4.texto':
    'As metas dos seus hobbies e projetos ficam no cômodo Metas, cada uma com seu plano e seu cronograma. Peça à IA um plano com fases e datas.',
  'tut.app-ideas--diario.1.titulo': 'A caixa de entrada',
  'tut.app-ideas--diario.1.texto':
    'Escreva a ideia e pronto. Pep@ soltou aqui uns 90 lampejos no ano: de física, da cafeteria, do treino. A estrela marca as favoritas.',
  'tut.app-ideas--diario.2.titulo': 'Chuvas por tema',
  'tut.app-ideas--diario.2.texto':
    'Uma chuva de ideias agrupa tudo sob um tema. Procure as de Pep@: os nomes para a gata (ganhou Laika), como pagar o Japão e o que levar na viagem.',
  'tut.app-ideas--diario.3.texto':
    'Quando uma chuva de ideias amadurece, um botão a transforma em mapa mental e você segue organizando no quadro.',
  'tut.app-ideas--mapas.1.titulo': 'Dez formatos',
  'tut.app-ideas--mapas.1.texto':
    'Cada formato desenha de um jeito. Abaixo estão os mapas que Pep@ fez durante o ano: a rotina da manhã em fluxo, a termodinâmica em árvore, física e música em Venn.',
  'tut.app-ideas--mapas.2.titulo': '«Minha vida ideal»',
  'tut.app-ideas--mapas.2.texto':
    'O PRIMEIRO mapa do ano, do mês 1: a vida que Pep@ queria. Olhe com calma — quase tudo o que está aqui acabou acontecendo.',
  'tut.app-ideas--mapas.3.texto':
    'No quadro: toque um nó para escolhê-lo e toque outra vez para escrever; arraste, dê zoom com os dedos e adicione ideias com a barra de baixo.',
  'tut.app-ideas--mapas.4.titulo': 'Um mapa inteiro, de um tema',
  'tut.app-ideas--mapas.4.texto':
    'Dê um tema à IA e ela monta o mapa completo, com os nós já organizados: o ponto de partida para um tema que você não sabe por onde começar a organizar.',
  'tut.app-ideas--mapas.5.titulo': 'Ampliar um nó com IA',
  'tut.app-ideas--mapas.5.texto':
    'Já dentro de um mapa, qualquer nó pode ser ampliado: a IA propõe subnós conforme o que você já escreveu em volta, sem perder sua estrutura.',
  'tut.app-ideas--decidir.1.titulo': 'Oito formas de decidir',
  'tut.app-ideas--decidir.1.texto':
    'Pep@ usou todos de verdade: um Eisenhower na semana das provas, uma SWOT no meio do ano e uma matriz para escolher a câmera.',
  'tut.app-ideas--decidir.2.titulo': 'Pós-graduação ou trabalho?',
  'tut.app-ideas--decidir.2.texto':
    'A decisão em aberto no fim do ano: cada lado com seu peso de 1 a 5 e o total embaixo. Ainda não está decidida — é assim que se vê pensar a sério.',
  'tut.app-ideas--decidir.3.texto':
    'Nos formatos por regiões cada elemento vive em uma zona: escolha-a abaixo antes de adicionar, ou arraste o elemento para outra e ele muda sozinho.',
  'tut.app-ideas--decidir.4.titulo': 'A matriz ponderada',
  'tut.app-ideas--decidir.4.texto':
    'Não é um quadro, é uma tabela: cada opção contra cada critério, com um peso de 1 a 5 conforme o quanto esse critério importa para você. O total ordena as opções sozinho.',
  'tut.calendario.1.titulo': 'O relógio',
  'tut.calendario.1.texto': 'O calendário não é um cômodo: vive no relógio da casa, então abre de onde você estiver.',
  'tut.calendario.2.titulo': 'Uma semana real',
  'tut.calendario.2.texto':
    'Turnos na cafeteria, aulas de física, correr ao amanhecer, piano à noite. Cada bloco é uma rotina com sua hora e sua cor; arraste para movê-las e estique para mudar a duração.',
  'tut.calendario.3.titulo': 'Quatro jeitos de olhar',
  'tut.calendario.3.texto':
    'Dia e Semana mostram a grade por horas; Mês e Ano dão o panorama do ano inteiro. O primeiro botão faz dupla função: diz «Hoje» e traz você para o presente, ou «Dia» se você já estiver vendo outra data.',
  'tut.calendario.4.titulo': 'De onde vem cada bloco',
  'tut.calendario.4.texto':
    'Os apps se agendam sozinhos: os compromissos da Agenda, o sono do Descanso, os momentos de estudo da Biblioteca. Com o filtro você mostra só um app.',
  'tut.calendario.5.titulo': 'Andar pelo ano',
  'tut.calendario.5.texto':
    'As setas ‹ › percorrem o período e Hoje volta ao presente. O ano inteiro de Pep@ está aqui, semana por semana. Com + Novo você cria um evento, ou desenha ele direto na grade.',
  'tut.calendario.6.titulo': 'Hábito por hábito',
  'tut.calendario.6.texto':
    'Cada linha é uma rotina e cada coluna um dia: verde se foi cumprido. Aqui você marca direto, e a porcentagem lá em cima resume o período que você está vendo.',
  'tut.calendario.7.titulo': 'O arco do ano',
  'tut.calendario.7.texto':
    'Na vista Ano o gráfico conta a história completa: Pep@ começou cumprindo um terço do que se propunha e fechou acima de 85 %. A constância foi construída, não apareceu.',
  'tut.calendario.8.titulo': 'As quedas também contam',
  'tut.calendario.8.texto':
    'Os dois buracos são reais: a lesão no joelho do mês 7 e as três semanas no Japão. Falhar não apaga o progresso — o painel mostra o ano como ele foi, não como devia ter sido. E uma rotina só conta a partir do dia em que você a criou.',
  'tut.metas.0.titulo': 'Um cômodo para se propor coisas',
  'tut.metas.0.texto':
    'Metas não guarda nada próprio: é onde você se propõe coisas e onde se vê tudo o que você se propôs, venha do cômodo que vier. As metas nascem nos outros apps — correr na Academia, a faculdade na Biblioteca, poupar no Escritório — e aqui se juntam agrupadas pelo app que cuida de cada uma.',
  'tut.metas.1.titulo': 'Primeiro, as metas',
  'tut.metas.1.texto':
    'O cômodo abre em Metas, agrupadas pelo app que cuida delas: correr em Exercício, o curso de física em Biblioteca. «Casa» não é nenhum app — essa categoria Pep@ inventou para a reforma da cozinha.',
  'tut.metas.2.titulo': 'Da meta ao seu plano',
  'tut.metas.2.texto':
    'Cada linha se lê como um painel: seu número na pasta, o prazo, o avanço e o estado — a fazer, em andamento ou feito, conforme o que já foi cumprido. Um clique abre a meta: seu plano, se tiver (o ✨ anuncia) e, se não, sua ficha com as submetas, as datas e os passos.',
  'tut.metas.3.titulo': 'Três planos, três estados',
  'tut.metas.3.texto':
    'A cozinha e a próxima maratona ainda são propostas; a inscrição na pós-graduação já está no cronograma. O da maratona foi pedido sem prazo: a IA calculou que ele exige 24 semanas e diz isso no resumo.',
  'tut.metas.4.titulo': 'A ficha do plano',
  'tut.metas.4.texto':
    'O ✨ de uma linha anuncia que a meta já tem plano, e seu clique abre esta ficha: as fases e suas submetas, cada uma com seu período. Enquanto é proposta, dá para editar tudo: renomear, mover datas, adicionar ou tirar nós sem desalinhar os demais.',
  'tut.metas.5.titulo': 'Marcar sem se comprometer',
  'tut.metas.5.texto':
    'Os checks de uma proposta ficam na folha, não nas suas metas: você pode ir marcando o que fez sem tocar no seu cronograma. As barras se enchem sozinhas para cima — o planejamento da cozinha já está fechado.',
  'tut.metas.6.titulo': 'Mover para o cronograma real',
  'tut.metas.6.texto':
    'Este botão transforma cada fase e cada submeta em metas de verdade, com suas datas definidas e presas à meta original. O que a meta já tinha se conserva.',
  'tut.metas.7.titulo': 'Aceito: uma só verdade',
  'tut.metas.7.texto':
    'O plano da pós já foi movido. Agora seus checks são os das submetas reais e a barra é a do seu cronograma: a folha para de fazer uma contagem à parte.',
  'tut.metas.8.titulo': 'E lá estão, no eixo',
  'tut.metas.8.texto':
    'O cronograma é o DESTA meta: suas submetas ocupam seu período sobre o eixo do tempo, com o plano sobreposto em violeta em cima — o proposto e o real, juntos.',
  'tut.metas.9.titulo': 'Cada meta, seu eixo',
  'tut.metas.9.texto':
    'Este eixo é o de UMA meta: aqui você dá datas ao que não as tem, pendura submetas novas e «Voltar» devolve você à folha dela. O menu Cronograma de cima mostra o de todas juntas.',
  'tut.metas.10.titulo': 'E daqui sai para a casa inteira',
  'tut.metas.10.texto':
    'Nada disso fica trancado: uma meta com datas aparece no calendário do relógio como qualquer outra coisa agendada, e os passos de hoje saem nas Missões do app que cuida dela — e no balão vermelho daquele cômodo. Aqui se planeja; cumpre-se no app, registrando de verdade.',
  'tut.app-biblioteca--enciclopedia.1.titulo': 'Um ano de curso, em uma árvore',
  'tut.app-biblioteca--enciclopedia.1.texto':
    'Pep@ estuda Física: mecânica no começo do ano, termodinâmica perto da prova do mês 6, relatividade e astrofísica no fim. Cada ramo se abre para ver suas fichas.',
  'tut.app-biblioteca--enciclopedia.2.titulo': 'A árvore cresce com você',
  'tut.app-biblioteca--enciclopedia.2.texto':
    'Os temas do catálogo já vêm prontos; os que ficam soltos foram abertos por uma conversa. Toque em uma ficha para ler seu resumo, seus pontos-chave e sua ilustração.',
  'tut.app-biblioteca--enciclopedia.3.texto':
    'Uma ficha se escreve à mão ou se destila de uma conversa. A do buraco negro e a da física do piano têm desenho: o app pode ilustrá-las para você.',
  'tut.app-biblioteca--charlas.1.titulo': 'As dúvidas do ano',
  'tut.app-biblioteca--charlas.1.texto':
    'Aqui estão as conversas que Pep@ teve enquanto estudava: entropia, dilatação do tempo, por que um piano soa como piano. Cada uma ficou guardada.',
  'tut.app-biblioteca--charlas.2.titulo': 'Da conversa à árvore',
  'tut.app-biblioteca--charlas.3.texto':
    'Assim a enciclopédia não se enche de teoria copiada, e sim do que você realmente perguntou.',
  'tut.app-biblioteca--enciclopedia.4.titulo': 'O índice é seu',
  'tut.app-biblioteca--enciclopedia.4.texto':
    'O + de cada linha escreve uma entrada ali mesmo, com o campo e o tema já definidos. E o botão do lápis faz a árvore crescer: esse mesmo + adiciona ramos, o da Semente cria campos novos, e você pode renomear, reordenar e apagar. O número com o raminho diz quantos subíndices estão pendurados ali.',
  'tut.app-biblioteca--estudio.2.titulo': 'O plano de estudo',
  'tut.app-biblioteca--estudio.2.texto':
    'O botão Missões do cabeçalho traz o que toca hoje. As metas de estudo ficam no cômodo Metas, agrupadas por app: «terminar termodinâmica antes da prova» já está cumprida; se preparar para a pós-graduação segue em andamento.',
  'tut.app-biblioteca--estudio.3.texto':
    'Você pode pedir um plano para cada meta: a IA pergunta sua data-alvo e suas horas disponíveis, e agenda os momentos de estudo no seu calendário.',
  'tut.app-biblioteca--resumen.1.texto':
    'Quantas entradas tem sua enciclopédia e quantos dos campos e temas do índice você já cobriu. Os temas que uma conversa abriu contam separado.',
  'tut.app-biblioteca--resumen.2.titulo': 'Quatro números',
  'tut.app-biblioteca--resumen.2.texto':
    'Conversas com o Sábio, minutos de estudo no total e na semana, e sua sequência de dias seguidos estudando.',
  'tut.app-biblioteca--resumen.3.titulo': 'Onde está o desequilíbrio',
  'tut.app-biblioteca--resumen.3.texto':
    'A barra mais longa é o campo que levou mais da sua atenção — para Pep@, termodinâmica na semana da prova.',
  'tut.app-biblioteca--resumen.4.titulo': 'Os dias de estudo',
  'tut.app-biblioteca--resumen.4.texto':
    'Um quadradinho por dia: dá para ver a maratona antes da prova e o vazio das três semanas no Japão, sem precisar abrir o histórico completo.',
  'tut.app-biblioteca--resumen.5.titulo': 'No que foram suas horas',
  'tut.app-biblioteca--resumen.5.texto':
    'O mesmo de cima, mas em minutos: uma coisa é ter muitas fichas de um campo, outra é ter dedicado tempo de verdade.',
  'tut.app-biblioteca--resumen.6.titulo': 'Um ano de sessões',
  'tut.app-biblioteca--resumen.6.texto':
    'E se você quiser o detalhe, o histórico guarda cada sessão com seus minutos e seu campo, arquivado por ano, mês e semana.',
  'tut.app-idiomas--charlas.1.titulo': 'Um tutor no seu nível',
  'tut.app-idiomas--charlas.1.texto':
    'Seu tutor é o assistente do cômodo: você fala com ele no idioma que estuda e ele responde no nível QECR do seu perfil — frases curtas com tradução no A1, expressões idiomáticas no C1. Se você escrever no seu idioma, ele incentiva você a tentar no que estuda.',
  'tut.app-idiomas--charlas.2.titulo': 'Ficam salvas e classificadas sozinhas',
  'tut.app-idiomas--charlas.2.texto':
    'Cada conversa fica nesta lista com seu título, seu tema do programa e seu nível, definidos sem que você faça nada. Ela também pode nascer de um tema —com o botão de conversa da linha dele— para praticar exatamente aquilo.',
  'tut.app-idiomas--charlas.3.texto':
    'Quando o tutor corrige, a forma certa vai em sua própria linha com um sinal de certo, e a conversa segue sem broncas. Ao sair, ele oferece extrair o vocabulário que apareceu: você escolhe quais cartões guardar e eles herdam o tema da conversa.',
  'tut.app-idiomas--repaso.1.titulo': 'O que toca hoje',
  'tut.app-idiomas--repaso.1.texto':
    'Pep@ está nisso há um ano e ainda tem revisões pendentes: o sistema não pede todo o vocabulário, só o que você está a ponto de esquecer.',
  'tut.app-idiomas--repaso.3.titulo': 'Um ano de constância',
  'tut.app-idiomas--repaso.3.texto':
    'O histórico guarda quantas você revisou cada dia e quantas acertou. Pep@ começou errando bastante e terminou acertando quase tudo — e no Japão revisou mais do que nunca.',
  'tut.app-idiomas--vocabulario.2.titulo': 'Dois idiomas ao mesmo tempo',
  'tut.app-idiomas--vocabulario.2.texto':
    'Em cima você troca de idioma: além do principal, Pep@ montou um japonês de sobrevivência entre o mês 4 e a viagem. Ao voltar, quase abandonou, e isso aparece nas caixas.',
  'tut.app-idiomas--temario.1.titulo': 'Três áreas, seis níveis',
  'tut.app-idiomas--temario.1.texto':
    'De A1 a C2, cada nível com seus temas de vocabulário, seus pontos de pronúncia e sua gramática. Você sabe o que está faltando sem procurar um curso por fora.',
  'tut.app-idiomas--temario.2.titulo': 'Onde você está',
  'tut.app-idiomas--temario.2.texto':
    'Cartões dominados, revisões do mês e seu nível atual. Pep@ começou o ano no A2 e hoje está no B1.',
  'tut.app-agenda--esencial.1.titulo': 'Sua agenda',
  'tut.app-agenda--esencial.1.texto':
    'A agenda guarda o que não é um hábito: pendências, consultas, contatos. São três menus, e tudo o que tem data se agenda sozinho no calendário da casa.',
  'tut.app-agenda--esencial.2.titulo': 'Trabalho',
  'tut.app-agenda--esencial.2.texto':
    'A bandeja junta as pendências sem data para que não se percam, e o quadro move suas tarefas por colunas: a fazer, em andamento e feito.',
  'tut.app-agenda--esencial.3.titulo': 'Saúde',
  'tut.app-agenda--esencial.3.texto':
    'Consultas médicas, medicamentos e cuidados, em três submenus: Você, Quem você ama (as pessoas sob seus cuidados) e Mascotes.',
  'tut.app-agenda--esencial.4.titulo': 'Pessoas',
  'tut.app-agenda--esencial.4.texto':
    'Sua agenda de contatos por relação. Os aniversários que você guardar se repetem sozinhos todo ano no calendário.',
  'tut.calendario--esencial.1.titulo': 'O relógio da casa',
  'tut.calendario--esencial.1.texto':
    'O calendário não é um cômodo: vive no relógio do HUD, então se abre de onde você estiver sem entrar em lugar nenhum.',
  'tut.calendario--esencial.2.titulo': 'Tudo agendado, junto',
  'tut.calendario--esencial.2.texto':
    'Aqui cai tudo o que tem data e hora: o que você cria com «+ Novo» ou traçando na grade, e o que os demais apps agendam sozinhos. O filtro lá em cima deixa ver um só app quando fica muita coisa.',
  'tut.calendario--esencial.3.titulo': 'Dia',
  'tut.calendario--esencial.3.texto':
    'A grade de uma jornada de 24 horas: serve para ver a que horas fica cada coisa e se algo se sobrepõe. Este botão faz dupla função: diz «Hoje» e te traz de volta ao presente, ou «Dia» se você já está vendo outra data.',
  'tut.calendario--esencial.4.titulo': 'Semana',
  'tut.calendario--esencial.4.texto':
    'A mesma grade por horas, mas com os sete dias lado a lado. É onde se vê como fica dividida a semana, e onde os blocos se arrastam de um dia para outro ou se esticam para durar mais.',
  'tut.calendario--esencial.5.titulo': 'Mês',
  'tut.calendario--esencial.5.texto':
    'Deixa o eixo de horas e pinta os dias como células com o que cai em cada uma. É a vista do panorama: quais semanas vêm cheias e quais dias ficam livres.',
  'tut.calendario--esencial.6.titulo': 'Ano',
  'tut.calendario--esencial.6.texto':
    'Os doze meses de uma vez. Nessa distância já não dá para ler as horas: o que se vê é a constância, o quanto você manteve o que se propôs ao longo do ano.',
  'tut.calendario--esencial.7.titulo': 'E as missões, à parte',
  'tut.calendario--esencial.7.texto':
    'Em vermelho, para não parecer uma quinta vista: Missões junta numa única tela a checklist de hoje de todos os apps. As metas e seus planos não estão aqui — vivem no seu próprio cômodo.',
  'tut.app-anecdotario--esencial.1.titulo': 'Seu diário pessoal',
  'tut.app-anecdotario--esencial.1.texto':
    'O diário guarda o que você quiser contar, com seu humor e suas fotos. Ele se organiza sozinho por data, sem que você precise classificar nada.',
  'tut.app-anecdotario--esencial.2.titulo': 'Como se escreve',
  'tut.app-anecdotario--esencial.2.texto':
    'Escolha o humor do dia, escreva o que quiser contar e anexe fotos se tiver. Só com uma foto, sem texto, também vale.',
  'tut.app-anecdotario--esencial.3.titulo': 'O calendário do humor',
  'tut.app-anecdotario--esencial.3.texto':
    'Cada dia é pintado com o humor da sua entrada, então o mês inteiro se lê num relance. Toque num dia para ver suas entradas embaixo.',
  'tut.app-anecdotario--esencial.4.titulo': 'O histórico',
  'tut.app-anecdotario--esencial.4.texto':
    'Todas as entradas ficam aqui, organizadas sozinhas em pastas por ano, mês e semana.',
  'tut.app-biblioteca--esencial.1.titulo': 'Sua biblioteca',
  'tut.app-biblioteca--esencial.1.texto':
    'A biblioteca é sua enciclopédia pessoal: você pergunta o que não sabe, guarda o que aprende e mantém a conta do que estuda. São quatro menus.',
  'tut.app-biblioteca--esencial.2.titulo': 'Conversas',
  'tut.app-biblioteca--esencial.2.texto':
    'Aqui você pergunta ao Sábio sobre qualquer tema e a conversa fica guardada. Cada conversa se classifica sozinha no seu campo do conhecimento e sai destilada como ficha da enciclopédia.',
  'tut.app-biblioteca--esencial.3.titulo': 'Enciclopédia',
  'tut.app-biblioteca--esencial.3.texto':
    'A árvore onde vive o que você aprendeu, ordenada por campo do conhecimento. Cada ficha traz seu resumo e seus pontos-chave, e você também pode escrevê-los à mão; com o lápis você faz o índice crescer do seu jeito.',
  'tut.app-biblioteca--esencial.4.titulo': 'Estudo',
  'tut.app-biblioteca--esencial.4.texto':
    'O relógio para estudar: você escolhe o campo e a duração, corrido ou por pomodoros, e cada trecho se registra sozinho. Continua contando mesmo que você saia do cômodo.',
  'tut.app-biblioteca--esencial.5.titulo': 'Resumo',
  'tut.app-biblioteca--esencial.5.texto':
    'O panorama de tudo isso: quantas fichas tem sua enciclopédia e que parte do índice você cobriu, os minutos de estudo, sua sequência e os dias em que estudou.',
  'tut.app-cocina--esencial.1.titulo': 'A cozinha',
  'tut.app-cocina--esencial.1.texto':
    'Este app cuida de duas coisas: o que você vai cozinhar e o que acaba comendo. Cada uma tem seu menu lá em cima, e cada menu abre suas próprias abas.',
  'tut.app-cocina--esencial.2.titulo': 'Receitário',
  'tut.app-cocina--esencial.2.texto':
    'O lado de cozinhar: aqui vivem suas receitas, as dietas que as agrupam e a lista do mercado. São três abas, nessa ordem.',
  'tut.app-cocina--esencial.3.titulo': 'Dieta',
  'tut.app-cocina--esencial.3.texto':
    'Uma dieta é um plano alimentar com suas receitas dentro e, se quiser, suas próprias metas de calorias e macros. Você guarda as suas junto com as que o app já traz.',
  'tut.app-cocina--esencial.4.titulo': 'Receitas',
  'tut.app-cocina--esencial.4.texto':
    'O receitário: cada receita guarda ingredientes, passos e seus macros por porção, e se organiza em pastas. A partir de uma receita você pode registrar a refeição ou mandar os ingredientes para a lista do mercado.',
  'tut.app-cocina--esencial.5.titulo': 'Compras',
  'tut.app-cocina--esencial.5.texto':
    'A lista do mercado, com cada item no corredor que lhe cabe. Você pode montar uma lista juntando o que falta de várias receitas e marcar o que já tem na despensa.',
  'tut.app-cocina--esencial.6.titulo': 'Controle de alimentação',
  'tut.app-cocina--esencial.6.texto':
    'O outro menu mantém a conta do que você come, em quatro abas numeradas. A primeira é Metas: com seu peso, sua altura e sua atividade, calcula quanto você precisa por dia e divide os macros.',
  'tut.app-cocina--esencial.7.titulo': 'Registro',
  'tut.app-cocina--esencial.7.texto':
    'O que já passou: as refeições do dia com suas calorias, a água que você já tomou e seu peso quando você se pesa. A aba ao lado, Plano de refeições, é o contrário: a grade do que você pretende comer nos próximos dias.',
  'tut.app-cocina--esencial.8.titulo': 'Progresso',
  'tut.app-cocina--esencial.8.texto':
    'As estatísticas de tudo isso no período que você escolher: calorias e macros, água e a curva do seu peso. Embaixo, um calendário colorido mostra num relance em quais dias você ficou dentro da meta.',
  'tut.app-computo--esencial.1.titulo': 'A sala de computação',
  'tut.app-computo--esencial.1.texto':
    'Aqui você resolve o que precisa ser calculado, em dois menus: a Calculadora, com seus modos e seu formulário de fórmulas, e as Planilhas para tudo que vai em tabelas.',
  'tut.app-computo--esencial.2.titulo': 'Calculadora',
  'tut.app-computo--esencial.2.texto':
    'Uma calculadora científica que dá o resultado enquanto você digita e guarda o que calculou no histórico. O teclado de baixo evita o do telefone, e as notações escrevem o conteúdo científico onde estiver o cursor.',
  'tut.app-computo--esencial.3.titulo': 'Os modos',
  'tut.app-computo--esencial.3.texto':
    'Este menu muda a vista inteira da calculadora: gráfico, bases numéricas, matrizes, sistemas de equações, conversão de unidades, gorjeta e regra de três. O histórico fica embaixo em todos eles.',
  'tut.app-computo--esencial.4.titulo': 'O formulário',
  'tut.app-computo--esencial.4.texto':
    'Seu livro de fórmulas, dobrado sobre a calculadora. Já vêm prontas as de Matemática, Física e Química, em pastas que você pode aninhar. Qualquer uma se abre para preencher suas variáveis, se edita ou se apaga.',
  'tut.app-computo--esencial.5.titulo': 'Planilhas',
  'tut.app-computo--esencial.5.texto':
    'Planilhas com referências de célula e fórmulas em português, e gráficos sobre o intervalo que você marcar. Exportam para Excel mantendo as fórmulas, ou para PDF.',
  'tut.app-descanso--esencial.1.titulo': 'Descanso',
  'tut.app-descanso--esencial.1.texto':
    'Este app acompanha seu sono numa única tela: a pontuação da última noite, seu horário com seus avisos, o registro diário e o histórico completo.',
  'tut.app-descanso--esencial.2.titulo': 'A pontuação',
  'tut.app-descanso--esencial.2.texto':
    'Cada noite registrada recebe uma pontuação que combina quanto tempo você dormiu, a que horas foi para a cama e quantas vezes acordou. Sem registros ainda, esta seção te convida a anotar a primeira noite.',
  'tut.app-descanso--esencial.3.titulo': 'Horário e avisos',
  'tut.app-descanso--esencial.3.texto':
    'Você ajusta seu horário de dormir e de acordar arrastando as pontas da faixa do dia; o mesmo horário aparece como bloco no calendário da casa. Aqui você também liga o despertador com seu tom e os avisos para desacelerar antes de dormir.',
  'tut.app-descanso--esencial.4.titulo': 'Registrar a noite',
  'tut.app-descanso--esencial.4.texto':
    'O formulário para anotar como você dormiu: a data, a hora em que foi para a cama e acordou, as interrupções e uma nota de qualidade, com espaço para uma observação.',
  'tut.app-descanso--esencial.5.titulo': 'O histórico',
  'tut.app-descanso--esencial.5.texto':
    'Todas as noites que você for registrando ficam aqui, organizadas por ano, mês e semana, para você revisar seu descanso ao longo do tempo.',
  'tut.app-despacho--esencial.1.titulo': 'Suas finanças',
  'tut.app-despacho--esencial.1.texto':
    'O escritório organiza seu dinheiro em quatro menus: o que você tem, o que entra e sai, suas metas e os mercados. Cada um abre suas próprias seções embaixo.',
  'tut.app-despacho--esencial.2.titulo': 'Patrimônio',
  'tut.app-despacho--esencial.2.texto':
    'O que você tem e o que deve, em duas listas: ativos e passivos. A terceira seção projeta essa foto para o futuro com a taxa que você definir em cada linha.',
  'tut.app-despacho--esencial.3.titulo': 'Fluxo',
  'tut.app-despacho--esencial.3.texto':
    'O dinheiro que entra e o que sai, separado em gastos, receitas e balanço. O balanço resume o período que você escolher — dia, semana, mês ou ano — com seu orçamento, suas categorias e sua tendência.',
  'tut.app-despacho--esencial.4.titulo': 'Metas',
  'tut.app-despacho--esencial.4.texto':
    'Seus objetivos de dinheiro em três seções: poupança e investimento, dívida, e umas calculadoras que propõem um valor a partir do seu próprio balanço. Cada meta pode descer para o cronograma e ganhar uma data.',
  'tut.app-despacho--esencial.5.titulo': 'Mercados',
  'tut.app-despacho--esencial.5.texto':
    'Cotações ao vivo de moedas, cripto, ações e commodities; precisa de conexão. É um painel de consulta: o app não recomenda o que comprar nem o que vender.',
  'tut.app-diario--esencial.1.titulo': 'O jornal de hoje',
  'tut.app-diario--esencial.1.texto':
    'O jornal traz o briefing do dia em duas vistas: manchetes e efemérides. Não guarda dados próprios: todo dia traz conteúdo novo e à meia-noite substitui tudo.',
  'tut.app-diario--esencial.2.titulo': 'Manchetes',
  'tut.app-diario--esencial.2.texto':
    'As manchetes do dia por categoria — mundo, economia, tecnologia, saúde, esportes e entretenimento —, filtráveis com os chips lá em cima. Vêm de imprensa real no seu idioma, com veículos que se revezam a cada dia.',
  'tut.app-diario--esencial.3.titulo': 'Efemérides',
  'tut.app-diario--esencial.3.texto':
    'A outra metade do jornal: o que aconteceu num dia como hoje — uma obra, um livro, uma espécie, uma palavra. Serve de desculpa para abri-lo mesmo quando as notícias não interessam naquele dia.',
  'tut.app-diario--esencial.4.titulo': 'Se renova sozinho',
  'tut.app-diario--esencial.4.texto':
    'A edição é baixada sozinha ao abrir o app e é substituída por inteiro à meia-noite: nada se acumula. Este botão força uma atualização antes desse horário.',
  'tut.app-diario--esencial.5.titulo': 'Entrega',
  'tut.app-diario--esencial.5.texto':
    'Configure quais seções cada assistente te entrega no próprio chat dele, num horário fixo ou num momento surpresa do dia.',
  'tut.app-ejercicio--esencial.1.titulo': 'Seu treino',
  'tut.app-ejercicio--esencial.1.texto':
    'O exercício reúne as três modalidades do corpo — força, resistência e flexibilidade — mais um menu de metas onde você decide quanto quer treinar por semana.',
  'tut.app-ejercicio--esencial.2.titulo': 'Metas',
  'tut.app-ejercicio--esencial.2.texto':
    'O resumo do cômodo: sua sequência, os dias com algo registrado e uma barra por modalidade contra o objetivo semanal que você definir aqui. Também é aqui que se escolhe o sistema de medidas, em quilos ou em libras.',
  'tut.app-ejercicio--esencial.3.titulo': 'Força',
  'tut.app-ejercicio--esencial.3.texto':
    'O treino com peso: cada sessão guarda seus exercícios com séries, repetições e carga. Com isso o app calcula o volume do dia, desenha a progressão de cada exercício e guarda os recordes.',
  'tut.app-ejercicio--esencial.4.titulo': 'Catálogo, rotinas e progresso',
  'tut.app-ejercicio--esencial.4.texto':
    'As três modalidades se organizam do mesmo jeito. O Catálogo agrupa os exercícios disponíveis e monta rotinas com eles, Rotinas registra o treino do dia que você escolher lá em cima, e Progresso resume o período com seu mapa de calor.',
  'tut.app-ejercicio--esencial.5.titulo': 'Resistência',
  'tut.app-ejercicio--esencial.5.texto':
    'Correr, pedalar, nadar ou caminhar, em trechos com seus minutos e sua distância. A partir daqui se abre o treino ao vivo, que capta o percurso por GPS e o pulso de um sensor Bluetooth e guarda a sessão ao terminar.',
  'tut.app-ejercicio--esencial.6.titulo': 'Flexibilidade',
  'tut.app-ejercicio--esencial.6.texto':
    'Alongamentos e mobilidade, com séries por tempo em vez de por peso: cada postura tem seus segundos e suas repetições. O reprodutor guiado passa a rotina postura por postura com um cronômetro que avisa quando trocar.',
  'tut.app-entretenimiento--esencial.1.titulo': 'Entretenimento',
  'tut.app-entretenimiento--esencial.1.texto':
    'Guarda os filmes, séries, livros e videogames que você vai terminando, e traz uma mesa de jogos digital para jogar sem sair de casa. São dois menus: Jogos de tabuleiro e Arquivo.',
  'tut.app-entretenimiento--esencial.2.titulo': 'Jogos de tabuleiro',
  'tut.app-entretenimiento--esencial.2.texto':
    'A mesa reúne jogos digitais que se jogam direto na tela. Um filtro separa o que é pensado para um ou dois jogadores do que serve para um grupo maior.',
  'tut.app-entretenimiento--esencial.3.titulo': 'Por famílias',
  'tut.app-entretenimiento--esencial.3.texto':
    'O catálogo se agrupa em famílias — tabuleiro, raciocínio, arcade, cartas e cassino, e para o grupo — cada uma com sua própria cor. Toque em qualquer cartão para abrir o jogo em tela cheia.',
  'tut.app-entretenimiento--esencial.4.titulo': 'Arquivo',
  'tut.app-entretenimiento--esencial.4.texto':
    'O arquivo junta o que você vê, lê e joga: cada título com seu status, sua nota e sua resenha. Pode ser ordenado por gênero, categoria, autor ou data.',
  'tut.app-garage--esencial.1.titulo': 'A garagem',
  'tut.app-garage--esencial.1.texto':
    'A garagem cuida dos seus veículos: bicicletas, carros, motos e o que você usar para se locomover. Cada um com seu histórico de serviços e seus trâmites, e tudo o que tem data se agenda sozinho no calendário da casa.',
  'tut.app-garage--esencial.2.titulo': 'Resumo',
  'tut.app-garage--esencial.2.texto':
    'A aba de entrada: um semáforo diz num relance se algo venceu, se algo está se aproximando ou se a garagem está em paz.',
  'tut.app-garage--esencial.3.titulo': 'Num relance',
  'tut.app-garage--esencial.3.texto':
    'Quantos veículos você tem, quantos trâmites continuam ativos e quanto você já gastou no ano.',
  'tut.app-garage--esencial.4.titulo': 'Veículos',
  'tut.app-garage--esencial.4.texto':
    'A lista completa, com placa, quilometragem e número de serviços em cada cartão. Ao tocar em um, abre sua ficha, com o histórico de serviços e seus trâmites.',
  'tut.app-garage--esencial.5.titulo': 'Cadastrar um novo',
  'tut.app-garage--esencial.5.texto':
    'Nome, tipo, marca, modelo, ano, placa e o odômetro de hoje. Com a placa preenchida, a ficha também habilita os trâmites que só valem para um veículo emplacado, como a vistoria ou o licenciamento.',
  'tut.app-hobbies--esencial.1.titulo': 'Seus passatempos',
  'tut.app-hobbies--esencial.1.texto':
    'Hobbies acompanha o que você pratica por gosto: cada hobby junta suas sessões, sua sequência e, se você quiser, seus projetos.',
  'tut.app-hobbies--esencial.2.titulo': 'Seus hobbies',
  'tut.app-hobbies--esencial.2.texto':
    'Cada hobby que você registrar aparece aqui como um cartão, com o avanço da semana e a sequência ativa. Ao abrir um, você vê suas estatísticas, seu mapa de calor do ano, o registro de sessões e seus projetos.',
  'tut.app-hobbies--esencial.3.titulo': 'Cadastrar um hobby',
  'tut.app-hobbies--esencial.3.texto':
    'Este botão abre o formulário para adicionar um hobby novo: nome, emoji, cor e, se você quiser, uma meta semanal em dias de prática.',
  'tut.app-hobbies--esencial.4.titulo': 'Dentro de cada hobby',
  'tut.app-hobbies--esencial.4.texto':
    'Ali você registra sessões com minutos e nota, vê seu mapa de calor do ano e leva projetos com seu próprio avanço. As metas e seu cronograma vivem no cômodo Metas.',
  'tut.app-ideas--esencial.1.titulo': 'Ideias',
  'tut.app-ideas--esencial.1.texto':
    'Ideias guarda o que passa pela sua cabeça e ajuda a amadurecer: primeiro se anota, depois se organiza num mapa e, se precisar, se compara para decidir. São três menus.',
  'tut.app-ideas--esencial.2.titulo': 'Diário de ideias',
  'tut.app-ideas--esencial.2.texto':
    'A bandeja onde cai qualquer ideia, solta ou agrupada numa tempestade por tema. Pode ser arquivada em pastas, destacada com estrela e, quando amadurece, convertida num mapa.',
  'tut.app-ideas--esencial.3.titulo': 'Mapas conceituais',
  'tut.app-ideas--esencial.3.texto':
    'Uma tela livre para organizar um tema no formato que ficar melhor: mental, árvore, fluxo, linha do tempo, ciclo, pirâmide, Venn e mais.',
  'tut.app-ideas--esencial.4.titulo': 'Diagramas de decisão',
  'tut.app-ideas--esencial.4.texto':
    'A mesma tela, com formatos pensados para decidir: prós e contras com peso, SWOT, Eisenhower ou uma matriz ponderada que ordena as opções sozinha.',
  'tut.app-idiomas--esencial.1.titulo': 'Sua escola de idiomas',
  'tut.app-idiomas--esencial.1.texto':
    'Aqui você escolhe um idioma, conversa com um tutor de inteligência artificial, guarda o vocabulário que aprende e o revisa com um sistema espaçado. São quatro menus: Conversas, Programa, Revisão e Progresso.',
  'tut.app-idiomas--esencial.2.titulo': 'Conversas',
  'tut.app-idiomas--esencial.2.texto':
    'Você conversa com seu tutor no idioma que está estudando: ele responde de acordo com seu nível e corrige com delicadeza. Cada conversa fica guardada e classificada sozinha, e ao sair oferece extrair o vocabulário novo como cartões.',
  'tut.app-idiomas--esencial.3.titulo': 'Programa',
  'tut.app-idiomas--esencial.3.texto':
    'Organiza o idioma em temas, pronúncia e gramática, do nível A1 ao C2. O vocabulário vive dentro de cada tema: cada cartão é guardado ali, com sua tradução e seu exemplo.',
  'tut.app-idiomas--esencial.4.titulo': 'Revisão',
  'tut.app-idiomas--esencial.4.texto':
    'A revisão espaçada: cada cartão vive numa caixa e só pede os que você está prestes a esquecer, com exercícios de múltipla escolha, invertidos ou de completar a frase, em vez de só olhar os cartões.',
  'tut.app-idiomas--esencial.5.titulo': 'Progresso',
  'tut.app-idiomas--esencial.5.texto':
    'O resumo do seu avanço: quantos cartões você domina, quanto revisou e seu nível atual, com o histórico das suas revisões dia a dia.',
  'tut.app-jardin--esencial.1.titulo': 'Seu espaço de calma',
  'tut.app-jardin--esencial.1.texto':
    'O jardim reúne três práticas: meditação, respiração guiada e agradecimentos. Não tem pontos nem sequências de propósito: aqui faltar não é punido, só se acompanha o que você pratica.',
  'tut.app-jardin--esencial.2.titulo': 'Meditação',
  'tut.app-jardin--esencial.2.texto':
    'Escolha uma trilha sonora e uma duração, ou medite em silêncio com um sino no início e no fim. Cada sessão fica guardada no seu histórico.',
  'tut.app-jardin--esencial.3.titulo': 'Respiração',
  'tut.app-jardin--esencial.3.texto':
    'Dois padrões de respiração guiada, um para te centrar e outro para soltar o dia: a tela respira com você enquanto avança.',
  'tut.app-jardin--esencial.4.titulo': 'Agradecimentos',
  'tut.app-jardin--esencial.4.texto':
    'Anote o que você agradece hoje, mesmo que seja uma coisa só, e revise suas entradas anteriores quando quiser. Sem sequências: perder um dia não apaga nada.',
  'tut.app-metas--esencial.1.titulo': 'O planejador da casa',
  'tut.app-metas--esencial.1.texto':
    'Este cômodo não guarda registros próprios: reúne num só lugar as metas e os planos que nascem nos demais apps. São três menus, e se leem nesta ordem: o que você se propôs, como pretende dividir e quando cai.',
  'tut.app-metas--esencial.2.titulo': 'Metas',
  'tut.app-metas--esencial.2.texto':
    'A lista de tudo o que você se propôs, agrupada pelo app que leva cada meta. Uma meta pode pender de outra, e ao tocá-la abre sua folha: ali estão seu prazo, seus passos e a entrada para seu próprio cronograma.',
  'tut.app-metas--esencial.3.titulo': 'Planos',
  'tut.app-metas--esencial.3.texto':
    'Um plano é o rascunho de um cronograma: divide uma meta em fases com suas datas. Enquanto é proposta, você ajusta à vontade; quando convence, é aceito e suas fases viram sub-metas de verdade.',
  'tut.app-metas--esencial.4.titulo': 'Cronograma',
  'tut.app-metas--esencial.4.texto':
    'O eixo do tempo com todas as metas de uma vez: cada uma é uma barra sobre as datas. Você aproxima e afasta por dias, semanas, meses ou anos, e um plano pode se sobrepor a ele para comparar com o que já está traçado.',
  'tut.app-sala--esencial.1.titulo': 'Sua sala de viagens',
  'tut.app-sala--esencial.1.texto':
    'Aqui vive seu mundo viajante: um mapa-múndi com alfinetes, itinerários de lugares por conhecer, rotas que encadeiam lugares e um diário de bordo de lembranças. São quatro menus.',
  'tut.app-sala--esencial.2.titulo': 'Mapa',
  'tut.app-sala--esencial.2.texto':
    'Cada lugar que você visitou ou sonha em visitar é um alfinete no mapa-múndi. O interruptor lá em cima troca o mapa plano por um globo que você gira arrastando.',
  'tut.app-sala--esencial.3.titulo': 'Itinerário',
  'tut.app-sala--esencial.3.texto':
    'Os lugares que você sonha em conhecer, cada um com seu plano dia a dia. Os que têm data se agendam sozinhos no calendário.',
  'tut.app-sala--esencial.4.titulo': 'Rotas',
  'tut.app-sala--esencial.4.texto': 'Uma rota encadeia lugares num percurso e o desenha no mapa.',
  'tut.app-sala--esencial.5.titulo': 'Diário de bordo',
  'tut.app-sala--esencial.5.texto':
    'As lembranças dos lugares que você visitou, em álbuns por país: fotos e histórias de cada lugar.',
  'tut.app-agenda--trabajo.1.titulo': 'A caixa de entrada',
  'tut.app-agenda--trabajo.1.texto':
    'Trabalho tem duas vistas: a caixa Tarefa e o Quadro. Em Tarefa mora o que precisa ser feito mas ainda não tem dia, com sua prioridade; nada obriga você a marcar uma data só para anotar.',
  'tut.app-agenda--trabajo.3.titulo': 'O quadro',
  'tut.app-agenda--trabajo.3.texto':
    'Todo o trabalho em três colunas —a fazer, em andamento e feito—, inclusive o que já tem data. Mantenha um cartão pressionado para arrastá-lo de coluna (soltá-lo em «feito» também marca a tarefa no calendário), ou mova-o com as setas.',
  'tut.app-agenda--salud.1.titulo': 'O ano do joelho',
  'tut.app-agenda--salud.1.texto':
    'Nutrição a cada poucos meses, dentista e as seis sessões de fisioterapia do mês 7: a lesão que travou Pep@ está registrada aqui.',
  'tut.app-agenda--salud.2.titulo': 'Medicamentos',
  'tut.app-agenda--salud.2.texto':
    'Cada medicamento gera um bloco por dose no calendário. O anti-inflamatório da lesão durou três semanas e foi arquivado; a vitamina continua.',
  'tut.app-agenda--salud.3.titulo': 'Laika',
  'tut.app-agenda--salud.3.texto':
    'A gata tem sua ficha com peso e veterinário, e seus cuidados com periodicidade: vacina anual, vermífugo a cada três meses, banho todo mês. Ao dar como feitos, a próxima data se recalcula sozinha.',
  'tut.app-agenda--salud.4.titulo': 'O que se repete',
  'tut.app-agenda--salud.4.texto':
    'O check-up anual, a limpeza no dentista, os exames: cuidados com período próprio. Ao marcá-los como feitos, a próxima data pula sozinha, então o calendário nunca aponta para algo que você já fez.',
  'tut.app-agenda--salud.ciclo.titulo': 'O ciclo',
  'tut.app-agenda--salud.ciclo.texto':
    'No final de Você vive o ciclo, com seu próprio interruptor: sangramento, sintomas e humor por dia, e com seus últimos períodos ele estima o próximo e a janela fértil. Desligá-lo conserva tudo o que foi registrado.',
  'tut.app-agenda--salud.projimos.titulo': 'Quem você ama',
  'tut.app-agenda--salud.projimos.texto':
    'Quem está sob seus cuidados: contatos de Pessoas marcados «Sob meus cuidados», cada um com suas consultas por especialidade, seus cuidados e seus medicamentos. Pep@ acompanha aqui a própria mãe.',
  'tut.app-agenda--personas.1.titulo': 'O círculo de Pep@',
  'tut.app-agenda--personas.1.texto':
    'Família, amizades, gente do trabalho e da faculdade, cada um na sua pasta. Com telefone, endereço e o que você não quer esquecer.',
  'tut.app-agenda--personas.2.titulo': 'Aniversários que não se esquecem',
  'tut.app-agenda--personas.2.texto':
    'Ao salvar uma data de nascimento, o aniversário se repete todo ano no calendário e avisa você. O app calcula a idade sozinho.',
  'tut.app-agenda--personas.3.texto':
    'Os planos com pessoas ficam ligados ao contato: assim você vê quando foi a última vez que encontrou alguém.',
  'tut.app-ejercicio--anio.1.titulo': 'Um ano em três números',
  'tut.app-ejercicio--anio.1.texto':
    'A sequência conta os dias seguidos com algo registrado, e a adesão compara os dias ativos com os que você se propôs. Pep@ começou o ano sem conseguir correr duas quadras.',
  'tut.app-ejercicio--anio.2.titulo': 'As três modalidades',
  'tut.app-ejercicio--anio.2.texto':
    'As barras medem o que você já fez em relação às suas metas: sessões de força, minutos de corrida e minutos de mobilidade. O objetivo se ajusta ao período que você escolher acima.',
  'tut.app-ejercicio--anio.3.titulo': 'As metas do ano',
  'tut.app-ejercicio--anio.3.texto':
    'O cômodo Metas guarda suas quatro metas cumpridas —os 5K, os 10K, a meia maratona e a maratona— e a que ainda está ativa. Metas com data também aparecem no calendário da casa.',
  'tut.app-ejercicio--carrera.1.titulo': 'Catálogo, rotinas e progresso',
  'tut.app-ejercicio--carrera.1.texto':
    'Cada modalidade se organiza igual: o catálogo de exercícios, suas rotinas com o histórico e o progresso. Vamos começar pelo que Pep@ já correu.',
  'tut.app-ejercicio--carrera.2.titulo': 'Cada corrida fica registrada',
  'tut.app-ejercicio--carrera.2.texto':
    'O histórico é agrupado por ano, mês e semana. As corridas grandes guardam também o traçado do percurso e seus trechos: aí está a maratona, com as parciais de dez quilômetros.',
  'tut.app-ejercicio--carrera.3.titulo': 'O mapa de calor não mente',
  'tut.app-ejercicio--carrera.3.texto':
    'Os vazios também contam a história: o mês da lesão no joelho está em branco e as três semanas no Japão, quase. Ao lado aparecem os quilômetros totais, a corrida mais longa e o melhor ritmo.',
  'tut.app-ejercicio--fuerza.1.titulo': 'Séries, repetições e peso',
  'tut.app-ejercicio--fuerza.1.texto':
    'Cada sessão guarda seus exercícios com o peso que você levantou. O app lembra a última vez para você não precisar procurar, e soma o volume total do dia.',
  'tut.app-ejercicio--fuerza.2.titulo': 'A curva de um ano',
  'tut.app-ejercicio--fuerza.2.texto':
    'Escolha um exercício e veja como subiu: o agachamento de Pep@ foi de quarenta quilos a setenta. No mês da lesão só treinou a parte de cima, e essa curva nem sentiu.',
  'tut.app-ejercicio--fuerza.3.titulo': 'Seus recordes, sem pedir',
  'tut.app-ejercicio--fuerza.3.texto':
    'De cada exercício ficam salvos o melhor peso, o máximo de repetições e uma estimativa do seu 1RM. Os de peso corporal, como as barras, aparecem à parte.',
  'tut.app-ejercicio--flexibilidad.1.titulo': 'Alongamento e mobilidade',
  'tut.app-ejercicio--flexibilidad.1.texto':
    'O catálogo traz os exercícios de sempre —posteriores, quadril, ombros— cada um com sua miniatura ilustrada, gerada por IA na primeira vez que é preciso.',
  'tut.app-ejercicio--flexibilidad.2.titulo': 'Séries por tempo, não por peso',
  'tut.app-ejercicio--flexibilidad.2.texto':
    'Cada exercício leva segundos e repetições em vez de peso. O Player guiado roda a rotina exercício por exercício com um timer que avisa quando trocar.',
  'tut.app-ejercicio--flexibilidad.3.titulo': 'O mesmo mapa de calor',
  'tut.app-ejercicio--flexibilidad.3.texto':
    'Minutos e sessões do mês, com o mesmo heatmap das outras duas modalidades: a constância da mobilidade se lê tão fácil quanto a da corrida.',
  'tut.app-ejercicio--flexibilidad.4.texto':
    'As três modalidades compartilham o Cardio ao vivo do relógio: quando você corre ou pedala com o timer ligado, o minuto a minuto se salva sozinho ao terminar.',
  'tut.app-cocina--alimentacion.1.titulo': 'Passo 1: para onde você vai',
  'tut.app-cocina--alimentacion.1.texto':
    'Com seu peso, sua altura e sua atividade, o app calcula quanto você precisa por dia e distribui os macros. Pep@ definiu 2.400 calorias e uma meta de peso que está a menos de um quilo.',
  'tut.app-cocina--alimentacion.2.titulo': 'Passo 2: o que você comeu hoje',
  'tut.app-cocina--alimentacion.2.texto':
    'Café da manhã, almoço, jantar e algo no meio: cada registro soma aos anéis do dia. A água tem sua própria meta, e é essa que a casa olha para dar o dia por cumprido.',
  'tut.app-cocina--alimentacion.3.titulo': 'Passo 3: 74 quilos, 67 quilos',
  'tut.app-cocina--alimentacion.3.texto':
    'A curva do ano inteiro, com o platô no mês da lesão e o quilo que subiu no Japão. Embaixo, o ritmo em que você vai e quando chegaria se seguir assim.',
  'tut.app-cocina--alimentacion.4.titulo': 'Um ano em cores',
  'tut.app-cocina--alimentacion.4.texto':
    'Verde é um dia dentro da meta, âmbar um que passou um pouco e vermelho um que passou longe. O mês da viagem aparece de cara. Toque em qualquer dia para abrir.',
  'tut.app-cocina--recetario.1.titulo': 'Dietas, não dietas de revista',
  'tut.app-cocina--recetario.1.texto':
    'Uma dieta aqui é um plano com as receitas dentro. A Pep@ guardou duas dela: a semana da maratona e a volta do Japão, além das que já vêm no app.',
  'tut.app-cocina--recetario.2.titulo': 'O livro de receitas',
  'tut.app-cocina--recetario.2.texto':
    'Cada receita guarda ingredientes, passos e os macros por porção, e se organiza em pastas. De uma receita você pode registrar a refeição ou mandar os ingredientes para o mercado.',
  'tut.app-cocina--recetario.3.titulo': 'Pedir a receita para a IA',
  'tut.app-cocina--recetario.3.texto':
    'Descreva o que quer cozinhar e a IA monta a receita completa com foto do prato. Isso é feito pela IA: ative em Editor › Configurações › Conta.',
  'tut.app-cocina--recetario.4.titulo': 'Da receita à lista de mercado',
  'tut.app-cocina--recetario.4.texto':
    'Criar lista junta o que falta de várias receitas em uma só compra: cada ingrediente adivinha sua categoria (verdura, laticínio…) e pode ser editado.',
  'tut.app-cocina--recetario.5.titulo': 'As listas salvas',
  'tut.app-cocina--recetario.5.texto':
    'Cada lista guarda o que ainda falta comprar e o que já está na despensa. Se você colocar preços, o total pode ir para os gastos do Escritório.',
  'tut.app-cocina--cronograma.1.titulo': 'O que a Cozinha pede de você hoje',
  'tut.app-cocina--cronograma.1.texto':
    'O botão Missões do cabeçalho abre o checklist do dia: a água, as refeições e os passos que vierem das suas metas. As metas em si —com o plano que a IA propõe para elas— ficam no cômodo Metas, agrupadas pelo app que cuida delas.',
  'tut.app-cocina--cronograma.2.texto':
    'Isso é feito pela IA: ative em Editor › Configurações › Conta. Sem ela, as metas são criadas e editadas do mesmo jeito, só na mão.',
  'tut.app-descanso--noche.1.titulo': 'Cem pontos, três partes',
  'tut.app-descanso--noche.1.texto':
    'A duração vale cinquenta, a constância da sua hora de dormir trinta e as interrupções vinte. Dormir muito um dia não compensa deitar fora de hora todos os outros.',
  'tut.app-descanso--noche.2.titulo': 'A última semana',
  'tut.app-descanso--noche.2.texto':
    'Sete barras contra a linha da sua meta. É a visão que diz num relance se nesta semana você está dormindo o que queria.',
  'tut.app-descanso--noche.3.titulo': 'O ano inteiro',
  'tut.app-descanso--noche.3.texto':
    'O histórico é guardado por ano, mês e semana. Volte até os primeiros meses da Pep@ e compare com os últimos: deitava depois da uma e dormia cinco horas.',
  'tut.app-descanso--horario.1.titulo': 'Das onze e meia às sete',
  'tut.app-descanso--horario.1.texto':
    'Arraste as pontas da barra para mudar a hora de dormir e a de acordar; o céu ali em cima muda com elas. Esse bloco também aparece no calendário, atravessando a meia-noite.',
  'tut.app-descanso--horario.2.titulo': 'Alarme e lembretes',
  'tut.app-descanso--horario.2.texto':
    'Você pode escolher o som do despertador, pedir um aviso na hora de ir para a cama e largar as telas uma hora antes. Os avisos são opcionais: aqui vêm desligados.',
  'tut.app-descanso--horario.3.titulo': 'Registrar a noite',
  'tut.app-descanso--horario.3.texto':
    'Toda manhã você anota a que horas se deitou, a que horas acordou, quantas vezes despertou e como foi. É só isso que o app precisa para o resto.',
  'tut.app-despacho--anio.1.titulo': 'Um ano, quatro lupas',
  'tut.app-despacho--anio.1.texto':
    'Escolha dia, semana, mês ou ano e navegue com as flechas. Volte alguns meses: você vai ver o mês da pane do carro e o do voo para o Japão, os dois em vermelho.',
  'tut.app-despacho--anio.2.titulo': 'A forma do ano',
  'tut.app-despacho--anio.2.texto':
    'Seis períodos para trás, em barras. As azuis são os meses em que sobrou; as vermelhas, os que doeram. Ali se vê a queda e a retomada.',
  'tut.app-despacho--anio.3.titulo': 'Para onde vai?',
  'tut.app-despacho--anio.3.texto':
    'O detalhamento por categoria do período que você está vendo. Pep@ escreve as próprias na mão: o app reconhece as conhecidas e dá cor própria às demais.',
  'tut.app-despacho--anio.4.titulo': 'O limite do mês',
  'tut.app-despacho--anio.4.texto':
    'Um orçamento mensal e uma barra que fica vermelha quando você passa. Se olhar por semana ou por ano, o app ajusta sozinho.',
  'tut.app-despacho--anio.5.titulo': 'O que você tem hoje',
  'tut.app-despacho--anio.5.texto':
    'Seu patrimônio vem direto da aba Patrimônio: ativos menos passivos. Aqui soma-se ou subtrai-se o saldo do período, para ver como você terminaria.',
  'tut.app-despacho--anio.6.titulo': 'E daqui a um ano',
  'tut.app-despacho--anio.6.texto':
    'Projeta doze meses com seus fixos no vencimento e o variável pela sua média, em dois cenários: com patrimônio e sem ele.',
  'tut.app-despacho--captura.1.titulo': 'Os fixos de Pep@',
  'tut.app-despacho--captura.1.texto':
    'O aluguel, a internet, o celular, o streaming e o seguro do carro: cinco cadastros do mês 2, quando decidiu se organizar. Cada um se conta sozinho desde então.',
  'tut.app-despacho--captura.2.titulo': 'Como registrar',
  'tut.app-despacho--captura.2.texto':
    'O formulário vai por passos: valor, se é variável ou fixo, categoria (você escreve a sua e ele sugere as conhecidas), com que frequência se repete e a nota.',
  'tut.app-despacho--captura.3.titulo': 'Um ano de lançamentos',
  'tut.app-despacho--captura.3.texto':
    'Centenas de gastos guardados em pastas de ano e mês. Procure o mês 7: ali está o consertoue levou quase dez mil de uma vez.',
  'tut.app-despacho--captura.4.titulo': 'De onde vem o dinheiro',
  'tut.app-despacho--captura.4.texto':
    'Dois salários quinzenais da cafeteria, as aulas de física que começou a dar quando decidiu viajar, e as gorjetas semanais, que nunca são iguais.',
  'tut.app-despacho--captura.5.texto':
    'Na sua casa você também pode registrar por chat: «gastei 250 no mercado» e fica anotado.',
  'tut.app-despacho--metas.1.titulo': 'A meta que cumpriu',
  'tut.app-despacho--metas.1.texto':
    'A viagem ao Japão, a 100%: onze meses de poupança, as aulas particulares, o décimo terceiro e o que ganhou de aniversário. Abaixo, a reserva de emergência que começou na volta e um pequeno investimento.',
  'tut.app-despacho--metas.2.titulo': 'A meta no tempo',
  'tut.app-despacho--metas.2.texto':
    'Essas metas ficam guardadas sobre o eixo do tempo no cômodo Metas: você coloca datas em uma e ela aparece entre os seus dias do calendário. Com ✨ a IA propõe o plano de aportes.',
  'tut.app-despacho--metas.3.titulo': 'O que devia',
  'tut.app-despacho--metas.3.texto':
    'O consertodo carro foi pago no cartão e levou meses para ser quitado. As dívidas ficam à parte porque se leem ao contrário: aqui, descer é ganhar.',
  'tut.app-despacho--metas.4.titulo': 'Mercados',
  'tut.app-despacho--metas.4.texto':
    'Pep@ acompanha o iene desde que decidiu a viagem e agora o won, para a próxima. Moedas, cripto, ações e commodities ao vivo (precisa de internet).',
  'tut.app-despacho--patrimonio.1.titulo': 'O que vale hoje',
  'tut.app-despacho--patrimonio.1.texto':
    'Ativos menos passivos. Quando uma linha tem taxa, este número é o que vale HOJE, não o que valia no dia em que você anotou — e abaixo dá para ver o detalhamento, ou voltar ao que você escreveu.',
  'tut.app-despacho--patrimonio.2.titulo': 'De onde vem',
  'tut.app-despacho--patrimonio.2.texto':
    'Os últimos dois anos deste grupo. Abra qualquer linha e você verá do que ela depende: quanto vale, desde quando, e quanto sobe ou desce por ano. O que você escreve nunca se reescreve sozinho.',
  'tut.app-despacho--patrimonio.3.titulo': 'E para onde vai',
  'tut.app-despacho--patrimonio.3.texto':
    'A terceira aba segue essa mesma linha para a frente: sólida o que aconteceu, pontilhada o que suas taxas dariam.',
  'tut.app-despacho--patrimonio.4.titulo': 'Três linhas',
  'tut.app-despacho--patrimonio.4.texto':
    'O que você tem em verde, o que deve em vermelho e o líquido em azul. A linha vertical é hoje: à esquerda dela está o que aconteceu de verdade.',
  'tut.app-despacho--patrimonio.5.titulo': 'Mexa em tudo',
  'tut.app-despacho--patrimonio.5.texto':
    'Quantos meses, quanta inflação você supõe, e se soma o que você poupa por mês com seu próprio ritmo de alta. Nada disso toca seus dados: pode testar sem medo.',
  'tut.app-despacho--calculadoras.1.texto':
    'Quatro regras de finanças pessoais, cada uma na sua aba: reserva de emergência, liberdade financeira, 50/30/20 e a entrada do carro (20/4/10).',
  'tut.app-despacho--calculadoras.2.titulo': 'Já com o seu saldo',
  'tut.app-despacho--calculadoras.2.texto':
    'Os campos chegam pré-carregados com a sua receita ou despesa real do mês — toque neles para simular outro valor sem perder de vista o real.',
  'tut.app-despacho--calculadoras.3.titulo': 'De cálculo a meta',
  'tut.app-despacho--calculadoras.3.texto':
    'Com um toque, o resultado se transforma numa meta de poupança real, pronta para descer ao cronograma e ganhar data. (Não aperte na demo: criaria uma meta de verdade.)',
  'tut.app-garage--vehiculos.1.titulo': 'Tenho algo urgente?',
  'tut.app-garage--vehiculos.1.texto':
    'Um único semáforo para você não ter que ler duas listas: vermelho se algo venceu, âmbar se está chegando, verde se a garagem está em paz.',
  'tut.app-garage--vehiculos.2.titulo': 'Quanto você já gastou',
  'tut.app-garage--vehiculos.2.texto':
    'Quantos veículos, quantas burocracias em aberto e quanto você já gastou no ano. Para Pep@, o carro saiu caro.',
  'tut.app-garage--vehiculos.2b.titulo': 'Cadastrar um novo',
  'tut.app-garage--vehiculos.2b.texto':
    'Nome, tipo, marca, modelo, ano, placa e o odômetro de hoje. Com a placa registrada, a garagem sabe quais trâmites oferecer a você mais adiante.',
  'tut.app-garage--vehiculos.3.titulo': 'A bike do dia a dia',
  'tut.app-garage--vehiculos.3.texto':
    'O transporte real dela: corrente, câmaras de ar, freios, um por um em sua própria linha — o mesmo arquivo de pastas por ano e mês que outros apps usam. Veja como os serviços se acumulam nos últimos meses: é o treino da maratona cobrando o preço.',
  'tut.app-garage--vehiculos.4.titulo': 'E o carro herdado',
  'tut.app-garage--vehiculos.4.texto':
    'Aqui está a pane do mês 7: ficou na mão, veio reboque e quase dez mil pesos que não tinha. Cada serviço guarda seu custo, sua quilometragem e em qual oficina foi.',
  'tut.app-garage--vehiculos.5.titulo': 'A ficha',
  'tut.app-garage--vehiculos.5.texto':
    'Marca, modelo, ano, placa e a quilometragem atual. Com a placa preenchida, a garagem libera os trâmites que só se aplicam a um carro.',
  'tut.app-garage--tramites.tabs.titulo': 'Três cadernos',
  'tut.app-garage--tramites.tabs.texto':
    'A ficha de cada veículo divide seus papéis em três cadernos: Burocracia, Documentos e Contatos. O histórico de serviços fica sempre embaixo, seja qual for o caderno aberto.',
  'tut.app-garage--tramites.1.titulo': 'O que vem',
  'tut.app-garage--tramites.1.texto':
    'Cada trâmite guarda seu próximo vencimento, de quantos em quantos meses se repete e quanto custa. Ao concluir, a data pula sozinha para a seguinte.',
  'tut.app-garage--tramites.2.titulo': 'A bike não paga IPVA',
  'tut.app-garage--tramites.2.texto':
    'Sem placa só se oferece o que se aplica: para a bike, sua revisão periódica. A inspeção, o IPVA ou o seguro pedem placa, então o caderno de Documentos dela fica vazio.',
  'tut.app-garage--tramites.2b.titulo': 'Os papéis, à parte',
  'tut.app-garage--tramites.2b.texto':
    'O documento do veículo, a apólice e o IPVA não se misturam com o que se faz na oficina: têm seu próprio caderno, com número, vencimento e aviso prévio.',
  'tut.app-garage--tramites.3.titulo': 'O caderno de Contatos',
  'tut.app-garage--tramites.3.texto':
    'A oficina de confiança, a seguradora, o centro de vistoria, a bicicletaria do bairro e o reboque daquela noite — com telefone e endereço a um toque.',
  'tut.app-garage--tramites.4.texto':
    'Todos esses trâmites estão também no calendário da casa, com aviso prévio. E atenção: os veículos que você dirige pelo mapa são outra coisa, moram no Inventário.',
  'tut.app-sala--mapa.1.titulo': 'Onde você já esteve',
  'tut.app-sala--mapa.1.texto':
    'Quatro países e algumas cidades: quase todas de uma mesma viagem. Toque em qualquer um dos três números para ver a lista abaixo do mapa.',
  'tut.app-sala--mapa.2.titulo': 'Os pins',
  'tut.app-sala--mapa.2.texto':
    'Os sete pins juntinhos no Japão são as três semanas da viagem; os âmbar —Seul, a Patagônia, Islândia— são o que ainda não. Para pôr um novo, ative «Pin visitado» ou «Pin a conhecer» e toque no lugar no mapa.',
  'tut.app-sala--mapa.3.titulo': 'O globo',
  'tut.app-sala--mapa.3.texto':
    'O comutador de cima troca o planisfério por um globo que você gira arrastando, com os mesmos pins tocáveis. O globo só olha: os pins novos são colocados na vista Plano.',
  'tut.app-sala--japon.1.titulo': 'Os álbuns',
  'tut.app-sala--japon.1.texto':
    'Uma pasta por país, com sua foto de capa. Dentro, um cartão por lugar e, dentro de cada um, o que Pep@ escreveu naquele dia.',
  'tut.app-sala--japon.2.titulo': 'O que escreveu por lá',
  'tut.app-sala--japon.2.texto':
    'Oito entradas da viagem, cada uma com sua foto: o Fuji ao amanhecer, o bambu de Arashiyama, os cervos de Nara. Escritas na hora, com o cheiro ainda na pele.',
  'tut.app-sala--japon.3.texto':
    'Dentro de cada lugar, o botão «Itinerário» abre a folha da viagem: dia por dia, de onde para onde, onde dormiu, como se locomoveu e quanto custou.',
  'tut.app-sala--proximo.1.titulo': 'O que está pendente',
  'tut.app-sala--proximo.1.texto':
    'Três sonhos anotados. Seul já tem data e plano; a Patagônia e a Islândia ainda são só uma ideia. Os que têm data aparecem no seu calendário.',
  'tut.app-sala--proximo.2.titulo': 'Da planilha à meta',
  'tut.app-sala--proximo.2.texto':
    'Os oito dias na Coreia somam quanto custaria a viagem, e essa soma fica salva como meta de poupança no escritório: ver crescer lá é ver chegar mais perto aqui.',
  'tut.app-sala--proximo.3.titulo': 'Rotas',
  'tut.app-sala--proximo.3.texto':
    'Uma rota encadeia lugares em ordem e os desenha no mapa. A do Japão é o trajeto que já fez; a da Coreia, o que quer fazer.',
  'tut.app-entretenimiento--archivo.1.titulo': 'Trinta obras, um ano',
  'tut.app-entretenimiento--archivo.1.texto':
    'Filmes, séries, livros e videogames, ordenados por quando terminou cada um. Tem uma maratona no mês 7 (com o joelho machucado, sobrou sofá) e um vazio de três semanas: Japão.',
  'tut.app-entretenimiento--archivo.2.titulo': 'A ficha',
  'tut.app-entretenimiento--archivo.2.texto':
    'Título, autor ou diretor, gênero, status e estrelas. A resenha é o que Pep@ achou, não um resumo da trama: daqui a um ano é a única coisa que vai servir.',
  'tut.app-entretenimiento--archivo.3.titulo': 'Quatro formas de organizar',
  'tut.app-entretenimiento--archivo.3.texto':
    'Por gênero, por categoria (filme, série, livro, videogame), por autor ou por data. Na visão por gênero as pastas se arrastam: coloque na frente o que você mais vê.',
  'tut.app-entretenimiento--juegos.1.texto':
    '1–2 jogadores ou 3+: o filtro esconde o que não serve para o grupo que está na sua frente. Os jogos marcados «2+» valem nas duas seções.',
  'tut.app-entretenimiento--juegos.2.titulo': 'Por família',
  'tut.app-entretenimiento--juegos.2.texto':
    'Tabuleiro, Raciocínio, Arcade, Cartas e cassino, Para o grupo: cada família com sua própria cor. Xadrez, damas, dominó, blackjack, tetris, campo minado e mais de uma dúzia.',
  'tut.app-entretenimiento--juegos.3.titulo': 'Um toque e já está jogando',
  'tut.app-entretenimiento--juegos.3.texto':
    'Cada cartão abre o jogo em tela cheia; os que permitem trazem seu próprio seletor de dificuldade em cima. Voltar traz você para cá mesmo, sem perder seu lugar.',
  'tut.app-diario--habito.1.titulo': 'As manchetes de hoje',
  'tut.app-diario--habito.1.texto':
    'Mundo, economia, tecnologia, saúde, esportes e entretenimento, com os chips de cima para filtrar. Os cabeçalhos são imprensa real no seu idioma —cada manchete diz a fonte dela— e a cada dia entram veículos diferentes, em rotação.',
  'tut.app-diario--habito.2.titulo': 'Se renova sozinho',
  'tut.app-diario--habito.2.texto':
    'A edição do dia é baixada sozinha e à meia-noite é trocada inteira: aqui não acumula nada, como um jornal de verdade. E se você mudar o idioma da casa, muda também a imprensa: cada idioma traz seus próprios veículos.',
  'tut.app-diario--habito.3.titulo': 'Um dia na história',
  'tut.app-diario--habito.3.texto':
    'A outra metade: o que aconteceu num dia como hoje, uma obra, um livro, uma espécie, uma palavra. Serve de desculpa para abrir mesmo quando as notícias não animam.',
  'tut.app-diario--habito.4.texto':
    'Pep@ leu umas duzentas vezes este ano: muito no começo, quase nada no mês ruim, e todos os dias das últimas três semanas. A sequência dele@ vive disso.',
  'tut.app-diario--reparto.1.titulo': 'A entrega',
  'tut.app-diario--reparto.1.texto':
    'Aqui você define quem te traz o quê. Não é mais uma notificação: chega como mensagem do assistente, com a voz dele.',
  'tut.app-diario--reparto.2.titulo': 'Dois entregadores',
  'tut.app-diario--reparto.2.texto':
    'O mago traz mundo, tecnologia e economia às 7:30. Laika leva o que é leve quando dá na telha dela. Cada assistente escolhe suas seções e seu modo.',
}
