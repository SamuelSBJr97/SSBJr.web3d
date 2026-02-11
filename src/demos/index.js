export const demos = [
  {
    id: "rollercoaster-ride",
    title: "Montanha-russa",
    description:
      "Perspectiva do carro com saltos entre trilhos e caminhos que mudam a cada volta.",
    load: () => import("./rollercoaster-ride.js")
  },
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
