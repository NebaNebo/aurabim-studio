import { defineConfig } from 'vite';
import { betterAuthPlugin } from './src/server/vite-auth-plugin';

export default defineConfig({
  base: './',
  plugins: [betterAuthPlugin()],
  server: {
    port: 5173,
    open: false
  }
});
