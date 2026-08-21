/**
 * Textos del portal /cuenta en inglés. El ORIGINAL es el español que vive
 * inline en `web/src/cuenta.tsx` (segundo argumento de `t()`); aquí y en los
 * demás archivos de esta carpeta va su traducción, con las mismas claves.
 */
export const TEXTOS: Record<string, string> = {
  'marca.nombre': 'Mind Planner Home',
  'marca.sub': 'MPH',
  'marco.privacidad': 'Privacy',
  'marco.terminos': 'Terms',
  'marco.titulo': 'My account — Mind Planner Home',
  'comun.procesando': 'Working…',

  'oauth.google': 'Continue with Google',
  'oauth.apple': 'Continue with Apple',
  'oauth.oCorreo': 'or with your email',

  'acc.crear': 'Create your account',
  'acc.entrar': 'Sign in to your account',
  'acc.crear.sub': 'Your account first; you pick your subscription afterwards.',
  'acc.entrar.sub': 'Your subscription and your house are waiting.',
  'acc.correo': 'Email',
  'acc.contrasena': 'Password',
  'acc.btEntrar': 'Sign in',
  'acc.btCrear': 'Create account',
  'acc.sinCuenta': 'I have no account: create one',
  'acc.conCuenta': 'I already have an account: sign in',
  'acc.olvide': 'Forgot your password?',
  'acc.creada': 'Account created: check your email and confirm it so you can sign in.',
  'acc.faltaCorreo': 'Type your email above first.',
  'acc.enviado': 'We sent you an email to reset your password.',

  'pass.titulo': 'Choose your new password',
  'pass.nueva': 'New password',
  'pass.guardar': 'Save password',
  'pass.minimo': 'At least 8 characters.',

  'app.titulo': 'Get the app',
  'app.pagoUnico': 'one-off payment',
  'app.b1': 'Your house forever, with every app',
  'app.b2': 'First month included: 700 AI credits + sync',
  'app.b3': 'One purchase for every device: browser, Android and iOS',
  'app.cta': 'See where to download it',
  'app.comprar': 'Buy the house',
  'app.enCamino': 'The payment is on its way: reload the page in a few seconds.',
  'app.pie': 'When you open it, sign in with this same email and your house follows you to every device.',

  'cred.titulo': 'One-off credits',
  'cred.b1': '{n} AI credits, with no subscription',
  'cred.b2': 'They never expire: they stay in your account until you spend them',
  'cred.b3': 'They kick in when your credits for the month run out',
  'cred.cta': 'Top up {n} credits',
  'cred.enCamino': 'The payment is on its way: reload the page in a few seconds.',

  'tar.hazte': 'Go Pro',
  'tar.cambiar': 'Change tier',
  'tar.renovar': 'Renew subscription',
  'tar.suscribir': 'Subscribe',
  'tar.cargando': 'Loading prices…',
  'tar.errorPrecios': 'The prices could not be loaded. Reload the page.',
  'tar.errorCambio': 'The change did not go through. Reload the page in a few seconds.',
  'tar.sinPagos': 'Payments are not configured in this environment.',
  'tar.tuNivel': 'Your tier',
  'tar.porAnio': '/year',
  'tar.porMes': '/month',
  'tar.b1': 'Tier ×{n}: {c} AI credits a month',
  'tar.b2': 'Every app in the house, on all your devices',
  'tar.b3': 'Sync and cloud backup',
  'tar.actual': 'This is your current tier',
  'tar.subir': 'Move up to ×{n}',
  'tar.bajar': 'Move down to ×{n}',
  'tar.regalo': '2 months free',
  'tar.a1': 'Tier ×1 paid in one go: {n} AI credits every month',
  'tar.a2': 'One charge a year instead of twelve',
  'tar.anual': 'Pay for a year',
  'tar.pie':
    'No lock-in: you move up, move down or cancel whenever you like and only pay the difference. If you cancel, the app stays on your devices in local mode, without AI or sync.',

  'mi.pro': 'Pro',
  'mi.trial': 'First month',
  'mi.local': 'Local',
  'mi.vence': 'Renews or expires: {f}',
  'mi.trialHasta': 'Your included month ends on {f}.',
  'mi.estado.fuePro':
    'Your subscription ended: the app stays on your devices in local mode. Renew and the monthly credits and sync come back exactly as you left them.',
  'mi.estado.trialVencido':
    'Your included month is over: the app and your data are yours forever. Subscribe to carry on with the monthly credits and sync, or top up one-off credits.',
  'mi.estado.local':
    'You are in local mode: the app and your data are yours without paying anything. AI is pay-as-you-go — buy the credits you need, or subscribe and get them every month.',
  'mi.disponibles': 'Credits available: {n}',
  'mi.abrirApp': 'Open the app in the browser',
  'mi.salir': 'Sign out',

  'pro.creditosMes': 'AI credits this month',
  'pro.extra': 'Extra credits (top-ups, never expire): {n}',
  'pro.gestionar': 'Manage subscription (cancel, change payment)',

  'pag.cargando': 'Loading…',
  'pag.sinBackend': 'This environment has no backend configured (the VITE_SUPABASE_* variables are missing).',
}
