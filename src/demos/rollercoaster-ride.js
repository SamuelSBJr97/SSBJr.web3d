import * as THREE from "three";

function mulberry32(seed) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createTrackData(seed, options) {
  const random = mulberry32(seed);
  const pointCount = options.pointCount;
  const baseRadius = options.baseRadius;
  const points = [];

  for (let i = 0; i < pointCount; i += 1) {
    const angle = (i / pointCount) * Math.PI * 2;
    const radius =
      baseRadius + (random() - 0.5) * 7 + Math.sin(angle * 3) * 3.5;
    const height = Math.sin(angle * 2) * 4 + (random() - 0.5) * 6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, height, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.5);
  const laneOffset = options.laneOffset;
  const leftPoints = points.map((point) => {
    const radial = new THREE.Vector3(point.x, 0, point.z).normalize();
    return point.clone().addScaledVector(radial, laneOffset);
  });
  const rightPoints = points.map((point) => {
    const radial = new THREE.Vector3(point.x, 0, point.z).normalize();
    return point.clone().addScaledVector(radial, -laneOffset);
  });

  const leftCurve = new THREE.CatmullRomCurve3(
    leftPoints,
    true,
    "catmullrom",
    0.5
  );
  const rightCurve = new THREE.CatmullRomCurve3(
    rightPoints,
    true,
    "catmullrom",
    0.5
  );

  const frames = curve.computeFrenetFrames(options.frameCount, true);
  const length = curve.getLength();

  return {
    curve,
    leftCurve,
    rightCurve,
    frames,
    length,
    baseRadius
  };
}

function createRailMesh(curve, color, opacity) {
  const geometry = new THREE.TubeGeometry(curve, 520, 0.18, 10, true);
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.7,
    roughness: 0.25,
    transparent: opacity < 1,
    opacity
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, geometry, material };
}

function createSleepers(curve, frames, count) {
  const geometry = new THREE.BoxGeometry(1.6, 0.12, 0.45);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3d2d24,
    roughness: 0.85,
    metalness: 0.1
  });
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const basis = new THREE.Matrix4();

  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const index = Math.floor(t * (frames.tangents.length - 1));
    const tangent = frames.tangents[index];
    const normal = frames.normals[index];
    const binormal = frames.binormals[index];
    const position = curve.getPointAt(t);

    basis.makeBasis(binormal, normal, tangent);
    matrix.copy(basis);
    matrix.setPosition(position);
    instanced.setMatrixAt(i, matrix);
  }

  instanced.castShadow = true;
  instanced.receiveShadow = true;
  return { mesh: instanced, geometry, material };
}

function createSupports(curve, count, groundY) {
  const geometry = new THREE.CylinderGeometry(0.12, 0.2, 1, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0x55515b,
    roughness: 0.6,
    metalness: 0.2
  });
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const point = curve.getPointAt(t);
    const height = Math.max(1.5, point.y - groundY);
    position.set(point.x, groundY + height / 2, point.z);
    scale.set(1, height, 1);
    quaternion.identity();
    matrix.compose(position, quaternion, scale);
    instanced.setMatrixAt(i, matrix);
  }

  instanced.castShadow = true;
  instanced.receiveShadow = true;
  return { mesh: instanced, geometry, material };
}

function createJumpEvents(random) {
  const positions = [0.12, 0.34, 0.58, 0.82];
  return positions.map((pos, index) => ({
    id: index,
    pos,
    target: random() > 0.5 ? -1 : 1,
    resolved: false,
    prompted: false,
    chosen: null
  }));
}

