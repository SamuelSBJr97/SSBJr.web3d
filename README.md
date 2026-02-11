# SSBJr Web3D

Laboratorio de demonstracoes 3D interativas com Three.js.

## Estrutura

- `src/` codigo do app e demos
- `src/demos/` demos isoladas com `createDemo()`
- `public/models/` modelos 3D e texturas
- `docs/` saida de build gerada pelo Vite (nao versionar)

## Scripts

- `npm install`
- `npm run dev`
- `npm run build` (saida em `docs/` para GitHub Pages)

## GitHub Pages

O deploy esta configurado via GitHub Actions em `.github/workflows/deploy.yml`.
A build gera `docs/` e o workflow publica automaticamente.

## Como adicionar novas demonstracoes

1. Crie um novo arquivo em `src/demos/` com `createDemo()`.
2. Adicione a entrada no array `demos` em `src/demos/index.js`.
3. O menu lateral sera atualizado automaticamente.
