import type { PorIdioma } from '../../core/i18n/porIdioma'

/** Rótulos de las hojas de arranque (`plantillasHoja.ts`), en el idioma de la siembra. */
export interface RotulosHoja {
  concepto: string
  previsto: string
  real: string
  diferencia: string
  vuelo: string
  alojamiento: string
  transporte: string
  comida: string
  entradas: string
  extras: string
  total: string
  graficaPresupuesto: string
  evaluacion: string
  nota: string
  peso: string
  aporta: string
  parcial1: string
  parcial2: string
  tareas: string
  final: string
  promedio: string
  pesoTotal: string
  graficaNotas: string
  fecha: string
  medida: string
  apunte: string
  maximo: string
  minimo: string
  graficaMediciones: string
}

type Fila = [
  string, string, string, string, string, string, string, string, string, string, string, string,
  string, string, string, string, string, string, string, string, string, string, string,
  string, string, string, string, string, string,
]

const CLAVES: (keyof RotulosHoja)[] = [
  'concepto', 'previsto', 'real', 'diferencia', 'vuelo', 'alojamiento', 'transporte', 'comida', 'entradas', 'extras', 'total', 'graficaPresupuesto',
  'evaluacion', 'nota', 'peso', 'aporta', 'parcial1', 'parcial2', 'tareas', 'final', 'promedio', 'pesoTotal', 'graficaNotas',
  'fecha', 'medida', 'apunte', 'maximo', 'minimo', 'graficaMediciones',
]

const r = (f: Fila): RotulosHoja =>
  Object.fromEntries(CLAVES.map((c, i) => [c, f[i]])) as unknown as RotulosHoja

