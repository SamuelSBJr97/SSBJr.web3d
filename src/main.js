import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { demos } from "./demos/index.js";
import "./style.css";

const viewport = document.querySelector("#viewport");
const demoList = document.querySelector("#demo-list");
const demoTitle = document.querySelector("#demo-title");
const demoDescription = document.querySelector("#demo-description");
const toggleImmersive = document.querySelector("#toggle-immersive");
const toggleMenu = document.querySelector("#toggle-menu");
const sidebar = document.querySelector("#sidebar");

let activeDemo = null;
let activeDemoId = null;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

const shared = {
  renderer,
  clock: new THREE.Clock(),
  controls: null
};

function setActiveButton(id) {
  const buttons = demoList.querySelectorAll("button");
  buttons.forEach((button) => {
    const isActive = button.dataset.demoId === id;
    button.classList.toggle("is-active", isActive);
  });
}

function disposeActiveDemo() {
  if (!activeDemo) return;
  if (typeof activeDemo.dispose === "function") {
    activeDemo.dispose();
  }
  if (shared.controls) {
    shared.controls.dispose();
    shared.controls = null;
  }
  activeDemo = null;
}

async function loadDemo(definition) {
  if (!definition) return;
  disposeActiveDemo();

  const module = await definition.load();
  activeDemo = await module.createDemo({
    renderer: shared.renderer,
    clock: shared.clock,
    viewport
  });

  if (activeDemo.controlsTarget) {
    shared.controls = new OrbitControls(activeDemo.camera, renderer.domElement);
    shared.controls.enableDamping = true;
    shared.controls.target.copy(activeDemo.controlsTarget);
    shared.controls.update();
  }

  activeDemoId = definition.id;
  demoTitle.textContent = definition.title;
  demoDescription.textContent = definition.description;
  setActiveButton(definition.id);
  resize();
}

function resize() {
  const { clientWidth, clientHeight } = viewport;
  renderer.setSize(clientWidth, clientHeight, false);
  if (activeDemo?.camera) {
    activeDemo.camera.aspect = clientWidth / clientHeight;
    activeDemo.camera.updateProjectionMatrix();
  }
  if (activeDemo?.onResize) {
    activeDemo.onResize({ width: clientWidth, height: clientHeight });
  }
}

function tick() {
  const delta = shared.clock.getDelta();
  if (shared.controls) {
    shared.controls.update();
  }
  if (activeDemo?.update) {
    activeDemo.update(delta);
  }
  if (activeDemo?.scene && activeDemo?.camera) {
    renderer.render(activeDemo.scene, activeDemo.camera);
  }
  requestAnimationFrame(tick);
}

function buildMenu() {
  demoList.innerHTML = "";
  demos.forEach((demo) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.demoId = demo.id;
    button.textContent = demo.title;
    button.addEventListener("click", () => loadDemo(demo));
    demoList.appendChild(button);
  });
}

function toggleImmersiveMode() {
  document.body.classList.toggle("immersive");
  const isImmersive = document.body.classList.contains("immersive");
  toggleImmersive.textContent = isImmersive ? "Sair do modo" : "Modo imersao";
  resize();
}

function toggleSidebar() {
  sidebar.classList.toggle("is-collapsed");
  resize();
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("immersive")) {
    toggleImmersiveMode();
  }
});

toggleImmersive.addEventListener("click", toggleImmersiveMode);
toggleMenu.addEventListener("click", toggleSidebar);

buildMenu();
loadDemo(demos[0]);
requestAnimationFrame(tick);
