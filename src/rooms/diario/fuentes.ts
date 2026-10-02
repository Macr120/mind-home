import type { CategoriaTitular, Titular } from '../../core/data/db'
import type { Idioma } from '../../core/state/ajustesStore'
import { diaDelAnio } from '../../core/fechaLocal'
import { enIdioma, type PorIdioma } from '../../core/i18n/porIdioma'
import { CATEGORIAS } from './constantes'

/**
 * Medios del periódico, por idioma y categoría. Cada edición mezcla varios:
 * de cada categoría entra un medio distinto según el día (rotan), así los
 * titulares no salen siempre de la misma cabecera.
 *
 * La mayoría de feeds se piden directo porque responden con CORS abierto. Los
 * marcados `proxy` no lo hacen y hay que pasarlos por rss2json, que corta las
 * peticiones seguidas: por eso solo entran unos pocos por edición.
 */
interface Medio {
  nombre: string
  categoria: CategoriaTitular
  url: string
  proxy?: boolean
}

const EL_PAIS = (seccion: string) =>
  `https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/${seccion}/portada`
const AS = (seccion = '') =>
  `https://feeds.as.com/mrss-s/pages/as/site/as.com/${seccion ? `section/${seccion}/` : ''}portada`
const NYT = (seccion: string) => `https://rss.nytimes.com/services/xml/rss/nyt/${seccion}.xml`
const WIRED = (seccion = '') =>
  seccion ? `https://www.wired.com/feed/category/${seccion}/latest/rss` : 'https://www.wired.com/feed/rss'
const CBS_SPORTS = (seccion = '') => `https://www.cbssports.com/rss/headlines/${seccion}`
const BBC = (seccion: string) => `https://feeds.bbci.co.uk/${seccion}/rss.xml`
const GUARDIAN = (seccion: string) => `https://www.theguardian.com/${seccion}/rss`
const EL_MUNDO = (seccion: string) => `https://e00-elmundo.uecdn.es/elmundo/rss/${seccion}.xml`
const G1 = (seccion = '') => `https://g1.globo.com/rss/g1/${seccion}`
const AGENCIA_BRASIL = (seccion: string) => `https://agenciabrasil.ebc.com.br/rss/${seccion}/feed.xml`
const FRANCEINFO = (seccion: string) => `https://www.franceinfo.fr/${seccion}.rss`
const LE_MONDE = (seccion: string) => `https://www.lemonde.fr/${seccion}/rss_full.xml`
const TAGESSCHAU = (seccion: string) => `https://www.tagesschau.de/${seccion}/index~rss2.xml`
const SPIEGEL = (seccion: string) => `https://www.spiegel.de/${seccion}/index.rss`
const SOLE_24_ORE = (seccion: string) => `https://www.ilsole24ore.com/rss/${seccion}.xml`
const IL_POST = (seccion: string) => `https://www.ilpost.it/${seccion}/feed/`
const ANSA = (seccion: string) => `https://www.ansa.it/sito/notizie/${seccion}/${seccion}_rss.xml`
const DW = (feed: string) => `https://rss.dw.com/xml/rss-${feed}`
const DW_ZH = (seccion: string) => DW(`chi-${seccion}`)
const CHINANEWS = (seccion: string) => `https://www.chinanews.com.cn/rss/${seccion}.xml`
const AMAR_UJALA = (seccion: string) => `https://www.amarujala.com/rss/${seccion}.xml`
const LIVE_HINDUSTAN = (seccion: string) => `https://api.livehindustan.com/feeds/rss/${seccion}/rssfeed.xml`
const HANI = (seccion = '') => `https://www.hani.co.kr/rss${seccion ? `/${seccion}` : ''}`
const YNA = (seccion: string) => `https://www.yna.co.kr/rss/${seccion}.xml`
const OHMYNEWS = (seccion: string) => `https://rss.ohmynews.com/rss/${seccion}.xml`
const CNN_TURK = (seccion: string) => `https://www.cnnturk.com/feed/rss/${seccion}/news`
const CUMHURIYET = (seccion: string) => `https://www.cumhuriyet.com.tr/rss/${seccion}`
const CNN_ID = (seccion: string) => `https://www.cnnindonesia.com/${seccion}/rss`
const ANTARA = (seccion: string) => `https://www.antaranews.com/rss/${seccion}.xml`
const RMF24 = (seccion: string) => `https://www.rmf24.pl/${seccion}/feed`
const CNN_AR = (seccion = '') => `https://arabic.cnn.com/api/v1/rss/${seccion ? `${seccion}/` : ''}rss.xml`
const SKY_NEWS_AR = (seccion: string) => `https://www.skynewsarabia.com/web/rss/${seccion}.xml`
const AAWSAT = (seccion: string) => `https://aawsat.com/feed/${seccion}`
const NOS = (feed: string) => `https://feeds.nos.nl/${feed}`
const NU = (seccion: string) => `https://www.nu.nl/rss/${seccion}`

