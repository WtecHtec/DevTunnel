
# vite-plugin-dev-tunnel

在开发阶段，为jsx/tsx文件注入source信息，方便调试。

# 使用
## npm

```
npm i vite-plugin-dev-tunnel

```
```
import  { VitePluginSource } from 'vite-plugin-dev-tunnel'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePluginSource()],
})
```

## 源文件

```
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePluginSource } from './vite-plugin-source'

export default defineConfig({
  plugins: [react(), VitePluginSource()],
})

```
