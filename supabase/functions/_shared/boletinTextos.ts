/**
 * Textos fijos del boletín en los 16 idiomas (el cuerpo lo genera la IA; esto
 * es lo que NO puede depender de ella: la baja y el aviso de crisis).
 */
export interface TextosBoletin {
  /** Nombre del idioma para el prompt. */
  nombre: string
  pie: string
  baja: string
  crisis: string
  promo: string
  noticia: string
  /** Respuesta de `boletin-baja`. */
  bajaHecha: string
}

export const TEXTOS: Record<string, TextosBoletin> = {
  es: {
    nombre: 'español',
    pie: 'Recibes este correo porque aceptaste el boletín diario de MindHaOS.',
    baja: 'Darme de baja',
    crisis: 'Este correo no sustituye la ayuda profesional. Si estás en crisis, llama a tu línea de emergencia local.',
    promo: 'Promoción',
    noticia: 'Novedad',
    bajaHecha: 'Listo: ya no recibirás el boletín diario de MindHaOS. Puedes volver a activarlo en la app, en Cuenta.',
  },
  en: {
    nombre: 'English',
    pie: 'You are receiving this email because you opted in to the MindHaOS daily newsletter.',
    baja: 'Unsubscribe',
    crisis: 'This email is not a substitute for professional help. If you are in crisis, call your local emergency line.',
    promo: 'Promotion',
    noticia: 'News',
    bajaHecha: 'Done: you will no longer receive the MindHaOS daily newsletter. You can turn it back on in the app, under Account.',
  },
  pt: {
    nombre: 'português',
    pie: 'Você recebe este e-mail porque aceitou o boletim diário do MindHaOS.',
    baja: 'Cancelar inscrição',
    crisis: 'Este e-mail não substitui a ajuda profissional. Se você estiver em crise, ligue para a linha de emergência local.',
    promo: 'Promoção',
    noticia: 'Novidade',
    bajaHecha: 'Pronto: você não receberá mais o boletim diário do MindHaOS. Pode reativá-lo no app, em Conta.',
  },
  fr: {
    nombre: 'français',
    pie: 'Vous recevez cet e-mail parce que vous avez accepté la newsletter quotidienne de MindHaOS.',
    baja: 'Se désabonner',
    crisis: 'Cet e-mail ne remplace pas une aide professionnelle. En cas de crise, appelez votre numéro d’urgence local.',
    promo: 'Promotion',
    noticia: 'Nouveauté',
    bajaHecha: 'C’est fait : vous ne recevrez plus la newsletter quotidienne de MindHaOS. Vous pouvez la réactiver dans l’app, dans Compte.',
  },
  de: {
    nombre: 'Deutsch',
    pie: 'Du erhältst diese E-Mail, weil du dem täglichen MindHaOS-Newsletter zugestimmt hast.',
    baja: 'Abmelden',
    crisis: 'Diese E-Mail ersetzt keine professionelle Hilfe. Wenn du in einer Krise bist, ruf deine örtliche Notrufnummer an.',
    promo: 'Angebot',
    noticia: 'Neuigkeit',
    bajaHecha: 'Erledigt: Du erhältst den täglichen MindHaOS-Newsletter nicht mehr. Du kannst ihn in der App unter Konto wieder aktivieren.',
  },
  it: {
    nombre: 'italiano',
    pie: 'Ricevi questa e-mail perché hai accettato la newsletter quotidiana di MindHaOS.',
    baja: 'Annulla iscrizione',
    crisis: 'Questa e-mail non sostituisce l’aiuto professionale. Se sei in crisi, chiama il numero di emergenza locale.',
    promo: 'Promozione',
    noticia: 'Novità',
    bajaHecha: 'Fatto: non riceverai più la newsletter quotidiana di MindHaOS. Puoi riattivarla nell’app, in Account.',
  },
  ja: {
    nombre: '日本語',
    pie: 'MindHaOS の毎日のニュースレターの受信に同意されたため、このメールをお送りしています。',
    baja: '配信を停止する',
    crisis: 'このメールは専門家の支援に代わるものではありません。危機的な状況にある場合は、地域の緊急窓口に連絡してください。',
    promo: 'キャンペーン',
    noticia: 'お知らせ',
    bajaHecha: '完了しました。MindHaOS の毎日のニュースレターは今後届きません。アプリの「アカウント」から再開できます。',
  },
  zh: {
    nombre: '简体中文',
    pie: '你收到这封邮件，是因为你同意接收 MindHaOS 每日简报。',
    baja: '退订',
    crisis: '本邮件不能替代专业帮助。如果你正处于危机中，请拨打当地紧急求助电话。',
    promo: '优惠',
    noticia: '新消息',
    bajaHecha: '已完成：你将不再收到 MindHaOS 每日简报。可在应用的“账户”中重新开启。',
  },
  ko: {
    nombre: '한국어',
    pie: 'MindHaOS 일일 뉴스레터 수신에 동의하셨기 때문에 이 메일을 받으셨습니다.',
    baja: '수신 거부',
    crisis: '이 메일은 전문적인 도움을 대신하지 않습니다. 위기 상황이라면 지역 긴급 전화로 연락하세요.',
    promo: '프로모션',
    noticia: '새 소식',
    bajaHecha: '완료: 더 이상 MindHaOS 일일 뉴스레터를 받지 않습니다. 앱의 계정에서 다시 켤 수 있습니다.',
  },
  ru: {
    nombre: 'русский',
    pie: 'Вы получили это письмо, потому что согласились на ежедневную рассылку MindHaOS.',
    baja: 'Отписаться',
    crisis: 'Это письмо не заменяет профессиональную помощь. Если вы в кризисе, позвоните на местную экстренную линию.',
    promo: 'Акция',
    noticia: 'Новость',
    bajaHecha: 'Готово: вы больше не будете получать ежедневную рассылку MindHaOS. Включить её снова можно в приложении, в разделе «Аккаунт».',
  },
  hi: {
    nombre: 'हिन्दी',
    pie: 'आपको यह ईमेल इसलिए मिला है क्योंकि आपने MindHaOS के दैनिक न्यूज़लेटर के लिए सहमति दी थी।',
    baja: 'सदस्यता छोड़ें',
    crisis: 'यह ईमेल पेशेवर मदद का विकल्प नहीं है। अगर आप संकट में हैं, तो अपनी स्थानीय आपातकालीन हेल्पलाइन पर कॉल करें।',
    promo: 'ऑफ़र',
    noticia: 'नई खबर',
    bajaHecha: 'हो गया: अब आपको MindHaOS का दैनिक न्यूज़लेटर नहीं मिलेगा। आप ऐप में खाता सेक्शन से इसे फिर चालू कर सकते हैं।',
  },
  tr: {
    nombre: 'Türkçe',
    pie: 'Bu e-postayı MindHaOS günlük bültenini kabul ettiğiniz için alıyorsunuz.',
    baja: 'Abonelikten çık',
    crisis: 'Bu e-posta profesyonel yardımın yerini tutmaz. Kriz içindeyseniz yerel acil yardım hattını arayın.',
    promo: 'Kampanya',
    noticia: 'Yenilik',
    bajaHecha: 'Tamam: artık MindHaOS günlük bültenini almayacaksınız. Uygulamada Hesap bölümünden yeniden açabilirsiniz.',
  },
  id: {
    nombre: 'Bahasa Indonesia',
    pie: 'Kamu menerima email ini karena menyetujui buletin harian MindHaOS.',
    baja: 'Berhenti berlangganan',
    crisis: 'Email ini bukan pengganti bantuan profesional. Jika kamu sedang dalam krisis, hubungi layanan darurat setempat.',
    promo: 'Promo',
    noticia: 'Kabar baru',
    bajaHecha: 'Selesai: kamu tidak akan lagi menerima buletin harian MindHaOS. Kamu bisa mengaktifkannya lagi di aplikasi, di Akun.',
  },
  pl: {
    nombre: 'polski',
    pie: 'Otrzymujesz tę wiadomość, ponieważ zgodziłeś się na codzienny newsletter MindHaOS.',
    baja: 'Wypisz się',
    crisis: 'Ta wiadomość nie zastępuje profesjonalnej pomocy. Jeśli jesteś w kryzysie, zadzwoń pod lokalny numer alarmowy.',
    promo: 'Promocja',
    noticia: 'Nowość',
    bajaHecha: 'Gotowe: nie będziesz już otrzymywać codziennego newslettera MindHaOS. Możesz go ponownie włączyć w aplikacji, w sekcji Konto.',
  },
  nl: {
    nombre: 'Nederlands',
    pie: 'Je ontvangt deze e-mail omdat je hebt ingestemd met de dagelijkse nieuwsbrief van MindHaOS.',
    baja: 'Afmelden',
    crisis: 'Deze e-mail vervangt geen professionele hulp. Ben je in crisis, bel dan je lokale noodlijn.',
    promo: 'Aanbieding',
    noticia: 'Nieuws',
    bajaHecha: 'Klaar: je ontvangt de dagelijkse nieuwsbrief van MindHaOS niet meer. Je kunt hem in de app weer aanzetten, onder Account.',
  },
  ar: {
    nombre: 'العربية',
    pie: 'تصلك هذه الرسالة لأنك وافقت على النشرة اليومية من MindHaOS.',
    baja: 'إلغاء الاشتراك',
    crisis: 'هذه الرسالة لا تغني عن المساعدة المتخصصة. إذا كنت في أزمة، فاتصل بخط الطوارئ المحلي.',
    promo: 'عرض',
    noticia: 'جديد',
    bajaHecha: 'تم: لن تصلك النشرة اليومية من MindHaOS بعد الآن. يمكنك تفعيلها من جديد في التطبيق، من قسم الحساب.',
  },
}

/** Domicilio del remitente: las leyes anti-spam lo exigen en los correos con promociones. */
export const DIRECCION = 'MindHaOS · Calle Riff 1036, C.P. 03340, Ciudad de México, México'

export function textosDe(idioma: string): TextosBoletin {
  return TEXTOS[idioma] ?? TEXTOS[idioma.slice(0, 2)] ?? TEXTOS.en
}