function buildEnvironment(trackData, seed) {
  const group = new THREE.Group();
  const random = mulberry32(seed + 99);
  const resources = { geometries: [], materials: [], lights: [] };

  const segmentLabels = ["Caverna", "Penhasco", "Floresta", "Agua"];
  const segmentRanges = [
    { start: 0, end: 0.25 },
    { start: 0.25, end: 0.5 },
    { start: 0.5, end: 0.75 },
    { start: 0.75, end: 1 }
  ];

  function addRockField(start, end) {
    const geometry = new THREE.IcosahedronGeometry(1.2, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2c2f3b,
      roughness: 0.9,
      metalness: 0.05
    });
    const count = 90;
    const instanced = new THREE.InstancedMesh(geometry, material, count);
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i += 1) {
      const t = lerp(start, end, random());
      const point = trackData.curve.getPointAt(t);
      const angle = random() * Math.PI * 2;
      const radial = trackData.baseRadius + 6 + random() * 10;
      const offset = new THREE.Vector3(
        Math.cos(angle) * radial,
        -2 + random() * 6,
        Math.sin(angle) * radial
      );
      scale.set(1 + random() * 2.4, 1 + random() * 2.4, 1 + random() * 2.4);
      matrix.compose(point.clone().add(offset), new THREE.Quaternion(), scale);
      instanced.setMatrixAt(i, matrix);
    }

    instanced.castShadow = true;
    instanced.receiveShadow = true;
    group.add(instanced);
    resources.geometries.push(geometry);
    resources.materials.push(material);
  }

  function addCliffs(start, end) {
    const geometry = new THREE.BoxGeometry(3, 10, 3);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2f3b2f,
      roughness: 0.8,
      metalness: 0.05
    });
    const count = 50;
    const instanced = new THREE.InstancedMesh(geometry, material, count);
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i += 1) {
      const t = lerp(start, end, random());
      const point = trackData.curve.getPointAt(t);
      const angle = random() * Math.PI * 2;
      const radial = trackData.baseRadius + 14 + random() * 12;
      const offset = new THREE.Vector3(
        Math.cos(angle) * radial,
        -6 + random() * 6,
        Math.sin(angle) * radial
      );
      scale.set(0.7 + random() * 1.6, 1 + random() * 2.6, 0.7 + random() * 1.6);
      matrix.compose(point.clone().add(offset), new THREE.Quaternion(), scale);
      instanced.setMatrixAt(i, matrix);
    }

    instanced.castShadow = true;
    instanced.receiveShadow = true;
    group.add(instanced);
    resources.geometries.push(geometry);
    resources.materials.push(material);
  }

  function addForest(start, end) {
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 3.4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3828,
      roughness: 0.9,
      metalness: 0.05
    });
    const foliageGeometry = new THREE.ConeGeometry(1.2, 3.2, 10);
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f5b38,
      roughness: 0.85,
      metalness: 0.05
    });

    const count = 70;
    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count);
    const foliage = new THREE.InstancedMesh(
      foliageGeometry,
      foliageMaterial,
      count
    );
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i += 1) {
      const t = lerp(start, end, random());
      const point = trackData.curve.getPointAt(t);
      const angle = random() * Math.PI * 2;
      const radial = trackData.baseRadius + 12 + random() * 16;
      const offset = new THREE.Vector3(
        Math.cos(angle) * radial,
        -7 + random() * 3,
        Math.sin(angle) * radial
      );
      const trunkScale = 0.8 + random() * 1.4;
      scale.set(trunkScale, 1 + random() * 1.8, trunkScale);
      matrix.compose(point.clone().add(offset), new THREE.Quaternion(), scale);
      trunks.setMatrixAt(i, matrix);

      const canopyPosition = point.clone().add(offset).add(new THREE.Vector3(0, 2.8, 0));
      const canopyScale = 0.8 + random() * 1.2;
      scale.set(canopyScale, 1 + random() * 1.4, canopyScale);
      matrix.compose(canopyPosition, new THREE.Quaternion(), scale);
      foliage.setMatrixAt(i, matrix);
    }

    trunks.castShadow = true;
    trunks.receiveShadow = true;
    foliage.castShadow = true;
    foliage.receiveShadow = true;

    group.add(trunks, foliage);
    resources.geometries.push(trunkGeometry, foliageGeometry);
    resources.materials.push(trunkMaterial, foliageMaterial);
  }

  function addWater(start, end) {
    const thetaStart = start * Math.PI * 2;
    const thetaLength = (end - start) * Math.PI * 2;
    const geometry = new THREE.RingGeometry(
      trackData.baseRadius - 12,
      trackData.baseRadius + 18,
      64,
      2,
      thetaStart,
      thetaLength
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0x1b4b5f,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -10.5;
    mesh.receiveShadow = true;
    group.add(mesh);

    const light = new THREE.PointLight(0x4dc7ff, 1.2, 80);
    light.position.set(0, -6, 0);
    group.add(light);
    resources.lights.push(light);
    resources.geometries.push(geometry);
    resources.materials.push(material);
  }

  addRockField(segmentRanges[0].start, segmentRanges[0].end);
  addCliffs(segmentRanges[1].start, segmentRanges[1].end);
  addForest(segmentRanges[2].start, segmentRanges[2].end);
  addWater(segmentRanges[3].start, segmentRanges[3].end);

  return {
    group,
    segmentLabels,
    segmentRanges,
    resources
  };
}

