// vite-plugin-source.ts
import { Plugin } from 'vite'
import { transformAsync } from '@babel/core'
import jsxSyntax from '@babel/plugin-syntax-jsx'
import path from 'path'

export function VitePluginSource(): Plugin {
    return {
        name: 'vite-plugin-source',
        enforce: 'pre',

        // ⚠️ 只在 dev serve 生效
        apply: 'serve',

        async transform(code, id) {
            // 只处理 tsx/jsx
            if (!/\.(t|j)sx?$/.test(id)) return null

            // 相对路径，方便显示
            const filename = path.relative(process.cwd(), id)

            const result = await transformAsync(code, {
                filename,
                parserOpts: {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript'],
                },
                plugins: [
                    jsxSyntax,
                    function injectSource() {
                        return {
                            visitor: {
                                JSXOpeningElement(path) {
                                    // 忽略 Fragment
                                    if (path.node.name.name === 'Fragment') return

                                    // ⚠️ 避免重复注入
                                    const hasAttr = path.node.attributes.some(
                                        (attr: any) => attr.name?.name === 'data-source'
                                    )
                                    if (hasAttr) return

                                    // 插入 data-source 属性
                                    path.node.attributes.push({
                                        type: 'JSXAttribute',
                                        name: { type: 'JSXIdentifier', name: 'data-source' },
                                        value: {
                                            type: 'StringLiteral',
                                            value: `${filename}:${path.node.loc?.start.line || 0}:${path.node.loc?.start.column || 0}`,
                                        },
                                    })
                                },
                            },
                        }
                    },
                ],
                generatorOpts: {
                    jsescOption: { minimal: true },
                },
            })

            return result?.code || code
        },
    }
}