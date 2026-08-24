import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.macr120.mindhome',
  appName: 'Mind Planner Home',
  webDir: 'dist',
  ios: {
    // Fondo del WebView mientras la web arranca (el mismo --ui-bg del tema
    // oscuro y de la pantalla de arranque): sin él, entre el splash y el primer
    // render se cuela un fogonazo blanco. Solo iOS: Android ya se publicó sin
    // esto y su splash lo tapa.
    backgroundColor: '#0f1115',
  },
};

export default config;