function createHud(viewport) {
  const parent = viewport.closest(".stage");
  const hud = document.createElement("div");
  hud.className = "ride-hud";
  hud.innerHTML = `
    <div class="ride-hud__panel">
      <div class="ride-hud__title">Loop Pulse</div>
      <div class="ride-hud__stats">
        <div><span>Volta</span><strong id="ride-lap">1</strong></div>
        <div><span>Velocidade</span><strong id="ride-speed">0</strong></div>
        <div><span>Acertos</span><strong id="ride-score">0</strong></div>
        <div><span>Erros</span><strong id="ride-misses">0</strong></div>
      </div>
      <div class="ride-hud__biome">
        <span>Area</span>
        <strong id="ride-biome">Caverna</strong>
      </div>
    </div>
    <div class="ride-hud__prompt">
      <div class="ride-hud__message" id="ride-message">Prepare para o proximo salto.</div>
      <div class="ride-hud__buttons">
        <button type="button" data-dir="left">Esquerda</button>
        <button type="button" data-dir="right">Direita</button>
      </div>
    </div>
  `;

  parent.appendChild(hud);
  const elements = {
    root: hud,
    lap: hud.querySelector("#ride-lap"),
    speed: hud.querySelector("#ride-speed"),
    score: hud.querySelector("#ride-score"),
    misses: hud.querySelector("#ride-misses"),
    biome: hud.querySelector("#ride-biome"),
    message: hud.querySelector("#ride-message"),
    buttons: hud.querySelectorAll("button[data-dir]")
  };

  return elements;
}

