/**
 * Rama «pt» del año demo de garage. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/garage.pt.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "vehiculos": {
    "biciNombre": "La Grulla",
    "biciNota": "Bicicleta de aço, usada, cinza e barulhenta, com a qual faço turnos, laboratório e treinos todos os dias. Em um ano nunca me deixou na mão.",
    "autoNombre": "El Mastodonte",
    "autoNota": "Sedã herdado do meu tio, mais velho do que eu e com o painel desbotado pelo sol. Ligo o carro a cada quinze dias, e ele me cobra juros por cada esquecimento."
  },
  "servicios": [
    {
      "dia": -350,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Resgate do porão",
      "nota": "Tirei ela do porão com os pneus murchos e a corrente toda empastada; foi uma tarde inteira de pano, ar e óleo até ela voltar a rodar."
    },
    {
      "dia": -336,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Troca de óleo muito atrasada",
      "nota": "Saiu preto como café frio, e o mecânico só levantou as sobrancelhas, que é o jeito dele de me repreender."
    },
    {
      "dia": -318,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Câmara nova e primeiro remendo",
      "nota": "Furou o pneu na Doctor Vértiz a caminho do café; aprendi a trocar câmara na calçada, tarde, mas aprendi."
    },
    {
      "dia": -300,
      "vehiculo": "auto",
      "tipo": "bateria",
      "titulo": "Bateria nova",
      "nota": "De tanto ficar parado, morreu sozinha; pedi uma carga para um vizinho e fui direto comprar uma bateria."
    },
    {
      "dia": -284,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Corrente limpa, finalmente",
      "nota": "Desengraxei e lubrifiquei com calma num domingo: parou de fazer barulho de dobradiça velha e até pedalar ficou mais leve."
    },
    {
      "dia": -252,
      "vehiculo": "auto",
      "tipo": "frenos",
      "titulo": "Pastilhas de freio dianteiras",
      "nota": "Chiavam em cada sinal e não dava mais para ignorar; comeram o meu salário da quinzena, mas trouxeram uma noite tranquila."
    },
    {
      "dia": -236,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Sapatas novas",
      "nota": "Com as chuvas eu freava dois metros depois do que queria, então troquei as sapatas e ajustei os cabos."
    },
    {
      "dia": -190,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "Furo a caminho do laboratório",
      "nota": "Um caco de vidro no Eje 8 e cheguei empurrando a bicicleta, vinte minutos atrasado para o laboratório."
    },
    {
      "dia": -178,
      "vehiculo": "auto",
      "tipo": "otro",
      "titulo": "Na mão na Calzada de Tlalpan",
      "nota": "O carro morreu no meio da avenida numa terça à noite, e passei uma hora e meia na calçada esperando o guincho, fazendo conta de um dinheiro que eu não tinha; foi aí que o mês inteiro desabou em cima de mim."
    },
    {
      "dia": -150,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "Revisão completa",
      "nota": "Com o joelho em fisioterapia eu não podia correr, então dediquei o tempo à bicicleta: rodas alinhadas, cabos trocados e tudo bem apertado."
    },
    {
      "dia": -140,
      "vehiculo": "auto",
      "tipo": "filtros",
      "titulo": "Filtros depois do susto",
      "nota": "Troquei o filtro de ar e o de combustível por pura paranoia; prefiro pagar isso a esperar outro guincho."
    },
    {
      "dia": -88,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "Corrente esticada, troquei",
      "nota": "Com o plano da meia maratona eu uso ela todo dia, e a corrente já estava patinando na largada."
    },
    {
      "dia": -64,
      "vehiculo": "bici",
      "tipo": "transmision",
      "titulo": "Cassete e cabos novos",
      "nota": "As marchas pulavam na subida; com o cassete novo, finalmente posso confiar no prato pequeno."
    },
    {
      "dia": -46,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "Óleo e revisão geral",
      "nota": "Serviço de rotina e sem surpresas, o que com esse carro já conta como boa notícia."
    },
    {
      "dia": -27,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "Freios antes da maratona",
      "nota": "Ajuste rápido porque naquelas semanas a bicicleta era meu único transporte e eu não queria nenhum pretexto."
    },
    {
      "dia": -8,
      "vehiculo": "auto",
      "tipo": "lavado",
      "titulo": "Lavagem antes da família",
      "nota": "Lavei e aspirei para ir buscar minha família na rodoviária: não conserta nada mecânico, mas parece outro carro."
    }
  ],
  "talleres": [
    {
      "clave": "taller",
      "nombre": "Taller Mecánico Rivas",
      "direccion": "Av. Cuauhtémoc 812, Col. Narvarte, Benito Juárez",
      "notas": "Seu Rivas me explica o que é urgente e o que pode esperar, e nunca inflou uma conta; é o único em quem confio com esse carro."
    },
    {
      "clave": "aseguradora",
      "nombre": "Seguros Meridiano - agente Nadia Ortega",
      "direccion": "Av. Insurgentes Sur 1234, 3º andar, Col. Del Valle",
      "notas": "A Nadia responde o WhatsApp mesmo aos domingos e organizou pagamentos mensais quando subi para a cobertura completa."
    },
    {
      "clave": "verificentro",
      "nombre": "Verificentro 09-118 Iztaccíhuatl",
      "direccion": "Calz. Iztaccíhuatl 240, Col. Iztaccíhuatl, Benito Juárez",
      "notas": "Horário marcado às sete da manhã, e saio em quarenta minutos; o de Coyoacán me custou meia manhã de fila."
    },
    {
      "clave": "ciclos",
      "nombre": "Ciclos Malinche",
      "direccion": "Zacatecas 145, Col. Roma Sur, Cuauhtémoc",
      "notas": "Foi lá que comprei a bicicleta e é lá que faço a revisão; eles emprestam ferramenta e me ensinam a fazer eu mesmo, em vez de cobrar por tudo."
    },
    {
      "clave": "grua",
      "nombre": "Grúas Tepeyac 24 horas",
      "direccion": "Base na Eje Central Lázaro Cárdenas 1105, Col. Álamos",
      "notas": "É o número que liguei na noite em que o carro me deixou na mão; chegaram em uma hora e meia e não tentaram me passar a perna no preço."
    }
  ],
  "tramites": [
    {
      "clave": "verificacion",
      "titulo": "Vistoria semestral",
      "nota": "Cai de acordo com o adesivo do carro, e eu sempre marco na primeira semana: se eu deixar passar, a multa dói mais do que o trâmite."
    },
    {
      "clave": "seguro",
      "titulo": "Renovação da apólice",
      "nota": "Este ano passei para a cobertura completa com a Nadia depois do susto da pane; pago em parcelas mensais e incluo no orçamento da quinzena."
    },
    {
      "clave": "tenencia",
      "titulo": "IPVA e licenciamento anual",
      "nota": "Pago nos primeiros meses do ano para conseguir o desconto e tirar isso da cabeça."
    },
    {
      "clave": "circulacion",
      "titulo": "Transferência de propriedade e documento",
      "nota": "O documento ainda está no nome do meu tio, e já é hora de regularizar antes que vire problema numa blitz."
    },
    {
      "clave": "afinacionBici",
      "titulo": "Revisão da bicicleta",
      "nota": "A cada seis meses na Ciclos Malinche: alinhamento das rodas, cabos e freios, que sai bem mais barato do que consertar uma roda torta."
    }
  ]
}
