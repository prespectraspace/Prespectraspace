import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let wallsGroup, measurementsGroup, hotspotsGroup;
let canvasContainer;
let lang = 'en';

// Interactive state
let showMeasurements = true;
let isAutoRotating = true;
let hoverTarget = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Hotspots details (3D position & translatable text info)
const hotspotsData = [
  {
    id: 'conference',
    pos: { x: -4, y: 1.5, z: -5 },
    nameEn: "Conference Room A",
    nameAr: "غرفة الاجتماعات (أ)",
    descEn: "Cap: 12 People | Area: 45 m² | 4K Screen",
    descAr: "السعة: 12 شخصاً | المساحة: 45 م² | شاشة 4K",
    dimEn: "7.3 m × 6.1 m",
    dimAr: "7.3 م × 6.1 م"
  },
  {
    id: 'lounge',
    pos: { x: 5, y: 1.5, z: -4 },
    nameEn: "Executive Suite",
    nameAr: "الجناح التنفيذي",
    descEn: "Premium office layout with panoramic scanning setup",
    descAr: "مكتب تنفيذي مجهز بكامل المسح البانورامي الفاخر",
    dimEn: "4.9 m × 4.3 m",
    dimAr: "4.9 م × 4.3 م"
  },
  {
    id: 'openoffice',
    pos: { x: 1, y: 1.5, z: 3 },
    nameEn: "Open Collaborative Workspace",
    nameAr: "مساحة العمل المفتوحة المشتركة",
    descEn: "Cap: 28 desks | Integrated spatial markers",
    descAr: "السعة: 28 مكتباً | نقاط مرجعية مدمجة ثلاثية الأبعاد",
    dimEn: "10.6 m × 7.6 m",
    dimAr: "10.6 م × 7.6 م"
  }
];

// Screen coordinate labels to overlay HTML text over WebGL Canvas
let overlayLabels = [];

export function initThreeViewer(canvasId, initialLang) {
  lang = initialLang;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  canvasContainer = canvas.parentElement;

  // 1. Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070a);
  scene.fog = new THREE.FogExp2(0x07070a, 0.025);

  // 2. Camera Setup
  camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);
  resetCameraAngle();

  // 3. Renderer Setup
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Remove Loader overlay when loading completes
  const loaderEl = document.getElementById('viewer-loader');
  if (loaderEl) {
    loaderEl.style.opacity = '0';
    setTimeout(() => loaderEl.style.display = 'none', 500);
  }

  // 4. Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
  controls.minDistance = 5;
  controls.maxDistance = 45;
  controls.autoRotate = isAutoRotating;
  controls.autoRotateSpeed = 0.8;

  // 5. Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(10, 20, 15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // Decorative Blue Neon Pointlights inside rooms
  const conferenceLight = new THREE.PointLight(0x00e5ff, 1.5, 10);
  conferenceLight.position.set(-4, 2.5, -5);
  scene.add(conferenceLight);

  const officeLight = new THREE.PointLight(0x0055ff, 1.5, 10);
  officeLight.position.set(5, 2.5, -4);
  scene.add(officeLight);

  // 6. Floor & Grid Setup
  createFloorAndGrid();

  // 7. Architectural Walls Group
  wallsGroup = new THREE.Group();
  scene.add(wallsGroup);
  buildDigitalTwinWalls();

  // 8. Measurements & Lines
  measurementsGroup = new THREE.Group();
  scene.add(measurementsGroup);
  buildMeasurements();

  // 9. Hotspots
  hotspotsGroup = new THREE.Group();
  scene.add(hotspotsGroup);
  buildHotspots();

  // 10. Generate HTML Overlay Labels
  createHTMLOverlayLabels();

  // 11. Listeners
  window.addEventListener('resize', onWindowResize);
  canvasContainer.addEventListener('mousemove', onMouseMove);
  canvasContainer.addEventListener('click', onCanvasClick);

  // Setup UI Button triggers
  setupViewerControls();

  // 12. Start Render Loop
  animate();
}

