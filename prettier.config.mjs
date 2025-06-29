/** @typedef {import("prettier").Config} PrettierConfig */
/** @typedef {import("prettier-plugin-tailwindcss").PluginOptions} TailwindConfig */
/** @typedef {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig */
/** @type { PrettierConfig | SortImportsConfig | TailwindConfig } */
const config = {
  arrowParens: 'always',
  printWidth: 80,
  singleQuote: true,
  jsxSingleQuote: false,
  semi: false,
  trailingComma: 'all',
  tabWidth: 2,

  plugins: [
    // https://github.com/IanVS/prettier-plugin-sort-imports
    '@ianvs/prettier-plugin-sort-imports',
    // https://github.com/tailwindlabs/tailwindcss/tree/master/packages/prettier-plugin
    'prettier-plugin-tailwindcss', // MUST come last
  ],

  importOrder: [
    '<TYPES>',
    '<THIRD_PARTY_MODULES>',
    '',
    '<TYPES>^@mono',
    '<TYPES>^[.|..|~]',
    '^~/',
    '^[../]',
    '^[./]',
  ],
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderTypeScriptVersion: '5.0.0',
}

export default config
