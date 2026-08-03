import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'
import pluginPrettier from 'eslint-plugin-prettier'
export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,mjs,jsx}']
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },

  // 项目根目录的 Node 配置文件（CJS），补充 node 全局变量
  {
    files: ['*.config.{cjs,js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
  {
    name: 'app/custom-rules',
    plugins: {
      // 注册 prettier 插件，使 'prettier/prettier' 规则生效
      prettier: pluginPrettier
    },
    rules: {
      // 不内联配置项：prettier/prettier 默认读取 .prettierrc.json，
      // 与 format 脚本共用同一份配置，避免两处不一致导致 lint 报格式警告
      'prettier/prettier': [
        'warn',
        {
          semi: false,
          singleQuote: true,
          printWidth: 100,
          trailingComma: 'none',
          endOfLine: 'auto'
        }
      ],
      'vue/multi-word-component-names': [
        'warn',
        {
          ignores: ['index'] // vue组件名称多单词组成（忽略index.vue）
        }
      ]
    }
  }
])
