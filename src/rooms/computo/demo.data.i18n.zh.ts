/**
 * Rama «zh» del año demo de computo. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/computo.zh.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "carpetas": [
    {
      "id": "demo-fisica",
      "nombre": "物理II",
      "emoji": "⚛️",
      "padre": null,
      "formulas": []
    },
    {
      "id": "demo-parciales",
      "nombre": "期中考",
      "emoji": "📐",
      "padre": "demo-fisica",
      "formulas": [
        {
          "id": "cat-fisica-mrua-posicion",
          "nombre": "匀加速运动的位置",
          "expresion": "x0 + v0 * t + a * t^2 / 2",
          "resultado": "x",
          "tex": "x = x_{0} + v_{0}t + \\tfrac{1}{2}a\\,t^{2}",
          "variables": [
            {
              "simbolo": "x0",
              "nombre": "初始位置",
              "unidad": "m",
              "valor": 0
            },
            {
              "simbolo": "v0",
              "nombre": "初速度",
              "unidad": "m/s",
              "valor": 0
            },
            {
              "simbolo": "a",
              "nombre": "加速度",
              "unidad": "m/s²",
              "valor": 9.81
            },
            {
              "simbolo": "t",
              "nombre": "时间",
              "unidad": "s",
              "valor": 3
            }
          ],
          "dia": -38
        },
        {
          "id": "cat-fisica-torricelli",
          "nombre": "托里拆利（不含时间的速度）",
          "expresion": "sqrt(v0^2 + 2 * a * d)",
          "resultado": "v",
          "tex": "v = \\sqrt{v_{0}^{2} + 2a\\,\\Delta x}",
          "variables": [
            {
              "simbolo": "v0",
              "nombre": "初速度",
              "unidad": "m/s",
              "valor": 0
            },
            {
              "simbolo": "a",
              "nombre": "加速度",
              "unidad": "m/s²",
              "valor": 9.81
            },
            {
              "simbolo": "d",
              "nombre": "位移",
              "unidad": "m",
              "valor": 20
            }
          ],
          "dia": -38
        },
        {
          "id": "cat-fisica-energia-cinetica",
          "nombre": "动能",
          "expresion": "m * v^2 / 2",
          "resultado": "Ek",
          "tex": "E_{k} = \\tfrac{1}{2}m\\,v^{2}",
          "descripcion": "体重固定不变：几乎都是为跑步中的自己计算的。",
          "variables": [
            {
              "simbolo": "m",
              "nombre": "质量",
              "unidad": "kg",
              "valor": 62
            },
            {
              "simbolo": "v",
              "nombre": "速度",
              "unidad": "m/s",
              "valor": 3.2
            }
          ],
          "dia": -36
        },
        {
          "id": "cat-fisica-hooke",
          "nombre": "胡克定律",
          "expresion": "k * x",
          "resultado": "F",
          "tex": "F = k\\,x",
          "variables": [
            {
              "simbolo": "k",
              "nombre": "弹簧常数",
              "unidad": "N/m",
              "valor": 200
            },
            {
              "simbolo": "x",
              "nombre": "形变量",
              "unidad": "m",
              "valor": 0.05
            }
          ],
          "dia": -30
        },
        {
          "id": "cat-fisica-periodo-pendulo",
          "nombre": "单摆的周期",
          "expresion": "2 * pi * sqrt(L / g)",
          "resultado": "T",
          "tex": "T = 2\\pi\\sqrt{\\dfrac{L}{g}}",
          "variables": [
            {
              "simbolo": "L",
              "nombre": "长度",
              "unidad": "m",
              "valor": 1
            },
            {
              "simbolo": "g",
              "nombre": "重力加速度",
              "unidad": "m/s²",
              "valor": 9.81,
              "constante": true
            }
          ],
          "dia": -24
        }
      ]
    },
    {
      "id": "demo-cafeteria",
      "nombre": "咖啡馆",
      "emoji": "☕",
      "padre": null,
      "formulas": [
        {
          "id": "demo-costo-taza",
          "nombre": "每杯成本",
          "expresion": "precioKg / 1000 * gramos + leche + vaso",
          "resultado": "costo",
          "descripcion": "提供一杯需要花的钱，不算我的时间。",
          "variables": [
            {
              "simbolo": "precioKg",
              "nombre": "每公斤咖啡的价格",
              "unidad": "$",
              "valor": 420
            },
            {
              "simbolo": "gramos",
              "nombre": "每杯的克数",
              "unidad": "g",
              "valor": 18
            },
            {
              "simbolo": "leche",
              "nombre": "牛奶成本",
              "unidad": "$",
              "valor": 4.5
            },
            {
              "simbolo": "vaso",
              "nombre": "杯子和杯盖",
              "unidad": "$",
              "valor": 2.8
            }
          ],
          "dia": -112
        },
        {
          "id": "demo-margen",
          "nombre": "价格利润率",
          "expresion": "(pv - costo) / pv * 100",
          "resultado": "margen",
          "tex": "利润率 = \\dfrac{价格 - 成本}{价格} \\times 100",
          "variables": [
            {
              "simbolo": "pv",
              "nombre": "销售价格",
              "unidad": "$",
              "valor": 45
            },
            {
              "simbolo": "costo",
              "nombre": "每杯成本",
              "unidad": "$",
              "valor": 14.9
            }
          ],
          "dia": -110
        }
      ]
    },
    {
      "id": "demo-correr",
      "nombre": "跑步",
      "emoji": "🏃",
      "padre": null,
      "formulas": [
        {
          "id": "demo-ritmo",
          "nombre": "每千米配速",
          "expresion": "minutos / km",
          "resultado": "ritmo",
          "tex": "配速 = \\dfrac{分钟}{km}",
          "variables": [
            {
              "simbolo": "minutos",
              "nombre": "总分钟数",
              "unidad": "min",
              "valor": 58
            },
            {
              "simbolo": "km",
              "nombre": "千米",
              "unidad": "km",
              "valor": 10
            }
          ],
          "dia": -205
        },
        {
          "id": "demo-paso-objetivo",
          "nombre": "马拉松目标配速",
          "expresion": "metaMin / 42.195",
          "resultado": "paso",
          "variables": [
            {
              "simbolo": "metaMin",
              "nombre": "目标时间（分钟）",
              "unidad": "min",
              "valor": 240
            }
          ],
          "dia": -200
        },
        {
          "id": "demo-vo2",
          "nombre": "估算VO₂max",
          "expresion": "15.3 * fcmax / fcrep",
          "resultado": "VO2",
          "tex": "VO_{2}\\,max \\approx 15.3\\,\\dfrac{HR_{最大}}{HR_{静息}}",
          "descripcion": "乌斯公式：不够精确，但足够看出我是否在进步。",
          "variables": [
            {
              "simbolo": "fcmax",
              "nombre": "最大心率",
              "unidad": "次/分钟",
              "valor": 189
            },
            {
              "simbolo": "fcrep",
              "nombre": "静息心率",
              "unidad": "次/分钟",
              "valor": 52
            }
          ],
          "dia": -186
        }
      ]
    }
  ],
  "hojas": [
    {
      "nombre": "日本预算",
      "celdas": {
        "A1": {
          "crudo": "天",
          "fmt": {
            "neg": true
          }
        },
        "B1": {
          "crudo": "餐饮",
          "fmt": {
            "neg": true
          }
        },
        "C1": {
          "crudo": "交通",
          "fmt": {
            "neg": true
          }
        },
        "D1": {
          "crudo": "门票",
          "fmt": {
            "neg": true
          }
        },
        "E1": {
          "crudo": "购物",
          "fmt": {
            "neg": true
          }
        },
        "A2": {
          "crudo": "第1天"
        },
        "B2": {
          "crudo": "4200",
          "fmt": {
            "dec": 0
          }
        },
        "C2": {
          "crudo": "1800",
          "fmt": {
            "dec": 0
          }
        },
        "D2": {
          "crudo": "900",
          "fmt": {
            "dec": 0
          }
        },
        "E2": {
          "crudo": "0",
          "fmt": {
            "dec": 0
          }
        },
        "A3": {
          "crudo": "第2天"
        },
        "B3": {
          "crudo": "3800",
          "fmt": {
            "dec": 0
          }
        },
        "C3": {
          "crudo": "2400",
          "fmt": {
            "dec": 0
          }
        },
        "D3": {
          "crudo": "1200",
          "fmt": {
            "dec": 0
          }
        },
        "E3": {
          "crudo": "2500",
          "fmt": {
            "dec": 0
          }
        },
        "A4": {
          "crudo": "第3天"
        },
        "B4": {
          "crudo": "3800",
          "fmt": {
            "dec": 0
          }
        },
        "C4": {
          "crudo": "2100",
          "fmt": {
            "dec": 0
          }
        },
        "D4": {
          "crudo": "800",
          "fmt": {
            "dec": 0
          }
        },
        "E4": {
          "crudo": "1800",
          "fmt": {
            "dec": 0
          }
        },
        "A5": {
          "crudo": "第4天"
        },
        "B5": {
          "crudo": "5200",
          "fmt": {
            "dec": 0
          }
        },
        "C5": {
          "crudo": "2600",
          "fmt": {
            "dec": 0
          }
        },
        "D5": {
          "crudo": "1500",
          "fmt": {
            "dec": 0
          }
        },
        "E5": {
          "crudo": "3200",
          "fmt": {
            "dec": 0
          }
        },
        "A6": {
          "crudo": "第5天"
        },
        "B6": {
          "crudo": "3800",
          "fmt": {
            "dec": 0
          }
        },
        "C6": {
          "crudo": "1900",
          "fmt": {
            "dec": 0
          }
        },
        "D6": {
          "crudo": "700",
          "fmt": {
            "dec": 0
          }
        },
        "E6": {
          "crudo": "0",
          "fmt": {
            "dec": 0
          }
        },
        "A7": {
          "crudo": "第6天"
        },
        "B7": {
          "crudo": "4600",
          "fmt": {
            "dec": 0
          }
        },
        "C7": {
          "crudo": "2800",
          "fmt": {
            "dec": 0
          }
        },
        "D7": {
          "crudo": "2100",
          "fmt": {
            "dec": 0
          }
        },
        "E7": {
          "crudo": "4100",
          "fmt": {
            "dec": 0
          }
        },
        "A8": {
          "crudo": "第7天"
        },
        "B8": {
          "crudo": "3800",
          "fmt": {
            "dec": 0
          }
        },
        "C8": {
          "crudo": "2200",
          "fmt": {
            "dec": 0
          }
        },
        "D8": {
          "crudo": "900",
          "fmt": {
            "dec": 0
          }
        },
        "E8": {
          "crudo": "1500",
          "fmt": {
            "dec": 0
          }
        },
        "A9": {
          "crudo": "第8天"
        },
        "B9": {
          "crudo": "6100",
          "fmt": {
            "dec": 0
          }
        },
        "C9": {
          "crudo": "3100",
          "fmt": {
            "dec": 0
          }
        },
        "D9": {
          "crudo": "1800",
          "fmt": {
            "dec": 0
          }
        },
        "E9": {
          "crudo": "2800",
          "fmt": {
            "dec": 0
          }
        },
        "A10": {
          "crudo": "第9天"
        },
        "B10": {
          "crudo": "3800",
          "fmt": {
            "dec": 0
          }
        },
        "C10": {
          "crudo": "1700",
          "fmt": {
            "dec": 0
          }
        },
        "D10": {
          "crudo": "600",
          "fmt": {
            "dec": 0
          }
        },
        "E10": {
          "crudo": "0",
          "fmt": {
            "dec": 0
          }
        },
        "A11": {
          "crudo": "第10天"
        },
        "B11": {
          "crudo": "4400",
          "fmt": {
            "dec": 0
          }
        },
        "C11": {
          "crudo": "2500",
          "fmt": {
            "dec": 0
          }
        },
        "D11": {
          "crudo": "1400",
          "fmt": {
            "dec": 0
          }
        },
        "E11": {
          "crudo": "3600",
          "fmt": {
            "dec": 0
          }
        },
        "A12": {
          "crudo": "第11天"
        },
        "B12": {
          "crudo": "3800",
          "fmt": {
            "dec": 0
          }
        },
        "C12": {
          "crudo": "2000",
          "fmt": {
            "dec": 0
          }
        },
        "D12": {
          "crudo": "1100",
          "fmt": {
            "dec": 0
          }
        },
        "E12": {
          "crudo": "900",
          "fmt": {
            "dec": 0
          }
        },
        "A13": {
          "crudo": "第12天"
        },
        "B13": {
          "crudo": "5800",
          "fmt": {
            "dec": 0
          }
        },
        "C13": {
          "crudo": "2900",
          "fmt": {
            "dec": 0
          }
        },
        "D13": {
          "crudo": "1600",
          "fmt": {
            "dec": 0
          }
        },
        "E13": {
          "crudo": "2200",
          "fmt": {
            "dec": 0
          }
        },
        "A14": {
          "crudo": "第13天"
        },
        "B14": {
          "crudo": "3800",
          "fmt": {
            "dec": 0
          }
        },
        "C14": {
          "crudo": "1800",
          "fmt": {
            "dec": 0
          }
        },
        "D14": {
          "crudo": "800",
          "fmt": {
            "dec": 0
          }
        },
        "E14": {
          "crudo": "0",
          "fmt": {
            "dec": 0
          }
        },
        "A15": {
          "crudo": "第14天"
        },
        "B15": {
          "crudo": "4200",
          "fmt": {
            "dec": 0
          }
        },
        "C15": {
          "crudo": "3400",
          "fmt": {
            "dec": 0
          }
        },
        "D15": {
          "crudo": "2600",
          "fmt": {
            "dec": 0
          }
        },
        "E15": {
          "crudo": "1200",
          "fmt": {
            "dec": 0
          }
        },
        "A17": {
          "crudo": "Total ¥",
          "fmt": {
            "neg": true
          }
        },
        "B17": {
          "crudo": "=SUMA(B2:B15)",
          "fmt": {
            "dec": 0
          }
        },
        "C17": {
          "crudo": "=SUMA(C2:C15)",
          "fmt": {
            "dec": 0
          }
        },
        "D17": {
          "crudo": "=SUMA(D2:D15)",
          "fmt": {
            "dec": 0
          }
        },
        "E17": {
          "crudo": "=SUMA(E2:E15)",
          "fmt": {
            "dec": 0
          }
        },
        "A18": {
          "crudo": "每日平均"
        },
        "B18": {
          "crudo": "=PROMEDIO(B2:B15)",
          "fmt": {
            "dec": 0
          }
        },
        "A20": {
          "crudo": "旅行总额 ¥",
          "fmt": {
            "neg": true
          }
        },
        "B20": {
          "crudo": "=B17+C17+D17+E17",
          "fmt": {
            "dec": 0
          }
        },
        "A21": {
          "crudo": "汇率（MXN/¥）"
        },
        "B21": {
          "crudo": "0.126",
          "fmt": {
            "dec": 3
          }
        },
        "A22": {
          "crudo": "比索总额",
          "fmt": {
            "neg": true
          }
        },
        "B22": {
          "crudo": "=REDONDEAR(B20*B21,2)",
          "fmt": {
            "dec": 2
          }
        }
      },
      "filas": 30,
      "cols": 6,
      "dia": -46
    },
    {
      "nombre": "18周计划",
      "celdas": {
        "A1": {
          "crudo": "周",
          "fmt": {
            "neg": true
          }
        },
        "B1": {
          "crudo": "千米",
          "fmt": {
            "neg": true
          }
        },
        "C1": {
          "crudo": "变化率",
          "fmt": {
            "neg": true
          }
        },
        "D1": {
          "crudo": "长距离跑",
          "fmt": {
            "neg": true
          }
        },
        "A2": {
          "crudo": "第1周"
        },
        "B2": {
          "crudo": "32",
          "fmt": {
            "dec": 0
          }
        },
        "D2": {
          "crudo": "=REDONDEAR(B2/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A3": {
          "crudo": "第2周"
        },
        "B3": {
          "crudo": "35",
          "fmt": {
            "dec": 0
          }
        },
        "C3": {
          "crudo": "=REDONDEAR((B3-B2)/B2*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D3": {
          "crudo": "=REDONDEAR(B3/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A4": {
          "crudo": "第3周"
        },
        "B4": {
          "crudo": "38",
          "fmt": {
            "dec": 0
          }
        },
        "C4": {
          "crudo": "=REDONDEAR((B4-B3)/B3*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D4": {
          "crudo": "=REDONDEAR(B4/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A5": {
          "crudo": "第4周"
        },
        "B5": {
          "crudo": "34",
          "fmt": {
            "dec": 0
          }
        },
        "C5": {
          "crudo": "=REDONDEAR((B5-B4)/B4*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D5": {
          "crudo": "=REDONDEAR(B5/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A6": {
          "crudo": "第5周"
        },
        "B6": {
          "crudo": "42",
          "fmt": {
            "dec": 0
          }
        },
        "C6": {
          "crudo": "=REDONDEAR((B6-B5)/B5*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D6": {
          "crudo": "=REDONDEAR(B6/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A7": {
          "crudo": "第6周"
        },
        "B7": {
          "crudo": "46",
          "fmt": {
            "dec": 0
          }
        },
        "C7": {
          "crudo": "=REDONDEAR((B7-B6)/B6*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D7": {
          "crudo": "=REDONDEAR(B7/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A8": {
          "crudo": "第7周"
        },
        "B8": {
          "crudo": "50",
          "fmt": {
            "dec": 0
          }
        },
        "C8": {
          "crudo": "=REDONDEAR((B8-B7)/B7*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D8": {
          "crudo": "=REDONDEAR(B8/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A9": {
          "crudo": "第8周"
        },
        "B9": {
          "crudo": "44",
          "fmt": {
            "dec": 0
          }
        },
        "C9": {
          "crudo": "=REDONDEAR((B9-B8)/B8*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D9": {
          "crudo": "=REDONDEAR(B9/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A10": {
          "crudo": "第9周"
        },
        "B10": {
          "crudo": "54",
          "fmt": {
            "dec": 0
          }
        },
        "C10": {
          "crudo": "=REDONDEAR((B10-B9)/B9*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D10": {
          "crudo": "=REDONDEAR(B10/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A11": {
          "crudo": "第10周"
        },
        "B11": {
          "crudo": "58",
          "fmt": {
            "dec": 0
          }
        },
        "C11": {
          "crudo": "=REDONDEAR((B11-B10)/B10*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D11": {
          "crudo": "=REDONDEAR(B11/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A12": {
          "crudo": "第11周"
        },
        "B12": {
          "crudo": "62",
          "fmt": {
            "dec": 0
          }
        },
        "C12": {
          "crudo": "=REDONDEAR((B12-B11)/B11*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D12": {
          "crudo": "=REDONDEAR(B12/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A13": {
          "crudo": "第12周"
        },
        "B13": {
          "crudo": "50",
          "fmt": {
            "dec": 0
          }
        },
        "C13": {
          "crudo": "=REDONDEAR((B13-B12)/B12*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D13": {
          "crudo": "=REDONDEAR(B13/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A14": {
          "crudo": "第13周"
        },
        "B14": {
          "crudo": "66",
          "fmt": {
            "dec": 0
          }
        },
        "C14": {
          "crudo": "=REDONDEAR((B14-B13)/B13*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D14": {
          "crudo": "=REDONDEAR(B14/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A15": {
          "crudo": "第14周"
        },
        "B15": {
          "crudo": "70",
          "fmt": {
            "dec": 0
          }
        },
        "C15": {
          "crudo": "=REDONDEAR((B15-B14)/B14*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D15": {
          "crudo": "=REDONDEAR(B15/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A16": {
          "crudo": "第15周"
        },
        "B16": {
          "crudo": "74",
          "fmt": {
            "dec": 0
          }
        },
        "C16": {
          "crudo": "=REDONDEAR((B16-B15)/B15*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D16": {
          "crudo": "=REDONDEAR(B16/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A17": {
          "crudo": "第16周"
        },
        "B17": {
          "crudo": "58",
          "fmt": {
            "dec": 0
          }
        },
        "C17": {
          "crudo": "=REDONDEAR((B17-B16)/B16*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D17": {
          "crudo": "=REDONDEAR(B17/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A18": {
          "crudo": "第17周"
        },
        "B18": {
          "crudo": "42",
          "fmt": {
            "dec": 0
          }
        },
        "C18": {
          "crudo": "=REDONDEAR((B18-B17)/B17*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D18": {
          "crudo": "=REDONDEAR(B18/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A19": {
          "crudo": "第18周"
        },
        "B19": {
          "crudo": "26",
          "fmt": {
            "dec": 0
          }
        },
        "C19": {
          "crudo": "=REDONDEAR((B19-B18)/B18*100,1)",
          "fmt": {
            "dec": 1
          }
        },
        "D19": {
          "crudo": "=REDONDEAR(B19/4,1)",
          "fmt": {
            "dec": 1
          }
        },
        "A21": {
          "crudo": "Total",
          "fmt": {
            "neg": true
          }
        },
        "B21": {
          "crudo": "=SUMA(B2:B19)",
          "fmt": {
            "dec": 0
          }
        },
        "A22": {
          "crudo": "高峰周"
        },
        "B22": {
          "crudo": "=MAX(B2:B19)",
          "fmt": {
            "dec": 0
          }
        },
        "A23": {
          "crudo": "平均"
        },
        "B23": {
          "crudo": "=PROMEDIO(B2:B19)",
          "fmt": {
            "dec": 1
          }
        }
      },
      "filas": 30,
      "cols": 5,
      "dia": -158
    },
    {
      "nombre": "物理II成绩",
      "celdas": {
        "A1": {
          "crudo": "评估项目",
          "fmt": {
            "neg": true
          }
        },
        "B1": {
          "crudo": "权重",
          "fmt": {
            "neg": true
          }
        },
        "C1": {
          "crudo": "成绩",
          "fmt": {
            "neg": true
          }
        },
        "D1": {
          "crudo": "贡献",
          "fmt": {
            "neg": true
          }
        },
        "A2": {
          "crudo": "期中考1"
        },
        "B2": {
          "crudo": "0.2",
          "fmt": {
            "dec": 2
          }
        },
        "C2": {
          "crudo": "8.4",
          "fmt": {
            "dec": 1
          }
        },
        "D2": {
          "crudo": "=B2*C2",
          "fmt": {
            "dec": 2
          }
        },
        "A3": {
          "crudo": "期中考2"
        },
        "B3": {
          "crudo": "0.2",
          "fmt": {
            "dec": 2
          }
        },
        "C3": {
          "crudo": "7.1",
          "fmt": {
            "dec": 1
          }
        },
        "D3": {
          "crudo": "=B3*C3",
          "fmt": {
            "dec": 2
          }
        },
        "A4": {
          "crudo": "作业"
        },
        "B4": {
          "crudo": "0.15",
          "fmt": {
            "dec": 2
          }
        },
        "C4": {
          "crudo": "9.5",
          "fmt": {
            "dec": 1
          }
        },
        "D4": {
          "crudo": "=B4*C4",
          "fmt": {
            "dec": 2
          }
        },
        "A5": {
          "crudo": "实验"
        },
        "B5": {
          "crudo": "0.15",
          "fmt": {
            "dec": 2
          }
        },
        "C5": {
          "crudo": "9",
          "fmt": {
            "dec": 1
          }
        },
        "D5": {
          "crudo": "=B5*C5",
          "fmt": {
            "dec": 2
          }
        },
        "A6": {
          "crudo": "Final"
        },
        "B6": {
          "crudo": "0.3",
          "fmt": {
            "dec": 2
          }
        },
        "A8": {
          "crudo": "累计权重",
          "fmt": {
            "neg": true
          }
        },
        "B8": {
          "crudo": "=SUMA(B2:B6)",
          "fmt": {
            "dec": 2
          }
        },
        "A9": {
          "crudo": "目前累计",
          "fmt": {
            "neg": true
          }
        },
        "D9": {
          "crudo": "=SUMA(D2:D5)",
          "fmt": {
            "dec": 2
          }
        },
        "A10": {
          "crudo": "期末所需成绩"
        },
        "D10": {
          "crudo": "=REDONDEAR((6-D9)/B6,1)",
          "fmt": {
            "dec": 1
          }
        }
      },
      "filas": 20,
      "cols": 5,
      "dia": -33
    }
  ],
  "calculos": [
    {
      "entrada": "62 * 3.2^2 / 2",
      "salida": "317.44",
      "tipo": "formula",
      "dia": -36
    },
    {
      "entrada": "x^2 - 5*x + 6 = 0",
      "salida": "2, 3",
      "tipo": "ecuacion",
      "dia": -35
    },
    {
      "entrada": "sqrt(2 * 9.81 * 20)",
      "salida": "19.809088818226",
      "tipo": "calculo",
      "dia": -34
    },
    {
      "entrada": "2 * pi * sqrt(0.8 / 9.81)",
      "salida": "1.7942528231932",
      "tipo": "formula",
      "dia": -24
    },
    {
      "entrada": "420 / 1000 * 18 + 4.5 + 2.8",
      "salida": "14.86",
      "tipo": "formula",
      "dia": -112
    },
    {
      "entrada": "(45 - 14.86) / 45 * 100",
      "salida": "66.977777777778",
      "tipo": "formula",
      "dia": -110
    },
    {
      "entrada": "240 / 42.195",
      "salida": "5.6877591634080",
      "tipo": "formula",
      "dia": -200
    },
    {
      "entrada": "58 / 10",
      "salida": "5.8",
      "tipo": "calculo",
      "dia": -205
    },
    {
      "entrada": "15.3 * 189 / 52",
      "salida": "55.609615384615",
      "tipo": "formula",
      "dia": -186
    },
    {
      "entrada": "74 * 18",
      "salida": "1332",
      "tipo": "calculo",
      "dia": -158
    },
    {
      "entrada": "3800 * 14",
      "salida": "53200",
      "tipo": "calculo",
      "dia": -46
    },
    {
      "entrada": "0.126 * 194500",
      "salida": "24507",
      "tipo": "calculo",
      "dia": -46
    },
    {
      "entrada": "x^2 - 4 = 0",
      "salida": "-2, 2",
      "tipo": "ecuacion",
      "dia": -33
    },
    {
      "entrada": "0.2*8.4 + 0.2*7.1 + 0.15*9.5 + 0.15*9",
      "salida": "5.855",
      "tipo": "calculo",
      "dia": -33
    },
    {
      "entrada": "(6 - 5.855) / 0.3",
      "salida": "0.48333333333333",
      "tipo": "calculo",
      "dia": -33
    }
  ]
}
