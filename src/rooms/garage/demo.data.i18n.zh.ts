/**
 * Rama «zh» del año demo de garage. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/garage.zh.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "vehiculos": {
    "biciNombre": "灰鹤",
    "biciNota": "二手钢架自行车，灰色，骑起来有点吵，我每天靠它倒班、去实验室、训练。这一整年，它从没把我丢在半路。",
    "autoNombre": "老猛犸",
    "autoNota": "从舅舅那里继承来的轿车，比我年纪还大，仪表盘被太阳晒得褪了色。我大概半个月才发动一次，每次疏忽它都要连本带利找我算账。"
  },
  "servicios": [
    {
      "dia": -350,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "从地下储藏室“救”出来",
      "nota": "从地下储藏室把它搬出来时，轮胎瘪了，链条锈得结成了硬壳；花了半个下午的时间擦洗、打气、上油，它才又能骑起来。"
    },
    {
      "dia": -336,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "拖了太久的换机油",
      "nota": "放出来的机油黑得像凉咖啡，师傅只是挑了挑眉，那是他说我的方式。"
    },
    {
      "dia": -318,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "换新内胎，第一次补胎",
      "nota": "去咖啡馆的路上在贝尔蒂斯医生大道爆胎了；我就在人行道上学会了换内胎，虽然学得晚，但总算学会了。"
    },
    {
      "dia": -300,
      "vehiculo": "auto",
      "tipo": "bateria",
      "titulo": "新电瓶",
      "nota": "太久没开，电瓶自己就没电了；找邻居搭了电，然后直接开去买了新电瓶。"
    },
    {
      "dia": -284,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "链条终于洗干净了",
      "nota": "周日花时间慢慢脱脂上油：不再发出老门轴那种吱呀声，连蹬起来都轻快了不少。"
    },
    {
      "dia": -252,
      "vehiculo": "auto",
      "tipo": "frenos",
      "titulo": "前刹车片",
      "nota": "每次停车都刺耳地响，实在没法再假装听不见；花掉了我半个月的工资，但也让我睡了个安稳觉。"
    },
    {
      "dia": -236,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "新刹车皮",
      "nota": "下雨天总要多滑出两米才能停下，于是换了刹车皮，还调整了刹车线。"
    },
    {
      "dia": -190,
      "vehiculo": "bici",
      "tipo": "llantas",
      "titulo": "去实验室路上爆胎",
      "nota": "在8号干道上轧到玻璃碴，只好推着车走，到实验室时晚了二十分钟。"
    },
    {
      "dia": -178,
      "vehiculo": "auto",
      "tipo": "otro",
      "titulo": "在特拉尔潘大道抛锚",
      "nota": "周二晚上，车在大马路中间突然熄火了，我在路边坐了一个半小时等拖车，一边盘算着自己根本没有的钱；就是在那一刻，整个月的压力一下子全压了过来。"
    },
    {
      "dia": -150,
      "vehiculo": "bici",
      "tipo": "revision",
      "titulo": "全面调校",
      "nota": "膝盖在做理疗没法跑步，就把时间都花在自行车上：调正车轮、换线、把每颗螺丝都拧紧。"
    },
    {
      "dia": -140,
      "vehiculo": "auto",
      "tipo": "filtros",
      "titulo": "那次受惊之后换的滤芯",
      "nota": "纯粹是出于不安，把空气滤芯和汽油滤芯都换了；比起再等一次拖车，我宁愿花这笔钱。"
    },
    {
      "dia": -88,
      "vehiculo": "bici",
      "tipo": "cadena",
      "titulo": "链条拉长了，换了新的",
      "nota": "因为半程马拉松训练计划，每天都在骑，链条一起步就打滑。"
    },
    {
      "dia": -64,
      "vehiculo": "bici",
      "tipo": "transmision",
      "titulo": "新飞轮和刹车线",
      "nota": "上坡时变速总是跳挡；换了新飞轮之后，终于能放心用小盘了。"
    },
    {
      "dia": -46,
      "vehiculo": "auto",
      "tipo": "aceite",
      "titulo": "换油和全面检查",
      "nota": "常规保养，没什么意外，对这辆车来说，这已经算是好消息了。"
    },
    {
      "dia": -27,
      "vehiculo": "bici",
      "tipo": "frenos",
      "titulo": "马拉松前的刹车调整",
      "nota": "那几周自行车是我唯一的交通工具，不想留下任何借口，所以赶紧调整了一下。"
    },
    {
      "dia": -8,
      "vehiculo": "auto",
      "tipo": "lavado",
      "titulo": "接家人前先洗车",
      "nota": "去客运站接家人之前，把车洗了、吸了尘。虽然机械上什么都没修，但感觉完全不一样。"
    }
  ],
  "talleres": [
    {
      "clave": "taller",
      "nombre": "里瓦斯汽修厂",
      "direccion": "贝尼托·华雷斯区纳尔瓦特街区夸乌特莫克大道812号",
      "notas": "里瓦斯师傅总能说清楚什么真的急、什么可以再等，账单也从没虚报过；这辆车的事，我只信他一个人。"
    },
    {
      "clave": "aseguradora",
      "nombre": "梅里迪亚诺保险 - 代理人娜迪亚·奥尔特加",
      "direccion": "德尔巴列街区起义者南大道1234号3楼",
      "notas": "哪怕是周日，娜迪亚也会回WhatsApp消息；升级到全险的时候，是她帮我安排了按月付款。"
    },
    {
      "clave": "verificentro",
      "nombre": "伊斯塔西瓦特尔尾气检测中心（09-118）",
      "direccion": "贝尼托·华雷斯区伊斯塔西瓦特尔街区伊斯塔西瓦特尔大道240号",
      "notas": "预约早上七点，四十分钟就能搞定；科约阿坎那家检测中心排队排掉了大半个上午。"
    },
    {
      "clave": "ciclos",
      "nombre": "马林切自行车行",
      "direccion": "夸乌特莫克区罗马南街区萨卡特卡斯街145号",
      "notas": "我的自行车是在那儿买的，调校也在那儿做；他们借工具给我，还教我自己动手，而不是什么都收费。"
    },
    {
      "clave": "grua",
      "nombre": "特佩亚克24小时拖车",
      "direccion": "驻点位于阿拉莫斯街区拉萨罗·卡德纳斯中央干道1105号",
      "notas": "那天晚上抛锚时，我打的就是这个号码；他们一个半小时就到了，价格上也没坑我。"
    }
  ],
  "tramites": [
    {
      "clave": "verificacion",
      "titulo": "半年一次的尾气检测",
      "nota": "时间是按检验贴纸的颜色排的，我总是在第一周就预约；要是错过了，罚款比手续本身还让人肉疼。"
    },
    {
      "clave": "seguro",
      "titulo": "保单续保",
      "nota": "那次抛锚吓到我之后，今年跟娜迪亚升级成了全险；按月付款，我把它算进每月的预算里。"
    },
    {
      "clave": "tenencia",
      "titulo": "车船税与年度登记续期",
      "nota": "我会在年初就交，这样能享受折扣，也能把这件悬着的事早点了结。"
    },
    {
      "clave": "circulacion",
      "titulo": "过户与行驶证变更",
      "nota": "行驶证到现在还是舅舅的名字，得赶紧办妥，免得哪天在检查站被为难。"
    },
    {
      "clave": "afinacionBici",
      "titulo": "自行车调校",
      "nota": "每半年去一次马林切自行车行：调正车轮、检查刹车线和刹车，比修一个歪掉的轮子便宜太多了。"
    }
  ]
}
