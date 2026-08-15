import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // مسیر نسبی تا خروجی build روی هر هاستی (از جمله زیرپوشه) کار کند
  base: './',
  server: {
    host: true,
    port: 5173,
  },
});
