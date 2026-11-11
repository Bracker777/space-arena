import { defineConfig } from 'vite'
import { devApi } from './server/dev-api.js'

export default defineConfig({
  // 'spa' (the default) answers unknown paths with index.html + 200,
  // which hides missing assets. 'mpa' gives an honest 404.
  appType: 'mpa',
  plugins: [devApi()],
})
