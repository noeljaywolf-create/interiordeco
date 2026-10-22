(() => {
  const host = document.querySelector(".hero-image");
  const canvas = document.querySelector("#room-canvas");
  const resetButton = document.querySelector("#scene-reset");
  if (!host || !canvas || !resetButton) return;

  if (!window.THREE) {
    console.warn("Shopnest 3D room is unavailable; showing the photographic fallback.");
    return;
  }

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: "high-performance",
  });
  const room = new THREE.Group();
  const materials = {
    plaster: new THREE.MeshStandardMaterial({ color: 0xcbbca4, roughness: 0.93 }),
    plasterShade: new THREE.MeshStandardMaterial({ color: 0xb5a58c, roughness: 0.95 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xf2ecdf, roughness: 0.75 }),
    oak: new THREE.MeshStandardMaterial({ color: 0x967453, roughness: 0.76 }),
    oakLight: new THREE.MeshStandardMaterial({ color: 0xb18c64, roughness: 0.78 }),
    walnut: new THREE.MeshStandardMaterial({ color: 0x5b4838, roughness: 0.72 }),
    linen: new THREE.MeshStandardMaterial({ color: 0xa79478, roughness: 0.97 }),
    linenLight: new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.94 }),
    linenDark: new THREE.MeshStandardMaterial({ color: 0x81765f, roughness: 0.96 }),
    green: new THREE.MeshStandardMaterial({ color: 0x52684e, roughness: 0.84 }),
    greenLight: new THREE.MeshStandardMaterial({ color: 0x748367, roughness: 0.85 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xa9654b, roughness: 0.86 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xeee5d3, roughness: 0.31, metalness: 0.02 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xb7c9c5, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.48 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb18e5c, roughness: 0.33, metalness: 0.6 }),
  };

  const initialOrbit = { theta: 0.55, phi: 1.27, radius: 16 };
  let orbit = { ...initialOrbit };
  let dragStart = null;
  let frameId = 0;
  let disposed = false;
  let inView = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const target = new THREE.Vector3(0, 2.15, -0.35);

  function box(parent, width, height, depth, material, position, options = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    parent.add(mesh);
    return mesh;
  }

  function cylinder(parent, topRadius, bottomRadius, height, material, position, segments = 32) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(topRadius, bottomRadius, height, segments),
      material,
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function sphere(parent, scale, material, position, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function makeWoodTexture() {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 512;
    textureCanvas.height = 512;
    const context = textureCanvas.getContext("2d");
    context.fillStyle = "#ad987b";
    context.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row += 1) {
      const y = row * 64;
      context.fillStyle = row % 2 ? "#b4a184" : "#aa9579";
      context.fillRect(0, y, 512, 62);
      context.strokeStyle = "rgba(78, 59, 39, .18)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, y + 62);
      context.lineTo(512, y + 62);
      context.stroke();
      const start = row % 2 ? 88 : 328;
      context.beginPath();
      context.moveTo(start, y);
      context.lineTo(start, y + 62);
      context.stroke();
      for (let grain = 0; grain < 5; grain += 1) {
        const grainY = y + 8 + grain * 11;
        context.strokeStyle = `rgba(75, 57, 40, ${0.035 + grain * 0.004})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, grainY);
        context.bezierCurveTo(130, grainY - 5, 320, grainY + 5, 512, grainY - 2);
        context.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.5, 2);
    texture.colorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    return texture;
  }

  function makeRugTexture() {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 256;
    textureCanvas.height = 256;
    const context = textureCanvas.getContext("2d");
    context.fillStyle = "#ded5c4";
    context.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 5) {
      context.strokeStyle = y % 10 ? "rgba(105, 91, 70, .07)" : "rgba(255,255,255,.13)";
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(256, y);
      context.stroke();
    }
    context.strokeStyle = "rgba(146, 123, 92, .45)";
    context.lineWidth = 3;
    context.strokeRect(12, 12, 232, 232);
    context.strokeStyle = "rgba(146, 123, 92, .19)";
    context.lineWidth = 1;
    context.strokeRect(18, 18, 220, 220);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    return texture;
  }

  function addPlant(parent, x, z, size = 1) {
    const planterMaterial = x > 0 ? materials.terracotta : materials.ceramic;
    cylinder(parent, 0.29 * size, 0.22 * size, 0.42 * size, planterMaterial, [x, 0.21 * size, z], 24);
    cylinder(parent, 0.29 * size, 0.29 * size, 0.055 * size, materials.walnut, [x, 0.42 * size, z], 24);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x53634a, roughness: 0.9 });

    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const height = (0.72 + (index % 3) * 0.16) * size;
      const branchStart = new THREE.Vector3(x, 0.42 * size, z);
      const branchEnd = new THREE.Vector3(
        x + Math.cos(angle) * 0.22 * size,
        0.42 * size + height,
        z + Math.sin(angle) * 0.16 * size,
      );
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012 * size, 0.022 * size, height, 7),
        stemMaterial,
      );
      branch.position.copy(branchStart).add(branchEnd).multiplyScalar(0.5);
      branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), branchEnd.clone().sub(branchStart).normalize());
      parent.add(branch);

      for (let side = -1; side <= 1; side += 2) {
        const leafY = 0.42 * size + height * (0.42 + (side + 1) * 0.1);
        const leafX = x + Math.cos(angle) * 0.27 * size + side * Math.sin(angle) * 0.09 * size;
        const leafZ = z + Math.sin(angle) * 0.2 * size - side * Math.cos(angle) * 0.09 * size;
        sphere(parent, [0.095 * size, 0.21 * size, 0.035 * size], index % 2 ? materials.green : materials.greenLight, [leafX, leafY, leafZ], [0.12 * side, angle, -0.65 * side]);
      }
    }
  }

  function addVase(parent, x, y, z, scale = 1) {
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.18, 0),
      new THREE.Vector2(0.26, 0.1),
      new THREE.Vector2(0.3, 0.32),
      new THREE.Vector2(0.25, 0.51),
      new THREE.Vector2(0.12, 0.61),
      new THREE.Vector2(0.11, 0.77),
      new THREE.Vector2(0.15, 0.79),
    ].map((point) => new THREE.Vector2(point.x * scale, point.y * scale));
    const vase = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), materials.ceramic);
    vase.position.set(x, y, z);
    vase.castShadow = true;
    parent.add(vase);
  }

  function addRoomArchitecture() {
    const woodTexture = makeWoodTexture();
    const floorMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.78 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 10), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    room.add(floor);

    const windowLeft = 2.125;
    const windowRight = 4.575;
    const windowBottom = 2.54;
    const windowTop = 5.76;
    box(room, windowLeft + 6.5, 7, 0.18, materials.plaster, [(windowLeft - 6.5) / 2, 3.5, -4.35], { castShadow: false });
    box(room, 6.5 - windowRight, 7, 0.18, materials.plaster, [(6.5 + windowRight) / 2, 3.5, -4.35], { castShadow: false });
    box(room, 13, 7 - windowTop, 0.18, materials.plaster, [0, (7 + windowTop) / 2, -4.35], { castShadow: false });
    box(room, 13, windowBottom, 0.18, materials.plaster, [0, windowBottom / 2, -4.35], { castShadow: false });
    box(room, 0.18, 7, 10, materials.plasterShade, [-6.4, 3.5, 0], { castShadow: false });
    box(room, 13, 0.17, 0.12, materials.trim, [0, 0.1, -4.23], { castShadow: false });
    box(room, 0.12, 0.17, 10, materials.trim, [-6.29, 0.1, 0], { castShadow: false });
    box(room, 13, 0.13, 0.15, materials.trim, [0, 6.91, -4.22], { castShadow: false });
    box(room, 0.15, 0.13, 10, materials.trim, [-6.28, 6.91, 0], { castShadow: false });

    const rugTexture = makeRugTexture();
    const rugMaterial = new THREE.MeshStandardMaterial({ map: rugTexture, roughness: 1, side: THREE.DoubleSide });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 4.3), rugMaterial);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0.25, 0.025, 0.2);
    rug.receiveShadow = true;
    room.add(rug);

    const windowFrame = materials.trim;
    const windowX = 3.35;
    const windowY = 4.15;
    const windowZ = -4.21;
    const outside = new THREE.MeshStandardMaterial({ color: 0x9ca78e, roughness: 1 });
    box(room, 2.2, 2.95, 0.06, outside, [windowX, windowY, -4.48], { castShadow: false, receiveShadow: false });
    for (const [x, y, radius] of [
      [2.55, 3.2, 0.5], [3.3, 3.0, 0.65], [4.1, 3.25, 0.48],
      [2.75, 4.5, 0.58], [3.85, 4.55, 0.62], [3.35, 5.1, 0.43],
    ]) {
      sphere(room, [radius, radius * 0.75, 0.12], materials.green, [x, y, -4.42]);
    }
    box(room, 2.45, 3.22, 0.12, windowFrame, [windowX, windowY, windowZ]);
    box(room, 2.18, 2.93, 0.06, materials.glass, [windowX, windowY, -4.135], { castShadow: false });
    box(room, 0.07, 2.93, 0.07, materials.trim, [windowX, windowY, -4.08], { castShadow: false });
    box(room, 2.18, 0.075, 0.07, materials.trim, [windowX, windowY, -4.075], { castShadow: false });
    box(room, 2.65, 0.12, 0.3, materials.trim, [windowX, 2.53, -4.08]);
    box(room, 0.1, 3.58, 0.1, materials.brass, [2.02, 4.15, -4.01]);
    box(room, 0.1, 3.58, 0.1, materials.brass, [4.68, 4.15, -4.01]);
    const curtainMaterial = new THREE.MeshStandardMaterial({ color: 0xd2c8b6, roughness: 1, side: THREE.DoubleSide });
    for (let fold = 0; fold < 5; fold += 1) {
      box(room, 0.15, 3.34, 0.13, curtainMaterial, [1.83 + fold * 0.08, 4.05, -4.0]);
      box(room, 0.15, 3.34, 0.13, curtainMaterial, [4.72 + fold * 0.08, 4.05, -4.0]);
    }

    const artFrame = materials.oakLight;
    const artCanvas = new THREE.MeshStandardMaterial({ color: 0xe6ddcc, roughness: 0.98 });
    box(room, 1.36, 1.64, 0.1, artFrame, [-3.25, 4.75, -4.19]);
    box(room, 1.17, 1.43, 0.035, artCanvas, [-3.25, 4.75, -4.12], { castShadow: false });
    box(room, 0.82, 1.08, 0.075, artFrame, [-1.72, 4.31, -4.19]);
    box(room, 0.65, 0.91, 0.03, materials.linenDark, [-1.72, 4.31, -4.14], { castShadow: false });
    sphere(room, [0.18, 0.34, 0.025], materials.terracotta, [-3.25, 4.64, -4.08], [0, 0, -0.3]);
    sphere(room, [0.37, 0.11, 0.025], materials.green, [-3.21, 4.56, -4.07], [0, 0, 0.15]);

    const sideTop = cylinder(room, 0.55, 0.55, 0.1, materials.oakLight, [-4.9, 1.08, -1.65]);
    sideTop.scale.z = 0.86;
    for (const dx of [-0.37, 0.37]) {
      for (const dz of [-0.33, 0.33]) {
        box(room, 0.07, 0.98, 0.07, materials.walnut, [-4.9 + dx, 0.53, -1.65 + dz]);
      }
    }
    cylinder(room, 0.16, 0.18, 0.13, materials.ceramic, [-4.9, 1.2, -1.65], 24);
    cylinder(room, 0.2, 0.2, 0.12, materials.brass, [-4.9, 1.34, -1.65], 24);
    cylinder(room, 0.32, 0.04, 0.4, materials.linenLight, [-4.9, 1.56, -1.65], 32);
    addPlant(room, -4.88, -0.65, 1.3);
    addPlant(room, 5.0, -2.7, 1.1);
  }

  function addSofa() {
    const sofa = new THREE.Group();
    sofa.position.set(0, 0, -1.7);
    room.add(sofa);
    const cushion = new THREE.MeshStandardMaterial({ color: 0xc5b9a3, roughness: 0.97 });
    const cushionLight = new THREE.MeshStandardMaterial({ color: 0xd5cbb9, roughness: 0.98 });

    box(sofa, 5.45, 0.48, 1.14, materials.linen, [0, 0.72, 0]);
    box(sofa, 5.55, 1.18, 0.48, materials.linen, [0, 1.32, -0.48]);
    box(sofa, 0.56, 1.04, 1.34, materials.linenDark, [-2.72, 0.94, -0.02]);
    box(sofa, 0.56, 1.04, 1.34, materials.linenDark, [2.72, 0.94, -0.02]);

    for (const x of [-1.82, -0.62, 0.62, 1.82]) {
      box(sofa, 1.14, 0.2, 1.02, cushion, [x, 1.04, 0.02]);
      box(sofa, 1.1, 0.94, 0.21, cushionLight, [x, 1.56, -0.2], {
        rotation: [0.04, 0, (x < 0 ? -1 : 1) * 0.025],
      });
    }
    box(sofa, 2.15, 0.28, 2.04, materials.linen, [1.65, 0.58, 0.72]);
    box(sofa, 2.05, 0.2, 1.9, cushion, [1.65, 0.82, 0.77]);
    box(sofa, 1.94, 0.17, 0.2, materials.linenDark, [1.65, 0.94, 1.63]);

    box(sofa, 0.76, 0.75, 0.28, materials.linenLight, [-1.7, 1.63, -0.34], { rotation: [0.06, 0, -0.12] });
    box(sofa, 0.76, 0.75, 0.28, materials.green, [-0.52, 1.62, -0.34], { rotation: [0.04, 0, 0.1] });
    box(sofa, 0.78, 0.77, 0.29, materials.terracotta, [1.42, 1.62, -0.34], { rotation: [0.03, 0, -0.09] });
    box(sofa, 0.74, 0.7, 0.29, materials.linenLight, [2.18, 1.61, -0.32], { rotation: [0.04, 0, 0.11] });

    for (const x of [-2.2, 2.2]) {
      for (const z of [-0.37, 0.37]) {
        box(sofa, 0.11, 0.38, 0.11, materials.walnut, [x, 0.23, z]);
      }
    }
    box(sofa, 4.8, 0.07, 0.035, materials.oakLight, [0, 1.17, -0.21], { castShadow: false });
  }

  function addCoffeeTableAndDetails() {
    const table = new THREE.Group();
    table.position.set(0.35, 0, 1.12);
    room.add(table);
    cylinder(table, 1.26, 1.26, 0.16, materials.oakLight, [0, 0.92, 0], 64);
    cylinder(table, 1.2, 1.2, 0.055, materials.walnut, [0, 0.825, 0], 64);
    cylinder(table, 0.32, 0.5, 0.65, materials.oak, [0, 0.43, 0], 48);
    cylinder(table, 0.62, 0.62, 0.1, materials.walnut, [0, 0.08, 0], 48);
    cylinder(table, 0.54, 0.54, 0.045, materials.oakLight, [0, 0.14, 0], 48);

    addVase(table, -0.54, 1.02, -0.1, 0.8);
    cylinder(table, 0.17, 0.17, 0.28, materials.green, [0.54, 1.16, 0.12], 32);
    cylinder(table, 0.17, 0.17, 0.018, materials.linenLight, [0.54, 1.305, 0.12], 32);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 8), materials.walnut);
    wick.position.set(0.54, 1.34, 0.12);
    table.add(wick);
    cylinder(table, 0.23, 0.23, 0.04, materials.linenLight, [-0.04, 1.02, 0.34], 32);
    cylinder(table, 0.18, 0.2, 0.02, materials.terracotta, [-0.04, 1.052, 0.34], 32);
  }

  function addOttomanAndLamp() {
    const ottoman = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.73, 0.52, 48), materials.linenDark);
    ottoman.position.set(-3.15, 0.37, 1.35);
    ottoman.castShadow = true;
    ottoman.receiveShadow = true;
    room.add(ottoman);
    cylinder(room, 0.69, 0.69, 0.12, materials.linen, [-3.15, 0.66, 1.35], 48);
    for (const angle of [0.4, 1.8, 3.2, 4.8]) {
      const x = -3.15 + Math.cos(angle) * 0.49;
      const z = 1.35 + Math.sin(angle) * 0.49;
      box(room, 0.07, 0.28, 0.07, materials.walnut, [x, 0.15, z], { rotation: [0, -angle, 0] });
    }

    cylinder(room, 0.34, 0.38, 0.13, materials.walnut, [4.72, 0.08, 0.13]);
    cylinder(room, 0.045, 0.045, 2.72, materials.brass, [4.72, 1.47, 0.13], 20);
    cylinder(room, 0.12, 0.23, 0.13, materials.brass, [4.72, 2.83, 0.13], 32);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.73, 0.64, 48, 1, true), materials.linenLight);
    shade.position.set(4.72, 2.51, 0.13);
    shade.castShadow = true;
    room.add(shade);
    cylinder(room, 0.65, 0.65, 0.035, materials.linenLight, [4.72, 2.19, 0.13], 48);

    const bookMaterial = new THREE.MeshStandardMaterial({ color: 0xb8a790, roughness: 0.95 });
    box(room, 0.72, 0.09, 0.96, bookMaterial, [-4.88, 1.19, -1.65], { rotation: [0, 0.04, 0] });
    box(room, 0.64, 0.08, 0.88, materials.terracotta, [-4.9, 1.28, -1.65], { rotation: [0, -0.03, 0] });
  }

  function updateCamera() {
    const sinPhi = Math.sin(orbit.phi);
    camera.position.set(
      target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
      target.y + orbit.radius * Math.cos(orbit.phi),
      target.z + orbit.radius * sinPhi * Math.cos(orbit.theta),
    );
    camera.lookAt(target);
  }

  function resize() {
    if (disposed) return;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
  }

  try {
    scene.background = new THREE.Color(0x9d9b8d);
    renderer.setClearColor(0x9d9b8d, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(room);
    scene.add(new THREE.HemisphereLight(0xf7edda, 0x5a5848, 0.88));

    const sunlight = new THREE.DirectionalLight(0xffe4bc, 1.65);
    sunlight.position.set(5, 10, 7);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -9;
    sunlight.shadow.camera.right = 9;
    sunlight.shadow.camera.top = 9;
    sunlight.shadow.camera.bottom = -9;
    sunlight.shadow.bias = -0.0003;
    scene.add(sunlight);

    const fillLight = new THREE.DirectionalLight(0xd5dfda, 0.48);
    fillLight.position.set(-5, 6, 3);
    scene.add(fillLight);

    addRoomArchitecture();
    addSofa();
    addCoffeeTableAndDetails();
    addOttomanAndLamp();

    camera.position.set(orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta), 8, orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta));
    camera.lookAt(target);
    resize();
    host.classList.add("has-3d");

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let lastTime = 0;
    function animate(time) {
      if (disposed || !inView || document.hidden) {
        frameId = 0;
        return;
      }
      frameId = window.requestAnimationFrame(animate);
      if (time - lastTime < 28) return;
      lastTime = time;
      if (!dragStart && !reducedMotion.matches) orbit.theta += 0.00022;
      updateCamera();
      renderer.render(scene, camera);
    }
    const viewportObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden && !frameId) {
        frameId = window.requestAnimationFrame(animate);
      } else if (!inView && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }, { threshold: 0.02 });
    viewportObserver.observe(host);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (!document.hidden && inView && !frameId) {
        frameId = window.requestAnimationFrame(animate);
      }
    });

    canvas.addEventListener("pointerdown", (event) => {
      dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      orbit.theta -= (event.clientX - dragStart.x) * 0.006;
      orbit.phi = THREE.MathUtils.clamp(orbit.phi + (event.clientY - dragStart.y) * 0.004, 0.88, 1.48);
      dragStart.x = event.clientX;
      dragStart.y = event.clientY;
    });
    const endDrag = () => { dragStart = null; };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      orbit.radius = THREE.MathUtils.clamp(orbit.radius + event.deltaY * 0.009, 13, 22);
    }, { passive: false });
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") orbit.theta -= 0.12;
      if (event.key === "ArrowRight") orbit.theta += 0.12;
      if (event.key === "ArrowUp") orbit.phi = THREE.MathUtils.clamp(orbit.phi - 0.08, 0.88, 1.48);
      if (event.key === "ArrowDown") orbit.phi = THREE.MathUtils.clamp(orbit.phi + 0.08, 0.88, 1.48);
    });
    resetButton.addEventListener("click", () => { orbit = { ...initialOrbit }; });
    window.addEventListener("resize", resize);

    window.addEventListener("pagehide", () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      viewportObserver.disconnect();
      renderer.dispose();
    }, { once: true });
  } catch (error) {
    console.error("Could not initialize the Shopnest 3D room; showing the photographic fallback.", error);
    renderer.dispose();
  }
})();
