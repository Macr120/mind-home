import type { PorIdioma } from '../../core/i18n/porIdioma'

/**
 * Textos por idioma de la semilla del garaje. Son ~15 cadenas: van INLINE con
 * todos los idiomas dentro (no amerita imports perezosos como la cocina). La
 * siembra los elige con `enIdioma(…, idiomaActual())` y `retraducirGarage`
 * reescribe las filas intactas al cambiar de idioma. Las claves internas son
 * el sufijo del uid de siembra de cada fila.
 */

export interface TextosGarage {
  bici: { nombre: string; marca: string }
  auto: { nombre: string; marca: string; modelo: string }
  taller: { nombre: string; direccion: string }
  seguro: { nombre: string }
  verificacion: { titulo: string }
  seguroTramite: { titulo: string }
  mant0: { titulo: string; nota: string }
  mant1: { titulo: string; taller: string }
}

export const TEXTOS_GARAGE: PorIdioma<TextosGarage> = {
  es: {
    bici: { nombre: 'Bici urbana', marca: 'Genérica' },
    auto: { nombre: 'Auto familiar', marca: 'Ejemplo', modelo: 'Sedán' },
    taller: { nombre: 'Taller centro', direccion: 'Av. Ejemplo 120' },
    seguro: { nombre: 'Aseguradora Ejemplo' },
    verificacion: { titulo: 'Verificación' },
    seguroTramite: { titulo: 'Renovación de póliza' },
    mant0: { titulo: 'Lubricar cadena', nota: 'Cadena limpia y aceitada.' },
    mant1: { titulo: 'Cambio de aceite sintético', taller: 'Taller centro' },
  },
  en: {
    bici: { nombre: 'City bike', marca: 'Generic' },
    auto: { nombre: 'Family car', marca: 'Example', modelo: 'Sedan' },
    taller: { nombre: 'Downtown garage', direccion: '120 Example Ave.' },
    seguro: { nombre: 'Example Insurance' },
    verificacion: { titulo: 'Emissions test' },
    seguroTramite: { titulo: 'Policy renewal' },
    mant0: { titulo: 'Lube the chain', nota: 'Chain cleaned and oiled.' },
    mant1: { titulo: 'Synthetic oil change', taller: 'Downtown garage' },
  },
  pt: {
    bici: { nombre: 'Bicicleta urbana', marca: 'Genérica' },
    auto: { nombre: 'Carro de família', marca: 'Exemplo', modelo: 'Sedã' },
    taller: { nombre: 'Oficina Centro', direccion: 'Av. Exemplo, 120' },
    seguro: { nombre: 'Seguradora Exemplo' },
    verificacion: { titulo: 'Vistoria veicular' },
    seguroTramite: { titulo: 'Renovação da apólice' },
    mant0: { titulo: 'Lubrificar a corrente', nota: 'Corrente limpa e lubrificada.' },
    mant1: { titulo: 'Troca de óleo sintético', taller: 'Oficina Centro' },
  },
  fr: {
    bici: { nombre: 'Vélo urbain', marca: 'Générique' },
    auto: { nombre: 'Voiture familiale', marca: 'Exemple', modelo: 'Berline' },
    taller: { nombre: 'Garage Centre', direccion: '120 avenue Exemple' },
    seguro: { nombre: 'Assurance Exemple' },
    verificacion: { titulo: 'Contrôle technique' },
    seguroTramite: { titulo: 'Renouvellement de la police' },
    mant0: { titulo: 'Lubrifier la chaîne', nota: 'Chaîne nettoyée et huilée.' },
    mant1: { titulo: 'Vidange huile synthétique', taller: 'Garage Centre' },
  },
  de: {
    bici: { nombre: 'Stadtrad', marca: 'Generisch' },
    auto: { nombre: 'Familienauto', marca: 'Beispiel', modelo: 'Limousine' },
    taller: { nombre: 'Werkstatt Zentrum', direccion: 'Beispielstraße 120' },
    seguro: { nombre: 'Beispiel Versicherung' },
    verificacion: { titulo: 'TÜV-Termin' },
    seguroTramite: { titulo: 'Verlängerung der Police' },
    mant0: { titulo: 'Kette schmieren', nota: 'Kette gereinigt und geölt.' },
    mant1: { titulo: 'Ölwechsel (synthetisch)', taller: 'Werkstatt Zentrum' },
  },
  it: {
    bici: { nombre: 'Bici da città', marca: 'Generica' },
    auto: { nombre: 'Auto di famiglia', marca: 'Esempio', modelo: 'Berlina' },
    taller: { nombre: 'Officina Centro', direccion: 'Via Esempio 120' },
    seguro: { nombre: 'Assicurazioni Esempio' },
    verificacion: { titulo: 'Revisione' },
    seguroTramite: { titulo: 'Rinnovo polizza' },
    mant0: { titulo: 'Lubrificare la catena', nota: 'Catena pulita e lubrificata.' },
    mant1: { titulo: 'Cambio olio sintetico', taller: 'Officina Centro' },
  },
  ja: {
    bici: { nombre: '街乗り自転車', marca: 'ノーブランド' },
    auto: { nombre: 'ファミリーカー', marca: 'サンプル', modelo: 'セダン' },
    taller: { nombre: '中央整備工場', direccion: 'サンプル通り120番地' },
    seguro: { nombre: 'サンプル損害保険' },
    verificacion: { titulo: '車検' },
    seguroTramite: { titulo: '保険の更新' },
    mant0: { titulo: 'チェーンの注油', nota: 'チェーンを洗浄して注油済み。' },
    mant1: { titulo: '合成オイル交換', taller: '中央整備工場' },
  },
  zh: {
    bici: { nombre: '城市自行车', marca: '普通款' },
    auto: { nombre: '家庭用车', marca: '示例', modelo: '轿车' },
    taller: { nombre: '市中心汽修厂', direccion: '示例大道120号' },
    seguro: { nombre: '示例保险公司' },
    verificacion: { titulo: '年检' },
    seguroTramite: { titulo: '保单续保' },
    mant0: { titulo: '给链条上油', nota: '链条已清洁上油。' },
    mant1: { titulo: '更换全合成机油', taller: '市中心汽修厂' },
  },
  ko: {
    bici: { nombre: '시티 자전거', marca: '일반' },
    auto: { nombre: '가족용 차', marca: '예시', modelo: '세단' },
    taller: { nombre: '시내 정비소', direccion: '예시로 120' },
    seguro: { nombre: '예시 보험사' },
    verificacion: { titulo: '자동차 검사' },
    seguroTramite: { titulo: '보험 갱신' },
    mant0: { titulo: '체인에 윤활유 바르기', nota: '체인을 세척하고 윤활유를 발랐어요.' },
    mant1: { titulo: '합성유 교체', taller: '시내 정비소' },
  },
  ru: {
    bici: { nombre: 'Городской велосипед', marca: 'Без бренда' },
    auto: { nombre: 'Семейный автомобиль', marca: 'Пример', modelo: 'Седан' },
    taller: { nombre: 'Автосервис в центре', direccion: 'пр. Примерный, 120' },
    seguro: { nombre: 'Страховая «Пример»' },
    verificacion: { titulo: 'Техосмотр' },
    seguroTramite: { titulo: 'Продление полиса' },
    mant0: { titulo: 'Смазать цепь', nota: 'Цепь очищена и смазана.' },
    mant1: { titulo: 'Замена синтетического масла', taller: 'Автосервис в центре' },
  },
  hi: {
    bici: { nombre: 'शहर की साइकिल', marca: 'जेनेरिक' },
    auto: { nombre: 'फैमिली कार', marca: 'उदाहरण', modelo: 'सेडान' },
    taller: { nombre: 'सेंट्रल गैराज', direccion: 'उदाहरण मार्ग 120' },
    seguro: { nombre: 'उदाहरण बीमा कंपनी' },
    verificacion: { titulo: 'प्रदूषण जांच' },
    seguroTramite: { titulo: 'बीमा नवीनीकरण' },
    mant0: { titulo: 'चेन में तेल डालना', nota: 'चेन साफ़ और तेल लगी हुई है।' },
    mant1: { titulo: 'सिंथेटिक ऑइल बदलना', taller: 'सेंट्रल गैराज' },
  },
  tr: {
    bici: { nombre: 'Şehir bisikleti', marca: 'Markasız' },
    auto: { nombre: 'Aile arabası', marca: 'Örnek', modelo: 'Sedan' },
    taller: { nombre: 'Merkez Oto Servisi', direccion: 'Örnek Caddesi No:120' },
    seguro: { nombre: 'Örnek Sigorta' },
    verificacion: { titulo: 'Egzoz muayenesi' },
    seguroTramite: { titulo: 'Poliçe yenileme' },
    mant0: { titulo: 'Zinciri yağla', nota: 'Zincir temizlendi ve yağlandı.' },
    mant1: { titulo: 'Sentetik yağ değişimi', taller: 'Merkez Oto Servisi' },
  },
  id: {
    bici: { nombre: 'Sepeda kota', marca: 'Generik' },
    auto: { nombre: 'Mobil keluarga', marca: 'Contoh', modelo: 'Sedan' },
    taller: { nombre: 'Bengkel Pusat Kota', direccion: 'Jl. Contoh No. 120' },
    seguro: { nombre: 'Asuransi Contoh' },
    verificacion: { titulo: 'Uji emisi' },
    seguroTramite: { titulo: 'Perpanjangan polis' },
    mant0: { titulo: 'Melumasi rantai', nota: 'Rantai sudah dibersihkan dan dilumasi.' },
    mant1: { titulo: 'Ganti oli sintetis', taller: 'Bengkel Pusat Kota' },
  },
  pl: {
    bici: { nombre: 'Rower miejski', marca: 'Generyczna' },
    auto: { nombre: 'Samochód rodzinny', marca: 'Przykład', modelo: 'Sedan' },
    taller: { nombre: 'Warsztat Centrum', direccion: 'ul. Przykładowa 120' },
    seguro: { nombre: 'Ubezpieczenia Przykład' },
    verificacion: { titulo: 'Przegląd techniczny' },
    seguroTramite: { titulo: 'Odnowienie polisy' },
    mant0: { titulo: 'Smarowanie łańcucha', nota: 'Łańcuch oczyszczony i naoliwiony.' },
    mant1: { titulo: 'Wymiana oleju syntetycznego', taller: 'Warsztat Centrum' },
  },
  nl: {
    bici: { nombre: 'Stadsfiets', marca: 'Merkloos' },
    auto: { nombre: 'Gezinsauto', marca: 'Voorbeeld', modelo: 'Sedan' },
    taller: { nombre: 'Garage Centrum', direccion: 'Voorbeeldstraat 120' },
    seguro: { nombre: 'Voorbeeld Verzekeringen' },
    verificacion: { titulo: 'APK-keuring' },
    seguroTramite: { titulo: 'Verlenging polis' },
    mant0: { titulo: 'Ketting smeren', nota: 'Ketting gereinigd en gesmeerd.' },
    mant1: { titulo: 'Synthetische olie verversen', taller: 'Garage Centrum' },
  },
  ar: {
    bici: { nombre: 'دراجة المدينة', marca: 'عامة' },
    auto: { nombre: 'سيارة العائلة', marca: 'مثال', modelo: 'سيدان' },
    taller: { nombre: 'ورشة المركز', direccion: 'شارع المثال 120' },
    seguro: { nombre: 'شركة تأمين المثال' },
    verificacion: { titulo: 'الفحص الدوري' },
    seguroTramite: { titulo: 'تجديد بوليصة التأمين' },
    mant0: { titulo: 'تشحيم السلسلة', nota: 'السلسلة نظيفة ومشحّمة.' },
    mant1: { titulo: 'تغيير الزيت الصناعي', taller: 'ورشة المركز' },
  },
}