export async function createDemo({ viewport }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.Fog(0x05070c, 20, 170);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 320);

  const root = new THREE.Group();
  scene.add(root);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(130, 36, 36),
    new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.95,
      metalness: 0.1,
      side: THREE.BackSide
    })
  );
  shell.receiveShadow = true;
  root.add(shell);

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xf8efe6, 1.4);
  sun.position.set(40, 50, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const rim = new THREE.PointLight(0x4dc7ff, 1.2, 120);
  rim.position.set(-30, 20, 30);
  scene.add(rim);

  const trackGroup = new THREE.Group();
  const envGroup = new THREE.Group();
  root.add(trackGroup, envGroup);

  const hud = createHud(viewport);

  const options = {
    pointCount: 18,
    baseRadius: 42,
    laneOffset: 2.8,
    frameCount: 640
  };

  const state = {
    lap: 1,
    t: 0,
    baseSpeed: 0.065,
    lane: 1,
    laneTarget: 1,
    score: 0,
    misses: 0,
    shake: 0,
    jumpIndex: 0
  };

  let trackData = null;
  let jumpEvents = [];
  let envMeta = null;
  let trackResources = [];
  let envResources = [];
  let activeJump = null;
  let lastResult = null;

  function clearGroup(group) {
    group.children.forEach((child) => group.remove(child));
  }

  function disposeTrackResources(resources) {
    resources.forEach((entry) => {
      if (entry.geometry) entry.geometry.dispose();
      if (entry.material) entry.material.dispose();
    });
    resources.length = 0;
  }

  function disposeEnvResources(resources) {
    resources.forEach((entry) => {
      entry.geometries.forEach((geometry) => geometry.dispose());
      entry.materials.forEach((material) => material.dispose());
    });
    resources.length = 0;
  }

  function rebuildLap(lapIndex) {
    clearGroup(trackGroup);
    clearGroup(envGroup);
    disposeTrackResources(trackResources);
    disposeEnvResources(envResources);

    trackData = createTrackData(1400 + lapIndex * 77, options);

    const leftRail = createRailMesh(trackData.leftCurve, 0xced4df, 1);
    const rightRail = createRailMesh(trackData.rightCurve, 0xc2b9b0, 1);
    const sleepers = createSleepers(trackData.curve, trackData.frames, 260);
    const supports = createSupports(trackData.curve, 120, -12);

    trackGroup.add(leftRail.mesh, rightRail.mesh, sleepers.mesh, supports.mesh);
    trackResources.push(leftRail, rightRail, sleepers, supports);

    envMeta = buildEnvironment(trackData, lapIndex * 31);
    envGroup.add(envMeta.group);
    envResources.push(envMeta.resources);

    jumpEvents = createJumpEvents(mulberry32(lapIndex * 199 + 11));
    state.jumpIndex = 0;
    activeJump = null;
  }

  rebuildLap(1);

  function updateHud(speedDisplay, biomeLabel) {
    hud.lap.textContent = state.lap.toString();
    hud.speed.textContent = Math.round(speedDisplay).toString();
    hud.score.textContent = state.score.toString();
    hud.misses.textContent = state.misses.toString();
    hud.biome.textContent = biomeLabel;
    if (activeJump) {
      const target = activeJump.target === -1 ? "ESQUERDA" : "DIREITA";
      hud.message.textContent = `Pule para ${target}.`;
    } else if (lastResult) {
      hud.message.textContent = lastResult;
    } else {
      hud.message.textContent = "Prepare para o proximo salto.";
    }
  }

  function resolveJump(choice) {
    if (!activeJump || activeJump.resolved) return;
    activeJump.resolved = true;
    activeJump.chosen = choice;

    if (choice === activeJump.target) {
      state.score += 1;
      lastResult = "Acerto limpo!";
    } else {
      state.misses += 1;
      state.shake = 0.55;
      lastResult = "Quase!";
    }

    state.laneTarget = activeJump.target;
    state.jumpIndex += 1;
    activeJump = null;
  }

  function handleDirection(dir) {
    if (!activeJump) return;
    const choice = dir === "left" ? -1 : 1;
    resolveJump(choice);
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      handleDirection("left");
    }
    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      handleDirection("right");
    }
  }

  hud.buttons.forEach((button) => {
    button.addEventListener("click", () => handleDirection(button.dataset.dir));
  });
  window.addEventListener("keydown", onKeyDown);

  return {
    scene,
    camera,
    update(delta) {
      if (!trackData) return;

      const tangent = trackData.curve.getTangentAt(state.t);
      const slopeBoost = clamp(tangent.y * 0.08, -0.02, 0.025);
      const speed = state.baseSpeed + slopeBoost;
      state.t += delta * speed;

      if (state.t >= 1) {
        state.t -= 1;
        state.lap += 1;
        rebuildLap(state.lap);
        lastResult = null;
      }

      const jump = jumpEvents[state.jumpIndex];
      if (jump) {
        const windowStart = jump.pos - 0.04;
        const windowEnd = jump.pos + 0.035;
        if (!jump.prompted && state.t >= windowStart) {
          jump.prompted = true;
          activeJump = jump;
        }
        if (jump.prompted && !jump.resolved && state.t >= windowEnd) {
          resolveJump(null);
        }
      }

      state.lane = lerp(state.lane, state.laneTarget, clamp(delta * 2.6, 0, 1));

      const blend = (state.lane + 1) * 0.5;
      const leftPoint = trackData.leftCurve.getPointAt(state.t);
      const rightPoint = trackData.rightCurve.getPointAt(state.t);
      const position = leftPoint.clone().lerp(rightPoint, blend);

      const forward = trackData.curve.getTangentAt(state.t).normalize();
      const lookAt = position.clone().add(forward.multiplyScalar(8));

      camera.position.copy(position);
      camera.position.y += 1.2;

      camera.lookAt(lookAt);

      if (state.shake > 0) {
        camera.position.x += (Math.random() - 0.5) * state.shake * 0.6;
        camera.position.y += (Math.random() - 0.5) * state.shake * 0.6;
        camera.position.z += (Math.random() - 0.5) * state.shake * 0.6;
        state.shake = Math.max(0, state.shake - delta * 1.6);
      }

      let biomeLabel = "Caverna";
      if (envMeta) {
        const range = envMeta.segmentRanges.find(
          (segment) => state.t >= segment.start && state.t < segment.end
        );
        const index = envMeta.segmentRanges.indexOf(range);
        biomeLabel = envMeta.segmentLabels[index] || "Caverna";
      }

      updateHud(speed * 1000, biomeLabel);
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      hud.root.remove();
      trackGroup.clear();
      envGroup.clear();
      shell.geometry.dispose();
      shell.material.dispose();
      disposeTrackResources(trackResources);
      disposeEnvResources(envResources);
    }
  };
}