const MEDIOS_ES: Medio[] = [
  { nombre: 'El País', categoria: 'mundo', url: EL_PAIS('internacional') },
  { nombre: 'El País América', categoria: 'mundo', url: EL_PAIS('america') },
  { nombre: 'El País México', categoria: 'mundo', url: EL_PAIS('mexico') },
  { nombre: 'RTVE', categoria: 'mundo', url: 'https://api2.rtve.es/rss/temas_noticias.xml' },
  { nombre: 'BBC Mundo', categoria: 'mundo', url: 'https://feeds.bbci.co.uk/mundo/rss.xml', proxy: true },
  { nombre: 'elDiario.es', categoria: 'mundo', url: 'https://www.eldiario.es/rss/', proxy: true },
  { nombre: '20minutos', categoria: 'mundo', url: 'https://www.20minutos.es/rss/', proxy: true },
  { nombre: 'France 24', categoria: 'mundo', url: 'https://www.france24.com/es/rss', proxy: true },
  { nombre: 'El Mundo', categoria: 'mundo', url: EL_MUNDO('internacional'), proxy: true },

  { nombre: 'El País Economía', categoria: 'economia', url: EL_PAIS('economia') },
  { nombre: 'Expansión', categoria: 'economia', url: 'https://e00-expansion.uecdn.es/rss/portada.xml', proxy: true },
  { nombre: 'El Confidencial', categoria: 'economia', url: 'https://rss.elconfidencial.com/mercados/', proxy: true },
  { nombre: 'El Mundo Economía', categoria: 'economia', url: EL_MUNDO('economia'), proxy: true },

  { nombre: 'El País Tecnología', categoria: 'tecnologia', url: EL_PAIS('tecnologia') },
  { nombre: 'Xataka', categoria: 'tecnologia', url: 'https://www.xataka.com/index.xml', proxy: true },
  { nombre: 'Hipertextual', categoria: 'tecnologia', url: 'https://hipertextual.com/feed', proxy: true },
  { nombre: 'Genbeta', categoria: 'tecnologia', url: 'https://www.genbeta.com/index.xml', proxy: true },

  { nombre: 'El País Salud', categoria: 'salud', url: EL_PAIS('salud-y-bienestar') },
  { nombre: 'El País Ciencia', categoria: 'salud', url: EL_PAIS('ciencia') },
  {
    nombre: 'National Geographic',
    categoria: 'salud',
    url: 'https://www.nationalgeographic.com.es/feeds/rss.html',
  },
  { nombre: 'El Mundo Ciencia', categoria: 'salud', url: EL_MUNDO('ciencia'), proxy: true },

  { nombre: 'El País Deportes', categoria: 'deportes', url: EL_PAIS('deportes') },
  { nombre: 'Diario AS', categoria: 'deportes', url: AS() },
  { nombre: 'AS Fútbol', categoria: 'deportes', url: AS('futbol') },
  { nombre: 'Marca', categoria: 'deportes', url: 'https://e00-marca.uecdn.es/rss/portada.xml', proxy: true },

  { nombre: 'El País Cultura', categoria: 'entretenimiento', url: EL_PAIS('cultura') },
  { nombre: 'El País Televisión', categoria: 'entretenimiento', url: EL_PAIS('television') },
  { nombre: 'El País Gente', categoria: 'entretenimiento', url: EL_PAIS('gente') },
  { nombre: 'El País Semanal', categoria: 'entretenimiento', url: EL_PAIS('eps') },
  { nombre: 'Espinof', categoria: 'entretenimiento', url: 'https://www.espinof.com/index.xml', proxy: true },
  { nombre: 'El Mundo Cultura', categoria: 'entretenimiento', url: EL_MUNDO('cultura'), proxy: true },
]

const MEDIOS_EN: Medio[] = [
  { nombre: 'The New York Times', categoria: 'mundo', url: NYT('World') },
  { nombre: 'NYT Europe', categoria: 'mundo', url: NYT('Europe') },
  { nombre: 'The Atlantic', categoria: 'mundo', url: 'https://www.theatlantic.com/feed/all/' },
  { nombre: 'NYT Climate', categoria: 'mundo', url: NYT('Climate') },
  { nombre: 'BBC News', categoria: 'mundo', url: BBC('news/world'), proxy: true },
  { nombre: 'The Guardian', categoria: 'mundo', url: GUARDIAN('world'), proxy: true },
  { nombre: 'NPR', categoria: 'mundo', url: 'https://feeds.npr.org/1004/rss.xml', proxy: true },

  { nombre: 'The New York Times', categoria: 'economia', url: NYT('Business') },
  { nombre: 'WIRED Business', categoria: 'economia', url: WIRED('business') },
  { nombre: 'BBC Business', categoria: 'economia', url: BBC('news/business'), proxy: true },
  { nombre: 'The Guardian', categoria: 'economia', url: GUARDIAN('business'), proxy: true },

  { nombre: 'The New York Times', categoria: 'tecnologia', url: NYT('Technology') },
  { nombre: 'WIRED', categoria: 'tecnologia', url: WIRED() },
  { nombre: 'WIRED Gear', categoria: 'tecnologia', url: WIRED('gear') },
  { nombre: 'BBC Technology', categoria: 'tecnologia', url: BBC('news/technology'), proxy: true },
  { nombre: 'The Verge', categoria: 'tecnologia', url: 'https://www.theverge.com/rss/index.xml', proxy: true },
  { nombre: 'Ars Technica', categoria: 'tecnologia', url: 'https://feeds.arstechnica.com/arstechnica/index', proxy: true },

  { nombre: 'The New York Times', categoria: 'salud', url: NYT('Health') },
  { nombre: 'NYT Science', categoria: 'salud', url: NYT('Science') },
  { nombre: 'WIRED Science', categoria: 'salud', url: WIRED('science') },
  { nombre: 'BBC Health', categoria: 'salud', url: BBC('news/health'), proxy: true },
  { nombre: 'The Guardian', categoria: 'salud', url: GUARDIAN('society/health'), proxy: true },

  { nombre: 'CBS Sports', categoria: 'deportes', url: CBS_SPORTS() },
  { nombre: 'CBS Sports NBA', categoria: 'deportes', url: CBS_SPORTS('nba/') },
  { nombre: 'CBS Sports NFL', categoria: 'deportes', url: CBS_SPORTS('nfl/') },
  { nombre: 'BBC Sport', categoria: 'deportes', url: BBC('sport'), proxy: true },
  { nombre: 'The Guardian', categoria: 'deportes', url: GUARDIAN('sport'), proxy: true },

  { nombre: 'The New York Times', categoria: 'entretenimiento', url: NYT('Arts') },
  { nombre: 'NYT Movies', categoria: 'entretenimiento', url: NYT('Movies') },
  { nombre: 'NYT Music', categoria: 'entretenimiento', url: NYT('Music') },
  { nombre: 'Pitchfork', categoria: 'entretenimiento', url: 'https://pitchfork.com/feed/feed-news/rss' },
  { nombre: 'WIRED Culture', categoria: 'entretenimiento', url: WIRED('culture') },
  { nombre: 'BBC Entertainment', categoria: 'entretenimiento', url: BBC('news/entertainment_and_arts'), proxy: true },
  { nombre: 'The Guardian', categoria: 'entretenimiento', url: GUARDIAN('culture'), proxy: true },
  { nombre: 'Variety', categoria: 'entretenimiento', url: 'https://variety.com/feed/', proxy: true },
]