function resetCameraAngle() {
  camera.position.set(15, 12, 18);
  if (controls) {
    controls.target.set(0, 0, 0);
  }
}

function createFloorAndGrid() {
  // Main floor geometry
  const floorGeo = new THREE.PlaneGeometry(32, 32);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0b0b0e,
    roughness: 0.35,
    metalness: 0.8,
    side: THREE.DoubleSide
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Glow Grid Helper
  const gridHelper = new THREE.GridHelper(32, 32, 0x0055ff, 0x1c1c24);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

// Builds the architectural shapes representing walls
function buildDigitalTwinWalls() {
  // Wall Material: Transparent dark blue border look
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x12121e,
    roughness: 0.2,
    metalness: 0.9,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  });

  const wallEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0x0066ff,
    linewidth: 2
  });

  // Programmatic wall segments (x, z, width, length, angle=0)
  const segments = [
    // Outer perimeter
    { x: 0, z: -9, w: 18, l: 0.3, h: 3 }, // Back wall
    { x: 0, z: 9, w: 18, l: 0.3, h: 3 },  // Front wall
    { x: -9, z: 0, w: 0.3, l: 18, h: 3 }, // Left wall
    { x: 9, z: 0, w: 0.3, l: 18, h: 3 },  // Right wall

    // Room partitioning
    { x: -1.5, z: -4.5, w: 0.2, l: 9, h: 3 }, // Conference divider (vertical)
    { x: -5.25, z: 0, w: 7.5, l: 0.2, h: 3 }, // Conference divider (horizontal)
    
    { x: 2.5, z: -4.5, w: 0.2, l: 9, h: 3 },  // Executive Office divider (vertical)
    { x: 5.75, z: 0, w: 6.5, l: 0.2, h: 3 }   // Executive Office divider (horizontal)
  ];

  segments.forEach(seg => {
    const geo = new THREE.BoxGeometry(seg.w, seg.h, seg.l);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(seg.x, seg.h / 2, seg.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);

    // Glowing outline edges to give it a digital cyber twin grid style
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, wallEdgeMaterial);
    line.position.copy(mesh.position);
    wallsGroup.add(line);
  });
}

// Builds the measurement lines & endpoint points
function buildMeasurements() {
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff });
  const pointGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const pointMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

  // Define measurement paths (start x,y,z to end x,y,z)
  const paths = [
    { start: { x: -9, y: 0.05, z: -9 }, end: { x: -9, y: 0.05, z: 9 }, label: "total_length" },
    { start: { x: -9, y: 0.05, z: -9 }, end: { x: 9, y: 0.05, z: -9 }, label: "total_width" },
    { start: { x: -9, y: 0.05, z: 0 }, end: { x: -1.5, y: 0.05, z: 0 }, label: "conf_width" },
    { start: { x: 2.5, y: 0.05, z: 0 }, end: { x: 9, y: 0.05, z: 0 }, label: "exec_width" }
  ];

  paths.forEach(p => {
    // 1. Draw points at end coordinates
    const pt1 = new THREE.Mesh(pointGeo, pointMat);
    pt1.position.set(p.start.x, p.start.y, p.start.z);
    measurementsGroup.add(pt1);

    const pt2 = new THREE.Mesh(pointGeo, pointMat);
    pt2.position.set(p.end.x, p.end.y, p.end.z);
    measurementsGroup.add(pt2);

    // 2. Draw line connecting endpoints
    const points = [
      new THREE.Vector3(p.start.x, p.start.y, p.start.z),
      new THREE.Vector3(p.end.x, p.end.y, p.end.z)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, lineMat);
    measurementsGroup.add(line);
  });
}

