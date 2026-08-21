import type { TextosEjemplosCocina } from './ejemplos.i18n'

/** INDONESIO de la siembra de cocina (misión catálogos 2026). */
export const EJEMPLOS_COCINA_ID: TextosEjemplosCocina = {
  recetas: {
    'pasta-al-pesto': {
      nombre: 'Pasta pesto',
      carpeta: 'Italia',
      etiquetas: ['pasta', 'cepat', 'vegetarian'],
      ingredientes: ['200 g pasta', '4 sdm pesto', '30 g keju parmesan', '1 sdm minyak zaitun'],
      pasos: ['Masak pasta hingga al dente.', 'Tiriskan lalu campur dengan pesto.', 'Sajikan dengan parmesan parut.'],
    },
    'pizza-margarita': {
      nombre: 'Pizza Margherita',
      carpeta: 'Italia',
      etiquetas: ['panggang', 'vegetarian'],
      ingredientes: ['1 dasar pizza', '150 g saus tomat', '125 g keju mozzarella', 'Daun basil'],
      pasos: ['Ratakan saus di atas dasar pizza.', 'Tambahkan keju mozzarella.', 'Panggang pada suhu 220 °C selama 12 menit.', 'Tutup dengan daun basil.'],
    },
    'tacos-al-pastor': {
      nombre: 'Tacos al pastor',
      carpeta: 'Meksiko',
      etiquetas: ['babi', 'klasik'],
      ingredientes: ['400 g daging babi marinasi', '9 tortilla jagung', '1/2 nanas', '1 bawang bombay', 'Daun ketumbar secukupnya'],
      pasos: ['Panggang daging babi marinasi.', 'Cincang halus bersama nanas.', 'Sajikan di atas tortilla dengan bawang bombay dan daun ketumbar.'],
    },
    'chilaquiles-verdes': {
      nombre: 'Chilaquiles hijau',
      carpeta: 'Meksiko',
      etiquetas: ['sarapan'],
      ingredientes: ['200 g keripik tortilla', '300 ml saus hijau', '2 telur', '50 g keju segar', 'Krim secukupnya'],
      pasos: ['Panaskan saus hijau.', 'Tambahkan keripik tortilla dan aduk.', 'Sajikan dengan telur, keju, dan krim.'],
    },
    'ensalada-mediterr-nea': {
      nombre: 'Salad Mediterania',
      carpeta: 'Sehat',
      etiquetas: ['ringan', 'vegetarian'],
      ingredientes: ['1 mentimun', '2 tomat', '80 g keju feta', '10 buah zaitun', '2 sdm minyak zaitun'],
      pasos: ['Potong sayuran.', 'Tambahkan keju feta dan zaitun.', 'Siram dengan minyak zaitun.'],
    },
    'salm-n-al-horno': {
      nombre: 'Salmon panggang',
      carpeta: 'Sehat',
      etiquetas: ['ikan', 'tinggi protein'],
      ingredientes: ['2 fillet salmon (300 g)', '1 lemon', '2 siung bawang putih', 'Daun dill dan garam secukupnya'],
      pasos: ['Letakkan salmon di atas loyang.', 'Bumbui dengan bawang putih, lemon, dan daun dill.', 'Panggang pada suhu 200 °C selama 18 menit.'],
    },
    'pollo-a-la-parrilla': {
      nombre: 'Ayam panggang',
      carpeta: 'Sehat',
      etiquetas: ['ayam', 'tinggi protein'],
      ingredientes: ['300 g dada ayam', '1 sdm minyak zaitun', 'Bumbu dan garam secukupnya', '1 lemon'],
      pasos: ['Bumbui ayam.', 'Panggang 6-7 menit tiap sisi.', 'Diamkan sebentar, lalu sajikan dengan lemon.'],
    },
    'bowl-de-quinoa': {
      nombre: 'Mangkuk quinoa',
      carpeta: 'Sehat',
      etiquetas: ['vegetarian', 'serat'],
      ingredientes: ['150 g quinoa', '100 g kacang arab matang', '1 wortel', '1/2 alpukat', '2 sdm minyak zaitun'],
      pasos: ['Masak quinoa.', 'Potong sayuran.', 'Campur semua bahan dan siram dengan saus.'],
    },
    'avena-overnight': {
      nombre: 'Oat rendam semalam',
      carpeta: 'Sehat',
      etiquetas: ['sarapan', 'cepat'],
      ingredientes: ['60 g oat', '200 ml susu', '1 pisang', '1 sdm biji chia'],
      pasos: ['Campur oat, susu, dan chia.', 'Simpan di kulkas semalaman.', 'Sajikan dengan irisan pisang.'],
    },
  },
  dietas: {
    'mediterr-nea': {
      nombre: 'Mediterania',
      descripcion: 'Kaya sayuran, ikan, dan minyak zaitun. Seimbang dan berkelanjutan.',
    },
    'alta-en-prote-na': {
      nombre: 'Tinggi protein',
      descripcion: 'Mengutamakan protein untuk perubahan komposisi tubuh dan rasa kenyang.',
    },
    keto: {
      nombre: 'Keto',
      descripcion: 'Rendah karbohidrat dan tinggi lemak sehat.',
    },
    vegetariana: {
      nombre: 'Vegetarian',
      descripcion: 'Tanpa daging, berbasis sayuran, kacang-kacangan, dan biji-bijian utuh.',
    },
    'ganancia-muscular': {
      nombre: 'Penambahan massa otot',
      descripcion: 'Surplus kalori dengan protein tinggi untuk menambah massa otot.',
    },
    'p-rdida-de-grasa': {
      nombre: 'Penurunan lemak',
      descripcion: 'Defisit kalori dengan protein tinggi untuk menjaga otot.',
    },
    'sin-gluten': {
      nombre: 'Bebas gluten',
      descripcion: 'Menghindari gandum dan turunannya; berbasis jagung, beras, ikan, dan sayuran.',
    },
  },
  dia: [
    { nombre: 'Oat rendam semalam dengan pisang', nota: 'Contoh: begini tampilan satu hari yang tercatat.' },
    { nombre: 'Yogurt Yunani dengan kacang kenari' },
    { nombre: 'Ayam panggang dengan nasi dan sayur' },
    { nombre: 'Salmon panggang dengan salad' },
  ],
  lista: {
    nombre: 'Contoh: Belanja mingguan',
    items: [
      'Dada ayam',
      'Salmon',
      'Telur',
      'Tomat',
      'Alpukat',
      'Bayam',
      'Yogurt Yunani',
      'Keju feta',
      'Oat',
      'Beras merah',
      'Minyak zaitun',
      'Tortilla jagung',
    ],
  },
}