export const ROTULOS_HOJA: PorIdioma<RotulosHoja> = {
  es: r([
    'Concepto', 'Previsto', 'Real', 'Diferencia', 'Vuelo', 'Alojamiento', 'Transporte', 'Comida', 'Entradas', 'Extras', 'Total', 'Previsto y real',
    'Evaluación', 'Nota', 'Peso', 'Aporta', 'Parcial 1', 'Parcial 2', 'Tareas', 'Final', 'Promedio', 'Peso total', 'Notas',
    'Fecha', 'Peso (kg)', 'Nota', 'Máximo', 'Mínimo', 'Evolución del peso',
  ]),
  en: r([
    'Item', 'Planned', 'Actual', 'Difference', 'Flight', 'Lodging', 'Transport', 'Food', 'Tickets', 'Extras', 'Total', 'Planned vs. actual',
    'Assessment', 'Grade', 'Weight', 'Contributes', 'Midterm 1', 'Midterm 2', 'Homework', 'Final exam', 'Average', 'Total weight', 'Grades',
    'Date', 'Weight (kg)', 'Note', 'Maximum', 'Minimum', 'Weight over time',
  ]),
  pt: r([
    'Item', 'Previsto', 'Real', 'Diferença', 'Voo', 'Hospedagem', 'Transporte', 'Comida', 'Ingressos', 'Extras', 'Total', 'Previsto e real',
    'Avaliação', 'Nota', 'Peso', 'Contribui', 'Prova 1', 'Prova 2', 'Tarefas', 'Final', 'Média', 'Peso total', 'Notas',
    'Data', 'Peso (kg)', 'Observação', 'Máximo', 'Mínimo', 'Evolução do peso',
  ]),
  fr: r([
    'Poste', 'Prévu', 'Réel', 'Écart', 'Vol', 'Hébergement', 'Transport', 'Repas', 'Entrées', 'Divers', 'Total', 'Prévu et réel',
    'Évaluation', 'Note', 'Coefficient', 'Apport', 'Partiel 1', 'Partiel 2', 'Devoirs', 'Examen final', 'Moyenne', 'Total des coefficients', 'Notes',
    'Date', 'Poids (kg)', 'Remarque', 'Maximum', 'Minimum', 'Évolution du poids',
  ]),
  de: r([
    'Posten', 'Geplant', 'Tatsächlich', 'Differenz', 'Flug', 'Unterkunft', 'Transport', 'Essen', 'Eintritte', 'Extras', 'Summe', 'Geplant und tatsächlich',
    'Prüfung', 'Note', 'Gewichtung', 'Anteil', 'Klausur 1', 'Klausur 2', 'Hausaufgaben', 'Abschlussprüfung', 'Durchschnitt', 'Gewichtung gesamt', 'Noten',
    'Datum', 'Gewicht (kg)', 'Notiz', 'Maximum', 'Minimum', 'Gewichtsverlauf',
  ]),
  it: r([
    'Voce', 'Previsto', 'Effettivo', 'Differenza', 'Volo', 'Alloggio', 'Trasporti', 'Cibo', 'Biglietti', 'Extra', 'Totale', 'Previsto ed effettivo',
    'Valutazione', 'Voto', 'Peso', 'Contributo', 'Parziale 1', 'Parziale 2', 'Compiti', 'Esame finale', 'Media', 'Peso totale', 'Voti',
    'Data', 'Peso (kg)', 'Nota', 'Massimo', 'Minimo', 'Andamento del peso',
  ]),
  nl: r([
    'Post', 'Gepland', 'Werkelijk', 'Verschil', 'Vlucht', 'Verblijf', 'Vervoer', 'Eten', 'Entree', "Extra's", 'Totaal', 'Gepland en werkelijk',
    'Toets', 'Cijfer', 'Weging', 'Bijdrage', 'Tentamen 1', 'Tentamen 2', 'Huiswerk', 'Eindexamen', 'Gemiddelde', 'Totale weging', 'Cijfers',
    'Datum', 'Gewicht (kg)', 'Notitie', 'Maximum', 'Minimum', 'Gewichtsverloop',
  ]),
  pl: r([
    'Pozycja', 'Plan', 'Faktycznie', 'Różnica', 'Lot', 'Nocleg', 'Transport', 'Jedzenie', 'Bilety', 'Dodatki', 'Suma', 'Plan i wykonanie',
    'Zaliczenie', 'Ocena', 'Waga', 'Wkład', 'Kolokwium 1', 'Kolokwium 2', 'Zadania', 'Egzamin', 'Średnia', 'Suma wag', 'Oceny',
    'Data', 'Waga (kg)', 'Uwagi', 'Maksimum', 'Minimum', 'Zmiana wagi',
  ]),
  tr: r([
    'Kalem', 'Planlanan', 'Gerçekleşen', 'Fark', 'Uçuş', 'Konaklama', 'Ulaşım', 'Yemek', 'Biletler', 'Ekstralar', 'Toplam', 'Planlanan ve gerçekleşen',
    'Değerlendirme', 'Not', 'Ağırlık', 'Katkı', 'Ara sınav 1', 'Ara sınav 2', 'Ödevler', 'Final', 'Ortalama', 'Toplam ağırlık', 'Notlar',
    'Tarih', 'Kilo (kg)', 'Açıklama', 'En yüksek', 'En düşük', 'Kilo değişimi',
  ]),
  id: r([
    'Pos', 'Rencana', 'Realisasi', 'Selisih', 'Penerbangan', 'Penginapan', 'Transportasi', 'Makan', 'Tiket masuk', 'Lain-lain', 'Total', 'Rencana dan realisasi',
    'Penilaian', 'Nilai', 'Bobot', 'Kontribusi', 'UTS 1', 'UTS 2', 'Tugas', 'Ujian akhir', 'Rata-rata', 'Total bobot', 'Daftar nilai',
    'Tanggal', 'Berat (kg)', 'Catatan', 'Maksimum', 'Minimum', 'Perkembangan berat',
  ]),
  ja: r([
    '項目', '予定', '実績', '差額', '航空券', '宿泊', '交通', '食事', '入場料', 'その他', '合計', '予定と実績',
    '評価項目', '点数', '比重', '寄与', '中間試験1', '中間試験2', '課題', '期末試験', '平均', '比重の合計', '成績',
    '日付', '体重 (kg)', 'メモ', '最大', '最小', '体重の推移',
  ]),
  zh: r([
    '项目', '预算', '实际', '差额', '机票', '住宿', '交通', '餐饮', '门票', '其他', '合计', '预算与实际',
    '考核', '分数', '权重', '贡献', '期中考试1', '期中考试2', '作业', '期末考试', '平均', '权重合计', '成绩',
    '日期', '体重 (kg)', '备注', '最大值', '最小值', '体重变化',
  ]),
  ko: r([
    '항목', '예상', '실제', '차이', '항공권', '숙박', '교통', '식비', '입장료', '기타', '합계', '예상과 실제',
    '평가', '점수', '비중', '기여', '중간고사 1', '중간고사 2', '과제', '기말고사', '평균', '비중 합계', '성적',
    '날짜', '체중 (kg)', '메모', '최대', '최소', '체중 변화',
  ]),
  ru: r([
    'Статья', 'План', 'Факт', 'Разница', 'Перелёт', 'Жильё', 'Транспорт', 'Еда', 'Билеты', 'Прочее', 'Итого', 'План и факт',
    'Работа', 'Оценка', 'Вес', 'Вклад', 'Контрольная 1', 'Контрольная 2', 'Домашние задания', 'Экзамен', 'Среднее', 'Сумма весов', 'Оценки',
    'Дата', 'Вес (кг)', 'Заметка', 'Максимум', 'Минимум', 'Изменение веса',
  ]),
  hi: r([
    'मद', 'अनुमानित', 'वास्तविक', 'अंतर', 'उड़ान', 'ठहरना', 'परिवहन', 'भोजन', 'टिकट', 'अन्य', 'कुल', 'अनुमानित और वास्तविक',
    'मूल्यांकन', 'अंक', 'भार', 'योगदान', 'मध्यावधि 1', 'मध्यावधि 2', 'गृहकार्य', 'अंतिम परीक्षा', 'औसत', 'कुल भार', 'अंक तालिका',
    'तारीख', 'वज़न (kg)', 'टिप्पणी', 'अधिकतम', 'न्यूनतम', 'वज़न में बदलाव',
  ]),
  ar: r([
    'البند', 'المتوقع', 'الفعلي', 'الفرق', 'الطيران', 'الإقامة', 'المواصلات', 'الطعام', 'التذاكر', 'إضافات', 'المجموع', 'المتوقع والفعلي',
    'التقييم', 'الدرجة', 'الوزن', 'المساهمة', 'الاختبار 1', 'الاختبار 2', 'الواجبات', 'الامتحان النهائي', 'المعدل', 'مجموع الأوزان', 'الدرجات',
    'التاريخ', 'الوزن (كغ)', 'ملاحظة', 'الأعلى', 'الأدنى', 'تطور الوزن',
  ]),
}