// Build clickable neon hotspots
function buildHotspots() {
  const geo = new THREE.SphereGeometry(0.35, 32, 32);
  
  hotspotsData.forEach(data => {
    // Inner pulsating core
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.75
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
    mesh.userData = { id: data.id, originalColor: 0x00e5ff };
    
    // Outer glass visual ring
    const ringGeo = new THREE.RingGeometry(0.5, 0.65, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0055ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(data.pos.x, 0.05, data.pos.z);
    mesh.add(ring); // Attach to parent sphere mesh

    hotspotsGroup.add(mesh);
  });
}

// Generate localized measurement divs overlaid on screenspace
function createHTMLOverlayLabels() {
  // Clear any existing labels
  document.querySelectorAll('.viewer-overlay-label').forEach(el => el.remove());
  overlayLabels = [];

  const labelsData = [
    { pos: { x: -9, y: 0.1, z: 0 }, textEn: "59.0 ft", textAr: "18.0 م" },
    { pos: { x: 0, y: 0.1, z: -9 }, textEn: "59.0 ft", textAr: "18.0 م" },
    { pos: { x: -5.25, y: 0.1, z: 0 }, textEn: "24.6 ft", textAr: "7.5 م" },
    { pos: { x: 5.75, y: 0.1, z: 0 }, textEn: "21.3 ft", textAr: "6.5 م" }
  ];

  labelsData.forEach(lbl => {
    const el = document.createElement('div');
    el.className = 'viewer-overlay-label';
    el.style.position = 'absolute';
    el.style.background = 'rgba(7, 7, 10, 0.85)';
    el.style.border = '1px solid var(--accent-cyan)';
    el.style.color = '#ffffff';
    el.style.padding = '2px 6px';
    el.style.borderRadius = '3px';
    el.style.fontSize = '10px';
    el.style.fontWeight = 'bold';
    el.style.pointerEvents = 'none';
    el.style.fontFamily = 'monospace';
    el.style.zIndex = '4';
    el.style.transition = 'opacity 0.2s ease';
    
    // Set localized text value
    el.textContent = lang === 'en' ? lbl.textEn : lbl.textAr;
    
    canvasContainer.appendChild(el);
    overlayLabels.push({ element: el, pos: new THREE.Vector3(lbl.pos.x, lbl.pos.y, lbl.pos.z) });
  });
}

// Map 3D points to absolute 2D window pixels
function updateHTMLOverlayLabelsPosition() {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  overlayLabels.forEach(lbl => {
    if (!showMeasurements) {
      lbl.element.style.opacity = '0';
      return;
    }

    const tempV = lbl.pos.clone();
    tempV.project(camera);

    // If point is behind the camera, hide it
    if (tempV.z > 1) {
      lbl.element.style.opacity = '0';
      return;
    }

    // Convert projected coords to screen coords (percentage)
    const x = (tempV.x * 0.5 + 0.5) * width;
    const y = (-tempV.y * 0.5 + 0.5) * height;

    lbl.element.style.opacity = '1';
    lbl.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  });
}

// Setup canvas viewport trigger elements
function setupViewerControls() {
  const dollhouseBtn = document.getElementById('btn-dollhouse-view');
  const floorplanBtn = document.getElementById('btn-floorplan-view');
  const toggleMeasurementsBtn = document.getElementById('btn-toggle-measurements');
  const toggleRotateBtn = document.getElementById('btn-toggle-rotate');
  const resetCamBtn = document.getElementById('btn-reset-cam');

  dollhouseBtn.addEventListener('click', () => {
    dollhouseBtn.classList.add('active');
    floorplanBtn.classList.remove('active');
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Unlock rotation angle
    
    // Animate camera position back to perspective angle
    newCameraPosition(15, 12, 18);
  });

  floorplanBtn.addEventListener('click', () => {
    floorplanBtn.classList.add('active');
    dollhouseBtn.classList.remove('active');
    controls.maxPolarAngle = 0; // Lock rotation at top-view orthographic angle
    
    newCameraPosition(0, 24, 0.01); // Position directly on top looking down
  });

  toggleMeasurementsBtn.addEventListener('click', () => {
    showMeasurements = !showMeasurements;
    measurementsGroup.visible = showMeasurements;
    toggleMeasurementsBtn.classList.toggle('active', showMeasurements);
  });

  toggleRotateBtn.addEventListener('click', () => {
    isAutoRotating = !isAutoRotating;
    controls.autoRotate = isAutoRotating;
    toggleRotateBtn.classList.toggle('active', isAutoRotating);
  });

  resetCamBtn.addEventListener('click', () => {
    resetCameraAngle();
  });
}

// Camera transition helper
function newCameraPosition(targetX, targetY, targetZ) {
  // Simple linear interpolation positioning
  const duration = 25;
  let frame = 0;
  const startX = camera.position.x;
  const startY = camera.position.y;
  const startZ = camera.position.z;

  function move() {
    frame++;
    const progress = frame / duration;
    camera.position.x = startX + (targetX - startX) * progress;
    camera.position.y = startY + (targetY - startY) * progress;
    camera.position.z = startZ + (targetZ - startZ) * progress;
    
    if (frame < duration) {
      requestAnimationFrame(move);
    } else {
      camera.position.set(targetX, targetY, targetZ);
    }
  }
  move();
}

// Hover collision check via raycasting
function onMouseMove(event) {
  // Calculate viewport relative mouse coords (-1 to +1)
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hotspotsGroup.children);

  if (intersects.length > 0) {
    const target = intersects[0].object;
    if (hoverTarget !== target) {
      // Restore previous hover state
      if (hoverTarget) {
        hoverTarget.material.color.setHex(hoverTarget.userData.originalColor);
      }
      
      hoverTarget = target;
      // Change color on hover
      hoverTarget.material.color.setHex(0x00ffff);
      document.body.style.cursor = 'pointer';
    }
  } else {
    if (hoverTarget) {
      hoverTarget.material.color.setHex(hoverTarget.userData.originalColor);
      hoverTarget = null;
      document.body.style.cursor = 'default';
    }
  }
}

