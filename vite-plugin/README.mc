
```
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePluginSource } from './vite-plugin-source'

export default defineConfig({
  plugins: [react(), VitePluginSource()],
})

```