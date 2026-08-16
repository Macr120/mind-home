/**
 * Rama «hi» del año demo de computo. Solo se descarga si el usuario
 * está en ese idioma (el índice `demo.data.i18n.ts` la carga con import()).
 *
 * Las frases se traducen en `traducciones/computo.hi.json`; este
 * archivo lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` —
 * no lo edites a mano.
 */
export default {
  "carpetas": [
    {
      "id": "demo-fisica",
      "nombre": "भौतिकी II",
      "emoji": "⚛️",
      "padre": null,
      "formulas": []
    },
    {
      "id": "demo-parciales",
      "nombre": "मिडटर्म परीक्षाएं",
      "emoji": "📐",
      "padre": "demo-fisica",
      "formulas": [
        {
          "id": "cat-fisica-mrua-posicion",
          "nombre": "स्थिर त्वरण में स्थिति",
          "expresion": "x0 + v0 * t + a * t^2 / 2",
          "resultado": "x",
          "tex": "x = x_{0} + v_{0}t + \\tfrac{1}{2}a\\,t^{2}",
          "variables": [
            {
              "simbolo": "x0",
              "nombre": "प्रारंभिक स्थिति",
              "unidad": "m",
              "valor": 0
            },
            {
              "simbolo": "v0",
              "nombre": "प्रारंभिक वेग",
              "unidad": "m/s",
              "valor": 0
            },
            {
              "simbolo": "a",
              "nombre": "त्वरण",
              "unidad": "m/s²",
              "valor": 9.81
            },
            {
              "simbolo": "t",
              "nombre": "समय",
              "unidad": "s",
              "valor": 3
            }
          ],
          "dia": -38
        },
        {
          "id": "cat-fisica-torricelli",
          "nombre": "टोरिसेली (समय के बिना वेग)",
          "expresion": "sqrt(v0^2 + 2 * a * d)",
          "resultado": "v",
          "tex": "v = \\sqrt{v_{0}^{2} + 2a\\,\\Delta x}",
          "variables": [
            {
              "simbolo": "v0",
              "nombre": "प्रारंभिक वेग",
              "unidad": "m/s",
              "valor": 0
            },
            {
              "simbolo": "a",
              "nombre": "त्वरण",
              "unidad": "m/s²",
              "valor": 9.81
            },
            {
              "simbolo": "d",
              "nombre": "विस्थापन",
              "unidad": "m",
              "valor": 20
            }
          ],
          "dia": -38
        },
        {
          "id": "cat-fisica-energia-cinetica",
          "nombre": "गतिज ऊर्जा",
          "expresion": "m * v^2 / 2",
          "resultado": "Ek",
          "tex": "E_{k} = \\tfrac{1}{2}m\\,v^{2}",
          "descripcion": "द्रव्यमान को स्थिर मानकर, दौड़ते समय अक्सर इसकी गणना ख़ुद के लिए की जाती है।",
          "variables": [
            {
              "simbolo": "m",
              "nombre": "द्रव्यमान",
              "unidad": "kg",
              "valor": 62
            },
            {
              "simbolo": "v",
              "nombre": "वेग",
              "unidad": "m/s",
              "valor": 3.2
            }
          ],
          "dia": -36
        },
        {
          "id": "cat-fisica-hooke",
          "nombre": "हुक का नियम",
          "expresion": "k * x",
          "resultado": "F",
          "tex": "F = k\\,x",
          "variables": [
            {
              "simbolo": "k",
              "nombre": "स्प्रिंग स्थिरांक",
              "unidad": "N/m",
              "valor": 200
            },
            {
              "simbolo": "x",
              "nombre": "विरूपण",
              "unidad": "m",
              "valor": 0.05
            }
          ],
          "dia": -30
        },
        {
          "id": "cat-fisica-periodo-pendulo",
          "nombre": "सरल लोलक का आवर्तकाल",
          "expresion": "2 * pi * sqrt(L / g)",
          "resultado": "T",
          "tex": "T = 2\\pi\\sqrt{\\dfrac{L}{g}}",
          "variables": [
            {
              "simbolo": "L",
              "nombre": "लंबाई",
              "unidad": "m",
              "valor": 1
            },
            {
              "simbolo": "g",
              "nombre": "गुरुत्वीय त्वरण",
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
      "nombre": "कैफ़े",
      "emoji": "☕",
      "padre": null,
      "formulas": [
        {
          "id": "demo-costo-taza",
          "nombre": "प्रति कप लागत",
          "expresion": "precioKg / 1000 * gramos + leche + vaso",
          "resultado": "costo",
          "descripcion": "समय को छोड़कर, एक कप परोसने में जो लागत आती है।",
          "variables": [
            {
              "simbolo": "precioKg",
              "nombre": "एक किलो कॉफ़ी की कीमत",
              "unidad": "$",
              "valor": 420
            },
            {
              "simbolo": "gramos",
              "nombre": "प्रति कप ग्राम",
              "unidad": "g",
              "valor": 18
            },
            {
              "simbolo": "leche",
              "nombre": "दूध की लागत",
              "unidad": "$",
              "valor": 4.5
            },
            {
              "simbolo": "vaso",
              "nombre": "कप और ढक्कन",
              "unidad": "$",
              "valor": 2.8
            }
          ],
          "dia": -112
        },
        {
          "id": "demo-margen",
          "nombre": "कीमत पर मार्जिन",
          "expresion": "(pv - costo) / pv * 100",
          "resultado": "margen",
          "tex": "मार्जिन = \\dfrac{कीमत - लागत}{कीमत} \\times 100",
          "variables": [
            {
              "simbolo": "pv",
              "nombre": "बिक्री मूल्य",
              "unidad": "$",
              "valor": 45
            },
            {
              "simbolo": "costo",
              "nombre": "कप की लागत",
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
      "nombre": "दौड़ना",
      "emoji": "🏃",
      "padre": null,
      "formulas": [
        {
          "id": "demo-ritmo",
          "nombre": "प्रति किलोमीटर पेस",
          "expresion": "minutos / km",
          "resultado": "ritmo",
          "tex": "पेस = \\dfrac{मिनट}{किमी}",
          "variables": [
            {
              "simbolo": "minutos",
              "nombre": "कुल मिनट",
              "unidad": "min",
              "valor": 58
            },
            {
              "simbolo": "km",
              "nombre": "किलोमीटर",
              "unidad": "km",
              "valor": 10
            }
          ],
          "dia": -205
        },
        {
          "id": "demo-paso-objetivo",
          "nombre": "मैराथन लक्ष्य के लिए पेस",
          "expresion": "metaMin / 42.195",
          "resultado": "paso",
          "variables": [
            {
              "simbolo": "metaMin",
              "nombre": "मिनटों में लक्ष्य",
              "unidad": "min",
              "valor": 240
            }
          ],
          "dia": -200
        },
        {
          "id": "demo-vo2",
          "nombre": "अनुमानित अधिकतम VO₂",
          "expresion": "15.3 * fcmax / fcrep",
          "resultado": "VO2",
          "tex": "VO_{2}\\,अधिकतम \\approx 15.3\\,\\dfrac{HR_{अधिकतम}}{HR_{विश्राम}}",
          "descripcion": "उथ का फ़ॉर्मूला: अनुमानित, पर यह देखने के लिए काफ़ी है कि प्रगति हो रही है या नहीं।",
          "variables": [
            {
              "simbolo": "fcmax",
              "nombre": "अधिकतम हृदय गति",
              "unidad": "बीपीएम",
              "valor": 189
            },
            {
              "simbolo": "fcrep",
              "nombre": "आराम की हृदय गति",
              "unidad": "बीपीएम",
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
      "nombre": "जापान का बजट",
      "celdas": {
        "A1": {
          "crudo": "दिन",
          "fmt": {
            "neg": true
          }
        },
        "B1": {
          "crudo": "खाना",
          "fmt": {
            "neg": true
          }
        },
        "C1": {
          "crudo": "परिवहन",
          "fmt": {
            "neg": true
          }
        },
        "D1": {
          "crudo": "टिकट",
          "fmt": {
            "neg": true
          }
        },
        "E1": {
          "crudo": "ख़रीदारी",
          "fmt": {
            "neg": true
          }
        },
        "A2": {
          "crudo": "दिन 1"
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
          "crudo": "दिन 2"
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
          "crudo": "दिन 3"
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
          "crudo": "दिन 4"
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
          "crudo": "दिन 5"
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
          "crudo": "दिन 6"
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
          "crudo": "दिन 7"
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
          "crudo": "दिन 8"
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
          "crudo": "दिन 9"
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
          "crudo": "दिन 10"
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
          "crudo": "दिन 11"
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
          "crudo": "दिन 12"
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
          "crudo": "दिन 13"
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
          "crudo": "दिन 14"
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
          "crudo": "दैनिक औसत"
        },
        "B18": {
          "crudo": "=PROMEDIO(B2:B15)",
          "fmt": {
            "dec": 0
          }
        },
        "A20": {
          "crudo": "यात्रा की कुल राशि ¥",
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
          "crudo": "विनिमय दर (MXN/¥)"
        },
        "B21": {
          "crudo": "0.126",
          "fmt": {
            "dec": 3
          }
        },
        "A22": {
          "crudo": "कुल राशि (पेसो में)",
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
      "nombre": "18 हफ़्तों की योजना",
      "celdas": {
        "A1": {
          "crudo": "सप्ताह",
          "fmt": {
            "neg": true
          }
        },
        "B1": {
          "crudo": "किलोमीटर",
          "fmt": {
            "neg": true
          }
        },
        "C1": {
          "crudo": "बदलाव %",
          "fmt": {
            "neg": true
          }
        },
        "D1": {
          "crudo": "लंबी दौड़",
          "fmt": {
            "neg": true
          }
        },
        "A2": {
          "crudo": "सप्ताह 1"
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
          "crudo": "सप्ताह 2"
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
          "crudo": "सप्ताह 3"
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
          "crudo": "सप्ताह 4"
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
          "crudo": "सप्ताह 5"
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
          "crudo": "सप्ताह 6"
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
          "crudo": "सप्ताह 7"
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
          "crudo": "सप्ताह 8"
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
          "crudo": "सप्ताह 9"
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
          "crudo": "सप्ताह 10"
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
          "crudo": "सप्ताह 11"
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
          "crudo": "सप्ताह 12"
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
          "crudo": "सप्ताह 13"
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
          "crudo": "सप्ताह 14"
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
          "crudo": "सप्ताह 15"
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
          "crudo": "सप्ताह 16"
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
          "crudo": "सप्ताह 17"
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
          "crudo": "सप्ताह 18"
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
          "crudo": "चरम सप्ताह"
        },
        "B22": {
          "crudo": "=MAX(B2:B19)",
          "fmt": {
            "dec": 0
          }
        },
        "A23": {
          "crudo": "औसत"
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
      "nombre": "भौतिकी II के अंक",
      "celdas": {
        "A1": {
          "crudo": "मूल्यांकन",
          "fmt": {
            "neg": true
          }
        },
        "B1": {
          "crudo": "भार",
          "fmt": {
            "neg": true
          }
        },
        "C1": {
          "crudo": "अंक",
          "fmt": {
            "neg": true
          }
        },
        "D1": {
          "crudo": "योगदान",
          "fmt": {
            "neg": true
          }
        },
        "A2": {
          "crudo": "मिडटर्म 1"
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
          "crudo": "मिडटर्म 2"
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
          "crudo": "होमवर्क"
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
          "crudo": "लैब"
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
          "crudo": "अब तक का भार",
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
          "crudo": "अब तक का कुल",
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
          "crudo": "फ़ाइनल में चाहिए"
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