// Click hotspot events
function onCanvasClick(event) {
  if (!hoverTarget) return;

  const data = hotspotsData.find(item => item.id === hoverTarget.userData.id);
  if (!data) return;

  const tooltip = document.getElementById('space-tooltip');
  const title = document.getElementById('tooltip-title');
  const detail = document.getElementById('tooltip-detail');

  title.textContent = lang === 'en' ? data.nameEn : data.nameAr;
  detail.innerHTML = `${lang === 'en' ? data.descEn : data.descAr}<br/><strong>${lang === 'en' ? 'Dimensions:' : 'الأبعاد:'}</strong> ${lang === 'en' ? data.dimEn : data.dimAr}`;

  // Make tooltip visible
  tooltip.classList.add('active');

  // Relocate camera to target clicked room target target coordinates
  controls.target.set(hoverTarget.position.x, 0, hoverTarget.position.z);

  // Stop auto rotating to let user examine space details
  if (isAutoRotating) {
    isAutoRotating = false;
    controls.autoRotate = false;
    const rotateBtn = document.getElementById('btn-toggle-rotate');
    if (rotateBtn) rotateBtn.classList.remove('active');
  }

  // Prevent bubble click conflicts
  event.stopPropagation();
}

// Hide tooltip if clicked outside hotspot
document.addEventListener('click', () => {
  const tooltip = document.getElementById('space-tooltip');
  if (tooltip) tooltip.classList.remove('active');
});

// Update Language parameters inside viewer
export function updateViewerLanguage(newLang) {
  lang = newLang;
  
  // Re-create HTML overlay labels with localized measurements
  createHTMLOverlayLabels();
}

function onWindowResize() {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update orbit controllers
  controls.update();

  // Pulse hotspots (animate scale back-and-forth)
  if (hotspotsGroup) {
    const time = Date.now() * 0.0035;
    hotspotsGroup.children.forEach(mesh => {
      const scale = 1 + Math.sin(time) * 0.08;
      mesh.scale.set(scale, scale, scale);
    });
  }

  // Render WebGL
  renderer.render(scene, camera);

  // Map 3D line points to screenspace HTML labels
  updateHTMLOverlayLabelsPosition();
}
