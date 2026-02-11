import * as THREE from "three";

export async function createDemo() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1117);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(3.2, 2.6, 3.2);

  const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf15b47,
    metalness: 0.5,
    roughness: 0.25
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4, 32),
    new THREE.MeshStandardMaterial({ color: 0x141620, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  floor.receiveShadow = true;
  scene.add(floor);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(4, 6, 2);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xf5d66b, 1.0, 10);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);

  const backLight = new THREE.PointLight(0x6bc2ff, 0.9, 10);
  backLight.position.set(2, 3, -4);
  scene.add(backLight);

  const controlsTarget = new THREE.Vector3(0, 0, 0);

  return {
    scene,
    camera,
    controlsTarget,
    update(delta) {
      cube.rotation.x += delta * 0.5;
      cube.rotation.y += delta * 0.7;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
    }
  };
}
