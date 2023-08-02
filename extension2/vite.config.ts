import { defineConfig } from 'vite'

const fetchVersion = () => {
  return {
    name: 'html-transform',
    transformIndexHtml(html) {
      return html.replace(
        /__APP_VERSION__/,
        `v${process.env.npm_package_version}`
      )
    }
  }
}

export default defineConfig({
  plugins: [fetchVersion()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: new URL('./popup/index.html', import.meta.url).pathname,
        background: new URL('./background/index.html', import.meta.url).pathname
      },
      output: {
        entryFileNames: "[name]/[name].js"
      }
    }
  }
})
