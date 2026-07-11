import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `--mode artifact` produces a fully inlined single-file build (hash routing,
// everything embedded) for running the app as a self-contained HTML page.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  base: mode === 'artifact' ? './' : '/',
}))
