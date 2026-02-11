export const demos = [
  {
    id: "rotating-cube",
    title: "Cubo magnetico",
    description: "Uma cena simples com luzes dinamicas e controle orbital.",
    load: () => import("./rotating-cube.js")
  },
  {
    id: "textured-sphere",
    title: "Esfera texturizada",
    description: "Material fisico com textura procedural e brilho suave.",
    load: () => import("./textured-sphere.js")
  }
];
