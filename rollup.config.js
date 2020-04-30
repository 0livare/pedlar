import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/pedlar.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: true,
    exports: 'named',
  },
  plugins: [typescript()],
}