const MEDIOS_PT: Medio[] = [
  { nombre: 'Folha de S.Paulo', categoria: 'mundo', url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', proxy: true },
  { nombre: 'G1', categoria: 'mundo', url: G1(), proxy: true },
  { nombre: 'RTP Notícias', categoria: 'mundo', url: 'https://www.rtp.pt/noticias/rss/pais', proxy: true },
  { nombre: 'Agência Brasil', categoria: 'mundo', url: AGENCIA_BRASIL('ultimasnoticias') },

  { nombre: 'Agência Brasil Economia', categoria: 'economia', url: AGENCIA_BRASIL('economia') },
  { nombre: 'G1 Economia', categoria: 'economia', url: G1('economia/'), proxy: true },
  { nombre: 'RTP Economia', categoria: 'economia', url: 'https://www.rtp.pt/noticias/rss/economia', proxy: true },

  { nombre: 'Revista Pesquisa FAPESP', categoria: 'tecnologia', url: 'https://revistapesquisa.fapesp.br/feed/' },
  { nombre: 'G1 Tecnologia', categoria: 'tecnologia', url: G1('tecnologia/'), proxy: true },
  { nombre: 'Tecnoblog', categoria: 'tecnologia', url: 'https://tecnoblog.net/feed/', proxy: true },

  { nombre: 'Agência Brasil Saúde', categoria: 'salud', url: AGENCIA_BRASIL('saude') },
  { nombre: 'G1 Ciência e Saúde', categoria: 'salud', url: G1('ciencia-e-saude/'), proxy: true },
  { nombre: 'Drauzio Varella', categoria: 'salud', url: 'https://drauziovarella.uol.com.br/feed/', proxy: true },

  { nombre: 'Agência Brasil Esportes', categoria: 'deportes', url: AGENCIA_BRASIL('esportes') },
  { nombre: 'ge', categoria: 'deportes', url: 'https://ge.globo.com/rss/ge/', proxy: true },
  { nombre: 'RTP Desporto', categoria: 'deportes', url: 'https://www.rtp.pt/noticias/rss/desporto', proxy: true },

  { nombre: 'G1 Pop & Arte', categoria: 'entretenimiento', url: G1('pop-arte/'), proxy: true },
  { nombre: 'Agência Brasil Cultura', categoria: 'entretenimiento', url: AGENCIA_BRASIL('cultura') },
]

const MEDIOS_FR: Medio[] = [
  { nombre: 'Franceinfo', categoria: 'mundo', url: 'https://www.franceinfo.fr/titres.rss' },
  { nombre: 'Le Monde', categoria: 'mundo', url: 'https://www.lemonde.fr/rss/une.xml', proxy: true },
  { nombre: 'France 24', categoria: 'mundo', url: 'https://www.france24.com/fr/rss', proxy: true },

  { nombre: 'Franceinfo Économie', categoria: 'economia', url: FRANCEINFO('economie') },
  { nombre: 'Le Monde Économie', categoria: 'economia', url: LE_MONDE('economie'), proxy: true },
  { nombre: 'Le Figaro Économie', categoria: 'economia', url: 'https://www.lefigaro.fr/rss/figaro_economie.xml', proxy: true },

  { nombre: 'Franceinfo Internet', categoria: 'tecnologia', url: FRANCEINFO('internet') },
  { nombre: 'Le Monde Pixels', categoria: 'tecnologia', url: LE_MONDE('pixels'), proxy: true },
  { nombre: 'Numerama', categoria: 'tecnologia', url: 'https://www.numerama.com/feed/', proxy: true },

  { nombre: 'Franceinfo Santé', categoria: 'salud', url: FRANCEINFO('sante') },
  { nombre: 'Franceinfo Sciences', categoria: 'salud', url: FRANCEINFO('sciences') },
  { nombre: 'Le Monde Santé', categoria: 'salud', url: LE_MONDE('sante'), proxy: true },

  { nombre: 'Franceinfo Sports', categoria: 'deportes', url: FRANCEINFO('sports') },
  { nombre: "L'Équipe", categoria: 'deportes', url: 'https://dwh.lequipe.fr/api/edito/rss?path=/' },
  { nombre: 'Le Monde Sport', categoria: 'deportes', url: LE_MONDE('sport'), proxy: true },

  { nombre: 'Franceinfo Culture', categoria: 'entretenimiento', url: 'https://www.franceinfo.fr/culture.rss' },
  { nombre: 'Le Monde Culture', categoria: 'entretenimiento', url: LE_MONDE('culture'), proxy: true },
]

const MEDIOS_DE: Medio[] = [
  {
    nombre: 'Tagesschau',
    categoria: 'mundo',
    url: 'https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml',
  },
  { nombre: 'Die Zeit', categoria: 'mundo', url: 'https://newsfeed.zeit.de/index', proxy: true },
  { nombre: 'Der Spiegel', categoria: 'mundo', url: 'https://www.spiegel.de/schlagzeilen/index.rss', proxy: true },
  { nombre: 'DW Nachrichten', categoria: 'mundo', url: DW('de-all') },

  { nombre: 'Tagesschau Wirtschaft', categoria: 'economia', url: TAGESSCHAU('wirtschaft') },
  { nombre: 'Der Spiegel Wirtschaft', categoria: 'economia', url: SPIEGEL('wirtschaft'), proxy: true },
  { nombre: 'Die Zeit Wirtschaft', categoria: 'economia', url: 'https://newsfeed.zeit.de/wirtschaft/index', proxy: true },

  { nombre: 'heise online', categoria: 'tecnologia', url: 'https://www.heise.de/rss/heise-top-atom.xml' },
  { nombre: 'Der Spiegel Netzwelt', categoria: 'tecnologia', url: SPIEGEL('netzwelt'), proxy: true },
  { nombre: 'Golem.de', categoria: 'tecnologia', url: 'https://rss.golem.de/rss.php?feed=ATOM1.0', proxy: true },

  { nombre: 'Tagesschau Gesundheit', categoria: 'salud', url: TAGESSCHAU('wissen/gesundheit') },
  { nombre: 'Ärzteblatt', categoria: 'salud', url: 'https://www.aerzteblatt.de/rss/news.asp' },
  { nombre: 'Der Spiegel Gesundheit', categoria: 'salud', url: SPIEGEL('gesundheit'), proxy: true },

  { nombre: 'kicker', categoria: 'deportes', url: 'https://newsfeed.kicker.de/news/aktuell' },
  { nombre: 'DW Sport', categoria: 'deportes', url: DW('de-sport') },
  { nombre: 'Der Spiegel Sport', categoria: 'deportes', url: SPIEGEL('sport'), proxy: true },

  {
    nombre: 'Der Spiegel Kultur',
    categoria: 'entretenimiento',
    url: 'https://www.spiegel.de/kultur/index.rss',
    proxy: true,
  },
  { nombre: 'Tagesschau Kultur', categoria: 'entretenimiento', url: TAGESSCHAU('kultur') },
]

const MEDIOS_IT: Medio[] = [
  { nombre: 'ANSA', categoria: 'mundo', url: 'https://www.ansa.it/sito/ansait_rss.xml', proxy: true },
  {
    nombre: 'la Repubblica',
    categoria: 'mundo',
    url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml',
    proxy: true,
  },
  { nombre: 'Il Sole 24 Ore Mondo', categoria: 'mundo', url: SOLE_24_ORE('mondo') },

  { nombre: 'Il Sole 24 Ore', categoria: 'economia', url: SOLE_24_ORE('economia') },
  { nombre: 'Il Post Economia', categoria: 'economia', url: IL_POST('economia') },
  { nombre: 'ANSA Economia', categoria: 'economia', url: ANSA('economia'), proxy: true },

  { nombre: 'Il Sole 24 Ore Tecnologia', categoria: 'tecnologia', url: SOLE_24_ORE('tecnologia') },
  { nombre: 'Punto Informatico', categoria: 'tecnologia', url: 'https://www.punto-informatico.it/feed/' },
  { nombre: 'ANSA Tecnologia', categoria: 'tecnologia', url: ANSA('tecnologia'), proxy: true },

  { nombre: 'Il Sole 24 Ore Salute', categoria: 'salud', url: SOLE_24_ORE('salute') },
  { nombre: 'Il Post Scienza', categoria: 'salud', url: IL_POST('scienza') },
  {
    nombre: 'ANSA Salute',
    categoria: 'salud',
    url: 'https://www.ansa.it/canale_saluteebenessere/notizie/saluteebenessere_rss.xml',
    proxy: true,
  },
  { nombre: 'RaiNews Salute', categoria: 'salud', url: 'https://www.rainews.it/rss/salute', proxy: true },

  { nombre: 'Il Post Sport', categoria: 'deportes', url: IL_POST('sport') },
  { nombre: 'Calcio e Finanza', categoria: 'deportes', url: 'https://www.calcioefinanza.it/feed/' },
  { nombre: 'ANSA Sport', categoria: 'deportes', url: ANSA('sport'), proxy: true },
  { nombre: 'Sky TG24 Sport', categoria: 'deportes', url: 'https://tg24.sky.it/rss/tg24_sport.xml', proxy: true },

  {
    nombre: 'la Repubblica Spettacoli',
    categoria: 'entretenimiento',
    url: 'https://www.repubblica.it/rss/spettacoli/rss2.0.xml',
    proxy: true,
  },
  { nombre: 'Il Post Cultura', categoria: 'entretenimiento', url: IL_POST('cultura') },
  { nombre: 'Il Sole 24 Ore Cultura', categoria: 'entretenimiento', url: SOLE_24_ORE('cultura') },
]

const MEDIOS_JA: Medio[] = [
  { nombre: '朝日新聞', categoria: 'mundo', url: 'https://www.asahi.com/rss/asahi/newsheadlines.rdf', proxy: true },
  { nombre: 'CNN.co.jp', categoria: 'mundo', url: 'https://feeds.cnn.co.jp/rss/cnn/cnn.rdf' },

  { nombre: '朝日新聞 経済', categoria: 'economia', url: 'https://www.asahi.com/rss/asahi/business.rdf', proxy: true },
  { nombre: '東洋経済オンライン', categoria: 'economia', url: 'https://toyokeizai.net/list/feed/rss', proxy: true },

  { nombre: 'WIRED.jp', categoria: 'tecnologia', url: 'https://wired.jp/feed/rss' },
  { nombre: 'MITテクノロジーレビュー', categoria: 'tecnologia', url: 'https://www.technologyreview.jp/feed/' },
  { nombre: 'ITmedia NEWS', categoria: 'tecnologia', url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml', proxy: true },

  { nombre: 'ヨミドクター', categoria: 'salud', url: 'https://www.yomiuri.co.jp/yomidr/feed/' },

  { nombre: '朝日新聞 スポーツ', categoria: 'deportes', url: 'https://www.asahi.com/rss/asahi/sports.rdf', proxy: true },
  { nombre: 'THE ANSWER', categoria: 'deportes', url: 'https://the-ans.jp/feed/', proxy: true },

  { nombre: 'シネマトゥデイ', categoria: 'entretenimiento', url: 'https://feeds.cinematoday.jp/rss', proxy: true },
]

const MEDIOS_ZH: Medio[] = [
  { nombre: '德国之声中文网', categoria: 'mundo', url: DW_ZH('all') },
  { nombre: '法广RFI中文', categoria: 'mundo', url: 'https://www.rfi.fr/cn/rss', proxy: true },
  { nombre: '纽约时报中文网', categoria: 'mundo', url: 'https://cn.nytimes.com/rss/', proxy: true },
  { nombre: '中国新闻网 国际', categoria: 'mundo', url: CHINANEWS('world') },

  { nombre: '德国之声中文网 经济', categoria: 'economia', url: DW_ZH('eco') },
  { nombre: '中国新闻网 财经', categoria: 'economia', url: CHINANEWS('finance') },

  { nombre: '少数派', categoria: 'tecnologia', url: 'https://sspai.com/feed' },
  { nombre: '极客公园', categoria: 'tecnologia', url: 'https://www.geekpark.net/rss' },
  { nombre: '德国之声中文网 科技', categoria: 'tecnologia', url: DW_ZH('sci') },
  { nombre: 'IT之家', categoria: 'tecnologia', url: 'https://www.ithome.com/rss/', proxy: true },

  { nombre: '中国新闻网 健康', categoria: 'salud', url: CHINANEWS('health') },

  { nombre: '中国新闻网 体育', categoria: 'deportes', url: CHINANEWS('sports') },

  { nombre: '德国之声中文网 文化', categoria: 'entretenimiento', url: DW_ZH('cul') },
  { nombre: '中国新闻网 文化', categoria: 'entretenimiento', url: CHINANEWS('culture') },
]

const MEDIOS_KO: Medio[] = [
  { nombre: '연합뉴스', categoria: 'mundo', url: 'https://www.yna.co.kr/rss/news.xml', proxy: true },
  { nombre: '한겨레', categoria: 'mundo', url: HANI(), proxy: true },
  { nombre: '동아일보', categoria: 'mundo', url: 'https://rss.donga.com/total.xml', proxy: true },
  { nombre: '오마이뉴스', categoria: 'mundo', url: OHMYNEWS('ohmynews') },

  { nombre: '오마이뉴스 경제', categoria: 'economia', url: OHMYNEWS('economy') },
  { nombre: '연합뉴스 경제', categoria: 'economia', url: YNA('economy'), proxy: true },
  { nombre: '한겨레 경제', categoria: 'economia', url: HANI('economy'), proxy: true },

  { nombre: '게임메카', categoria: 'tecnologia', url: 'https://www.gamemeca.com/rss.php' },
  { nombre: '전자신문', categoria: 'tecnologia', url: 'https://rss.etnews.com/Section901.xml', proxy: true },
  { nombre: 'ZDNet Korea', categoria: 'tecnologia', url: 'https://feeds.feedburner.com/zdkorea', proxy: true },

  { nombre: '헬스조선', categoria: 'salud', url: 'https://health.chosun.com/site/data/rss/rss.xml' },
  { nombre: '연합뉴스 건강', categoria: 'salud', url: YNA('health'), proxy: true },

  { nombre: '오마이뉴스 스포츠', categoria: 'deportes', url: OHMYNEWS('sports') },
  { nombre: '연합뉴스 스포츠', categoria: 'deportes', url: YNA('sports'), proxy: true },
  { nombre: '한겨레 스포츠', categoria: 'deportes', url: HANI('sports'), proxy: true },

  { nombre: '한겨레 문화', categoria: 'entretenimiento', url: HANI('culture'), proxy: true },
  { nombre: '오마이뉴스 문화', categoria: 'entretenimiento', url: OHMYNEWS('culture') },
]

const MEDIOS_RU: Medio[] = [
  { nombre: 'Meduza', categoria: 'mundo', url: 'https://meduza.io/rss/all', proxy: true },
  { nombre: 'РБК', categoria: 'mundo', url: 'https://rssexport.rbc.ru/rbcnews/news/30/full.rss', proxy: true },
  { nombre: 'Lenta.ru', categoria: 'mundo', url: 'https://lenta.ru/rss/news', proxy: true },
  { nombre: 'ТАСС', categoria: 'mundo', url: 'https://tass.ru/rss/v2.xml', proxy: true },
  { nombre: 'DW', categoria: 'mundo', url: DW('ru-all') },

  { nombre: 'DW Экономика', categoria: 'economia', url: DW('ru-eco') },
  {
    nombre: 'Коммерсантъ Экономика',
    categoria: 'economia',
    url: 'https://www.kommersant.ru/rss/section-economics.xml',
    proxy: true,
  },
  { nombre: 'Ведомости', categoria: 'economia', url: 'https://www.vedomosti.ru/rss/rubric/economics', proxy: true },

  { nombre: 'TechInsider', categoria: 'tecnologia', url: 'https://www.techinsider.ru/out/public-all.xml' },
  { nombre: 'Хабр', categoria: 'tecnologia', url: 'https://habr.com/ru/rss/news/', proxy: true },
  { nombre: '3DNews', categoria: 'tecnologia', url: 'https://3dnews.ru/news/rss/', proxy: true },

  { nombre: 'Доктор Питер', categoria: 'salud', url: 'https://doctorpiter.ru/rss/' },
  { nombre: 'N + 1', categoria: 'salud', url: 'https://nplus1.ru/rss', proxy: true },

  { nombre: 'Спорт-Экспресс', categoria: 'deportes', url: 'https://www.sport-express.ru/services/materials/news/se/' },
  { nombre: 'Чемпионат', categoria: 'deportes', url: 'https://www.championat.com/rss/news/' },

  { nombre: 'Lenta.ru Культура', categoria: 'entretenimiento', url: 'https://lenta.ru/rss/news/culture', proxy: true },
  { nombre: 'DW Культура', categoria: 'entretenimiento', url: DW('ru-cul') },
]

const MEDIOS_HI: Medio[] = [
  { nombre: 'BBC News हिंदी', categoria: 'mundo', url: 'https://feeds.bbci.co.uk/hindi/rss.xml', proxy: true },
  { nombre: 'अमर उजाला', categoria: 'mundo', url: AMAR_UJALA('breaking-news') },
  { nombre: 'आज तक', categoria: 'mundo', url: 'https://www.aajtak.in/rssfeeds/?id=home', proxy: true },

  { nombre: 'अमर उजाला कारोबार', categoria: 'economia', url: AMAR_UJALA('business') },
  { nombre: 'लाइव हिन्दुस्तान बिज़नेस', categoria: 'economia', url: LIVE_HINDUSTAN('business') },

  { nombre: 'अमर उजाला टेक्नोलॉजी', categoria: 'tecnologia', url: AMAR_UJALA('technology') },
  { nombre: 'लाइव हिन्दुस्तान गैजेट्स', categoria: 'tecnologia', url: LIVE_HINDUSTAN('gadgets') },

  { nombre: 'अमर उजाला लाइफस्टाइल', categoria: 'salud', url: AMAR_UJALA('lifestyle') },

  { nombre: 'अमर उजाला खेल', categoria: 'deportes', url: AMAR_UJALA('sports') },
  { nombre: 'लाइव हिन्दुस्तान खेल', categoria: 'deportes', url: LIVE_HINDUSTAN('sports') },

  { nombre: 'अमर उजाला मनोरंजन', categoria: 'entretenimiento', url: AMAR_UJALA('entertainment') },
  { nombre: 'लाइव हिन्दुस्तान मनोरंजन', categoria: 'entretenimiento', url: LIVE_HINDUSTAN('entertainment') },
]

const MEDIOS_TR: Medio[] = [
  { nombre: 'Hürriyet', categoria: 'mundo', url: 'https://www.hurriyet.com.tr/rss/anasayfa', proxy: true },
  { nombre: 'Cumhuriyet', categoria: 'mundo', url: 'https://www.cumhuriyet.com.tr/rss' },

  { nombre: 'CNN Türk Ekonomi', categoria: 'economia', url: CNN_TURK('ekonomi') },
  { nombre: 'Cumhuriyet Ekonomi', categoria: 'economia', url: CUMHURIYET('ekonomi') },
  { nombre: 'Bloomberg HT', categoria: 'economia', url: 'https://www.bloomberght.com/rss/tum-haberler.xml', proxy: true },

  { nombre: 'CNN Türk Teknoloji', categoria: 'tecnologia', url: CNN_TURK('teknoloji') },
  { nombre: 'Cumhuriyet Bilim-Teknoloji', categoria: 'tecnologia', url: CUMHURIYET('bilim-teknoloji') },
  { nombre: 'Webtekno', categoria: 'tecnologia', url: 'https://www.webtekno.com/rss.xml', proxy: true },

  { nombre: 'CNN Türk Sağlık', categoria: 'salud', url: CNN_TURK('saglik') },
  { nombre: 'Cumhuriyet Sağlık', categoria: 'salud', url: CUMHURIYET('saglik') },

  { nombre: 'CNN Türk Spor', categoria: 'deportes', url: CNN_TURK('spor') },
  { nombre: 'Cumhuriyet Spor', categoria: 'deportes', url: CUMHURIYET('spor') },

  {
    nombre: 'CNN Türk Kültür Sanat',
    categoria: 'entretenimiento',
    url: 'https://www.cnnturk.com/feed/rss/kultur-sanat/news',
  },
  { nombre: 'Cumhuriyet Kültür-Sanat', categoria: 'entretenimiento', url: CUMHURIYET('kultur-sanat') },
]

const MEDIOS_ID: Medio[] = [
  { nombre: 'Antara News', categoria: 'mundo', url: 'https://www.antaranews.com/rss/terkini.xml' },
  { nombre: 'Tempo', categoria: 'mundo', url: 'https://rss.tempo.co/nasional', proxy: true },
  { nombre: 'CNN Indonesia', categoria: 'mundo', url: CNN_ID('nasional') },
  { nombre: 'Republika', categoria: 'mundo', url: 'https://www.republika.co.id/rss', proxy: true },

  { nombre: 'CNN Indonesia Ekonomi', categoria: 'economia', url: CNN_ID('ekonomi') },
  { nombre: 'Antara Ekonomi', categoria: 'economia', url: ANTARA('ekonomi') },
  { nombre: 'CNBC Indonesia', categoria: 'economia', url: 'https://www.cnbcindonesia.com/rss', proxy: true },

  { nombre: 'CNN Indonesia Teknologi', categoria: 'tecnologia', url: CNN_ID('teknologi') },
  { nombre: 'Antara Tekno', categoria: 'tecnologia', url: ANTARA('tekno') },
  { nombre: 'Liputan6 Tekno', categoria: 'tecnologia', url: 'https://feed.liputan6.com/rss/tekno', proxy: true },

  { nombre: 'CNN Indonesia Gaya Hidup', categoria: 'salud', url: CNN_ID('gaya-hidup') },
  { nombre: 'Antara Lifestyle', categoria: 'salud', url: ANTARA('lifestyle') },
  { nombre: 'detikHealth', categoria: 'salud', url: 'https://health.detik.com/rss', proxy: true },

  { nombre: 'CNN Indonesia Olahraga', categoria: 'deportes', url: CNN_ID('olahraga') },
  { nombre: 'Antara Olahraga', categoria: 'deportes', url: ANTARA('olahraga') },
  { nombre: 'Liputan6 Bola', categoria: 'deportes', url: 'https://feed.liputan6.com/rss/bola', proxy: true },

  { nombre: 'CNN Indonesia Hiburan', categoria: 'entretenimiento', url: CNN_ID('hiburan') },
  { nombre: 'Antara Hiburan', categoria: 'entretenimiento', url: ANTARA('hiburan') },
]

const MEDIOS_PL: Medio[] = [
  { nombre: 'RMF24', categoria: 'mundo', url: RMF24('fakty'), proxy: true },
  { nombre: 'Onet Wiadomości', categoria: 'mundo', url: 'https://wiadomosci.onet.pl/.feed', proxy: true },
  { nombre: 'TVN24', categoria: 'mundo', url: 'https://tvn24.pl/najnowsze.xml', proxy: true },
  { nombre: 'Gazeta.pl', categoria: 'mundo', url: 'https://wiadomosci.gazeta.pl/pub/rss/wiadomosci.xml', proxy: true },
  { nombre: 'Wirtualna Polska', categoria: 'mundo', url: 'https://wiadomosci.wp.pl/rss.xml' },
  { nombre: 'DW', categoria: 'mundo', url: DW('pol-all') },

  { nombre: 'Money.pl', categoria: 'economia', url: 'https://www.money.pl/rss/' },
  { nombre: 'Puls Biznesu', categoria: 'economia', url: 'https://www.pb.pl/rss/najnowsze.xml' },
  { nombre: 'Bankier.pl', categoria: 'economia', url: 'https://www.bankier.pl/rss/wiadomosci.xml', proxy: true },
  { nombre: 'RMF24 Ekonomia', categoria: 'economia', url: RMF24('ekonomia'), proxy: true },

  { nombre: 'WP Tech', categoria: 'tecnologia', url: 'https://tech.wp.pl/rss/aktualnosci' },
  { nombre: 'Benchmark', categoria: 'tecnologia', url: 'https://www.benchmark.pl/rss/aktualnosci-pliki.xml' },
  { nombre: "Spider's Web", categoria: 'tecnologia', url: 'https://spidersweb.pl/feed', proxy: true },

  { nombre: 'abcZdrowie', categoria: 'salud', url: 'https://portal.abczdrowie.pl/rss.xml' },
  { nombre: 'RMF24 Zdrowie', categoria: 'salud', url: RMF24('zdrowie'), proxy: true },
  { nombre: 'Medonet', categoria: 'salud', url: 'https://www.medonet.pl/.feed', proxy: true },

  { nombre: 'Gol24', categoria: 'deportes', url: 'https://gol24.pl/rss' },
  { nombre: 'RMF24 Sport', categoria: 'deportes', url: RMF24('sport'), proxy: true },
  { nombre: 'Przegląd Sportowy', categoria: 'deportes', url: 'https://przegladsportowy.onet.pl/.feed', proxy: true },

  { nombre: 'RMF24 Kultura', categoria: 'entretenimiento', url: RMF24('kultura'), proxy: true },
  { nombre: 'WP Film', categoria: 'entretenimiento', url: 'https://film.wp.pl/rss.xml' },
]

const MEDIOS_AR: Medio[] = [
  {
    nombre: 'الجزيرة نت',
    categoria: 'mundo',
    url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9',
    proxy: true,
  },
  { nombre: 'BBC Arabic', categoria: 'mundo', url: 'https://feeds.bbci.co.uk/arabic/rss.xml', proxy: true },
  { nombre: 'France 24', categoria: 'mundo', url: 'https://www.france24.com/ar/rss', proxy: true },
  { nombre: 'CNN بالعربية', categoria: 'mundo', url: CNN_AR() },
  { nombre: 'سكاي نيوز عربية', categoria: 'mundo', url: SKY_NEWS_AR('world') },

  { nombre: 'سكاي نيوز عربية اقتصاد', categoria: 'economia', url: SKY_NEWS_AR('business') },
  { nombre: 'الشرق الأوسط اقتصاد', categoria: 'economia', url: AAWSAT('economy') },
  {
    nombre: 'France 24 اقتصاد',
    categoria: 'economia',
    url: 'https://www.france24.com/ar/%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF/rss',
    proxy: true,
  },

  { nombre: 'سكاي نيوز عربية علوم وتكنولوجيا', categoria: 'tecnologia', url: SKY_NEWS_AR('technology') },
  { nombre: 'الشرق الأوسط علوم', categoria: 'tecnologia', url: AAWSAT('science') },
  { nombre: 'البوابة العربية للأخبار التقنية', categoria: 'tecnologia', url: 'https://aitnews.com/feed/', proxy: true },

  { nombre: 'CNN بالعربية علوم وصحة', categoria: 'salud', url: CNN_AR('science_and_health') },
  { nombre: 'الشرق الأوسط صحة', categoria: 'salud', url: AAWSAT('health') },

  { nombre: 'CNN بالعربية رياضة', categoria: 'deportes', url: CNN_AR('sport') },
  { nombre: 'سكاي نيوز عربية رياضة', categoria: 'deportes', url: SKY_NEWS_AR('sport') },
  {
    nombre: 'France 24 رياضة',
    categoria: 'deportes',
    url: 'https://www.france24.com/ar/%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9/rss',
    proxy: true,
  },

  { nombre: 'CNN بالعربية ترفيه', categoria: 'entretenimiento', url: CNN_AR('entertainment') },
  { nombre: 'سكاي نيوز عربية منوعات', categoria: 'entretenimiento', url: SKY_NEWS_AR('varieties') },
]

const MEDIOS_NL: Medio[] = [
  { nombre: 'NOS', categoria: 'mundo', url: NOS('nosnieuwsalgemeen'), proxy: true },
  { nombre: 'NU.nl', categoria: 'mundo', url: 'https://www.nu.nl/rss/Algemeen', proxy: true },
  { nombre: 'de Volkskrant', categoria: 'mundo', url: 'https://www.volkskrant.nl/voorpagina/rss.xml', proxy: true },
  { nombre: 'NRC', categoria: 'mundo', url: 'https://www.nrc.nl/rss/', proxy: true },

  { nombre: 'Emerce', categoria: 'economia', url: 'https://www.emerce.nl/feed' },
  { nombre: 'NOS Economie', categoria: 'economia', url: NOS('nosnieuwseconomie'), proxy: true },
  { nombre: 'NU.nl Economie', categoria: 'economia', url: NU('Economie'), proxy: true },

  { nombre: 'Tweakers', categoria: 'tecnologia', url: 'https://tweakers.net/feeds/mixed.xml' },
  { nombre: 'Bright', categoria: 'tecnologia', url: 'https://www.bright.nl/feed/news.xml' },
  { nombre: 'NOS Tech', categoria: 'tecnologia', url: NOS('nosnieuwstech'), proxy: true },

  { nombre: 'NU.nl Gezondheid', categoria: 'salud', url: NU('Gezondheid'), proxy: true },
  { nombre: 'de Volkskrant Wetenschap', categoria: 'salud', url: 'https://www.volkskrant.nl/wetenschap/rss.xml', proxy: true },

  { nombre: 'Voetbal International', categoria: 'deportes', url: 'https://www.vi.nl/feed/news.xml' },
  { nombre: 'Voetbalprimeur', categoria: 'deportes', url: 'https://www.voetbalprimeur.nl/feed/news.xml' },
  { nombre: 'NOS Sport', categoria: 'deportes', url: NOS('nossportalgemeen'), proxy: true },

  { nombre: 'NOS Cultuur & Media', categoria: 'entretenimiento', url: NOS('nosnieuwscultuurenmedia'), proxy: true },
  { nombre: 'NU.nl Entertainment', categoria: 'entretenimiento', url: NU('Entertainment'), proxy: true },
]

/**
 * Las cabeceras por idioma. Traducir aquí no serviría de nada: un lector en
 * francés quiere prensa francesa, no El País en francés, así que cada idioma
 * trae sus propios medios. El que no tenga lista lee el periódico español.
 */
const MEDIOS: PorIdioma<Medio[]> = {
  es: MEDIOS_ES,
  en: MEDIOS_EN,
  pt: MEDIOS_PT,
  fr: MEDIOS_FR,
  de: MEDIOS_DE,
  it: MEDIOS_IT,
  ja: MEDIOS_JA,
  zh: MEDIOS_ZH,
  ko: MEDIOS_KO,
  ru: MEDIOS_RU,
  hi: MEDIOS_HI,
  tr: MEDIOS_TR,
  id: MEDIOS_ID,
  pl: MEDIOS_PL,
  ar: MEDIOS_AR,
  nl: MEDIOS_NL,
}

/** Titulares que se toman de cada medio. */
const POR_MEDIO = 3
/** Medios de refuerzo que pasan por el proxy en cada edición (su cuota es corta). */
const REFUERZOS = 3

type ItemRss = {
  title?: string
  description?: string
  content?: string
  link?: string
  pubDate?: string
  thumbnail?: string
  enclosure?: { link?: string; type?: string; thumbnail?: string }
}

type RespuestaRss = { status?: string; items?: ItemRss[] }

/** fetch JSON con timeout. */
export async function fetchJson(url: string, ms = 12_000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function textoPlano(html: string): string {
  const limpio = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return limpio.length > 300 ? `${limpio.slice(0, 297)}…` : limpio
}

const ES_IMAGEN = /\.(jpe?g|png|webp|gif)(\?|$)/i

const imagenEnHtml = (html: string) => html.match(/<img[^>]+src="([^"]+)"/i)?.[1]

/** Imagen de un item de rss2json: enclosure (si es imagen) → thumbnail → <img> del contenido. */
function imagenDeItem(item: ItemRss): string | undefined {
  const enc = item.enclosure
  if (enc?.link && (enc.type?.startsWith('image') || ES_IMAGEN.test(enc.link))) return enc.link
  if (enc?.thumbnail) return enc.thumbnail
  if (item.thumbnail) return item.thumbnail
  return imagenEnHtml(item.content ?? item.description ?? '')
}

const texto = (nodo: Element, tag: string) =>
  nodo.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''

/**
 * Imagen de un <item> del XML: los feeds la publican en media:content,
 * media:thumbnail o enclosure; si no, se rescata la primera <img> del cuerpo.
 */
function imagenDeNodo(nodo: Element): string | undefined {
  for (const tag of ['media:content', 'media:thumbnail', 'enclosure']) {
    // Varios tamaños de la misma foto: se prefiere el más ancho.
    const candidatos = [...nodo.getElementsByTagName(tag)]
      .filter((el) => {
        if (!el.getAttribute('url')) return false
        // Muchos feeds no declaran el tipo; solo se descarta lo que dice no ser imagen.
        const tipo = el.getAttribute('type') ?? el.getAttribute('medium') ?? ''
        if (tipo && !tipo.startsWith('image')) return false
        // Las miniaturas (Yahoo publica de 130 px) se ven borrosas de portada.
        const ancho = Number(el.getAttribute('width'))
        return !ancho || ancho >= 300
      })
      .sort((a, b) => Number(b.getAttribute('width') ?? 0) - Number(a.getAttribute('width') ?? 0))
    const url = candidatos[0]?.getAttribute('url')
    if (url) return url
  }
  return imagenEnHtml(
    nodo.getElementsByTagName('content:encoded')[0]?.textContent ?? texto(nodo, 'description'),
  )
}

/** Convierte el XML de un feed (RSS o Atom) en titulares de la categoría del medio. */
function parsearFeed(xml: string, medio: Medio): Titular[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML inválido')

  const nodos = [...doc.getElementsByTagName('item'), ...doc.getElementsByTagName('entry')]
  const titulares: Titular[] = []
  for (const nodo of nodos) {
    const titulo = texto(nodo, 'title')
    // Atom pone la URL en el atributo href de <link>.
    const url = texto(nodo, 'link') || (nodo.getElementsByTagName('link')[0]?.getAttribute('href') ?? '')
    if (!titulo || !url) continue
    titulares.push({
      categoria: medio.categoria,
      titulo,
      resumen: textoPlano(texto(nodo, 'description') || texto(nodo, 'summary')),
      fuente: medio.nombre,
      url,
      imagen: imagenDeNodo(nodo),
      publicado: texto(nodo, 'pubDate') || texto(nodo, 'published') || texto(nodo, 'updated'),
    })
    if (titulares.length >= POR_MEDIO) break
  }
  if (!titulares.length) throw new Error('feed vacío')
  return titulares
}

/** Feed de un medio: directo si permite CORS, por rss2json si no. */
async function cargarMedio(medio: Medio): Promise<Titular[]> {
  if (medio.proxy) {
    const data = (await fetchJson(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(medio.url)}`,
    )) as RespuestaRss
    if (data.status !== 'ok' || !data.items?.length) throw new Error('feed vacío')
    return data.items
      .filter((i) => i.title?.trim() && i.link?.trim())
      .slice(0, POR_MEDIO)
      .map((i) => ({
        categoria: medio.categoria,
        titulo: i.title!.trim(),
        resumen: textoPlano(i.description ?? ''),
        fuente: medio.nombre,
        url: i.link!.trim(),
        imagen: imagenDeItem(i),
        publicado: i.pubDate ?? '',
      }))
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const res = await fetch(medio.url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return parsearFeed(await res.text(), medio)
  } finally {
    clearTimeout(timer)
  }
}

/** Toma `n` elementos de la lista empezando en el día (rotación diaria). */
function rotar<T>(lista: T[], dia: number, n: number): T[] {
  if (!lista.length) return []
  return Array.from({ length: Math.min(n, lista.length) }, (_, i) => lista[(dia + i) % lista.length])
}

/**
 * Titulares del día: un medio directo por categoría (rotando cuál) más unos
 * refuerzos vía proxy de otras cabeceras. Lo que falle se omite.
 */
export async function cargarTitulares(fecha: string, idioma: Idioma): Promise<Titular[]> {
  const dia = diaDelAnio(fecha)
  const medios = enIdioma(MEDIOS, idioma)

  // El desfase por categoría evita que todas caigan en el mismo índice y la
  // edición salga entera de la misma cabecera.
  // Si el medio del día falla (caído, o bloqueado en la región: CNN árabe da 451
  // desde México) se prueba el siguiente de su categoría, para no perderla.
  const directos = CATEGORIAS.map(async (c, i) => {
    for (const medio of rotar(medios.filter((m) => !m.proxy && m.categoria === c.id), dia + i, Infinity)) {
      try {
        return await cargarMedio(medio)
      } catch {
        // al siguiente
      }
    }
    return []
  })
  // Los refuerzos rotan sobre la lista completa de proxy, así cada día entran
  // cabeceras distintas (y en categorías distintas).
  const refuerzos = rotar(medios.filter((m) => m.proxy), dia * REFUERZOS, REFUERZOS).map(cargarMedio)

  const cargas = await Promise.allSettled([...directos, ...refuerzos])
  const titulares = cargas.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))

  // Se agrupan por categoría (el orden del feed) intercalando los medios que
  // coincidan en una, para que no salgan seguidos los de la misma cabecera.
  return CATEGORIAS.flatMap((c) => {
    const grupos: Titular[][] = []
    for (const t of titulares.filter((x) => x.categoria === c.id)) {
      const grupo = grupos.find((g) => g[0].fuente === t.fuente)
      if (grupo) grupo.push(t)
      else grupos.push([t])
    }
    const orden: Titular[] = []
    for (let i = 0; i < POR_MEDIO; i++) {
      for (const g of grupos) if (g[i]) orden.push(g[i])
    }
    return orden
  })
}
