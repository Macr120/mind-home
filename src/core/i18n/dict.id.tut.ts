import type { Dict } from './dict'

/**
 * Textos de PASO de los tutoriales en id. Capa aparte porque solo hacen
 * falta con un tour corriendo.
 *
 * Lo monta `traducir-a-mano.mjs meter-dict` — no lo edites a mano.
 */

export const ID_TUT: Dict = {
  'tut.app-computo--formulario.1.titulo': 'Menempel di kalkulator',
  'tut.app-computo--formulario.1.texto':
    'Seluruh Buku Rumus tinggal di menu ini, satu ketukan dari tempat kamu berhitung. Matematika, Fisika, dan Kimia sudah terisi dan dikelompokkan per topik, dalam folder yang bisa kamu susun bertingkat sesukamu. Pep juga punya Fisika II beserta ujian tengah semesternya, hitungan kafe, dan hitungan lari.',
  'tut.app-computo--formulario.2.titulo': 'Semuanya milikmu',
  'tut.app-computo--formulario.2.texto':
    'Tidak ada “bawaan” dan “punyaku”: setiap rumus dibuka, diedit, dan dihapus dengan cara yang sama. Kotak pencarian di atas mencari di semuanya.',
  'tut.app-computo--formulario.3.titulo': 'Ubah sesukamu',
  'tut.app-computo--formulario.3.texto':
    'Mengedit sebuah rumus membuatmu bisa mengganti ekspresinya, mengganti nama variabelnya, atau mengunci nilai yang selalu kamu pakai.',
  'tut.app-computo--formulario.4.texto':
    'Kurvanya muncul di antara rumus dan variabel, dan menggeser slider mana pun langsung menggerakkannya. “Buka ukuran penuh” mengirimnya ke mode Grafik, dan tombol cetak menarik seluruh folder menjadi PDF dengan rumus yang tersusun rapi.',
  'tut.app-computo--calculadora.1.titulo': 'Tulis operasinya',
  'tut.app-computo--calculadora.1.texto':
    'Hasilnya dihitung sambil kamu mengetik. Papan tombol di bawah menyingkirkan papan ketik ponsel, dan tombol ilmiah tidak lagi tinggal di sana: semuanya ada di Notasi.',
  'tut.app-computo--calculadora.2.titulo': 'Notasi',
  'tut.app-computo--calculadora.2.texto':
    'Semua yang ilmiah ada di sini, dan lebih banyak lagi: kamu pilih kelompoknya —Dasar, Kalkulus, Matriks, Trigonometri, Simbol— lalu tombolnya berubah. Semuanya ditulis di posisi kursormu dan celahnya siap diketik.',
  'tut.app-computo--calculadora.3.titulo': 'Mode khusus',
  'tut.app-computo--calculadora.3.texto':
    'Kalkulatornya mengganti seluruh tampilan: grafik, basis 2 sampai 16, matriks, sistem persamaan, konversi satuan, hitungan tagihan dengan tip, dan aturan tiga. Riwayat tetap di bawah pada semuanya.',
  'tut.app-computo--calculadora.3b.titulo': 'Basis',
  'tut.app-computo--calculadora.3b.texto':
    'Apa pun yang kamu ketik dibaca dalam basis terpilih dan ditampilkan di kelima belas basis sekaligus, dari 2 sampai 16, secara langsung. Ada operasi bitwise, dan dengan awalan 0b, 0o, dan 0x basis-basis bisa dicampur dalam satu hitungan.',
  'tut.app-computo--calculadora.3c.titulo': 'Matriks dan sistem',
  'tut.app-computo--calculadora.3c.texto':
    'Matriks beroperasi dengan A dan B sampai 6×6: penjumlahan, perkalian, determinan, invers, transpos, dan teras. Tetangganya, Sistem, menyelesaikan persamaan linear dengan membaca variabel tak diketahui dari yang kamu tulis, sampai enam persamaan.',
  'tut.app-computo--calculadora.3d.titulo': 'Satuan',
  'tut.app-computo--calculadora.3d.texto':
    'Delapan kategori —dari panjang sampai data— yang mengonversi sambil kamu mengetik; masing-masing mengingat pasangan terakhirnya dan «Tukar» membalik arah konversinya. Suhu keluar dengan benar: 100 °C itu 212 °F.',
  'tut.app-computo--calculadora.3e.titulo': 'Tip dan aturan tiga',
  'tut.app-computo--calculadora.3e.texto':
    'Dua hitungan cepat di luar kepala: Tip dihitung dari tagihannya —bukan dari totalnya— dan membaginya ke berapa pun orangnya; Aturan 3, langsung atau terbalik, mengisi x-nya sendiri.',
  'tut.app-computo--calculadora.4.titulo': 'Buku Rumus dalam jangkauan',
  'tut.app-computo--calculadora.4.texto':
    'Rumus-rumusmu menggantung di menu ini, dengan variabel siap diisi: itulah yang membuat menyimpannya jadi ada gunanya.',
  'tut.app-computo--calculadora.5.titulo': 'Menggambar grafik',
  'tut.app-computo--calculadora.5.texto':
    'Semua yang digambar lewat sini, dengan grafik di atas dan papan tombol di bawah untuk menulis fungsinya. Seret untuk menggeser, cubit untuk memperbesar, dan sentuh untuk membaca satu titik.',
  'tut.app-computo--calculadora.6.titulo': 'Empat cara menggambar',
  'tut.app-computo--calculadora.6.texto':
    'Fungsi x, kurva kutub seperti mawar ini (r sebagai fungsi sudut), kurva parametrik yang x dan y-nya bergantung pada parameter yang sama, dan permukaan dua variabel yang bisa kamu putar dengan jari.',
  'tut.app-computo--calculadora.7.titulo': 'Menyelesaikan persamaan',
  'tut.app-computo--calculadora.7.texto':
    'Tulis persamaannya lengkap dengan tanda sama dengan. Kalau berupa polinomial, akarnya diberikan secara persis; kalau bukan, akarnya dicari di dalam interval yang sedang kamu lihat dan kamu diberi tahu yang mana.',
  'tut.app-computo--hojas.1.titulo': 'Spreadsheet kamu',
  'tut.app-computo--hojas.1.texto':
    'Setiap spreadsheet adalah dokumen tersendiri. Pep punya anggaran Jepang, rencana 18 minggu maraton, dan nilai Fisika II.',
  'tut.app-computo--hojas.2.titulo': 'Mulai dengan sesuatu',
  'tut.app-computo--hojas.2.texto':
    'Aplikasi ini membawa tiga spreadsheet yang sudah jadi lengkap dengan rumusnya —anggaran, rata-rata terbobot, dan catatan pengukuran— supaya kamu tidak pernah mulai dari kosong. Semuanya milikmu: ubah atau hapus saja.',
  'tut.app-computo--hojas.3.titulo': 'Bilah rumus',
  'tut.app-computo--hojas.3.texto':
    'Sel diedit di atas sini, bukan di dalam kisi: di ponsel, ini satu-satunya cara mengetik tanpa berkelahi. Saat menulis rumus, menyentuh sebuah sel akan menyisipkan referensinya.',
  'tut.app-computo--hojas.4.titulo': 'Buat grafik dari yang kamu pilih',
  'tut.app-computo--hojas.4.texto':
    'Pilih satu rentang lalu tekan tombol Buat Grafik: Batang, Garis, Area, Pai, atau Sebar. Grafiknya menyimpan RENTANG-nya, jadi ia bergerak sendiri saat sebuah angka berubah.',
  'tut.app-computo--hojas.5.titulo': 'Ekspor',
  'tut.app-computo--hojas.5.texto':
    'Ke Excel keluar .xlsx sungguhan, dengan rumus yang hidup dan grafik sebagai grafik Excel asli. Ke PDF keluar lewat pencetak browser.',
  'tut.casa.1.texto': 'Ini rumahmu: setiap ruangan menyimpan satu aplikasi. Aku tunjukkan kontrol dasarnya.',
  'tut.casa.2.titulo': 'Menu utama',
  'tut.casa.2.texto': 'Tombol ini membuka menu: ruanganmu, katalog templat (aplikasi), dan inventaris objek.',
  'tut.casa.3.titulo': 'Bergerak',
  'tut.casa.3.texto':
    'Berjalanlah dengan joystick, dengan WASD, atau dengan tombol panah di keyboard. Begitu melewati pintu sebuah ruangan, kamu masuk dan aplikasinya terbuka sendiri.',
  'tut.casa.4.titulo': 'Tiga cara melihat',
  'tut.casa.4.texto':
    'Isometrik, orang ketiga, dan orang pertama (atau tombol V). Menyentuh Iso juga memusatkan lagi kamera ke karaktermu: jalan pulang cepat kalau kamu keburu jauh menjelajah.',
  'tut.casa.5.titulo': 'Satu sudut, beberapa pemilik',
  'tut.casa.5.texto':
    'Sudut itu bukan cuma kubus tampilan: begitu kamu mendekati sesuatu yang bisa diajak berinteraksi —sebuah kursi, kendaraan, lapangan— sudut itu berubah sendiri mengikuti apa yang ada di dekatmu. Tidak ada yang menyala tanpa kamu dekati.',
  'tut.casa.6.titulo': 'Roda alat',
  'tut.casa.6.texto':
    'Gerakan, Mainan, Kendaraan, dan Bangunan, sampai 3 terpasang sekaligus. Dibuka dari sini atau dari sudut yang sama itu saat tanganmu kosong.',
  'tut.casa.7.titulo': 'Jam',
  'tut.casa.7.texto':
    'Waktu di rumah: sentuh dan kalender lengkap terbuka, dengan Misi hariannya. Matahari atau bulan di sebelahnya mengatur laju waktu dan cahaya pemandangannya.',
  'tut.casa.8.titulo': 'Musik rumah',
  'tut.casa.8.texto':
    'Setiap ruangan bisa punya lagunya sendiri, atau membiarkan suasana umum rumah yang berbunyi. Bisa dimatikan sepenuhnya kalau kamu lebih suka sunyi.',
  'tut.casa.9.titulo': 'Obrolan',
  'tut.casa.9.texto':
    'Obrolan sang arsitek: ceritakan apa yang kamu lakukan dan dia mencatatnya di aplikasi yang tepat, atau minta perubahan di rumah.',
  'tut.casa.10.texto':
    'Itu dasarnya. Tombol Editor di atas membuka penyesuaian lengkap, dan setiap menu dan setiap aplikasi punya tombol ? sendiri dengan tutorialnya.',
  'tut.primeros.1.texto': 'Pertama-tama: bagaimana rumah ini dibangun. Semua dimulai dari tab Ruangan.',
  'tut.primeros.2.titulo': 'Buat ruangan',
  'tut.primeros.2.texto':
    'Dengan tombol ini kamu menggambar ruangan baru di peta. Untuk menunjukkan sisa jalannya, sekarang aku buatkan satu…',
  'tut.primeros.3.titulo': 'Ruangan barumu',
  'tut.primeros.3.texto':
    'Ini dia! Ruangan yang baru dibuat, masih tanpa aplikasi: makanya kartunya bertuliskan + Tetapkan.',
  'tut.primeros.4.titulo': 'Menetapkan aplikasi',
  'tut.primeros.4.texto':
    'Dengan + Tetapkan aku memberinya aplikasi: lihat bagaimana ruangan itu mengambil nama, ikon, dan perabotnya. Mulai sekarang seluruh kartunya adalah tombol masuk.',
  'tut.primeros.5.titulo': 'Masuk',
  'tut.primeros.5.texto':
    'Kita sudah di dalam: ini aplikasi ruangannya. Saat berjalan-jalan kamu juga masuk lewat pintunya, dan keluar dengan ‹ Kembali ke rumah.',
  'tut.primeros.6.texto':
    'Ruangan itu tetap ada di rumahmu, lengkap dengan aplikasinya. Begitulah sisanya dibangun: satu ruangan untuk setiap hal yang mau kamu simpan di sini.',
  'tut.menu-cuartos.1.texto': 'Tab Ruangan menampilkan semua ruangan di rumahmu, dikelompokkan per kategori.',
  'tut.menu-cuartos.2.titulo': 'Ringkasanmu',
  'tut.menu-cuartos.2.texto':
    'Karaktermu hidup dari aktivitas nyatamu: di sini kamu lihat suasana hatinya, levelnya, dan runtunannya. Catat sesuatu di aplikasi mana pun dan dia akan ceria; beberapa hari tanpa apa-apa dan dia jadi sedih — dia tidak pernah menghukummu atau mengulang dari nol.',
  'tut.menu-cuartos.3.titulo': 'Kartu-kartunya',
  'tut.menu-cuartos.3.texto':
    'Setiap kartu adalah satu ruangan: ikonnya, namanya, dan progres aplikasinya, dikelompokkan ke Tubuh, Pikiran, Ekstra, dan Pengaturan. Ruangan yang belum punya aplikasi ada di paling bawah.',
  'tut.menu-cuartos.4.titulo': 'Opsi ruangan',
  'tut.menu-cuartos.4.texto':
    'Roda gigi membentangkan opsi ruangan dalam satu baris: menaikkan atau menurunkannya di daftar, menghapusnya, dan Edit, yang membuka editor bentuk, warna, dinding, dan objeknya.',
  'tut.menu-cuartos.5.titulo': 'Seluruh kartunya masuk',
  'tut.menu-cuartos.5.texto':
    'Seluruh kartu adalah tombolnya: sentuh di bagian mana pun dan kamu masuk ke aplikasi ruangan itu. Kalau belum punya aplikasi, kartu yang sama bertuliskan + Tetapkan dan membuka katalog untuk memilihkannya satu.',
  'tut.menu-cuartos.6.titulo': 'Buat ruangan',
  'tut.menu-cuartos.6.texto':
    'Buat ruangan membuka editor peta dengan kuas siap menggambar ruangan barunya: bentuk, ukuran, dan letaknya ada di tanganmu. Di ponsel, jalan pintas roda alat › Bangunan › Ruangan lebih enak dipakai: ia menggambar langsung di atas peta tanpa membuka panel.',
  'tut.menu-cuartos.7.texto':
    'Singkatnya: Edit untuk menyesuaikan, Masuk untuk memakai aplikasinya. Tab lain di menu ini punya tutorialnya sendiri.',
  'tut.menu-plantillas.1.texto':
    'Templat itu sebuah aplikasi (Dapur, Gym, Keuangan…). Templat ditetapkan ke sebuah objek di dalam ruangan dan terbuka saat kamu masuk.',
  'tut.menu-plantillas.2.titulo': 'Dua tampilan',
  'tut.menu-plantillas.2.texto':
    'Ruangan berisi aplikasi seperti biasa, masing-masing di objeknya sendiri. Ekstra beda lagi: sirkuit, lapangan, kebun sayur, peternakan, atau paintball dibangun langsung di atas lahan, tanpa memakai satu ruangan pun.',
  'tut.menu-plantillas.3.titulo': 'Katalog',
  'tut.menu-plantillas.3.texto':
    'Aplikasi bawaan dan aplikasi buatanmu, tersusun dalam grup. Ketuk salah satu untuk menetapkannya ke sebuah ruangan atau, di Ekstra, untuk membangunnya di peta.',
  'tut.menu-plantillas.4.titulo': 'Templat buatanmu',
  'tut.menu-plantillas.4.texto':
    'Buat templatmu sendiri dengan menyusunnya dari blok: catatan, daftar periksa, penghitung, kebiasaan, galeri… Tombol ini membuka editornya sendiri, lengkap dengan tutorialnya sendiri.',
  'tut.menu-plantillas.5.texto':
    'Satu ruangan bisa punya beberapa aplikasi: begitu masuk, muncul peluncur untuk memilih mana yang mau dibuka.',
  'tut.plantillas-custom.1.texto':
    'Editor ini merakit aplikasi milikmu dari nol: kamu beri bentuk dengan nama, emoji, dan blok, lalu ia masuk ke katalog berdampingan dengan yang bawaan.',
  'tut.plantillas-custom.2.titulo': 'Nama, emoji, dan warna',
  'tut.plantillas-custom.2.texto':
    'Namanya nanti apa dan warnanya apa di menu, katalog, dan kalender kalau kamu menjadwalkan sesuatu miliknya.',
  'tut.plantillas-custom.3.titulo': 'Alat-alatnya',
  'tut.plantillas-custom.3.texto':
    'Dua belas jenis blok: catatan, daftar periksa, penghitung, kebiasaan, sesi, hitung mundur, galeri, log, penilaian, progres, daftar, dan tautan. Tiap blok yang kamu tambahkan jadi satu bagian di aplikasimu.',
  'tut.plantillas-custom.4.titulo': 'Urutan itu penting',
  'tut.plantillas-custom.4.texto':
    'Blok yang sudah ditambahkan diurutkan ulang dengan panah dan dihapus dengan ✕ — menghapus satu blok ikut menghapus datanya saat disimpan, jadi periksa dulu sebelum mengonfirmasi. Lewat dropdown “Menu”, blok pindah dari satu tab ke tab lain tanpa kehilangan apa pun.',
  'tut.plantillas-custom.5.titulo': 'Simpan',
  'tut.plantillas-custom.5.texto':
    'Dengan nama dan minimal satu blok, Simpan menaruhnya di katalog dalam keadaan siap pakai. Dari sana templat ditetapkan ke sebuah objek, sama seperti templat bawaan mana pun.',
  'tut.plantillas-custom.6.texto':
    'Kamu bisa mengeditnya lagi kapan saja: blok dan datanya tetap utuh, yang berubah hanya yang kamu ubah.',
  'tut.menu-inventario.1.texto': 'Inventaris: semua objek yang bisa kamu taruh di rumahmu, siap diseret.',
  'tut.menu-inventario.2.titulo': 'Objek',
  'tut.menu-inventario.2.texto':
    'Pustaka objekmu, tersusun dalam kategori dan folder. Kamu bisa mengganti namanya dan merapikannya supaya cepat ketemu lain kali.',
  'tut.menu-inventario.3.titulo': 'Objek spesial',
  'tut.menu-inventario.3.texto':
    'Yang benar-benar melakukan sesuatu, bukan cuma hiasan: kendaraan yang bisa dinaiki, pistol mainan, air mancur, wahana taman, dan lampu.',
  'tut.menu-inventario.4.titulo': 'Menempatkan',
  'tut.menu-inventario.4.texto':
    'Selagi menu ini terbuka, seret sebuah gambar kecil langsung ke adegan 3D untuk menaruhnya di mana pun kamu mau.',
  'tut.menu-inventario.5.texto':
    'Untuk memindahkan, mewarnai, atau menghapus yang sudah ditaruh, pakai Editor (tab Objek) — menu ini hanya untuk membawa barang baru ke dalam adegan.',
  'tut.editor-mapa.1.texto':
    'Editor rumah punya 4 tab: Peta, Karakter, Objek, dan Pengaturan. Tur ini tur Peta; tiga tab lainnya punya turnya sendiri.',
  'tut.editor-mapa.2.titulo': 'Sketsa',
  'tut.editor-mapa.2.texto':
    'Kamu menggambar di atas kisi-kisi dari pandangan atas: ruangan, dinding, pintu, jendela, dan lantai, dengan mode dan kuas di bilah atas. Yang kamu gambar langsung muncul di 3D, tanpa perlu memuat ulang apa pun.',
  'tut.editor-mapa.3.texto':
    'Atap dibuat per sel: tiap sel bisa punya bentuk atau materialnya sendiri, jadi satu ruangan bisa memadukan beberapa kemiringan atap alih-alih satu atap datar saja.',
  'tut.editor-mapa.4.texto':
    'Rumahmu juga punya level: lantai yang bisa ditumpuk ke atas dan satu basemen ke bawah. Setiap level baru lahir dengan jalan naiknya sendiri —sebuah tangga atau lubang di pelat lantai— yang menembus lantai di atasnya.',
  'tut.editor-mapa.5.titulo': 'Selesai',
  'tut.editor-mapa.5.texto':
    'Semuanya tersimpan sendiri selagi kamu mengedit. Selesai menutup editor dan mengembalikanmu ke permainan dengan rumah persis seperti yang kamu tinggalkan.',
  'tut.editor-personajes.1.texto':
    'Karakter utamamu dan para asistenmu tinggal di editor yang sama: pilih siapa yang mau diedit di bagian atas, dan alatnya ikut berubah sesuai apa yang masuk akal untuk masing-masing.',
  'tut.editor-personajes.2.titulo': 'Wajah dan foto',
  'tut.editor-personajes.2.texto':
    'Ekspresi, model rambut, dan warna rambut, atau langsung fotomu sendiri supaya karakternya mirip kamu. Tidak semua tubuh mendukung wajah sendiri.',
  'tut.editor-personajes.3.titulo': 'Pakaian per kategori',
  'tut.editor-personajes.3.texto':
    'Tiap potong pakaian dipakai, dilepas, dan diganti warnanya secara terpisah: kemeja, celana, alas kaki, aksesori. Semuanya bebas dipadupadankan.',
  'tut.editor-personajes.4.titulo': 'Setelan tersimpan',
  'tut.editor-personajes.4.texto':
    'Simpan satu padanan pakaian lengkap sebagai setelan, lalu ganti penampilanmu seluruhnya dengan sekali ketuk, tanpa menyusun ulang sepotong demi sepotong tiap kali.',
  'tut.editor-personajes.5.titulo': 'Lemari pakaian per ruangan',
  'tut.editor-personajes.5.texto':
    'Tetapkan setelan berbeda untuk tiap ruangan: avatarmu masuk ke Gym dengan pakaian lari dan berganti sendiri begitu pindah ke Dapur.',
  'tut.editor-personajes.6.texto':
    'Tubuh, warna, dan ukuran diedit seperti biasa; kalau AI aktif, kamu juga bisa membuat model 3D-mu sendiri alih-alih memilih salah satu preset.',
  'tut.editor-objetos.1.texto':
    'Ketuk sebuah objek di adegan (atau di daftar) untuk mengeditnya: warna, ukuran, dan rotasi adalah tiga pengaturan yang dimiliki semua objek.',
  'tut.editor-objetos.2.texto':
    'Objek yang sudah punya aplikasi akan membuka templatnya saat kamu masuk ruangan; yang tidak, cuma jadi hiasan — keduanya diedit dengan cara yang sama.',
  'tut.editor-objetos.3.texto':
    'Roda gigi ⚙️ pada sebuah objek membuatnya bisa diedit per bagian: rakit modelmu sendiri dengan menggabungkan bentuk-bentuk dasar, atau minta satu ke AI dengan mendeskripsikannya.',
  'tut.editor-config.1.texto':
    'Delapan bagian yang bisa dilipat, bukan satu daftar panjang: ketuk judulnya untuk membuka yang kamu butuhkan saja.',
  'tut.editor-config.2.titulo': 'Akun dan AI',
  'tut.editor-config.2.texto':
    'Masuk ke akun, paketmu, dan berapa banyak AI yang sudah kamu pakai bulan ini; tepat di sebelahnya, tabel harga tiap operasi. Keduanya punya tutorial detailnya sendiri.',
  'tut.editor-config.3.titulo': 'Gaya visual',
  'tut.editor-config.3.texto':
    'Tema peta (cahaya, kabut, pencahayaan) dan gaya pascaproses, semuanya dimuat saat dibutuhkan supaya tidak memberatkan.',
  'tut.editor-config.4.titulo': 'Antarmuka dan bahasa',
  'tut.editor-config.4.texto':
    'Bahasa, tema antarmuka (terang/gelap/otomatis), gaya ikon, dan kerapatan — semua yang mengubah BAGAIMANA rumahmu terlihat, bukan apa isinya.',
  'tut.editor-config.5.titulo': 'Notifikasi',
  'tut.editor-config.5.texto':
    'Pemberitahuan mana yang masuk dan mana yang diam: rutinitas, notifikasi rencana, dan pengingat bisa dimatikan satu per satu.',
  'tut.editor-config.6.texto':
    'Musik dan Tutorial punya panduannya sendiri; Cadangan data juga, dan itulah yang paling perlu kamu tengok sebelum ganti perangkat.',
  'tut.respaldo.1.titulo': 'Di mana rumahmu tinggal',
  'tut.respaldo.1.texto':
    'Tanpa akun dan tanpa sinkronisasi, datamu hanya ada di perangkat ini. Pemberitahuan di atas memberi tahu apakah browser punya izin untuk melindunginya dari pembersihan otomatis.',
  'tut.respaldo.2.titulo': 'Ekspor',
  'tut.respaldo.2.texto':
    'Mengunduh satu berkas JSON berisi semua tabelmu: ruangan, target, catatan, semuanya. Ini cadangan manualmu.',
  'tut.respaldo.3.titulo': 'Pulihkan',
  'tut.respaldo.3.texto':
    'Memulihkan akan MENGGANTI semua data saat ini dengan isi file — sebelumnya ia minta konfirmasi dan menampilkan berapa catatan yang dibawa, jadi tidak ada kejutan.',
  'tut.respaldo.4.texto':
    'Sebaiknya buat cadangan sebelum ganti perangkat, ganti browser, atau sesekali saja: tanpa akun, ini satu-satunya salinan yang kamu punya.',
  'tut.editor-cuarto.1.texto':
    'Kamu sedang mengedit satu ruangan tertentu: denah dan kameranya fokus ke situ, bukan ke seluruh rumah.',
  'tut.editor-cuarto.2.titulo': 'Apa yang bisa diedit',
  'tut.editor-cuarto.2.texto':
    'Bentuk, lantai, dinding, pintu, warna dan nama ruangan, plus objek-objeknya. Aplikasi yang ditetapkan juga diganti dari sini: itulah yang paling sering membawa orang ke panel ini.',
  'tut.editor-cuarto.3.titulo': 'Kembali ke peta',
  'tut.editor-cuarto.3.texto':
    'Panah ini kembali ke seluruh peta tanpa menutup editor, supaya kamu bisa lanjut menggarap ruangan lain.',
  'tut.editor-cuarto.4.texto':
    'Ada juga tombol mengambang “Keluar ruangan” di atas ruangannya sendiri dalam 3D, kalau kamu lebih suka menyentuhnya di sana.',
  'tut.inicio.1.texto':
    'Tombol dengan nama rumahmu membuka layar beranda: aplikasi-aplikasimu dalam kisi, dengan mekanika sebuah ponsel.',
  'tut.inicio.2.titulo': 'Satu ketukan, satu aplikasi',
  'tut.inicio.2.texto':
    'Di sini hanya muncul ruangan yang sudah punya aplikasi, dengan level, runtunan, dan daftar tuntasnya. Penghitung merah di pojok adalah misinya yang masih menunggu hari ini, dan menyentuh kartunya langsung masuk.',
  'tut.inicio.3.titulo': 'Tekan lama sebuah kartu',
  'tut.inicio.3.texto':
    'Tekanan lama mengangkatnya dan semuanya bergoyang, seperti di ponsel: seret untuk menyusun ulang, atau sentuh pensil di pojoknya untuk mengedit kartunya.',
  'tut.inicio.4.titulo': 'Tantanganmu, terpampang',
  'tut.inicio.4.texto':
    'Dua cincin itu adalah Gunung Sisifus: pangkat tahun ini dan lencana yang sudah diraih. Menyentuhnya membuka gunung selengkapnya, yang sama dengan di menu samping.',
  'tut.inicio.5.titulo': 'Wallpaper dan tampilan 3D',
  'tut.inicio.5.texto':
    'Tombol ini memberi kisinya wallpaper, diredupkan supaya kartunya tetap terbaca. Tombol di sebelahnya berganti antara ikon tiap ruangan dan miniatur 3D berperabotnya.',
  'tut.inicio.6.texto':
    'Membuat ruangan, menghapusnya, atau menetapkan aplikasi tetap urusan menu samping: layar ini untuk masuk dengan cepat. Tutup dengan menyentuh di luarnya.',
  'tut.herramientas.1.texto': 'Tombol ini membuka roda alat karaktermu.',
  'tut.herramientas.2.titulo': 'Dua level',
  'tut.herramientas.2.texto':
    'Pilih kategorinya dulu, lalu alat spesifik di dalamnya. Kamu bisa memasang hingga 3 alat sekaligus, dari kategori berbeda atau dari kategori yang sama.',
  'tut.herramientas.3.titulo': 'Kategori keempat',
  'tut.herramientas.3.texto':
    'Bangunan tidak memasang mainan: ia menyalakan mode menggambar peta (Ruangan, Dinding, Pintu, Jendela, lantai, Atap) tanpa lewat editor lengkap. Denahnya sama, cuma jalan masuknya lebih cepat.',
  'tut.herramientas.4.titulo': 'Bagian tengah',
  'tut.herramientas.4.texto':
    'Bagian tengah melepas semua yang terpasang dan mengembalikan sudut itu ke keadaan normal (kubus tampilan atau kontrol kontekstual lain, tergantung apa yang ada di dekatmu).',
  'tut.herramientas.5.texto':
    'Rodanya tertutup begitu kamu menyentuh di luarnya. Coba kapan saja: tidak ada yang disimpan permanen, semuanya cuma berlaku selama alatnya masih kamu bawa.',
  'tut.navegacion.1.texto':
    'Tiga kamera: Iso (tampilan rumah boneka), orang ketiga dan orang pertama. Ganti di sini atau dengan tombol V.',
  'tut.navegacion.2.titulo': 'Menentukan arah',
  'tut.navegacion.2.texto':
    'Di Iso kamu mengendalikan kamera lewat kubus: sudut-sudutnya memberi sudut pandang isometrik dan sisi-sisinya, tampilan datar. Di orang ketiga/pertama, tempatnya diisi pad yang kamu seret untuk melihat sekeliling.',
  'tut.navegacion.3.titulo': 'Saat ada sesuatu di dekatmu',
  'tut.navegacion.3.texto':
    'Sudut yang sama berhenti jadi kamera begitu kamu mendekati sesuatu yang bisa dipakai: lapangan menawarkan tombol mainnya, kendaraan tombol naiknya, kursi tombol duduknya. Cuma satu hal dalam satu waktu, dan selalu karena kedekatan — tidak pernah otomatis.',
  'tut.navegacion.4.titulo': 'Putar dan pusatkan',
  'tut.navegacion.4.texto':
    'Setiap panah memutar seperempat putaran: peta di Iso, pandanganmu di orang ketiga/pertama. Tombol ketiga hanya muncul saat peta ada di depan, dan memusatkannya lagi kalau kamu tersesat waktu menjelajah.',
  'tut.navegacion.5.titulo': 'Bergerak',
  'tut.navegacion.5.texto':
    'Berjalan dengan joystick, WASD atau tanda panah. Di air kamu berenang; kalau sedang menaiki kendaraan, kamu mengemudi dengan kontrol yang sama.',
  'tut.navegacion.6.texto':
    'Tombol Editor di atas bekerja di tampilan mana pun: buka di orang ketiga/pertama dan kamu mengedit sambil berjalan, menyentuh objek, dinding, atau karakter persis di tempatnya.',
  'tut.chat.1.texto':
    'Chat Sang Arsitek: mencatat harimu, mengedit rumah dan menjawab pertanyaanmu, semuanya dari kotak yang sama.',
  'tut.chat.2.titulo': 'Menulis',
  'tut.chat.2.texto':
    'Tulis bebas: “lari 20 menit”, “belanja 250 di supermarket”… Chip di sebelahnya menunjukkan ke aplikasi mana ini akan masuk. Pakai @ruangan untuk menentukan tujuannya sendiri kalau tebakannya meleset.',
  'tut.chat.3.titulo': 'Mendikte lewat suara',
  'tut.chat.3.texto':
    'Mikrofon menyalin apa yang kamu ucapkan ke kotak teks — praktis untuk mencatat tanpa melepas barang yang sedang kamu pegang.',
  'tut.chat.4.titulo': 'Melampirkan',
  'tut.chat.4.texto':
    'Tombol + membentangkan lima opsi: mengunggah gambar atau PDF dan mengambil foto —dengan AI aktif, struk atau timbangan dibaca dengan sendirinya— plus dua yang tidak butuh AI: masker AR dan obrolan AR.',
  'tut.chat.4b.titulo': 'Masker AR',
  'tut.chat.4b.texto':
    'Ia menyalakan kamera dan memasangkan maskernya di wajahmu, mengikutimu secara langsung — masker yang sama dengan di video perkenalan rumah. Bekerja tanpa AI dan tanpa akun.',
  'tut.chat.4c.titulo': 'Obrolan AR',
  'tut.chat.4c.texto':
    'Percakapan yang sama seperti biasa, tapi dengan kameramu sebagai latar dan asisten dalam 3D di depan, dengan emosi yang mengiringi jawabannya.',
  'tut.chat.5.titulo': 'Asisten',
  'tut.chat.5.texto':
    'Asistenmu memberi wajah dan suara pada jawabannya. Sentuh dia untuk melihat percakapannya, ganti asisten atau membuat yang baru.',
  'tut.chat.6.titulo': 'Manualnya',
  'tut.chat.6.texto':
    'Manualnya mendaftar semua perintah: menambah atau menghapus ruangan, membuat objek, mengingat sesuatu…',
  'tut.chat.7.titulo': 'Model AI',
  'tut.chat.7.texto':
    'Ikon ini memilih AI mana yang menjawab dan menyimpan kuncimu kalau kamu pakai kunci sendiri. Kalau belum ada yang disetel, chat tetap jalan lewat kata kunci, tanpa memahami bahasa bebas.',
  'tut.chat.8.texto':
    'Kamu juga bisa bertanya “bagaimana cara kerja Dapur?” atau minta “tutorial Gym” di sini juga, dan apa yang tersimpan dibahas di tutorial tab Entri.',
  'tut.chat-registros.1.texto':
    'Obrolan menampilkan dengan siapa kamu mengobrol; Entri, apa yang tersimpan dari percakapan itu.',
  'tut.chat-registros.2.titulo': 'Yang diingat tentang kamu',
  'tut.chat-registros.2.texto':
    'Hal-hal yang menurut asisten layak diingat antar sesi —sebuah alergi, sebuah target, sebuah preferensi— supaya tidak perlu menanyakannya lagi. Sentuh ✕-nya untuk melupakannya.',
  'tut.chat-registros.3.texto':
    'Apa yang kamu catat di aplikasimu (makanan, pengeluaran, sesi) tinggal di masing-masing aplikasi, bukan di sini: tab ini hanya memori dari percakapannya sendiri.',
  'tut.app-generica.1.texto':
    'Header menampilkan ruangan dan aplikasi yang terbuka. Kalau ruangannya punya beberapa aplikasi, panah ‹ kembali ke layar pemilihan.',
  'tut.app-generica.2.titulo': 'Misi',
  'tut.app-generica.2.texto':
    'Tombol Misi membuka agenda hari ini di aplikasi ini: target harianmu, yang sudah dijadwalkan, dan apa pun yang diminta target-targetmu. Setiap langkah tercoret sendiri begitu kamu mencatat, dan menuntaskan seluruh daftarlah yang memberi XP hari itu.',
  'tut.app-generica.3.titulo': 'Blok-bloknya',
  'tut.app-generica.3.texto':
    'Templat ini disusun dari blok (catatan, daftar, penghitung, kebiasaan…). Kamu bisa menggantinya di Menu › Templat › edit.',
  'tut.app-generica.4.titulo': 'Keluar',
  'tut.app-generica.4.texto':
    '“Kembali ke rumah” menutup aplikasinya dan mengembalikanmu ke 3D. Apa pun yang kamu catat di sini sudah tersimpan.',
  'tut.enlaces.1.titulo': 'Dari target ke aplikasinya',
  'tut.enlaces.1.texto':
    'Setiap target atau langkah rencana bisa membawa chip dengan ikon sebuah aplikasi: itulah jawaban untuk “lalu ini dicatat di mana?”.',
  'tut.enlaces.2.titulo': 'Memasang atau menggantinya',
  'tut.enlaces.2.texto':
    'Hubungkan aplikasi membuka pemilihnya: kamu pilih aplikasinya dulu, lalu bagian mana di dalamnya (kalau punya beberapa bagian tempat mencatat).',
  'tut.enlaces.3.titulo': 'Chip yang sudah terpasang',
  'tut.enlaces.3.texto':
    'Kalau chip-nya sudah terpasang, menyentuhnya membuka aplikasi itu langsung di bagian tersebut. Menghapusnya tidak menghapus target maupun tanggalnya: hanya melepas tautannya.',
  'tut.enlaces.4.texto':
    'Hanya aplikasi yang ditugaskan ke sebuah objek di suatu ruangan yang muncul sebagai tujuan: menautkan ke aplikasi tanpa ruangan berarti chip yang tidak membawamu ke mana-mana.',
  'tut.musica.1.texto': 'Tombol ini membuka kontrol musik rumah.',
  'tut.musica.2.titulo': 'Nyalakan atau matikan',
  'tut.musica.2.texto':
    'Satu sakelar untuk seluruh musik ambien di rumah. Saat mati, rumah jadi sunyi kecuali suara dari aksi-aksi tertentu.',
  'tut.musica.3.titulo': 'Tema per ruangan',
  'tut.musica.3.texto':
    'Setiap ruangan bisa terdengar berbeda: otomatis mengikuti aplikasinya, satu tema yang kamu pilih sendiri, atau sunyi total di ruangan itu tanpa mengubah sisa rumah.',
  'tut.musica.4.titulo': 'Dari mana suaranya berasal',
  'tut.musica.4.texto':
    'Dihasilkan (menggubah sendiri sesuai suasana), Trek saya (yang kamu unggah) atau Sistem (yang sedang kamu putar di luar aplikasi, tanpa tertimpa).',
  'tut.musica.5.titulo': 'Volume terpisah',
  'tut.musica.5.texto':
    'Musik dan suara aksi (langkah kaki, klik, pencapaian) diatur terpisah — kamu bisa mengecilkan musiknya dan membiarkan efeknya, atau sebaliknya.',
  'tut.musica.6.texto':
    'Tombol HUD bisa dihilangkan dari layar utama; musiknya tetap bisa diatur di Editor › Pengaturan › Musik.',
  'tut.cuenta-ia.1.texto':
    'Di sinilah AI rumah dinyalakan: tanpa ini, obrolan tetap jalan lewat kata kunci, dan fitur seperti membuat resep, rencana, atau gambar tetap mati.',
  'tut.cuenta-ia.2.titulo': 'Dengan atau tanpa akun',
  'tut.cuenta-ia.2.texto':
    'Kamu bisa memakai AI dengan kunci penyedia milikmu sendiri (tanpa akun, tanpa kredit) atau dengan akun yang membawa kredit dan menyinkronkan antarperangkat.',
  'tut.cuenta-ia.3.titulo': 'Harga AI',
  'tut.cuenta-ia.3.texto':
    'Tabel ini tetap informatif meski kamu tidak punya akun: persis yang kamu butuhkan untuk memutuskan apakah sepadan. Ditampilkan per ruangan, operasi demi operasi.',
  'tut.cuenta-ia.4.titulo': 'Satu-satunya pengubah',
  'tut.cuenta-ia.4.texto':
    'Kualitas gambar adalah satu-satunya hal yang mengubah harga di seluruh tabel: Cepat itu bagus dan murah (yang dipakai secara bawaan); Terbaik memberi lebih banyak detail dan teks yang lebih rapi di dalam gambar.',
  'tut.cuenta-ia.5.titulo': 'Satu satuan, banyak operasi',
  'tut.cuenta-ia.5.texto':
    'Satu jawaban berharga 1 kredit, rencana panjang 4, gambar atau model 3D 10 — aturannya sama untuk semua ruangan, tabel ini hanya membentangkannya satu per satu.',
  'tut.ejemplos.1.texto':
    'Bilah ini muncul di hampir semua aplikasi selama belum ada datamu di dalamnya: satu tombol untuk melihatnya penuh contoh, alih-alih memulai dari layar kosong.',
  'tut.ejemplos.2.texto':
    'Melihat contoh tidak menghapus atau mencampur apa pun milikmu: itu baris tersendiri, ditandai sebagai contoh, yang disembunyikan (bukan dihapus) saat kamu mematikannya. Menyalakannya lagi mengembalikannya persis seperti semula.',
  'tut.ejemplos.3.texto':
    'Di dalam rumah demo bilah ini tidak muncul: satu tahun penuh milik Pep sudah mengisi peran itu, jadi tidak perlu contoh terpisah.',
  'tut.hoy.1.texto':
    'Misi tidak tinggal di tempat terpisah: misi tinggal DI DALAM setiap aplikasi. Di bagian atas tiap ruangan ada tombol Misi, berisi daftar yang diminta aplikasi itu HARI INI.',
  'tut.hoy.2.titulo': 'Tiga sumber, satu daftar',
  'tut.hoy.2.texto':
    'Misi milik aplikasi itu sendiri — air, kalori — dan yang kamu jadwalkan untuk hari ini di kalender: semuanya dalam satu daftar, dikelompokkan menurut blok asal tiap langkah.',
  'tut.hoy.3.titulo': 'Tercoret karena datanya ada',
  'tut.hoy.3.texto':
    'Tombol di baris itu mencatat data ASLI di aplikasinya — segelas air, satu kali makan — dan langkahnya tercoret semata karena catatan itu sudah ada di sana, bukan karena ada yang menandainya. Menekannya lagi setelah langkahnya selesai tidak menggandakan apa pun: tombolnya menghilang.',
  'tut.hoy.4.titulo': 'Angkamu setiap hari',
  'tut.hoy.4.texto':
    'Langkah dengan angka yang bisa diatur mengubahnya di sini juga. Menyetelnya ke 0 mematikan target hari itu tanpa menghapus riwayat hari-hari sebelumnya.',
  'tut.hoy.5.titulo': 'Dari target jadi rutinitas',
  'tut.hoy.5.texto':
    'Kalender menjadwalkan target yang sama dengan jam tetap: yang terbuka adalah editor yang sama dengan rutinitas di jam, jadi semuanya tercatat di dua tempat sekaligus.',
  'tut.hoy.6.titulo': 'Yang selesai tidak hilang',
  'tut.hoy.6.texto':
    'Ia turun ke “Selesai”, dalam keadaan terlipat: melihat catatanmu berdampak adalah bagian dari hadiahnya, dan dari sana kamu bisa membatalkannya kalau ada satu yang terlanjur masuk.',
  'tut.hoy.6b.titulo': 'Seluruh daftarlah yang menghasilkan poin',
  'tut.hoy.6b.texto':
    'Menuntaskan semua misi hari itu menyalakan perayaan dan menambah XP aplikasinya: level naik lewat daftar yang dituntaskan, bukan lewat catatan yang tercecer.',
  'tut.hoy.7.texto':
    'Dan kalau ada yang kurang, «Tambah misi» menawarkan apa yang biasanya disarankan aplikasi ini, dan «Checklist baru» membuat milikmu sendiri: daftar yang berulang tiap hari.',
  'tut.hoy.8.titulo': 'Bola merah',
  'tut.hoy.8.texto':
    'Lihat rumahnya: bola yang melayang di atas perabot tiap ruangan berubah merah kalau di sana masih ada yang harus dikerjakan hari ini, dan hijau kalau tidak ada lagi. Jumlah persisnya ada di gelembung merah kartunya — layar awal, menu, dan gelembung masuk — dan berubah kuning kecokelatan kalau ada yang sudah lewat jamnya.',
  'tut.hoy.9.titulo': 'Dan semuanya sekaligus, di kalender',
  'tut.hoy.9.texto':
    'Ini tombol Misi di jam, dengan gelembungnya sendiri: mengumpulkan apa saja yang harus dikerjakan hari ini di SELURUH rumah, satu kartu per aplikasi — di kiri yang belum, di kanan yang sudah. Di sini tidak ada pencatatan: tiap baris membawamu ke aplikasinya, dan di sanalah datanya ditulis.',
  'tut.progreso.1.texto':
    'Kartu karaktermu: Pep punya satu tahun penuh aktivitas nyata di belakangnya, jadi setiap angka di sini punya cerita nyata yang menjelaskannya.',
  'tut.progreso.2.titulo': 'Karakternya',
  'tut.progreso.2.texto':
    'Menyentuhnya membuka editor karakter. Suasana hatinya —bahagia, senang, sedih, atau tertidur— naik setiap ada catatan baru dan hanya turun kalau berhari-hari tidak ada satu pun; tidak pernah disetel ulang sekaligus.',
  'tut.progreso.3.titulo': 'Pangkat Sisifus',
  'tut.progreso.3.texto':
    'Dua belas pangkat pendakian: setiap hari dengan aktivitas menaikkanmu satu anak tangga dari 365. Pep sudah mengumpulkan beberapa pangkat; sentuh untuk melihat gunungnya secara utuh.',
  'tut.progreso.4.titulo': 'Anak tangga dan hari tenggang',
  'tut.progreso.4.texto':
    'Setiap 7 anak tangga datang satu lencana, setiap rentang beberapa minggu menaikkan pangkat. Bolong satu hari tidak merusak apa pun: ada 2 hari tenggang tiap bulan sebelum kamu mundur ke awal pangkat yang sekarang.',
  'tut.progreso.5.titulo': '52 lencana per keluarga',
  'tut.progreso.5.texto':
    'Dikelompokkan menurut keluarga geologisnya, tetap jadi misteri sampai kamu memperolehnya: tidak ada nama maupun keterangan yang terlihat sebelum terbuka.',
  'tut.progreso.6.titulo': 'Rangkumanmu',
  'tut.progreso.6.texto':
    'Wrapped menyusun rangkuman minggu, bulan, atau tahunmu dalam bentuk slide — ia punya tutorialnya sendiri, dengan data berlimpah pada tahun seperti milik Pep.',
  'tut.progreso.7.titulo': 'Radar per ruangan',
  'tut.progreso.7.texto':
    'Setiap sudutnya adalah satu ruangan di rumah, dan ukurannya adalah jumlah XP dari aplikasi yang ditugaskan ke sana. Ruangan yang kosong dari aktivitas langsung kelihatan: sudutnya melesak ke tengah.',
  'tut.wrapped.1.texto':
    'Gaya stories: sentuh sisi kanan untuk maju, sisi kiri untuk mundur, dan tahan untuk menjeda di satu slide.',
  'tut.wrapped.2.titulo': 'Minggu, bulan, atau tahun',
  'tut.wrapped.2.texto':
    'Setiap jenis menyusun slide-nya sendiri dengan datanya sendiri — rangkuman tahunan Pep yang paling panjang, lengkap dengan momen tertinggi dan terendah sepanjang tahun.',
  'tut.wrapped.3.titulo': 'Berpindah antarperiode',
  'tut.wrapped.3.texto':
    'Panah ‹ › menyusuri periode yang sudah tertutup: kamu tidak bisa maju melewati hari ini, jadi perbandingannya selalu dengan sesuatu yang nyata.',
  'tut.wrapped.4.titulo': 'Membagikan satu slide',
  'tut.wrapped.4.texto':
    'Menyalin teks dari slide yang sedang kamu lihat, siap ditempel ke mana pun kamu mau — tanpa perlu tangkapan layar.',
  'tut.wrapped.5.texto':
    'Sebuah titik di samping tombol yang membukanya memberi tahu kalau ada rangkuman baru yang belum kamu lihat; membukanya memadamkan titik itu.',
  'tut.infra-huerto--ciclo.8.texto':
    'Ini tempat perlindungan Pep: di satu sisi kandang-kandangnya dan di sisi lain kebun sayur yang memberi mereka makan. Ayo ke petak-petaknya.',
  'tut.infra-huerto--ciclo.1.texto':
    'Ini kebun sayur di suaka milik Pep: petak-petak nyata dengan kerja setahun di atasnya. Tidak ada satu pun yang cuma contoh — semuanya hidup, tumbuh secara real-time, dan bisa kamu sentuh.',
  'tut.infra-huerto--ciclo.2.texto':
    'Makanan dan Peternakan berbagi satu editor: apa yang dipanen di sini mengisi lumbung hewan-hewan di sebelah. Semuanya satu rantai.',
  'tut.infra-huerto--ciclo.3.titulo': 'Penyiraman yang menentukan',
  'tut.infra-huerto--ciclo.3.texto':
    'Lihat petak-petaknya: ada benih yang baru ditanam, tanaman setengah tumbuh, bunga matahari yang siap… dan wortel layu yang sengaja dibiarkan Pep tanpa air. Tetes biru menandakan haus; yang sudah layu tidak bisa diselamatkan lagi.',
  'tut.infra-huerto--ciclo.4.titulo': 'Penyiraman otomatis',
  'tut.infra-huerto--ciclo.4.texto':
    'Tomat itu punya sprinkler: menyiram selnya sendiri dan delapan sel tetangganya selamanya. Begitulah caranya meninggalkan kebun sayur tanpa ada yang layu.',
  'tut.infra-huerto--ciclo.5.titulo': 'Panen',
  'tut.infra-huerto--ciclo.5.texto':
    'Bunga mataharinya siap: satu sentuhan, langsung masuk keranjang. Kamu juga bisa memanen dengan berjalan di atas yang sudah siap, tanpa membuka editor ini.',
  'tut.infra-huerto--ciclo.6.titulo': 'Setahun dalam keranjang',
  'tut.infra-huerto--ciclo.6.texto':
    'Tiap petak menghitung panennya sendiri dan keranjang mengumpulkan panen setahun penuh — lebih dari 400 buah. Dari sinilah hewan-hewan suaka makan.',
  'tut.infra-huerto--ciclo.7.texto':
    'Semuanya tetap berjalan setelah kamu keluar. Di demo kamu benar-benar bisa menyiram, memanen, dan menanam: coba dulu sebelum pergi.',
  'tut.infra-huerto--parcelas.1.titulo': 'Tanah dulu',
  'tut.infra-huerto--parcelas.1.texto':
    'Dengan Petak kamu menyentuh satu sel peta dan tanahnya langsung siap. Di suaka ada dua petak kosong yang menunggumu.',
  'tut.infra-huerto--parcelas.2.titulo': 'Pilih mau tanam apa',
  'tut.infra-huerto--parcelas.2.texto':
    'Enam spesies, dan di bawah masing-masing tertulis berapa lama tumbuhnya dan seberapa sering minta air: wortel 3 menit, labu 2 jam.',
  'tut.infra-huerto--parcelas.3.titulo': 'Yang paling cepat',
  'tut.infra-huerto--parcelas.3.texto':
    'Untuk melihat siklus lengkapnya hari ini, tanam wortel di petak yang kosong: dia sudah siap sebelum kamu selesai jalan-jalan.',
  'tut.infra-huerto--parcelas.4.titulo': 'Urungkan',
  'tut.infra-huerto--parcelas.4.texto':
    'Hapus bekerja selapis demi selapis di sel yang sama: tanamannya dulu, lalu sprinklernya, terakhir petaknya.',
  'tut.infra-huerto--parcelas.5.texto':
    'Itu saja seluruh ilmunya: tanah, spesies, dan kesabaran. Apa pun yang kamu tanam di demo benar-benar tumbuh selagi kamu menjelajah.',
  'tut.infra-granja--cuidar.8.texto':
    'Ini suaka milik Pep: kandang para hewan yang diselamatkan dan, di sebelah selatan, kebun sayur tempat mereka makan. Ayo turun menemui mereka.',
  'tut.infra-granja--cuidar.1.texto':
    'Ini para hewan yang diselamatkan di suaka Pep: masing-masing punya nama, rasa lapar, dan suasana hati yang berjalan secara real-time. Tidak ada yang cuma contoh — kamu benar-benar bisa merawat mereka.',
  'tut.infra-granja--cuidar.2.titulo': 'Lumbung setahun',
  'tut.infra-granja--cuidar.2.texto':
    '“Beri makan” mengambil dari keranjang, dan keranjang terisi dengan memanen kebun sayur di sebelah. Pep meninggalkan stok setahun: pakai saja.',
  'tut.infra-granja--cuidar.3.titulo': 'Beri makan',
  'tut.infra-granja--cuidar.3.texto':
    'Satu sentuhan di kandang memberi makan semua yang lapar, mulai dari yang paling lapar. Ayam minta tiap 4 jam; sapi tahan 12 jam.',
  'tut.infra-granja--cuidar.4.titulo': 'Elus',
  'tut.infra-granja--cuidar.4.texto':
    'Enam jam tanpa belaian dan mereka bosan (dua kali lebih cepat kalau kandangnya kotor). Satu sentuhan mengelus seluruh kandang.',
  'tut.infra-granja--cuidar.5.titulo': 'Kandang yang kotor',
  'tut.infra-granja--cuidar.5.texto':
    'Kandang kecil sudah delapan hari tidak dibersihkan — kelihatan dari jeraminya. Sentuh dengan Bersihkan dan jadikan seperti baru: di demo boleh.',
  'tut.infra-granja--cuidar.6.titulo': 'Si pendatang baru',
  'tut.infra-granja--cuidar.6.texto':
    'Babi itu tiba di suaka pagi ini dalam keadaan sakit. Hewan yang sakit berhenti makan dan hanya Sembuhkan yang bisa memulihkannya — dia punya waktu seminggu sebelum terlambat. Sembuhkan dia sendiri.',
  'tut.infra-granja--cuidar.7.texto':
    'Untuk keseharian kamu tidak perlu membuka ini: saat kamu lewat di dekat kandang, gelembungnya muncul dengan Beri makan dan Elus, dan kamu juga bisa memintanya lewat chat.',
  'tut.infra-granja--corrales.1.titulo': 'Kandang',
  'tut.infra-granja--corrales.1.texto':
    'Sentuh sel kosong dan lahir kandang 1×1; sentuh sel di sebelahnya dan kandangnya memanjang. Tiga hewan muat per sel: lihat dua kandang di suaka, satu besar untuk hewan gembalaan dan satu kecil untuk unggas.',
  'tut.infra-granja--corrales.2.titulo': 'Spesiesnya',
  'tut.infra-granja--corrales.2.texto':
    'Enam spesies, masing-masing punya jendela laparnya sendiri. Sentuh di dalam kandang yang masih ada tempat, dan hewannya muncul lengkap dengan nama.',
  'tut.infra-granja--corrales.3.titulo': 'Mainan',
  'tut.infra-granja--corrales.3.texto':
    'Genangan lumpur, bak mandi, dan bola, satu per sel: hewan-hewan datang sendiri dan bermain menaikkan suasana hati mereka. Di suaka ketiganya sudah tersebar.',
  'tut.infra-granja--corrales.4.titulo': 'Nama',
  'tut.infra-granja--corrales.4.texto':
    'Dengan Beri nama kamu menyentuh sebuah kandang dan melihat daftarnya beserta kapasitas yang terpakai; sentuh seekor hewan untuk mengganti namanya.',
  'tut.infra-granja--corrales.5.texto':
    'Itu saja seluruh ilmunya: kandang, kapasitas, mainan, dan kasih sayang. Di demo kamu bahkan bisa memperluas suakanya kalau mau.',
  'tut.infra-caminos--carrera.1.texto':
    'Ini lintasan milik Pep: oval aspal dengan garis finis kotak-kotak. Ini satu-satunya garis finis di peta — seluruh mode balapan berputar di sekitarnya.',
  'tut.infra-caminos--carrera.2.texto':
    'Itu garis finisnya. Dekati sepeda atau mobil di halaman dan naiki lewat tombolnya; sambil menunggang kendaraan, lewati garis ini dan lampu start pun muncul.',
  'tut.infra-caminos--carrera.3.texto':
    'Rapatkan ke ovalnya dan drift di tikungan supaya kecepatanmu tidak hilang. Kamu juga bisa balapan melawan asisten, lengkap dengan item: pisang, turbo, dan bom.',
  'tut.infra-caminos--carrera.4.texto':
    'Di samping garis finis ada tabel waktu terbaik: sepeda Pep mengumpulkan 38 kemenangan dan putaran terbaik 41,8 detik. Kalahkan — rekor yang kamu buat di demo ikut tersimpan.',
  'tut.infra-caminos--carrera.5.texto':
    'Rel yang mengelilingi peta dan roller coaster di pasar malam juga termasuk jalur: berjalanlah di atas relnya dan “Naik” pun muncul. Tiap jalur adalah jaringan tersendiri.',
  'tut.infra-caminos--trazos.1.texto':
    'Ada tiga jenis jalur, dan dari sini ketiganya kelihatan: trek balap (untuk balapan), rel kereta (kereta yang mengelilingi peta), dan roller coaster (dengan ketinggian per sel). Ketiganya tidak pernah tercampur meski bersentuhan: masing-masing hanya mencari tetangga sejenisnya.',
  'tut.infra-caminos--trazos.2.texto':
    'Roller coaster di pasar malam naik sampai enam level dan tanjakan antarsel menyesuaikan diri sendiri. Naiklah: gerbongnya menyusuri sirkuit tertutup itu.',
  'tut.infra-caminos--trazos.3.texto':
    'Di rumahmu sendiri kamu menggambarnya sel demi sel dengan editor Sirkuit, atau bebas dengan trek bebas per sektor. Di demo ini petanya sudah tergambar.',
  'tut.infra-canchas--jugar.1.texto':
    'Ini kompleks olahraga milik Pep: sepak bola, basket, tenis, dan bisbol, berjajar. Tiap lapangan adalah persegi panjang di peta — masuk ke dalamnya sambil berjalan langsung memulai permainannya.',
  'tut.infra-canchas--jugar.2.texto':
    'Tombol isi tenaga muncul di celah kubus navigasi dan melempar ke arah hadap karaktermu: bidik dulu, isi tenaga kemudian.',
  'tut.infra-canchas--jugar.3.texto':
    'Di bawah, lapangan bisbol dan lapangan tenis: tenis punya pantulan dan reli, sedangkan bisbol murni memukul, melawan mesin atau pelempar.',
  'tut.infra-canchas--jugar.5.texto':
    'Di atas, lapangan sepak bola dan lapangan basket. Sepak bola dimainkan dengan menggiring dan menembak; basket, dengan mengatur tenaga tembakan.',
  'tut.infra-canchas--jugar.4.texto':
    'Papan skor disimpan per lapangan: Pep meninggalkan 21-15 di basket dan runtunan 18 reli di tenis. Di demo pertandingan ikut dihitung — lampaui saja.',
  'tut.infra-paintball--batalla.1.texto':
    'Buka roda alat: Paintball ada di sana, di kategori bangunan dan permainan, bersebelahan dengan kendaraan.',
  'tut.infra-paintball--batalla.2.texto':
    'Pilih modenya: 1 vs 1, 2 vs 2, atau battle royale. Rivalmu adalah asisten-asisten di peta — Laika ikut hitung — dan mainnya di lantai dasar.',
  'tut.infra-paintball--batalla.3.texto':
    'Seluruh rumah adalah arenanya: berlindung di balik tembok, muncul sebentar untuk menembak, dan jaga punggungmu. Cipratan catnya tetap menempel selama pertempuran.',
  'tut.infra-paintball--batalla.4.texto':
    'Papan skor Pep berdiri di 47 kemenangan lawan 23 kekalahan. Di demo pertempuran benar-benar dihitung: naikkan skornya sebelum kamu pergi.',
  'tut.app-anecdotario--diario.1.texto':
    'Ini buku kenangan Pep: satu tahun penuh, dua tiga entri seminggu. SELURUH alurnya diceritakan di sini: dari rasa jenuh di awal sampai maraton dua minggu lalu.',
  'tut.app-anecdotario--diario.2.titulo': 'Begini cara menulisnya',
  'tut.app-anecdotario--diario.2.texto':
    'Pilih suasana hati hari itu, beri judul kalau mau, tulis dan lampirkan foto. Satu foto saja cukup: teksnya tidak wajib.',
  'tut.app-anecdotario--diario.3.titulo': 'Setahun dalam warna',
  'tut.app-anecdotario--diario.3.texto':
    'Setiap hari diwarnai sesuai suasana hatinya. Lihat masa turun di bulan ke-7 (cedera itu) dan betapa cerahnya Jepang terlihat. Sentuh satu hari untuk menyaring entrinya.',
  'tut.app-anecdotario--diario.4.titulo': 'Arsip',
  'tut.app-anecdotario--diario.4.texto':
    'Entri tersimpan sendiri ke dalam folder per tahun, bulan, dan minggu. Buka minggu-minggu Jepang dan baca seluruh perjalanannya.',
  'tut.app-anecdotario--fotos.1.texto':
    'Tonggak-tonggak tahun Pep punya foto: keyboard bekas itu, kedatangan Laika, dua kartu pos dari Jepang, dan medali maraton.',
  'tut.app-anecdotario--fotos.2.titulo': 'Cari di riwayat',
  'tut.app-anecdotario--fotos.2.texto':
    'Buka bulan ke-2 (keyboard-nya), bulan ke-9 (Jepang), atau dua minggu lalu (medalinya). Sentuh foto mana pun dan ia terbuka layar penuh.',
  'tut.app-anecdotario--fotos.3.texto':
    'Setiap entri memberi makan runtunanmu dan membangunkan karaktermu: menulis di sini juga merawat rumah.',
  'tut.app-jardin--practicar.1.titulo': 'Ketenangan terkumpul',
  'tut.app-jardin--practicar.1.texto':
    'Setiap menit latihan menyirami kebun ini. Kebun milik Pep tumbuh setahun penuh: dari benih jadi hutan.',
  'tut.app-jardin--practicar.2.titulo': 'Meditasi dengan suara',
  'tut.app-jardin--practicar.2.texto':
    'Pilih satu trek suara (hutan, laut, hujan, mangkuk) dan durasinya, atau bermeditasi dalam sunyi dengan lonceng. Sesi tersimpan sendiri begitu selesai.',
  'tut.app-jardin--practicar.3.titulo': 'Setahun penuh sesi',
  'tut.app-jardin--practicar.3.texto':
    'Ini setahun milik Pep: mulai dari tiga kali seminggu, lalu di bulan ke-7 —cedera itu, biaya mobil— latihannya jadi hampir tiap hari. Itulah yang menahannya saat masa turun.',
  'tut.app-jardin--practicar.4.titulo': 'Pernapasan',
  'tut.app-jardin--practicar.4.texto':
    'Dua pola berpandu: pernapasan kotak 4-4-4-4 untuk memusatkan diri dan 4-7-8 untuk melepaskan hari itu. Layarnya bernapas bersamamu.',
  'tut.app-jardin--gratitud.1.titulo': 'Hari ini aku bersyukur atas…',
  'tut.app-jardin--gratitud.1.texto':
    'Tiga baris sehari. Satu saja cukup; tiga, lebih baik. Tersimpan satu entri per hari dan bisa kamu perbaiki sambil jalan.',
  'tut.app-jardin--gratitud.2.titulo': 'Punya Pep',
  'tut.app-jardin--gratitud.2.texto':
    'Sembilan puluh hari rasa syukur yang nyata: keyboard itu, Laika tertidur di atas catatan, lutut yang membaik, pulang dari Jepang. Bacalah pelan-pelan.',
  'tut.app-jardin--gratitud.3.texto':
    'Ruangan ini tidak punya runtunan dan tidak menghukum hari yang terlewat: itu memang disengaja. Ketenangan bukan lomba.',
  'tut.app-hobbies--piano.1.titulo': 'Dua hobi, satu tahun',
  'tut.app-hobbies--piano.1.texto':
    'Pep mencatat dua: piano (proyek tahun itu, target 4 hari seminggu) dan astrofotografi. Tiap kartu menampilkan minggu berjalan dan runtunannya.',
  'tut.app-hobbies--piano.2.titulo': 'Di dalam piano',
  'tut.app-hobbies--piano.2.texto':
    'Runtunan, runtunan terbaik, total latihan, hari aktif, dan rata-rata. Setahun di atas tuts — lengkap dengan jeda jujur saat ke Jepang.',
  'tut.app-hobbies--piano.3.titulo': 'Peta panas',
  'tut.app-hobbies--piano.3.texto':
    'Setiap kotak kecil adalah satu hari. Terlihat awalnya di bulan ke-2, bagaimana piano MENAHAN masa turun bulan ke-7, dan lubang tiga minggu di Jepang.',
  'tut.app-hobbies--piano.4.titulo': 'Sesi',
  'tut.app-hobbies--piano.4.texto':
    'Tiap latihan dengan menitnya dan, banyak di antaranya, dengan catatan: dari “tanganku sakit” sampai memainkan “Clair de Lune” utuh.',
  'tut.app-hobbies--piano.5.titulo': 'Proyek',
  'tut.app-hobbies--piano.5.texto':
    'Latihan yang punya arah: lagu pertama (selesai di bulan ke-5) dan “Clair de Lune”, dimainkan untuk keluarga seminggu lalu.',
  'tut.app-hobbies--proyectos.1.titulo': 'Proyek-proyek piano',
  'tut.app-hobbies--proyectos.1.texto':
    'Sebuah proyek mengumpulkan sesi yang kamu curahkan padanya: di sini terlihat berapa sesi dan berapa menit yang terkumpul di masing-masing.',
  'tut.app-hobbies--proyectos.2.titulo': 'Progres dalam foto',
  'tut.app-hobbies--proyectos.2.texto':
    '“Clair de Lune” menyimpan partitur beserta catatannya. Di astrofotografi, proyek dua belas bulan purnama mengumpulkan bidikan terbaik sepanjang tahun.',
  'tut.app-hobbies--proyectos.3.texto':
    'Kamu juga bisa mencatat sesi lewat obrolan (“latihan piano 30 menit”) dan merencanakan target proyek dengan perencananya.',
  'tut.app-hobbies--gestion.1.titulo': 'Menambah hobi',
  'tut.app-hobbies--gestion.1.texto':
    'Nama, emoji, warna, dan —opsional— target mingguan dalam hitungan hari. Formulir itu saja sudah cukup untuk mulai melacaknya.',
  'tut.app-hobbies--gestion.2.titulo': 'Target mingguan',
  'tut.app-hobbies--gestion.2.texto':
    'Piano dipasangi 4 hari seminggu: baris minggu itu ikut terisi setiap hari kamu latihan, dan di atasnya tertulis sudah berapa hari dibanding targetnya.',
  'tut.app-hobbies--gestion.3.titulo': 'Catat latihan',
  'tut.app-hobbies--gestion.3.texto':
    'Menit cepat dengan sekali sentuh, atau angka persisnya; proyeknya opsional dan catatannya untuk apa pun yang mau kamu ingat dari sesi itu.',
  'tut.app-hobbies--gestion.4.texto':
    'Target hobi dan proyekmu ada di ruangan Target, masing-masing dengan rencananya dan linimasanya. Minta AI buatkan rencana dengan tahap dan tanggal.',
  'tut.app-ideas--diario.1.titulo': 'Kotak masuk',
  'tut.app-ideas--diario.1.texto':
    'Tulis apa yang terlintas, selesai. Pep melepas ~90 ide di sini sepanjang tahun: soal fisika, soal kafe, soal latihan. Bintangnya menandai yang paling kamu suka.',
  'tut.app-ideas--diario.2.titulo': 'Brainstorming per tema',
  'tut.app-ideas--diario.2.texto':
    'Brainstorming mengumpulkan semuanya di bawah satu tema. Cari punya Pep: nama-nama untuk kucingnya (Laika yang menang), cara membiayai Jepang, dan apa yang dibawa ke perjalanan.',
  'tut.app-ideas--diario.3.texto':
    'Begitu sebuah brainstorming matang, satu tombol mengubahnya jadi peta pikiran dan kamu lanjut merapikannya di kanvas.',
  'tut.app-ideas--mapas.1.titulo': 'Sepuluh format',
  'tut.app-ideas--mapas.1.texto':
    'Setiap format menggambar dengan caranya sendiri. Di bawah ada peta-peta yang Pep buat sepanjang tahun: rutinitas paginya sebagai diagram alur, termodinamika sebagai pohon, fisika dan musik sebagai diagram Venn.',
  'tut.app-ideas--mapas.2.titulo': '“Hidup idealku”',
  'tut.app-ideas--mapas.2.texto':
    'Peta PERTAMA tahun itu, dari bulan ke-1: hidup yang Pep inginkan. Lihat pelan-pelan — hampir semua yang ada di sini akhirnya benar-benar terjadi.',
  'tut.app-ideas--mapas.3.texto':
    'Di kanvas: ketuk sebuah node untuk memilihnya dan ketuk lagi untuk menulis; seret, cubit untuk zoom, dan tambahkan ide lewat bilah di bawah.',
  'tut.app-ideas--mapas.4.titulo': 'Satu peta utuh, dari satu topik',
  'tut.app-ideas--mapas.4.texto':
    'Beri AI sebuah topik dan dia menyusun peta lengkapnya, dengan node-node yang sudah tertata: titik awal untuk topik yang kamu sendiri bingung mau mulai merapikannya dari mana.',
  'tut.app-ideas--mapas.5.titulo': 'Memperluas node dengan AI',
  'tut.app-ideas--mapas.5.texto':
    'Begitu kamu ada di dalam sebuah peta, node mana pun bisa diperluas: AI mengusulkan sub-node berdasarkan apa yang sudah kamu tulis di sekitarnya, tanpa merusak strukturmu.',
  'tut.app-ideas--decidir.1.titulo': 'Delapan cara memutuskan',
  'tut.app-ideas--decidir.1.texto':
    'Pep benar-benar memakainya: satu Eisenhower di minggu ujian tengah semester, satu SWOT di pertengahan tahun, dan satu matriks untuk memilih kamera.',
  'tut.app-ideas--decidir.2.titulo': 'Lanjut S2 atau kerja?',
  'tut.app-ideas--decidir.2.texto':
    'Inilah keputusan yang masih menggantung di penghujung tahun: tiap sisi dengan bobotnya dari 1 sampai 5 dan totalnya di bawah. Belum juga diputuskan — beginilah rupanya berpikir dengan serius.',
  'tut.app-ideas--decidir.3.texto':
    'Di format berbasis zona, setiap item tinggal di satu zona: pilih zonanya di bawah sebelum menambahkan, atau seret itemnya ke zona lain dan ia berpindah sendiri.',
  'tut.app-ideas--decidir.4.titulo': 'Matriks keputusan berbobot',
  'tut.app-ideas--decidir.4.texto':
    'Ini bukan kanvas, ini tabel: setiap pilihan diadu dengan setiap kriteria, dengan bobot 1 sampai 5 sesuai seberapa penting kriteria itu bagimu. Totalnya mengurutkan pilihan-pilihannya sendiri.',
  'tut.calendario.1.titulo': 'Jam',
  'tut.calendario.1.texto':
    'Kalender bukan sebuah ruangan: ia tinggal di jam rumah, jadi bisa dibuka dari mana pun kamu berada.',
  'tut.calendario.2.titulo': 'Satu minggu nyata',
  'tut.calendario.2.texto':
    'Shift di kafe, kelas fisika, lari saat subuh, piano di malam hari. Setiap blok adalah satu rutinitas dengan jam dan warnanya; seret untuk memindahkannya, tarik ujungnya untuk mengubah durasinya.',
  'tut.calendario.3.titulo': 'Empat cara melihat',
  'tut.calendario.3.texto':
    'Hari dan Minggu menampilkan kisi per jam; Bulan dan Tahun memberi gambaran setahun penuh. Tombol pertamanya punya dua fungsi: ia bertuliskan “Hari ini” dan membawamu ke saat ini, atau “Hari” kalau kamu sedang melihat tanggal lain.',
  'tut.calendario.4.titulo': 'Dari mana asal setiap blok',
  'tut.calendario.4.texto':
    'Aplikasi menjadwalkan sendiri: janji temu dari Agenda, tidur dari Istirahat, waktu belajar dari Perpustakaan. Dengan Filter kamu menyisakan satu aplikasi saja di layar.',
  'tut.calendario.5.titulo': 'Menyusuri tahun',
  'tut.calendario.5.texto':
    'Panah ‹ › menggeser periodenya dan Hari ini mengembalikanmu ke sekarang. Sepanjang tahun Pep ada di sini, minggu demi minggu. Dengan + Baru kamu membuat acara, atau kamu menggambarnya langsung di atas kisi.',
  'tut.calendario.6.titulo': 'Kebiasaan demi kebiasaan',
  'tut.calendario.6.texto':
    'Setiap baris adalah satu rutinitas dan setiap kolom satu hari: hijau kalau terpenuhi. Kamu mencentangnya langsung dari sini, dan persentase di atas merangkum periode yang sedang kamu lihat.',
  'tut.calendario.7.titulo': 'Alur satu tahun',
  'tut.calendario.7.texto':
    'Di tampilan Tahun grafiknya menceritakan kisah lengkapnya: Pep memulai dengan memenuhi sepertiga dari yang dia niatkan dan menutup tahun di atas 85%. Konsistensi itu dibangun, bukan datang sendiri.',
  'tut.calendario.8.titulo': 'Masa turun juga dihitung',
  'tut.calendario.8.texto':
    'Kedua lubang itu nyata: cedera lutut di bulan ke-7 dan tiga minggu di Jepang. Bolong tidak menghapus kemajuanmu — panel ini menampilkan tahun itu apa adanya, bukan seharusnya. Dan satu rutinitas baru dihitung sejak hari kamu membuatnya.',
  'tut.metas.0.titulo': 'Ruangan untuk menetapkan target',
  'tut.metas.0.texto':
    'Target tidak menyimpan datanya sendiri: di sinilah kamu menetapkan target dan melihat semua yang sudah kamu tetapkan, dari ruangan mana pun asalnya. Target lahir di aplikasi lain — lari di Gym, kuliah di Perpustakaan, menabung di Ruang Kerja — dan di sini semuanya berkumpul, dikelompokkan menurut aplikasi yang memegangnya.',
  'tut.metas.1.titulo': 'Target lebih dulu',
  'tut.metas.1.texto':
    'Ruangan ini terbuka di Target, dikelompokkan menurut aplikasi yang memegangnya: lari di Gym, kuliah fisika di Perpustakaan. “Rumah” bukan aplikasi mana pun — kategori itu dibuat sendiri oleh Pep untuk renovasi dapurnya.',
  'tut.metas.2.titulo': 'Dari target ke rencananya',
  'tut.metas.2.texto':
    'Setiap baris terbaca seperti papan: nomornya di dalam folder, tenggatnya, kemajuannya, dan statusnya — Belum dikerjakan, Sedang berjalan, atau Selesai, tergantung seberapa banyak yang sudah tercentang. Satu klik membuka targetnya: rencananya kalau ada (tanda ✨ yang memberitahu) dan, kalau tidak, lembarnya berisi sub-target, tanggal, dan langkah-langkahnya.',
  'tut.metas.3.titulo': 'Tiga rencana, tiga status',
  'tut.metas.3.texto':
    'Dapur dan maraton berikutnya masih berupa usulan; pendaftaran pascasarjana sudah masuk Linimasa. Rencana maraton diminta tanpa tenggat: AI menghitung bahwa itu butuh 24 minggu, dan mengatakannya di ringkasannya.',
  'tut.metas.4.titulo': 'Lembar rencananya',
  'tut.metas.4.texto':
    'Tanda ✨ di sebuah baris menandakan target itu sudah punya rencana, dan mengekliknya membuka lembar ini: tahap-tahap beserta sub-targetnya, masing-masing dengan periodenya sendiri. Selama masih usulan, semuanya bisa diedit: ganti nama, geser tanggal, tambah atau buang simpul tanpa mengacaukan yang lain.',
  'tut.metas.5.titulo': 'Mencentang tanpa terikat',
  'tut.metas.5.texto':
    'Centang sebuah usulan tinggal di lembarnya, bukan di targetmu: kamu bisa menandai yang sudah selesai tanpa menyentuh linimasamu. Batangnya terisi sendiri ke atas — perencanaan dapur sudah ditutup.',
  'tut.metas.6.titulo': 'Pindahkan ke linimasa nyata',
  'tut.metas.6.texto':
    'Tombol ini mengubah setiap tahap dan setiap sub-target menjadi target sungguhan, dengan tanggalnya sudah terpasang dan menggantung pada target aslinya. Apa yang sudah dimiliki target itu tetap dipertahankan.',
  'tut.metas.7.titulo': 'Diterima: satu kebenaran saja',
  'tut.metas.7.texto':
    'Rencana pascasarjana sudah dipindahkan. Sekarang centangnya adalah centang sub-target nyata dan batangnya adalah batang linimasamu: lembarnya berhenti menghitung sendiri.',
  'tut.metas.8.titulo': 'Dan itu dia, di sumbunya',
  'tut.metas.8.texto':
    'Linimasanya milik target INI: sub-targetnya menempati periodenya di sumbu waktu, dengan rencananya tertumpuk berwarna ungu di atasnya — yang diusulkan dan yang nyata, bersama-sama.',
  'tut.metas.9.titulo': 'Setiap target, sumbunya sendiri',
  'tut.metas.9.texto':
    'Sumbunya selalu milik satu target: di sini yang belum punya tanggal diberi tanggal, sub-target baru digantungkan, dan «Kembali» membawamu balik ke lembarnya. Menu Linimasa di atas menampilkan linimasa semua target sekaligus.',
  'tut.metas.10.titulo': 'Dan dari sini menyebar ke seluruh rumah',
  'tut.metas.10.texto':
    'Tidak ada yang terkunci di sini: target yang punya tanggal muncul di kalender jam seperti hal terjadwal lainnya, dan langkah-langkah hari ini muncul di Misi aplikasi yang memegangnya — juga di gelembung merah ruangan itu. Di sini merencanakan; menuntaskannya di aplikasi, dengan mencatat sungguhan.',
  'tut.app-biblioteca--enciclopedia.1.titulo': 'Setahun kuliah, dalam satu pohon',
  'tut.app-biblioteca--enciclopedia.1.texto':
    'Pep kuliah Fisika: mekanika di awal tahun, termodinamika menjelang ujian tengah semester di bulan ke-6, relativitas dan astrofisika di akhir. Setiap cabang terbuka untuk memperlihatkan entri-entrinya.',
  'tut.app-biblioteca--enciclopedia.2.titulo': 'Pohonnya tumbuh bersamamu',
  'tut.app-biblioteca--enciclopedia.2.texto':
    'Topik dari katalog sudah tersedia; yang menggantung lepas dibuka oleh sebuah obrolan. Sentuh sebuah entri untuk membaca ringkasannya, poin pentingnya, dan ilustrasinya.',
  'tut.app-biblioteca--enciclopedia.3.texto':
    'Sebuah entri kamu tulis manual atau kamu sarikan dari sebuah percakapan. Entri lubang hitam dan entri fisika piano punya gambar: aplikasinya bisa membuatkan ilustrasinya untukmu.',
  'tut.app-biblioteca--charlas.1.titulo': 'Pertanyaan sepanjang tahun',
  'tut.app-biblioteca--charlas.1.texto':
    'Inilah percakapan yang dilakukan Pep sambil belajar: entropi, dilatasi waktu, kenapa piano terdengar seperti piano. Semuanya tersimpan.',
  'tut.app-biblioteca--charlas.2.titulo': 'Dari obrolan ke pohon',
  'tut.app-biblioteca--charlas.3.texto':
    'Dengan begitu ensiklopediamu tidak terisi teori salinan, melainkan hal-hal yang benar-benar kamu tanyakan.',
  'tut.app-biblioteca--enciclopedia.4.titulo': 'Indeksnya milikmu',
  'tut.app-biblioteca--enciclopedia.4.texto':
    'Tanda + di tiap baris menulis entri persis di situ, dengan bidang dan topiknya sudah terpasang. Dan lewat tombol pensil kamu menumbuhkan pohonnya: tanda + yang sama menambahkan cabang, yang ada di Benih membuat bidang baru, dan kamu bisa mengganti nama, mengurutkan ulang, dan menghapus. Angka bercabang itu memberitahu berapa sub-indeks yang menggantung di bawahnya.',
  'tut.app-biblioteca--estudio.2.titulo': 'Rencana belajar',
  'tut.app-biblioteca--estudio.2.texto':
    'Tombol Misi di header memunculkan apa yang harus dikerjakan hari ini. Target belajar ada di ruangan Target, dikelompokkan menurut aplikasi: «selesaikan termodinamika sebelum ujian» sudah tercapai; persiapan pascasarjana masih berjalan.',
  'tut.app-biblioteca--estudio.3.texto':
    'Setiap target bisa kamu mintakan rencana: AI menanyakan tanggal targetmu dan jam luangmu, lalu menjadwalkan waktu belajarnya di kalendermu.',
  'tut.app-biblioteca--resumen.1.texto':
    'Berapa entri yang dimiliki ensiklopediamu dan berapa bidang serta topik indeks yang sudah kamu cakup. Topik yang dibuka oleh sebuah obrolan dihitung terpisah.',
  'tut.app-biblioteca--resumen.2.titulo': 'Empat angka',
  'tut.app-biblioteca--resumen.2.texto':
    'Obrolan dengan Sang Bijak, menit belajar total dan minggu ini, serta runtunan hari belajarmu berturut-turut.',
  'tut.app-biblioteca--resumen.3.titulo': 'Di mana timpangnya',
  'tut.app-biblioteca--resumen.3.texto':
    'Batang terpanjang adalah bidang yang paling menyita perhatianmu — bagi Pep, termodinamika di minggu ujian tengah semester.',
  'tut.app-biblioteca--resumen.4.titulo': 'Hari-hari belajar',
  'tut.app-biblioteca--resumen.4.texto':
    'Satu kotak untuk satu hari: kebut-kebutan sebelum ujian tengah semester dan lubang tiga minggu di Jepang langsung terlihat, tanpa perlu membuka seluruh riwayat.',
  'tut.app-biblioteca--resumen.5.titulo': 'Ke mana jam-jammu pergi',
  'tut.app-biblioteca--resumen.5.texto':
    'Sama seperti di atas tapi dalam menit: punya banyak entri di satu bidang itu satu hal, benar-benar meluangkan waktu untuknya itu hal lain.',
  'tut.app-biblioteca--resumen.6.titulo': 'Setahun penuh sesi',
  'tut.app-biblioteca--resumen.6.texto':
    'Dan kalau kamu mau rinciannya, riwayat menyimpan setiap sesi beserta menit dan bidangnya, terarsip per tahun, bulan, dan minggu.',
  'tut.app-idiomas--charlas.1.titulo': 'Tutor yang sesuai levelmu',
  'tut.app-idiomas--charlas.1.texto':
    'Tutormu adalah asisten ruangan ini: kamu berbicara padanya dalam bahasa yang kamu pelajari dan dia menjawab sesuai level CEFR profilmu — kalimat pendek dengan terjemahan di A1, idiom di C1. Kalau kamu menulis dalam bahasamu sendiri, dia menyemangatimu untuk mencoba dalam bahasa yang kamu pelajari.',
  'tut.app-idiomas--charlas.2.titulo': 'Tersimpan dan terkelompok sendiri',
  'tut.app-idiomas--charlas.2.texto':
    'Setiap obrolan tinggal di daftar ini dengan judulnya, topik silabusnya, dan levelnya, terisi tanpa kamu berbuat apa-apa. Obrolan juga bisa lahir dari sebuah topik —lewat tombol obrolan di barisnya— untuk melatih persis hal itu.',
  'tut.app-idiomas--charlas.3.texto':
    'Saat tutor mengoreksi, bentuk yang benar ditaruh di barisnya sendiri dengan tanda centang, dan percakapan berlanjut tanpa omelan. Saat keluar dia menawarkan mengekstrak kosakata yang muncul: kamu memilih kartu mana yang disimpan dan kartu-kartu itu mewarisi topik obrolannya.',
  'tut.app-idiomas--repaso.1.titulo': 'Yang jatuh tempo hari ini',
  'tut.app-idiomas--repaso.1.texto':
    'Pep sudah setahun menjalani ini dan masih punya tinjauan yang menunggu: sistemnya tidak meminta seluruh kosakatamu, hanya yang hampir kamu lupakan.',
  'tut.app-idiomas--repaso.3.titulo': 'Setahun konsisten',
  'tut.app-idiomas--repaso.3.texto':
    'Riwayatnya menyimpan berapa kartu yang kamu tinjau tiap hari dan berapa yang kamu jawab benar. Pep memulai dengan cukup banyak salah dan menutupnya dengan hampir semuanya benar — dan di Jepang dia meninjau lebih banyak dari kapan pun.',
  'tut.app-idiomas--vocabulario.2.titulo': 'Dua bahasa sekaligus',
  'tut.app-idiomas--vocabulario.2.texto':
    'Bahasanya diganti dari atas: selain bahasa utamanya, Pep menyusun bahasa Jepang bertahan hidup antara bulan ke-4 dan perjalanannya. Sepulang dari sana dia hampir meninggalkannya, dan itu terlihat di kotak-kotaknya.',
  'tut.app-idiomas--temario.1.titulo': 'Tiga bidang, enam level',
  'tut.app-idiomas--temario.1.texto':
    'Dari A1 sampai C2, setiap level dengan topik kosakatanya, poin pelafalannya, dan tata bahasanya. Kamu tahu apa yang masih kurang tanpa mencari kursus di luar.',
  'tut.app-idiomas--temario.2.titulo': 'Sampai di mana kamu',
  'tut.app-idiomas--temario.2.texto':
    'Kartu yang dikuasai, tinjauan bulan ini, dan levelmu sekarang. Pep memulai tahun di A2 dan sekarang ada di sekitar B1.',
  'tut.app-agenda--esencial.1.titulo': 'Agendamu',
  'tut.app-agenda--esencial.1.texto':
    'Agenda menyimpan yang bukan kebiasaan: tugas, janji temu, kontak. Ada tiga menu, dan semua yang punya tanggal langsung masuk sendiri ke kalender rumah.',
  'tut.app-agenda--esencial.2.titulo': 'Kerja',
  'tut.app-agenda--esencial.2.texto':
    'Kotak masuk mengumpulkan tugas tanpa tanggal supaya tidak hilang, dan papan memindahkan tugasmu antar kolom: perlu dikerjakan, sedang berlangsung, dan selesai.',
  'tut.app-agenda--esencial.3.titulo': 'Kesehatan',
  'tut.app-agenda--esencial.3.texto':
    'Janji dokter, obat, dan perawatan, dalam tiga submenu: Kamu, Orang tersayang (yang ada dalam perawatanmu), dan Hewan peliharaan.',
  'tut.app-agenda--esencial.4.titulo': 'Orang',
  'tut.app-agenda--esencial.4.texto':
    'Buku kontakmu menurut hubungan. Ulang tahun yang kamu simpan otomatis berulang setiap tahun di kalender.',
  'tut.calendario--esencial.1.titulo': 'Jam rumah',
  'tut.calendario--esencial.1.texto':
    'Kalender bukan ruangan: dia hidup di jam HUD, jadi terbuka dari mana pun kamu berada tanpa masuk ke tempat lain.',
  'tut.calendario--esencial.2.titulo': 'Semua yang dijadwalkan, jadi satu',
  'tut.calendario--esencial.2.texto':
    'Semua yang punya tanggal dan waktu jatuh di sini: yang kamu buat dengan «+ Baru» atau dengan menggambar di kisi, dan yang dijadwalkan sendiri oleh aplikasi lain. Filter di atas menampilkan satu aplikasi saja kalau terlalu ramai.',
  'tut.calendario--esencial.3.titulo': 'Hari',
  'tut.calendario--esencial.3.texto':
    'Kisi 24 jam dalam sehari: menunjukkan jam berapa tiap hal terjadi dan apakah ada yang bertumpukan. Tombol ini punya dua fungsi: bertuliskan «Hari ini» dan membawamu kembali ke masa kini, atau «Hari» kalau kamu sedang melihat tanggal lain.',
  'tut.calendario--esencial.4.titulo': 'Minggu',
  'tut.calendario--esencial.4.texto':
    'Kisi jam yang sama, tapi dengan tujuh hari berdampingan. Di sinilah kamu lihat bagaimana minggu terbagi, dan di sinilah blok diseret dari satu hari ke hari lain atau direntangkan supaya lebih lama.',
  'tut.calendario--esencial.5.titulo': 'Bulan',
  'tut.calendario--esencial.5.texto':
    'Menghilangkan sumbu jam dan menggambar hari sebagai kotak dengan apa pun yang jatuh di masing-masing. Ini tampilan menyeluruh: minggu mana yang padat dan hari mana yang kosong.',
  'tut.calendario--esencial.6.titulo': 'Tahun',
  'tut.calendario--esencial.6.texto':
    'Dua belas bulan sekaligus. Dari jarak ini jam sudah tidak terbaca lagi: yang terlihat adalah konsistensi — seberapa lama kamu mempertahankan apa yang kamu niatkan sepanjang tahun.',
  'tut.calendario--esencial.7.titulo': 'Dan misi, terpisah',
  'tut.calendario--esencial.7.texto':
    'Dengan warna merah, supaya tidak terbaca sebagai tampilan kelima: Misi mengumpulkan daftar tugas hari ini dari semua aplikasi dalam satu layar. Target dan rencananya tidak ada di sini — mereka hidup di ruangannya sendiri.',
  'tut.app-anecdotario--esencial.1.titulo': 'Diarimu sendiri',
  'tut.app-anecdotario--esencial.1.texto':
    'Buku kenangan menyimpan apa pun yang ingin kamu ceritakan, dengan suasana hati dan fotonya. Dia mengatur dirinya sendiri berdasarkan tanggal, kamu tidak perlu mengelompokkan apa pun.',
  'tut.app-anecdotario--esencial.2.titulo': 'Cara menulis',
  'tut.app-anecdotario--esencial.2.texto':
    'Pilih suasana hati hari itu, tulis apa yang ingin kamu ceritakan, dan lampirkan foto kalau ada. Satu foto saja tanpa teks juga cukup.',
  'tut.app-anecdotario--esencial.3.titulo': 'Kalender suasana hati',
  'tut.app-anecdotario--esencial.3.texto':
    'Setiap hari diwarnai sesuai suasana hati entrinya, jadi seluruh bulan terbaca sekali lihat. Ketuk satu hari untuk melihat entrinya di bawah.',
  'tut.app-anecdotario--esencial.4.titulo': 'Riwayat',
  'tut.app-anecdotario--esencial.4.texto':
    'Semua entri tetap ada di sini, terorganisir sendiri dalam folder per tahun, bulan, dan minggu.',
  'tut.app-biblioteca--esencial.1.titulo': 'Perpustakaanmu',
  'tut.app-biblioteca--esencial.1.texto':
    'Perpustakaan adalah ensiklopedia pribadimu: kamu tanyakan yang tidak kamu tahu, simpan yang kamu pelajari, dan catat apa yang kamu pelajari. Ada empat menu.',
  'tut.app-biblioteca--esencial.2.titulo': 'Obrolan',
  'tut.app-biblioteca--esencial.2.texto':
    'Di sini kamu tanya apa pun ke Sang Bijak dan percakapannya tersimpan. Setiap obrolan mengelompokkan dirinya sendiri ke bidang ilmunya dan keluar sudah disarikan sebagai entri ensiklopedia.',
  'tut.app-biblioteca--esencial.3.titulo': 'Ensiklopedia',
  'tut.app-biblioteca--esencial.3.texto':
    'Pohon tempat yang kamu pelajari hidup, disusun menurut bidang ilmu. Setiap entri punya ringkasan dan poin pentingnya, dan kamu juga bisa menulisnya sendiri; dengan pensil kamu mengembangkan indeksnya sesuai dirimu.',
  'tut.app-biblioteca--esencial.4.titulo': 'Belajar',
  'tut.app-biblioteca--esencial.4.texto':
    'Timer untuk belajar: kamu pilih bidang dan durasi, langsung atau lewat pomodoro, dan setiap ronde tercatat sendiri. Tetap berjalan meski kamu keluar dari ruangan.',
  'tut.app-biblioteca--esencial.5.titulo': 'Ringkasan',
  'tut.app-biblioteca--esencial.5.texto':
    'Gambaran besar dari semua di atas: berapa banyak entri di ensiklopediamu dan berapa bagian indeks yang sudah kamu isi, menit belajarmu, runtunanmu, dan hari-hari kamu belajar.',
  'tut.app-cocina--esencial.1.titulo': 'Dapur',
  'tut.app-cocina--esencial.1.texto':
    'Aplikasi ini menangani dua hal: apa yang akan kamu masak dan apa yang akhirnya kamu makan. Masing-masing punya menunya sendiri di atas, dan setiap menu membuka tabnya sendiri.',
  'tut.app-cocina--esencial.2.titulo': 'Buku resep',
  'tut.app-cocina--esencial.2.texto':
    'Sisi memasak: di sinilah resepmu, diet yang mengelompokkannya, dan daftar belanja tersimpan. Tiga tab, dalam urutan itu.',
  'tut.app-cocina--esencial.3.titulo': 'Diet',
  'tut.app-cocina--esencial.3.texto':
    'Diet adalah rencana makan dengan resepnya di dalam dan, kalau kamu mau, target kalori dan makronya sendiri. Kamu simpan diet buatanmu sendiri berdampingan dengan yang sudah ada di aplikasi.',
  'tut.app-cocina--esencial.4.titulo': 'Resep',
  'tut.app-cocina--esencial.4.texto':
    'Buku resep: setiap resep menyimpan bahan, langkah, dan makro per porsinya, disusun dalam folder. Dari satu resep kamu bisa mencatat makanan atau mengirim bahannya ke daftar belanja.',
  'tut.app-cocina--esencial.5.titulo': 'Belanja',
  'tut.app-cocina--esencial.5.texto':
    'Daftar belanja, dengan setiap barang di rak yang sesuai. Kamu bisa membuat daftar dengan mengumpulkan yang kurang dari beberapa resep dan mencentang yang sudah ada di lemari makanan.',
  'tut.app-cocina--esencial.6.titulo': 'Nutrisi',
  'tut.app-cocina--esencial.6.texto':
    'Menu lainnya mencatat apa yang kamu makan, dalam empat tab bernomor. Yang pertama adalah Target: dari berat badan, tinggi, dan aktivitasmu, dia menghitung berapa yang kamu butuhkan setiap hari dan membagi makronya.',
  'tut.app-cocina--esencial.7.titulo': 'Catatan',
  'tut.app-cocina--esencial.7.texto':
    'Yang sudah terjadi: makanan hari itu dengan kalorinya, air yang sudah kamu minum, dan berat badanmu saat kamu menimbang. Tab di sebelahnya, Rencana makan, kebalikannya: kisi apa yang kamu rencanakan untuk dimakan di hari-hari mendatang.',
  'tut.app-cocina--esencial.8.titulo': 'Progres',
  'tut.app-cocina--esencial.8.texto':
    'Statistik dari semua di atas untuk periode yang kamu pilih: kalori dan makro, air, dan kurva berat badanmu. Di bawah, kalender berwarna menunjukkan sekali lihat hari mana kamu tetap dalam target.',
  'tut.app-computo--esencial.1.titulo': 'Komputasi',
  'tut.app-computo--esencial.1.texto':
    'Di sinilah apa pun yang perlu dihitung diselesaikan, dalam dua menu: Kalkulator, dengan mode-modenya dan buku rumusmu, dan Spreadsheet untuk semua yang berbentuk tabel.',
  'tut.app-computo--esencial.2.titulo': 'Kalkulator',
  'tut.app-computo--esencial.2.texto':
    'Kalkulator ilmiah yang menampilkan hasil saat kamu mengetik dan menyimpan semua hitunganmu dalam riwayat. Tombol di bawah membebaskanmu dari keyboard ponsel, dan notasi menuliskan hal ilmiah di mana pun kursormu berada.',
  'tut.app-computo--esencial.3.titulo': 'Mode',
  'tut.app-computo--esencial.3.texto':
    'Menu ini mengganti seluruh tampilan kalkulator: grafik, basis angka, matriks, sistem persamaan, konversi satuan, tip, dan aturan tiga. Riwayat tetap ada di bawah di semuanya.',
  'tut.app-computo--esencial.4.titulo': 'Buku Rumus',
  'tut.app-computo--esencial.4.texto':
    'Buku rumusmu, terlipat di atas kalkulator. Matematika, Fisika, dan Kimia sudah dimuat, dalam folder yang bisa kamu susun bertingkat. Rumus apa pun bisa dibuka untuk mengisi variabelnya, diedit, atau dihapus.',
  'tut.app-computo--esencial.5.titulo': 'Spreadsheet',
  'tut.app-computo--esencial.5.texto':
    'Lembar dengan referensi sel dan rumus yang mudah dipahami, plus grafik atas rentang yang kamu tandai. Diekspor ke Excel dengan rumusnya tetap hidup, atau ke PDF.',
  'tut.app-descanso--esencial.1.titulo': 'Istirahat',
  'tut.app-descanso--esencial.1.texto':
    'Aplikasi ini melacak tidurmu dalam satu layar: skor malam terakhir, jadwalmu dengan pengingatnya, catatan harian, dan riwayat lengkap.',
  'tut.app-descanso--esencial.2.titulo': 'Skor',
  'tut.app-descanso--esencial.2.texto':
    'Setiap malam yang tercatat mendapat skor yang menggabungkan berapa lama kamu tidur, jam berapa kamu tidur, dan berapa kali kamu terbangun. Kalau belum ada catatan, di sini kamu diajak mencatat malam pertamamu.',
  'tut.app-descanso--esencial.3.titulo': 'Jadwal dan pengingat',
  'tut.app-descanso--esencial.3.texto':
    'Kamu atur jam tidur dan bangun dengan menyeret ujung-ujung garis harian; jadwal yang sama juga muncul sebagai blok di kalender rumah. Di sini juga kamu nyalakan alarm dengan nadanya dan pengingat untuk memperlambat sebelum tidur.',
  'tut.app-descanso--esencial.4.titulo': 'Catat malam ini',
  'tut.app-descanso--esencial.4.texto':
    'Formulir untuk mencatat cara kamu tidur: tanggal, jam tidur dan bangun, gangguan, dan penilaian kualitas, dengan ruang untuk catatan.',
  'tut.app-descanso--esencial.5.titulo': 'Riwayat',
  'tut.app-descanso--esencial.5.texto':
    'Semua malam yang kamu catat tetap ada di sini, disusun per tahun, bulan, dan minggu — supaya kamu bisa meninjau tidurmu dari waktu ke waktu.',
  'tut.app-despacho--esencial.1.titulo': 'Keuanganmu',
  'tut.app-despacho--esencial.1.texto':
    'Ruang Kerja mengatur uangmu dalam empat menu: yang kamu punya, yang masuk dan keluar, targetmu, dan pasar. Masing-masing membuka bagiannya sendiri di bawah.',
  'tut.app-despacho--esencial.2.titulo': 'Kekayaan bersih',
  'tut.app-despacho--esencial.2.texto':
    'Yang kamu punya dan yang kamu utang, dalam dua daftar: aset dan kewajiban. Bagian ketiga memproyeksikan gambaran ini ke depan dengan tingkat yang kamu tetapkan untuk setiap barisnya.',
  'tut.app-despacho--esencial.3.titulo': 'Arus kas',
  'tut.app-despacho--esencial.3.texto':
    'Uang yang masuk dan keluar, dipisah jadi pengeluaran, pemasukan, dan saldo. Saldo merangkum periode yang kamu pilih — hari, minggu, bulan, atau tahun — lengkap dengan anggaran, kategori, dan trennya.',
  'tut.app-despacho--esencial.4.titulo': 'Target',
  'tut.app-despacho--esencial.4.texto':
    'Target keuanganmu dalam tiga bagian: tabungan dan investasi, utang, dan kalkulator yang mengusulkan jumlah berdasarkan saldomu sendiri. Target apa pun bisa turun ke linimasa dan diberi tanggal.',
  'tut.app-despacho--esencial.5.titulo': 'Pasar',
  'tut.app-despacho--esencial.5.texto':
    'Kutipan langsung untuk mata uang, kripto, saham, dan komoditas; perlu koneksi. Ini papan referensi saja: aplikasi tidak menyarankan apa yang harus dibeli atau dijual.',
  'tut.app-diario--esencial.1.titulo': 'Koran hari ini',
  'tut.app-diario--esencial.1.texto':
    'Berita Harian membawa rangkuman harian dalam dua tampilan: berita utama dan «Hari ini dalam sejarah». Tidak menyimpan datanya sendiri: setiap hari membawa konten baru dan tengah malam menggantinya seluruhnya.',
  'tut.app-diario--esencial.2.titulo': 'Berita utama',
  'tut.app-diario--esencial.2.texto':
    'Berita utama hari itu menurut kategori — dunia, ekonomi, teknologi, kesehatan, olahraga, dan hiburan —, bisa difilter dengan chip di atas. Berasal dari pers asli dalam bahasamu, dengan media yang berganti tiap hari.',
  'tut.app-diario--esencial.3.titulo': 'Hari ini dalam sejarah',
  'tut.app-diario--esencial.3.texto':
    'Separuh lainnya dari koran: apa yang terjadi di hari seperti ini — sebuah karya, sebuah buku, sebuah spesies, sebuah kata. Alasan untuk membukanya meski beritanya tidak menarik hari itu.',
  'tut.app-diario--esencial.4.titulo': 'Memperbarui diri sendiri',
  'tut.app-diario--esencial.4.texto':
    'Edisinya terunduh sendiri saat kamu membuka aplikasi dan diganti seluruhnya tengah malam: tidak ada yang menumpuk. Tombol ini memaksa pembaruan sebelum jam itu.',
  'tut.app-diario--esencial.5.titulo': 'Pengiriman',
  'tut.app-diario--esencial.5.texto':
    'Atur bagian mana yang dikirimkan setiap asisten kepadamu di obrolannya sendiri, pada jam tetap atau di momen kejutan hari itu.',
  'tut.app-ejercicio--esencial.1.titulo': 'Latihanmu',
  'tut.app-ejercicio--esencial.1.texto':
    'Gym menggabungkan tiga mode tubuh — kekuatan, daya tahan, dan fleksibilitas — plus menu target tempat kamu memutuskan berapa banyak latihan yang kamu inginkan tiap minggu.',
  'tut.app-ejercicio--esencial.2.titulo': 'Target',
  'tut.app-ejercicio--esencial.2.texto':
    'Ringkasan ruangan: runtunanmu, hari-hari dengan catatan, dan sebuah bar per mode dibandingkan dengan target mingguan yang kamu tetapkan di sini. Di sini juga kamu pilih sistem satuan, kilogram atau pon.',
  'tut.app-ejercicio--esencial.3.titulo': 'Kekuatan',
  'tut.app-ejercicio--esencial.3.texto':
    'Latihan dengan beban: setiap sesi menyimpan latihannya dengan set, repetisi, dan bebannya. Dari situ aplikasi menghitung volume hari itu, menggambar progres tiap latihan, dan menyimpan rekormu.',
  'tut.app-ejercicio--esencial.4.titulo': 'Katalog, rutinitas, dan progres',
  'tut.app-ejercicio--esencial.4.texto':
    'Ketiga mode disusun dengan cara yang sama. Katalog mengelompokkan latihan yang tersedia dan menyusun rutinitas darinya, Rutinitas mencatat latihan hari yang kamu pilih di atas, dan Progres merangkum periode itu dengan peta aktivitasnya.',
  'tut.app-ejercicio--esencial.5.titulo': 'Daya tahan',
  'tut.app-ejercicio--esencial.5.texto':
    'Lari, sepeda, renang, atau jalan kaki, terbagi dalam segmen dengan menit dan jaraknya. Dari sini latihan langsung terbuka: dia mengambil rute lewat GPS dan detak jantung dari sensor Bluetooth, dan menyimpan sesinya saat kamu selesai.',
  'tut.app-ejercicio--esencial.6.titulo': 'Fleksibilitas',
  'tut.app-ejercicio--esencial.6.texto':
    'Peregangan dan mobilitas, dengan set berdasarkan waktu, bukan beban: setiap pose punya detik dan repetisinya sendiri. Pemutar terpandu menjalankan rutinitas pose demi pose dengan timer yang memberitahumu kapan harus berganti.',
  'tut.app-entretenimiento--esencial.1.titulo': 'Hiburan',
  'tut.app-entretenimiento--esencial.1.texto':
    'Menyimpan film, serial, buku, dan video game yang sedang kamu selesaikan, dan menghadirkan meja permainan digital untuk kamu mainkan tanpa keluar rumah. Ada dua menu: Permainan Papan dan Arsip.',
  'tut.app-entretenimiento--esencial.2.titulo': 'Permainan Papan',
  'tut.app-entretenimiento--esencial.2.texto':
    'Meja ini mengumpulkan permainan digital yang dimainkan langsung di layar. Sebuah filter memisahkan yang cocok untuk satu atau dua pemain dari yang cocok untuk kelompok lebih besar.',
  'tut.app-entretenimiento--esencial.3.titulo': 'Menurut keluarga',
  'tut.app-entretenimiento--esencial.3.texto':
    'Katalog dikelompokkan menurut keluarga — papan, teka-teki, arcade, kartu dan kasino, dan untuk kelompok — masing-masing dengan warnanya sendiri. Ketuk kartu mana pun untuk membuka permainan layar penuh.',
  'tut.app-entretenimiento--esencial.4.titulo': 'Arsip',
  'tut.app-entretenimiento--esencial.4.texto':
    'Arsip mengumpulkan apa yang kamu tonton, baca, dan mainkan: setiap judul dengan statusnya, penilaiannya, dan ulasanmu. Bisa diurutkan menurut genre, kategori, penulis, atau tanggal.',
  'tut.app-garage--esencial.1.titulo': 'Garasi',
  'tut.app-garage--esencial.1.texto':
    'Garasi melacak kendaraanmu: sepeda, mobil, motor, dan apa pun yang kamu pakai untuk berpindah tempat. Masing-masing punya riwayat servis dan administrasinya sendiri, dan semua yang punya tanggal langsung masuk sendiri ke kalender rumah.',
  'tut.app-garage--esencial.2.titulo': 'Ringkasan',
  'tut.app-garage--esencial.2.texto':
    'Tab pembuka: lampu lalu lintas menunjukkan sekali lihat apakah ada yang lewat jatuh tempo, mendekat, atau garasinya aman-aman saja.',
  'tut.app-garage--esencial.3.titulo': 'Sekali lihat',
  'tut.app-garage--esencial.3.texto':
    'Berapa banyak kendaraan yang kamu punya, berapa banyak administrasi yang masih aktif, dan berapa yang sudah kamu keluarkan tahun ini.',
  'tut.app-garage--esencial.4.titulo': 'Kendaraan',
  'tut.app-garage--esencial.4.texto':
    'Daftar lengkap, dengan pelat nomor, jarak tempuh, dan jumlah servis di setiap kartu. Menyentuh satu kartu membuka berkasnya, lengkap dengan riwayat servis dan administrasinya.',
  'tut.app-garage--esencial.5.titulo': 'Menambah yang baru',
  'tut.app-garage--esencial.5.texto':
    'Nama, jenis, merek, model, tahun, pelat nomor, dan odometer hari ini. Dengan pelat nomor terisi, berkas ini juga membuka administrasi yang hanya berlaku untuk kendaraan berpelat, seperti uji emisi atau pajak kendaraan.',
  'tut.app-hobbies--esencial.1.titulo': 'Kegemaranmu',
  'tut.app-hobbies--esencial.1.texto':
    'Hobi melacak apa yang kamu lakukan untuk kesenangan: setiap hobi mengumpulkan sesinya, runtunannya, dan, kalau kamu mau, proyeknya.',
  'tut.app-hobbies--esencial.2.titulo': 'Hobimu',
  'tut.app-hobbies--esencial.2.texto':
    'Setiap hobi yang kamu daftarkan muncul di sini sebagai kartu, dengan progres minggu itu dan runtunan yang aktif. Membuka satu hobi menunjukkan statistiknya, peta aktivitas tahunannya, catatan sesi, dan proyeknya.',
  'tut.app-hobbies--esencial.3.titulo': 'Menambah hobi',
  'tut.app-hobbies--esencial.3.texto':
    'Tombol ini membuka formulir untuk menambah hobi baru: nama, emoji, warna, dan, kalau kamu mau, target mingguan dalam hari latihan.',
  'tut.app-hobbies--esencial.4.titulo': 'Di dalam setiap hobi',
  'tut.app-hobbies--esencial.4.texto':
    'Di situ kamu mencatat sesi dengan menit dan catatan, melihat peta aktivitas tahunanmu, dan menjalankan proyek dengan progresnya sendiri. Target dan linimasanya hidup di ruangan Target.',
  'tut.app-ideas--esencial.1.titulo': 'Ide',
  'tut.app-ideas--esencial.1.texto':
    'Ide menyimpan apa pun yang terlintas di kepalamu dan membantunya matang: mula-mula dicatat, lalu disusun dalam peta dan, kalau perlu, dibandingkan untuk memutuskan. Ada tiga menu.',
  'tut.app-ideas--esencial.2.titulo': 'Jurnal ide',
  'tut.app-ideas--esencial.2.texto':
    'Kotak masuk tempat pemikiran apa pun jatuh, sendiri atau dikelompokkan dalam curah gagasan menurut topik. Bisa diarsipkan ke folder, ditandai bintang, dan saat sudah matang, diubah jadi peta.',
  'tut.app-ideas--esencial.3.titulo': 'Peta konsep',
  'tut.app-ideas--esencial.3.texto':
    'Kanvas bebas untuk menyusun sebuah topik dalam format yang paling sesuai: peta pikiran, pohon, alur, linimasa, siklus, piramida, Venn, dan lainnya.',
  'tut.app-ideas--esencial.4.titulo': 'Diagram keputusan',
  'tut.app-ideas--esencial.4.texto':
    'Kanvas yang sama, tapi dengan format yang dirancang untuk memutuskan: kelebihan dan kekurangan berbobot, SWOT, Eisenhower, atau matriks berbobot yang mengurutkan opsi dengan sendirinya.',
  'tut.app-idiomas--esencial.1.titulo': 'Sekolah bahasamu',
  'tut.app-idiomas--esencial.1.texto':
    'Di sini kamu pilih bahasa, mengobrol dengan tutor AI, menyimpan kosakata yang kamu pelajari, dan meninjaunya dengan sistem berjarak. Ada empat menu: Obrolan, Silabus, Tinjauan, dan Progres.',
  'tut.app-idiomas--esencial.2.titulo': 'Obrolan',
  'tut.app-idiomas--esencial.2.texto':
    'Kamu mengobrol dengan tutormu dalam bahasa yang sedang kamu pelajari: dia merespons sesuai levelmu dan mengoreksi dengan lembut. Setiap obrolan tersimpan dan mengelompokkan dirinya sendiri, dan saat kamu keluar, dia menawarkan untuk mengambil kosakata baru sebagai kartu.',
  'tut.app-idiomas--esencial.3.titulo': 'Silabus',
  'tut.app-idiomas--esencial.3.texto':
    'Menyusun bahasa dalam topik, pelafalan, dan tata bahasa, dari level A1 sampai C2. Kosakata hidup di dalam setiap topik: setiap kartu tersimpan di situ, dengan terjemahan dan contohnya.',
  'tut.app-idiomas--esencial.4.titulo': 'Tinjauan',
  'tut.app-idiomas--esencial.4.texto':
    'Tinjauan berjarak: setiap kartu hidup dalam sebuah kotak dan hanya yang hampir kamu lupakan yang muncul, dengan latihan — pilihan ganda, terbalik, atau melengkapi kalimat — bukan sekadar melihat kartu.',
  'tut.app-idiomas--esencial.5.titulo': 'Progres',
  'tut.app-idiomas--esencial.5.texto':
    'Ringkasan kemajuanmu: berapa banyak kartu yang sudah kamu kuasai, berapa banyak yang kamu tinjau, dan levelmu sekarang, lengkap dengan riwayat tinjauanmu hari demi hari.',
  'tut.app-jardin--esencial.1.titulo': 'Ruang tenangmu',
  'tut.app-jardin--esencial.1.texto':
    'Taman menggabungkan tiga praktik: meditasi, pernapasan terpandu, dan rasa syukur. Sengaja tidak ada poin atau runtunan: di sini tidak ada hukuman kalau kamu lewatkan satu hari, ini hanya menemani apa pun yang kamu praktikkan.',
  'tut.app-jardin--esencial.2.titulo': 'Meditasi',
  'tut.app-jardin--esencial.2.texto':
    'Pilih trek suara dan durasi, atau bermeditasi dalam diam dengan lonceng di awal dan akhir. Setiap sesi tersimpan di riwayatmu.',
  'tut.app-jardin--esencial.3.titulo': 'Pernapasan',
  'tut.app-jardin--esencial.3.texto':
    'Dua pola pernapasan terpandu, satu untuk memusatkanmu dan satu lagi untuk melepaskan harimu: layarnya bernapas bersamamu selagi berjalan.',
  'tut.app-jardin--esencial.4.titulo': 'Syukur',
  'tut.app-jardin--esencial.4.texto':
    'Catat apa yang kamu syukuri hari ini, meski cuma satu hal, dan lihat kembali entri sebelumnya kapan pun kamu mau. Tanpa runtunan: melewatkan satu hari tidak menghapus apa pun.',
  'tut.app-metas--esencial.1.titulo': 'Perencana rumah',
  'tut.app-metas--esencial.1.texto':
    'Ruangan ini tidak menyimpan catatannya sendiri: dia mengumpulkan di satu tempat target dan rencana yang lahir di aplikasi lain. Ada tiga menu, dan dibaca dalam urutan ini: apa yang kamu tetapkan untuk dirimu, bagaimana kamu berencana membaginya, dan kapan itu jatuh.',
  'tut.app-metas--esencial.2.titulo': 'Target',
  'tut.app-metas--esencial.2.texto':
    'Daftar semua yang kamu tetapkan untuk dirimu, dikelompokkan menurut aplikasi yang mengelola tiap target. Satu target bisa tergantung pada yang lain, dan menyentuhnya membuka kartunya: di situ ada batas waktunya, langkah-langkahnya, dan jalan masuk ke linimasanya sendiri.',
  'tut.app-metas--esencial.3.titulo': 'Rencana',
  'tut.app-metas--esencial.3.texto':
    'Rencana adalah draf linimasa: dia membagi sebuah target jadi beberapa fase dengan tanggalnya. Selama masih jadi usulan kamu bisa mengubahnya sesukamu; ketika sudah meyakinkanmu, terima, dan fase-fasenya berubah jadi sub-target sungguhan.',
  'tut.app-metas--esencial.4.titulo': 'Linimasa',
  'tut.app-metas--esencial.4.texto':
    'Sumbu waktu dengan semua target sekaligus: masing-masing adalah bar di atas tanggal. Kamu bisa memperbesar dan memperkecil menurut hari, minggu, bulan, atau tahun, dan sebuah rencana bisa ditumpuk di atasnya untuk dibandingkan dengan yang sudah tergambar.',
  'tut.app-sala--esencial.1.titulo': 'Ruang tamu jalan-jalanmu',
  'tut.app-sala--esencial.1.texto':
    'Di sinilah dunia jalan-jalanmu hidup: peta dunia dengan pin, rencana perjalanan tempat yang ingin dikunjungi, rute yang menghubungkan tempat, dan jurnal perjalanan berisi kenangan. Ada empat menu.',
  'tut.app-sala--esencial.2.titulo': 'Peta',
  'tut.app-sala--esencial.2.texto':
    'Setiap tempat yang sudah kamu kunjungi atau impikan untuk dikunjungi adalah sebuah pin di peta dunia. Sakelar di atas mengganti peta datar dengan globe yang bisa kamu putar dengan menyeretnya.',
  'tut.app-sala--esencial.3.titulo': 'Rencana perjalanan',
  'tut.app-sala--esencial.3.texto':
    'Tempat-tempat yang kamu impikan untuk dikunjungi, masing-masing dengan rencana hariannya sendiri. Yang punya tanggal terjadwal sendiri di kalender.',
  'tut.app-sala--esencial.4.titulo': 'Rute',
  'tut.app-sala--esencial.4.texto':
    'Sebuah rute menghubungkan tempat-tempat jadi satu perjalanan dan menggambarnya di peta.',
  'tut.app-sala--esencial.5.titulo': 'Jurnal perjalanan',
  'tut.app-sala--esencial.5.texto':
    'Kenangan dari tempat-tempat yang sudah kamu kunjungi, dalam album per negara: foto dan cerita dari setiap tempat.',
  'tut.app-agenda--trabajo.1.titulo': 'Kotak masuk',
  'tut.app-agenda--trabajo.1.texto':
    'Kerja punya dua tampilan: baki Tugas dan Papan. Di Tugas tinggal apa yang harus dikerjakan tapi belum punya hari, lengkap dengan prioritasnya; tidak ada yang memaksamu memberi tanggal hanya untuk mencatatnya.',
  'tut.app-agenda--trabajo.3.titulo': 'Papan',
  'tut.app-agenda--trabajo.3.texto':
    'Seluruh pekerjaan dalam tiga kolom —Perlu dikerjakan, Sedang berlangsung, dan Selesai—, termasuk yang sudah punya tanggal. Tekan lama sebuah kartu untuk menyeretnya ke kolom lain (menjatuhkannya di “Selesai” sekaligus mencentangnya di kalender), atau pindahkan dengan panah.',
  'tut.app-agenda--salud.1.titulo': 'Tahun lutut itu',
  'tut.app-agenda--salud.1.texto':
    'Nutrisi tiap beberapa bulan, dokter gigi, dan enam sesi fisioterapi di bulan ke-7: cedera yang menghentikan Pep tercatat di sini.',
  'tut.app-agenda--salud.2.titulo': 'Obat',
  'tut.app-agenda--salud.2.texto':
    'Setiap obat membuat satu blok per dosis di kalender. Obat antiradang untuk cederanya bertahan tiga minggu lalu diarsipkan; vitaminnya masih jalan.',
  'tut.app-agenda--salud.3.titulo': 'Laika',
  'tut.app-agenda--salud.3.texto':
    'Kucing itu punya kartunya sendiri dengan berat dan dokter hewan, plus perawatan berkalanya: vaksin tahunan, obat cacing tiap tiga bulan, mandi tiap bulan. Begitu kamu mencentangnya, jadwal berikutnya dihitung ulang sendiri.',
  'tut.app-agenda--salud.4.titulo': 'Yang berulang',
  'tut.app-agenda--salud.4.texto':
    'Cek kesehatan tahunan, pembersihan gigi, tes darah: perawatan dengan periodenya sendiri. Saat ditandai selesai, tanggal berikutnya melompat sendiri, jadi kalender tidak pernah menunjuk sesuatu yang sudah kamu lakukan.',
  'tut.app-agenda--salud.ciclo.titulo': 'Siklus',
  'tut.app-agenda--salud.ciclo.texto':
    'Di ujung Kamu tinggal siklus, dengan sakelarnya sendiri: pendarahan, gejala, dan suasana hati per hari, dan dari haid-haid terakhirmu ia memperkirakan yang berikutnya serta masa subur. Mematikannya tidak menghapus apa pun yang sudah dicatat.',
  'tut.app-agenda--salud.projimos.titulo': 'Orang tersayang',
  'tut.app-agenda--salud.projimos.texto':
    'Mereka yang ada dalam perawatanmu: kontak dari Orang yang ditandai «Dalam perawatanku», masing-masing dengan janji temu per spesialisasi, perawatannya, dan obatnya. Pep menaruh ibunya di sini.',
  'tut.app-agenda--personas.1.titulo': 'Lingkaran Pep',
  'tut.app-agenda--personas.1.texto':
    'Keluarga, teman, orang kantor dan kampus, masing-masing di foldernya sendiri. Lengkap dengan telepon, alamat, dan apa pun yang tidak ingin kamu lupakan.',
  'tut.app-agenda--personas.2.titulo': 'Ulang tahun yang tak terlewat',
  'tut.app-agenda--personas.2.texto':
    'Begitu kamu menyimpan tanggal lahir, ulang tahunnya berulang tiap tahun di kalender dan mengingatkanmu. Aplikasi menghitung usianya sendiri.',
  'tut.app-agenda--personas.3.texto':
    'Rencana bersama orang lain terhubung ke kontaknya: jadi kamu bisa melihat kapan terakhir kali bertemu seseorang.',
  'tut.app-ejercicio--anio.1.titulo': 'Setahun dalam tiga angka',
  'tut.app-ejercicio--anio.1.texto':
    'Runtunan aktif menghitung hari berturut-turut yang ada catatannya, dan Kepatuhan membandingkan hari aktifmu dengan yang kamu targetkan. Pep memulai tahun itu tanpa sanggup lari dua blok.',
  'tut.app-ejercicio--anio.2.titulo': 'Tiga jenis latihan',
  'tut.app-ejercicio--anio.2.texto':
    'Batang-batangnya mengukur capaianmu terhadap targetmu: sesi kekuatan, menit daya tahan, dan menit fleksibilitas. Targetnya menyesuaikan periode yang kamu pilih di atas.',
  'tut.app-ejercicio--anio.3.titulo': 'Target tahun ini',
  'tut.app-ejercicio--anio.3.texto':
    'Ruangan Target menyimpan empat targetnya yang sudah tercapai — 5K, 10K, half marathon, dan marathon — dan satu yang masih berjalan. Target dengan tanggal juga muncul di kalender rumah.',
  'tut.app-ejercicio--carrera.1.titulo': 'Katalog, Rutinitas, dan Progres',
  'tut.app-ejercicio--carrera.1.texto':
    'Tiap jenis latihan tersusun sama: katalog gerakan, rutinitasmu beserta riwayatnya, dan progres. Mari mulai dari lari-lari yang sudah dijalani Pep.',
  'tut.app-ejercicio--carrera.2.titulo': 'Tiap lari tercatat',
  'tut.app-ejercicio--carrera.2.texto':
    'Riwayatnya dikelompokkan per tahun, bulan, dan minggu. Lari besar juga menyimpan jejak rutenya beserta bagian-bagiannya: itu maratonnya, lengkap dengan catatan waktu tiap sepuluh kilometer.',
  'tut.app-ejercicio--carrera.3.titulo': 'Peta panas tidak berbohong',
  'tut.app-ejercicio--carrera.3.texto':
    'Ruang-ruang kosongnya juga bercerita: bulan cedera lutut kosong melompong dan tiga minggu di Jepang nyaris sama. Di sebelahnya muncul total kilometer, lari terpanjang, dan tempo terbaik.',
  'tut.app-ejercicio--fuerza.1.titulo': 'Set, repetisi, dan beban',
  'tut.app-ejercicio--fuerza.1.texto':
    'Tiap sesi menyimpan gerakannya beserta beban yang kamu angkat. Aplikasi mengingat sesi terakhir supaya kamu tidak perlu mencarinya, lalu menjumlahkan total volume hari itu.',
  'tut.app-ejercicio--fuerza.2.titulo': 'Kurva setahun',
  'tut.app-ejercicio--fuerza.2.texto':
    'Pilih satu gerakan dan lihat kenaikannya: squat Pep naik dari empat puluh kilo ke tujuh puluh. Selama bulan cedera dia hanya melatih tubuh bagian atas, dan kurva itu sama sekali tidak terusik.',
  'tut.app-ejercicio--fuerza.3.titulo': 'Rekormu, tanpa diminta',
  'tut.app-ejercicio--fuerza.3.texto':
    'Tiap gerakan menyimpan beban terbaik, repetisi maksimum, dan perkiraan 1RM-mu. Gerakan berat badan, seperti pull-up, ditandai terpisah.',
  'tut.app-ejercicio--flexibilidad.1.titulo': 'Peregangan dan mobilitas',
  'tut.app-ejercicio--flexibilidad.1.texto':
    'Katalognya berisi latihan yang itu-itu juga —hamstring, pinggul, bahu— masing-masing dengan gambar mini ilustrasi yang dibuat AI saat pertama kali dibutuhkan.',
  'tut.app-ejercicio--flexibilidad.2.titulo': 'Set dihitung waktu, bukan beban',
  'tut.app-ejercicio--flexibilidad.2.texto':
    'Tiap latihan memakai detik dan repetisi, bukan beban. Pemutar terpandu menjalankan rutinitas latihan demi latihan dengan timer yang memberi tahu kapan berganti.',
  'tut.app-ejercicio--flexibilidad.3.titulo': 'Heatmap yang sama',
  'tut.app-ejercicio--flexibilidad.3.texto':
    'Menit dan sesi bulan ini, dengan heatmap yang sama seperti dua modalitas lainnya: konsistensi mobilitas terbaca semudah lari.',
  'tut.app-ejercicio--flexibilidad.4.texto':
    'Ketiga modalitas berbagi Kardio langsung dari jam: saat kamu lari atau mengayuh dengan timer menyala, catatan menit demi menit tersimpan sendiri begitu selesai.',
  'tut.app-cocina--alimentacion.1.titulo': 'Langkah 1: ke mana tujuanmu',
  'tut.app-cocina--alimentacion.1.texto':
    'Dari berat, tinggi, dan aktivitasmu, aplikasi menghitung kebutuhan harianmu lalu membagi makronya. Pep menetapkan 2.400 kalori dan berat target yang tinggal kurang dari satu kilo lagi.',
  'tut.app-cocina--alimentacion.2.titulo': 'Langkah 2: apa yang kamu makan hari ini',
  'tut.app-cocina--alimentacion.2.texto':
    'Sarapan, makan siang, makan malam, dan camilan di sela-sela: tiap catatan mengisi cincin hari itu. Air punya targetnya sendiri, dan itulah yang dilihat rumah untuk menganggap harimu tuntas.',
  'tut.app-cocina--alimentacion.3.titulo': 'Langkah 3: 74 kilo, 67 kilo',
  'tut.app-cocina--alimentacion.3.texto':
    'Kurva sepanjang tahun, lengkap dengan datarannya di bulan cedera dan satu kilo yang naik di Jepang. Di bawahnya kamu diberi tahu kecepatanmu dan kapan kamu sampai kalau terus begini.',
  'tut.app-cocina--alimentacion.4.titulo': 'Setahun dalam warna',
  'tut.app-cocina--alimentacion.4.texto':
    'Hijau berarti hari yang masih di dalam target, amber yang lewat sedikit, dan merah yang lewat jauh. Bulan perjalanannya kelihatan sejak pandangan pertama. Sentuh hari mana pun untuk membukanya.',
  'tut.app-cocina--recetario.1.titulo': 'Diet, bukan diet majalah',
  'tut.app-cocina--recetario.1.texto':
    'Diet di sini adalah rencana dengan resep-resepnya di dalam. Pep menyimpan dua buatannya sendiri: minggu maraton dan pulang dari Jepang, selain yang sudah dibawa aplikasi.',
  'tut.app-cocina--recetario.2.titulo': 'Buku resep',
  'tut.app-cocina--recetario.2.texto':
    'Tiap resep menyimpan bahan, langkah, dan makro per porsinya, lalu tersusun dalam folder. Dari sebuah resep kamu bisa mencatat makanannya atau mengirim bahannya ke Belanja.',
  'tut.app-cocina--recetario.3.titulo': 'Meminta resep ke AI',
  'tut.app-cocina--recetario.3.texto':
    'Jelaskan apa yang ingin kamu masak dan AI menyusun resep lengkapnya beserta foto hidangannya. Ini dikerjakan AI: aktifkan di Editor › Pengaturan › Akun.',
  'tut.app-cocina--recetario.4.titulo': 'Dari resep ke daftar belanja',
  'tut.app-cocina--recetario.4.texto':
    'Buat daftar mengumpulkan yang kurang dari beberapa resep menjadi satu kali belanja: tiap bahan menebak kategorinya sendiri (sayur, olahan susu…) dan bisa kamu ubah.',
  'tut.app-cocina--recetario.5.titulo': 'Daftar tersimpan',
  'tut.app-cocina--recetario.5.texto':
    'Tiap daftar tersimpan lengkap dengan yang belum dibeli dan yang sudah ada di dapur. Kalau kamu mengisi harganya, totalnya bisa dikirim ke pengeluaran di Ruang Kerja.',
  'tut.app-cocina--cronograma.1.titulo': 'Yang diminta Dapur darimu hari ini',
  'tut.app-cocina--cronograma.1.texto':
    'Tombol Misi di header membuka checklist hari itu: air minum, makanan, dan langkah-langkah yang datang dari targetmu. Targetnya sendiri —dengan rencana yang diusulkan AI— ada di ruangan Target, dikelompokkan menurut aplikasi yang memegangnya.',
  'tut.app-cocina--cronograma.2.texto':
    'Ini dikerjakan AI: aktifkan di Editor › Pengaturan › Akun. Tanpa itu, target tetap bisa dibuat dan diedit dengan cara yang sama, hanya saja manual.',
  'tut.app-descanso--noche.1.titulo': 'Seratus poin, tiga bagian',
  'tut.app-descanso--noche.1.texto':
    'Durasi bernilai lima puluh, konsistensi waktu tidurmu tiga puluh, dan gangguan dua puluh. Tidur panjang sehari tidak menutupi tidur larut di semua hari lainnya.',
  'tut.app-descanso--noche.2.titulo': 'Sepekan terakhir',
  'tut.app-descanso--noche.2.texto':
    'Tujuh batang melawan garis target tidurmu. Inilah tampilan yang sekali lihat memberitahumu apakah minggu ini kamu tidur sebanyak yang kamu mau.',
  'tut.app-descanso--noche.3.titulo': 'Setahun penuh',
  'tut.app-descanso--noche.3.texto':
    'Riwayatnya disimpan per tahun, bulan, dan minggu. Gulir sampai bulan-bulan pertama Pep lalu bandingkan dengan yang terakhir: tidur lewat pukul satu dan cuma dapat lima jam.',
  'tut.app-descanso--horario.1.titulo': 'Dari pukul setengah dua belas sampai tujuh',
  'tut.app-descanso--horario.1.texto':
    'Seret kedua ujung bilahnya untuk menggeser waktu tidur dan waktu bangunmu; langit di atasnya ikut berubah. Blok ini juga muncul di kalender, melewati tengah malam.',
  'tut.app-descanso--horario.2.titulo': 'Alarm dan pengingat',
  'tut.app-descanso--horario.2.texto':
    'Kamu bisa memilih suara alarmnya, minta diingatkan saat waktunya tidur, dan meletakkan layar satu jam sebelumnya. Pengingatnya opsional: di sini semuanya datang dalam keadaan mati.',
  'tut.app-descanso--horario.3.titulo': 'Catat malam',
  'tut.app-descanso--horario.3.texto':
    'Setiap pagi kamu mencatat jam berapa kamu tidur, jam berapa kamu bangun, berapa kali kamu terbangun, dan bagaimana rasanya. Cuma itu yang aplikasi butuhkan untuk semua sisanya.',
  'tut.app-despacho--anio.1.titulo': 'Satu tahun, empat lensa',
  'tut.app-despacho--anio.1.texto':
    'Pilih Hari, Minggu, Bulan, atau Tahun, lalu bergerak dengan panahnya. Mundur beberapa bulan: kamu akan menemukan bulan saat mobilnya rusak dan bulan penerbangan ke Jepang, keduanya merah.',
  'tut.app-despacho--anio.2.titulo': 'Bentuk tahun itu',
  'tut.app-despacho--anio.2.texto':
    'Enam periode ke belakang, dalam bentuk batang. Yang biru adalah bulan-bulan saat uangnya bersisa; yang merah, bulan-bulan yang terasa berat. Jurang dan bangkitnya terlihat persis di situ.',
  'tut.app-despacho--anio.3.titulo': 'Uangnya lari ke mana?',
  'tut.app-despacho--anio.3.texto':
    'Rincian per kategori untuk periode yang sedang kamu lihat. Pep menulis kategorinya sendiri: aplikasi mengenali yang umum dan memberi warna tersendiri untuk sisanya.',
  'tut.app-despacho--anio.4.titulo': 'Batas bulan ini',
  'tut.app-despacho--anio.4.texto':
    'Satu anggaran bulanan dan sebuah batang yang berubah merah begitu kamu melewatinya. Kalau kamu melihatnya per minggu atau per tahun, aplikasi membaginya sendiri.',
  'tut.app-despacho--anio.5.titulo': 'Yang kamu punya hari ini',
  'tut.app-despacho--anio.5.texto':
    'Kekayaan bersihmu datang langsung dari tab Kekayaan bersih: aset dikurangi kewajiban. Di sini saldo periode ditambahkan atau dikurangkan, supaya kamu melihat akan berakhir di mana.',
  'tut.app-despacho--anio.6.titulo': 'Dan setahun lagi',
  'tut.app-despacho--anio.6.texto':
    'Ia memproyeksikan dua belas bulan dengan item tetapmu pada jatuh temponya dan yang variabel dengan rata-ratamu, dalam dua skenario: dengan kekayaan bersih dan tanpa kekayaan bersih.',
  'tut.app-despacho--captura.1.titulo': 'Item tetap milik Pep',
  'tut.app-despacho--captura.1.texto':
    'Sewa, internet, ponsel, langganan streaming, dan asuransi mobil: lima catatan dari bulan ke-2, saat Pep memutuskan untuk berbenah. Sejak itu masing-masing menghitung dirinya sendiri.',
  'tut.app-despacho--captura.2.titulo': 'Cara mencatatnya',
  'tut.app-despacho--captura.2.texto':
    'Formulirnya berjalan selangkah demi selangkah: jumlah, variabel atau tetap, kategori (kamu menulis kategorimu sendiri dan ia menyarankan yang sudah ada), seberapa sering berulang, dan catatan.',
  'tut.app-despacho--captura.3.titulo': 'Setahun penuh transaksi',
  'tut.app-despacho--captura.3.texto':
    'Ratusan pengeluaran tersimpan dalam folder tahun dan bulan. Cari bulan ke-7: di situlah kerusakan yang menelan hampir sepuluh ribu peso sekaligus.',
  'tut.app-despacho--captura.4.titulo': 'Uangnya datang dari mana',
  'tut.app-despacho--captura.4.texto':
    'Dua gaji dua mingguan dari kafe, kelas fisika yang mulai Pep ajarkan begitu perjalanan itu diputuskan, dan tip mingguan yang jumlahnya tidak pernah sama.',
  'tut.app-despacho--captura.5.texto':
    'Di rumahmu sendiri kamu juga bisa mencatat lewat chat: “belanja 250 di supermarket” dan langsung tercatat.',
  'tut.app-despacho--metas.1.titulo': 'Target yang tercapai',
  'tut.app-despacho--metas.1.texto':
    'Liburan ke Jepang, 100%: sebelas bulan menabung, les privat, bonus akhir tahun, dan uang hadiah ulang tahunnya. Di bawahnya, dana darurat yang dimulai sepulang perjalanan dan satu investasi kecil.',
  'tut.app-despacho--metas.2.titulo': 'Target sepanjang waktu',
  'tut.app-despacho--metas.2.texto':
    'Target-target ini tersimpan di sumbu waktu di ruangan Target: beri tanggal pada salah satunya dan langsung muncul di antara hari-hari kalendermu. Dengan ✨ AI mengusulkan rencana setoran.',
  'tut.app-despacho--metas.3.titulo': 'Utangnya waktu itu',
  'tut.app-despacho--metas.3.texto':
    'Kerusakan mobil itu dibayar pakai kartu kredit dan butuh berbulan-bulan sampai lunas. Utang ditaruh terpisah karena dibacanya terbalik: di sini turun berarti menang.',
  'tut.app-despacho--metas.4.titulo': 'Pasar',
  'tut.app-despacho--metas.4.texto':
    'Pep memantau yen sejak perjalanan itu diputuskan, dan sekarang won, untuk perjalanan berikutnya. Forex, Kripto, Saham, dan Komoditas secara langsung (butuh internet).',
  'tut.app-despacho--patrimonio.1.titulo': 'Nilainya hari ini',
  'tut.app-despacho--patrimonio.1.texto':
    'Aset dikurangi kewajiban. Kalau sebuah baris punya tarif, angka ini nilai HARI INI, bukan nilai saat kamu mencatatnya — dan di bawah kamu bisa lihat rinciannya, atau kembali ke angka yang kamu tulis.',
  'tut.app-despacho--patrimonio.2.titulo': 'Dari mana asalnya',
  'tut.app-despacho--patrimonio.2.texto':
    'Dua tahun terakhir grup ini. Buka baris mana pun dan kamu lihat apa yang menentukannya: berapa nilainya, sejak kapan, dan berapa naik turunnya per tahun. Yang kamu tulis tidak pernah menulis ulang dirinya sendiri.',
  'tut.app-despacho--patrimonio.3.titulo': 'Dan ke mana arahnya',
  'tut.app-despacho--patrimonio.3.texto':
    'Tab ketiga meneruskan garis yang sama ke depan: garis penuh untuk yang sudah terjadi, putus-putus untuk hasil tarifmu.',
  'tut.app-despacho--patrimonio.4.titulo': 'Tiga garis',
  'tut.app-despacho--patrimonio.4.texto':
    'Milikmu hijau, utangmu merah, dan bersihnya biru. Garis tegak adalah hari ini: di kirinya yang benar-benar terjadi.',
  'tut.app-despacho--patrimonio.5.titulo': 'Gerakkan semuanya',
  'tut.app-despacho--patrimonio.5.texto':
    'Berapa bulan, berapa inflasi yang kamu asumsikan, dan mau tidaknya menambah tabungan bulananmu dengan laju naiknya sendiri. Tak ada yang menyentuh datamu: coba saja tanpa takut.',
  'tut.app-despacho--calculadoras.1.texto':
    'Empat aturan keuangan pribadi, masing-masing di tabnya sendiri: dana darurat, kebebasan finansial, 50/30/20, dan uang muka mobil (20/4/10).',
  'tut.app-despacho--calculadoras.2.titulo': 'Sudah terisi dari saldomu',
  'tut.app-despacho--calculadoras.2.texto':
    'Kolomnya datang sudah terisi pemasukan atau pengeluaran nyatamu bulan ini — sentuh untuk mensimulasikan angka lain tanpa kehilangan angka yang sebenarnya.',
  'tut.app-despacho--calculadoras.3.titulo': 'Dari hitungan jadi target',
  'tut.app-despacho--calculadoras.3.texto':
    'Dengan satu ketukan, hasilnya berubah jadi target tabungan sungguhan, siap turun ke linimasa dan diberi tanggal. (Jangan tekan di demo: itu akan membuat target sungguhan.)',
  'tut.app-garage--vehiculos.1.titulo': 'Ada yang mendesak?',
  'tut.app-garage--vehiculos.1.texto':
    'Satu lampu lalu lintas saja supaya kamu tidak perlu membaca dua daftar: merah kalau ada yang terlambat, kuning kalau ada yang akan datang, hijau kalau garasinya tenang.',
  'tut.app-garage--vehiculos.2.titulo': 'Yang sudah kamu keluarkan',
  'tut.app-garage--vehiculos.2.texto':
    'Berapa kendaraan, berapa administrasi yang masih berjalan, dan berapa yang sudah kamu keluarkan tahun ini. Buat Pep, mobil itu mahal ongkosnya.',
  'tut.app-garage--vehiculos.2b.titulo': 'Menambahkan yang baru',
  'tut.app-garage--vehiculos.2b.texto':
    'Nama, jenis, merek, model, tahun, plat nomor, dan odometer hari ini. Dengan plat nomor tercatat, garasi tahu urusan apa yang harus ditawarkan nanti.',
  'tut.app-garage--vehiculos.3.titulo': 'Sepeda sehari-hari',
  'tut.app-garage--vehiculos.3.texto':
    'Transportasi sungguhannya: rantai, ban dalam, rem, satu per satu di barisnya sendiri — arsip folder per tahun dan bulan yang sama seperti di aplikasi lain. Perhatikan servisnya menumpuk di bulan-bulan terakhir: itu latihan maraton yang menagih ongkosnya.',
  'tut.app-garage--vehiculos.4.titulo': 'Dan mobil warisan itu',
  'tut.app-garage--vehiculos.4.texto':
    'Kerusakan bulan ke-7 ada di sini: mogok di jalan, ada derek, dan hampir sepuluh ribu peso yang tidak dia punya. Tiap servis menyimpan biayanya, jarak tempuhnya, dan bengkel mana yang mengerjakannya.',
  'tut.app-garage--vehiculos.5.titulo': 'Kartu kendaraan',
  'tut.app-garage--vehiculos.5.texto':
    'Merek, model, tahun, pelat nomor, dan odometer terkini. Begitu pelatnya diisi, garasi membuka administrasi yang hanya berlaku untuk mobil.',
  'tut.app-garage--tramites.tabs.titulo': 'Tiga buku',
  'tut.app-garage--tramites.tabs.texto':
    'Kartu tiap kendaraan membagi berkas-berkasnya ke tiga buku: Administrasi, Dokumen, dan Kontak. Riwayat servis selalu ada di bawah, buku mana pun yang sedang dilihat.',
  'tut.app-garage--tramites.1.titulo': 'Yang akan datang',
  'tut.app-garage--tramites.1.texto':
    'Tiap administrasi menyimpan tanggal jatuh tempo berikutnya, berapa bulan sekali berulang, dan berapa biayanya. Begitu kamu menyelesaikannya, tanggalnya melompat sendiri ke yang berikutnya.',
  'tut.app-garage--tramites.2.titulo': 'Sepeda tidak bayar pajak kendaraan',
  'tut.app-garage--tramites.2.texto':
    'Tanpa pelat nomor, hanya yang berlaku yang ditawarkan: untuk sepeda, servis berkalanya. Uji emisi, pajak kendaraan, atau asuransi meminta pelat nomor, jadi buku Dokumen miliknya tetap kosong.',
  'tut.app-garage--tramites.2b.titulo': 'Dokumen, disimpan terpisah',
  'tut.app-garage--tramites.2b.texto':
    'STNK, polis asuransi, dan pajak kendaraan tidak bercampur dengan yang terjadi di bengkel: mereka punya buku catatan sendiri, dengan nomor referensi, tanggal jatuh tempo, dan peringatan sebelumnya.',
  'tut.app-garage--tramites.3.titulo': 'Buku Kontak',
  'tut.app-garage--tramites.3.texto':
    'Bengkel langgananmu, perusahaan asuransi, tempat uji emisi, toko sepeda di dekat rumah, dan derek malam itu — nomor telepon dan alamatnya sejauh satu ketukan.',
  'tut.app-garage--tramites.4.texto':
    'Semua administrasi itu ada juga di kalender rumah, lengkap dengan peringatan sebelumnya. Dan hati-hati: kendaraan yang kamu kemudikan di peta itu hal lain, mereka tinggal di Inventaris.',
  'tut.app-sala--mapa.1.titulo': 'Ke mana saja kamu pernah pergi',
  'tut.app-sala--mapa.1.texto':
    'Empat negara dan beberapa kota: hampir semuanya dari satu perjalanan yang sama. Sentuh salah satu dari tiga angka itu untuk melihat daftarnya di bawah peta.',
  'tut.app-sala--mapa.2.titulo': 'Pin-pinnya',
  'tut.app-sala--mapa.2.texto':
    'Tujuh pin yang berkumpul di Jepang adalah tiga minggu perjalanan itu; yang kuning —Seoul, Patagonia, Islandia— adalah yang belum terjadi. Untuk menaruh pin baru, nyalakan «Pin yang dikunjungi» atau «Pin daftar keinginan» lalu sentuh tempatnya di peta.',
  'tut.app-sala--mapa.3.titulo': 'Globe',
  'tut.app-sala--mapa.3.texto':
    'Sakelar di atas mengganti peta datar dengan globe yang kamu putar dengan menyeret, dengan pin-pin yang sama dan bisa disentuh. Globe hanya untuk melihat: pin baru dipasang di tampilan Datar.',
  'tut.app-sala--japon.1.titulo': 'Album',
  'tut.app-sala--japon.1.texto':
    'Satu folder per negara, lengkap dengan foto sampulnya. Di dalamnya satu kartu per tempat, dan di dalam tiap kartu: apa yang Pep tulis hari itu.',
  'tut.app-sala--japon.2.titulo': 'Yang dia tulis di sana',
  'tut.app-sala--japon.2.texto':
    'Delapan entri dari perjalanan itu, masing-masing dengan fotonya: Gunung Fuji saat fajar, hutan bambu Arashiyama, rusa-rusa di Nara. Semuanya ditulis di tempat, saat baunya masih menempel.',
  'tut.app-sala--japon.3.texto':
    'Di dalam tiap tempat, tombol “Rencana perjalanan” membuka lembar perjalanannya: hari demi hari, dari mana ke mana, tidur di mana, bergerak dengan apa, dan berapa biayanya.',
  'tut.app-sala--proximo.1.titulo': 'Yang belum kesampaian',
  'tut.app-sala--proximo.1.texto':
    'Tiga mimpi yang sudah dicatat. Seoul sudah punya tanggal dan rencana; Patagonia dan Islandia masih sebatas ide. Yang punya tanggal akan muncul di kalendermu.',
  'tut.app-sala--proximo.2.titulo': 'Dari lembar ke target',
  'tut.app-sala--proximo.2.texto':
    'Delapan hari di Korea menjumlahkan berapa biaya perjalanannya, dan jumlah itu tersimpan sebagai target tabungan di Ruang Kerja: melihatnya tumbuh di sana berarti melihatnya mendekat di sini.',
  'tut.app-sala--proximo.3.titulo': 'Rute',
  'tut.app-sala--proximo.3.texto':
    'Sebuah rute merangkai tempat-tempat secara berurutan dan menggambarnya di peta. Rute Jepang adalah perjalanan yang sudah dia tempuh; rute Korea, yang ingin dia tempuh.',
  'tut.app-entretenimiento--archivo.1.titulo': 'Tiga puluh judul, satu tahun',
  'tut.app-entretenimiento--archivo.1.texto':
    'Film, serial, buku, dan video game, diurutkan berdasarkan kapan dia menyelesaikannya. Ada maraton di bulan ke-7 (dengan lutut yang cedera, waktu di sofa jadi berlimpah) dan celah tiga minggu: Jepang.',
  'tut.app-entretenimiento--archivo.2.titulo': 'Entri',
  'tut.app-entretenimiento--archivo.2.texto':
    'Judul, penulis atau sutradara, genre, status, dan bintang. Ulasan berisi pendapat Pep, bukan ringkasan cerita: setahun lagi, hanya bagian itulah yang berguna untuknya.',
  'tut.app-entretenimiento--archivo.3.titulo': 'Empat cara mengurutkannya',
  'tut.app-entretenimiento--archivo.3.texto':
    'Berdasarkan genre, berdasarkan kategori (film, serial, buku, video game), berdasarkan penulis, atau berdasarkan tanggal. Di tampilan per genre, foldernya bisa diseret: taruh yang paling sering kamu tonton di urutan pertama.',
  'tut.app-entretenimiento--juegos.1.texto':
    '1-2 pemain atau 3+ pemain: filternya menyembunyikan yang tidak cocok untuk kelompok di depanmu. Permainan bertanda “2+” muncul di kedua bagian.',
  'tut.app-entretenimiento--juegos.2.titulo': 'Berdasarkan jenis',
  'tut.app-entretenimiento--juegos.2.texto':
    'Permainan Papan, Asah Otak, Arcade, Permainan Kartu, Permainan Kelompok: setiap jenis punya warnanya sendiri. Catur, Dam, Domino, Blackjack, Tetris, Penyapu Ranjau, dan lebih dari selusin lainnya.',
  'tut.app-entretenimiento--juegos.3.titulo': 'Sekali ketuk, langsung main',
  'tut.app-entretenimiento--juegos.3.texto':
    'Setiap kartu membuka permainan dalam layar penuh; yang mendukungnya membawa pemilih Kesulitan sendiri di bagian atas. Kembali membawamu tepat ke sini lagi, tanpa kehilangan posisimu.',
  'tut.app-diario--habito.1.titulo': 'Berita utama hari ini',
  'tut.app-diario--habito.1.texto':
    'Dunia, ekonomi, teknologi, kesehatan, olahraga, dan hiburan, dengan chip di atas untuk menyaring. Nama-nama korannya pers sungguhan dalam bahasamu —tiap berita utama menyebut korannya sendiri— dan tiap hari media yang berbeda masuk, bergiliran.',
  'tut.app-diario--habito.2.titulo': 'Memperbarui dirinya sendiri',
  'tut.app-diario--habito.2.texto':
    'Edisi hari itu diunduh sendiri dan tengah malam diganti seutuhnya: di sini tidak ada yang menumpuk, persis seperti koran sungguhan. Dan kalau kamu mengganti bahasa rumah, persnya ikut berganti: tiap bahasa membawa medianya sendiri.',
  'tut.app-diario--habito.3.titulo': 'Sehari dalam sejarah',
  'tut.app-diario--habito.3.texto':
    'Setengah lainnya: apa yang terjadi di hari seperti ini, sebuah karya seni, sebuah buku, sebuah spesies, sebuah kata. Ini alasan bagus untuk membukanya walau kamu sedang malas membaca berita.',
  'tut.app-diario--habito.4.texto':
    'Pep membacanya sekitar dua ratus hari tahun ini: banyak di awal, hampir tidak pernah di bulan yang berat, dan setiap hari selama tiga minggu terakhir. Runtunannya hidup dari situ.',
  'tut.app-diario--reparto.1.titulo': 'Pengiriman oleh asisten',
  'tut.app-diario--reparto.1.texto':
    'Di sini kamu mengatur siapa membawakan apa untukmu. Ini bukan notifikasi biasa: pesannya datang dari asisten, dengan suaranya sendiri.',
  'tut.app-diario--reparto.2.titulo': 'Dua pengantar koran',
  'tut.app-diario--reparto.2.texto':
    'Penyihir mengantarkan Dunia, Teknologi, dan Ekonomi kepadanya pukul 7:30. Laika membawa yang ringan-ringan kapan pun dia mau. Setiap asisten memilih bagian dan modenya sendiri.',
}
