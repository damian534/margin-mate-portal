import type { CapacitorConfig } from '@capacitor/cli';
import { nativeServerConfig } from './native.config';

const config: CapacitorConfig = {
  appId: 'app.lovable.f48756f9dddd48948139f6867c449221',
  appName: 'Margin Connect',
  webDir: 'dist',
  server: nativeServerConfig(process.env.CAPACITOR_LIVE_RELOAD === 'true'),
};

export default config;
