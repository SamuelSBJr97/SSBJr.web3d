import * as THREE from "three";

function createProceduralTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128);
  gradient.addColorStop(0, "#f15b47");
  gradient.addColorStop(0.5, "#e59d58");
  gradient.addColorStop(1, "#243044");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let i = 0; i < 60; i += 1) {
    context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
    context.beginPath();
    context.arc(
      Math.random() * size,
      Math.random() * size,
      Math.random() * 20 + 4,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function createDemo() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f18);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  camera.position.set(0, 1.6, 4.6);

  const texture = createProceduralTexture();

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 64, 64),
    new THREE.MeshPhysicalMaterial({
      map: texture,
      clearcoat: 0.8,
      roughness: 0.25,
      metalness: 0.1
    })
  );
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.05, 16, 180),
    new THREE.MeshStandardMaterial({ color: 0xf5d66b })
  );
  ring.rotation.x = Math.PI / 2.4;
  ring.position.y = -0.4;
  scene.add(ring);

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const spot = new THREE.SpotLight(0xffffff, 1.6, 20, Math.PI / 6, 0.3, 1);
  spot.position.set(3, 6, 5);
  spot.castShadow = true;
  scene.add(spot);

  const controlsTarget = new THREE.Vector3(0, 0.4, 0);

  return {
    scene,
    camera,
    controlsTarget,
    update(delta) {
      sphere.rotation.y += delta * 0.4;
      ring.rotation.z -= delta * 0.2;
    },
    dispose() {
      texture.dispose();
      sphere.geometry.dispose();
      sphere.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
    }
  };
}
