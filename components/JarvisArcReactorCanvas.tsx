'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface VoiceAudioTelemetry {
  level: number; // 0.0 to 1.0 overall voice amplitude
  bass: number; // 0.0 to 1.0 deep voice resonance / kicks
  mid: number; // 0.0 to 1.0 vocal clarity
  treble: number; // 0.0 to 1.0 sparks / high frequencies
  isSpeaking: boolean;
}

interface JarvisArcReactorCanvasProps {
  telemetryRef: React.MutableRefObject<VoiceAudioTelemetry>;
  isSpeaking: boolean;
  onReplayVoice: () => void;
}

export default function JarvisArcReactorCanvas({
  telemetryRef,
  isSpeaking,
  onReplayVoice,
}: JarvisArcReactorCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection for 60fps performance across devices
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;

    // 2. Three.js Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Deep cybernetic void
    scene.fog = new THREE.FogExp2(0x060913, 0.035);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);

    // Responsive camera auto-framing: calculates distance so the entire reactor & expanding rings fit completely
    const updateCameraFraming = (cam: THREE.PerspectiveCamera, w: number, h: number) => {
      const aspect = w / h;
      cam.aspect = aspect;
      const fov = 40;
      cam.fov = fov;
      const tanHalfFov = Math.tan(((fov / 2) * Math.PI) / 180);
      // Maximum bounding radius of masterStage (3.6 radius * 0.70 scale)
      const maxEffectiveRadius = 3.65 * 0.70; // ~2.55
      const zVert = maxEffectiveRadius / tanHalfFov;
      const zHoriz = maxEffectiveRadius / (tanHalfFov * aspect);
      // Generous 16% safety padding ensures outer rings never clip on any screen ratio
      cam.position.set(0, 0, Math.max(zVert, zHoriz) * 1.16);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
    };

    updateCameraFraming(camera, width, height);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Environment Map for realistic metallic chrome reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 4. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x0d1b2a, 0.9);
    scene.add(ambientLight);

    // Primary Electric Cyan Reactor Glow Light
    const corePointLight = new THREE.PointLight(0x00f0ff, 4.5, 16, 1.4);
    corePointLight.position.set(0, 0, 0.4);
    scene.add(corePointLight);

    // Secondary White-Hot Arc Core Light
    const coreWhiteLight = new THREE.PointLight(0xe0f7fa, 3.0, 9, 1.8);
    coreWhiteLight.position.set(0, -0.1, 0.6);
    scene.add(coreWhiteLight);

    // Armor Rim Light (Burgundy / Dark Crimson Accent)
    const armorRimLight = new THREE.DirectionalLight(0xb91c1c, 0.95);
    armorRimLight.position.set(4, 3, -2);
    scene.add(armorRimLight);

    // Key Specular Light (Top-Left Highlight)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(-3, 4, 4);
    scene.add(keyLight);

    // =========================================================================
    // ROOT HIERARCHY GROUPS
    // =========================================================================
    const masterStage = new THREE.Group();
    // Scaled to 0.70 so the entire assembly with expanding rings fits comfortably within the card frame
    masterStage.scale.set(0.70, 0.70, 0.70);
    scene.add(masterStage);

    // Group for the central Arc Reactor circle that bumps inside/outside with voice
    const reactorCoreGroup = new THREE.Group();
    masterStage.add(reactorCoreGroup);

    // Group for the outer holographic rings that expand outward with voice
    const outerRingsGroup = new THREE.Group();
    masterStage.add(outerRingsGroup);

    // =========================================================================
    // 5. OUTER METALLIC HOUSING & ARMOR BEZEL (Per Reference Photo)
    // =========================================================================
    const armorHousingGroup = new THREE.Group();
    reactorCoreGroup.add(armorHousingGroup);

    // A. Outer Deep Burgundy/Crimson Titanium Armor Rim
    const armorRimGeo = new THREE.TorusGeometry(2.36, 0.14, 28, 96);
    const armorRimMat = new THREE.MeshStandardMaterial({
      color: 0x450a14, // Deep Iron Man Crimson
      metalness: 0.85,
      roughness: 0.38,
      emissive: new THREE.Color(0x2d050c),
      emissiveIntensity: 0.4,
    });
    const armorRimMesh = new THREE.Mesh(armorRimGeo, armorRimMat);
    armorRimMesh.position.z = -0.18;
    armorHousingGroup.add(armorRimMesh);

    // B. Beveled Brushed-Chrome Main Outer Ring
    const chromeRingGeo = new THREE.TorusGeometry(2.14, 0.085, 24, 96);
    const chromeRingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.16,
      envMapIntensity: 1.4,
    });
    const chromeRingMesh = new THREE.Mesh(chromeRingGeo, chromeRingMat);
    chromeRingMesh.position.z = 0.02;
    armorHousingGroup.add(chromeRingMesh);

    // C. Stepped Gunmetal Inner Collar
    const collarGeo = new THREE.CylinderGeometry(2.05, 2.14, 0.18, 72, 1, true);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.28,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.z = -0.06;
    armorHousingGroup.add(collarMesh);

    // D. Backing Circular Energy Diffusion Disc (Cyan Backlight)
    const backplateGeo = new THREE.CircleGeometry(1.98, 64);
    const backplateMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.72,
    });
    const backplateMesh = new THREE.Mesh(backplateGeo, backplateMat);
    backplateMesh.position.z = -0.22;
    armorHousingGroup.add(backplateMesh);

    // E. 10 Radial Energy/Cooling Segment Fins (Visible in reference photo)
    const finGroup = new THREE.Group();
    finGroup.position.z = -0.08;
    armorHousingGroup.add(finGroup);

    const finGeo = new THREE.BoxGeometry(0.09, 0.58, 0.16);
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.92,
      roughness: 0.22,
    });

    const FIN_COUNT = 10;
    for (let i = 0; i < FIN_COUNT; i++) {
      const angle = (i * Math.PI * 2) / FIN_COUNT;
      const finMesh = new THREE.Mesh(finGeo, finMat);
      const r = 1.64;
      finMesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      finMesh.rotation.z = angle + Math.PI / 2;
      finGroup.add(finMesh);
    }

    // =========================================================================
    // 6. ICONIC INVERTED TRIANGULAR EXOSKELETON FRAME (Mark VI Core)
    // =========================================================================
    const triangleFrameGroup = new THREE.Group();
    reactorCoreGroup.add(triangleFrameGroup);

    function createInvertedTriangleShape(radius: number): THREE.Shape {
      const shape = new THREE.Shape();
      const r = radius;
      // Inverted: Flat edge on top, single apex pointing down
      const p1 = new THREE.Vector2(-r * (Math.sqrt(3) / 2), r * 0.5);
      const p2 = new THREE.Vector2(r * (Math.sqrt(3) / 2), r * 0.5);
      const p3 = new THREE.Vector2(0, -r);

      shape.moveTo(p1.x, p1.y);
      shape.lineTo(p2.x, p2.y);
      shape.lineTo(p3.x, p3.y);
      shape.closePath();
      return shape;
    }

    // Outer Beveled Polished Chrome Triangular Frame
    const outerTriShape = createInvertedTriangleShape(1.36);
    const outerHole = createInvertedTriangleShape(0.96);
    outerTriShape.holes.push(outerHole);

    const outerTriGeo = new THREE.ExtrudeGeometry(outerTriShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 3,
    });
    const polishedChromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.12,
      envMapIntensity: 1.8,
    });
    const outerTriMesh = new THREE.Mesh(outerTriGeo, polishedChromeMat);
    outerTriMesh.position.z = 0.02;
    triangleFrameGroup.add(outerTriMesh);

    // 3 Vertex Connector Struts reaching out to the outer ring
    const strutGeo = new THREE.BoxGeometry(0.14, 0.62, 0.12);
    const strutMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.18,
    });

    // Top-Left Connector (150 deg)
    const strutTL = new THREE.Mesh(strutGeo, strutMat);
    strutTL.position.set(-1.42, 0.82, 0.06);
    strutTL.rotation.z = Math.PI / 3;
    triangleFrameGroup.add(strutTL);

    // Top-Right Connector (30 deg)
    const strutTR = new THREE.Mesh(strutGeo, strutMat);
    strutTR.position.set(1.42, 0.82, 0.06);
    strutTR.rotation.z = -Math.PI / 3;
    triangleFrameGroup.add(strutTR);

    // Bottom Connector (straight down to ring)
    const strutB = new THREE.Mesh(strutGeo, strutMat);
    strutB.position.set(0, -1.62, 0.06);
    triangleFrameGroup.add(strutB);

    // Vertex Hinge / Clamp Cylinders at the 3 Apexes
    const hingeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 24);
    const hingeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.96,
      roughness: 0.22,
    });

    const hinge1 = new THREE.Mesh(hingeGeo, hingeMat);
    hinge1.rotation.x = Math.PI / 2;
    hinge1.position.set(-1.18, 0.68, 0.12);
    triangleFrameGroup.add(hinge1);

    const hinge2 = new THREE.Mesh(hingeGeo, hingeMat);
    hinge2.rotation.x = Math.PI / 2;
    hinge2.position.set(1.18, 0.68, 0.12);
    triangleFrameGroup.add(hinge2);

    const hinge3 = new THREE.Mesh(hingeGeo, hingeMat);
    hinge3.rotation.x = Math.PI / 2;
    hinge3.position.set(0, -1.36, 0.12);
    triangleFrameGroup.add(hinge3);

    // Central Vertical Spine Strut (runs from inner triangle bottom to outer apex)
    const spineGeo = new THREE.BoxGeometry(0.08, 0.72, 0.1);
    const spineMesh = new THREE.Mesh(spineGeo, strutMat);
    spineMesh.position.set(0, -0.98, 0.08);
    triangleFrameGroup.add(spineMesh);

    // =========================================================================
    // 7. NESTED INNER CORE TRIANGLE & QUANTUM SINGULARITY (Pulsing Energy Emitter)
    // =========================================================================
    const innerCorePistonGroup = new THREE.Group();
    reactorCoreGroup.add(innerCorePistonGroup);

    // Inner Polished Titanium Triangle Frame
    const innerTriShape = createInvertedTriangleShape(0.68);
    const innerHole = createInvertedTriangleShape(0.36);
    innerTriShape.holes.push(innerHole);

    const innerTriGeo = new THREE.ExtrudeGeometry(innerTriShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 3,
    });
    const innerTriMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      metalness: 0.98,
      roughness: 0.1,
      emissive: new THREE.Color(0x00f0ff),
      emissiveIntensity: 0.5,
      envMapIntensity: 2.0,
    });
    const innerTriMesh = new THREE.Mesh(innerTriGeo, innerTriMat);
    innerTriMesh.position.z = 0.08;
    innerCorePistonGroup.add(innerTriMesh);

    // Central Blazing Quantum Energy Singularity Prism
    const singularityShape = createInvertedTriangleShape(0.32);
    const singularityGeo = new THREE.ExtrudeGeometry(singularityShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });

    // Custom Shader for the Living Reactor Core Plasma
    const singularityMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVoiceLevel: { value: 0 },
        uBass: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uVoiceLevel;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec3 pos = position;
          pos *= 1.0 + uVoiceLevel * 0.22;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uVoiceLevel;
        uniform float uBass;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec3 whiteHot = vec3(1.0, 1.0, 1.0);
          vec3 radiantCyan = vec3(0.0, 0.94, 1.0);
          vec3 deepPlasma = vec3(0.05, 0.45, 0.95);

          float pulse = 0.85 + 0.15 * sin(uTime * 12.0) + uVoiceLevel * 0.65 + uBass * 0.45;
          float dist = length(vUv - vec2(0.5, 0.5)) * 2.0;

          vec3 color = mix(whiteHot, radiantCyan, smoothstep(0.0, 0.5, dist));
          color = mix(color, deepPlasma, smoothstep(0.5, 1.0, dist));
          color *= pulse;

          gl_FragColor = vec4(color, 0.98);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const singularityMesh = new THREE.Mesh(singularityGeo, singularityMat);
    singularityMesh.position.z = 0.14;
    innerCorePistonGroup.add(singularityMesh);

    // =========================================================================
    // 8. MULTIPLE OUTER HOLOGRAPHIC JARVIS RINGS (Expand with voice & rotate)
    // =========================================================================

    // Ring 1: Segmented Outer HUD Arc Ring (Radius 2.52)
    const ring1Geo = new THREE.RingGeometry(2.48, 2.54, 72, 1, 0, Math.PI * 1.85);
    const hudCyanMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const hudRing1 = new THREE.Mesh(ring1Geo, hudCyanMat1);
    outerRingsGroup.add(hudRing1);

    // Ring 2: Micro-Tick Tachometer Ring (Radius 2.76)
    const tickCount = 64;
    const tickGroup = new THREE.Group();
    outerRingsGroup.add(tickGroup);

    const smallTickGeo = new THREE.PlaneGeometry(0.025, 0.09);
    const largeTickGeo = new THREE.PlaneGeometry(0.045, 0.16);
    const tickMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < tickCount; i++) {
      const angle = (i * Math.PI * 2) / tickCount;
      const isMajor = i % 8 === 0;
      const tick = new THREE.Mesh(isMajor ? largeTickGeo : smallTickGeo, tickMat);
      const r = 2.76;
      tick.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      tick.rotation.z = angle + Math.PI / 2;
      tickGroup.add(tick);
    }

    // Ring 3: Counter-Rotating Dashed Brackets Ring (Radius 2.98)
    const ring3Group = new THREE.Group();
    outerRingsGroup.add(ring3Group);

    for (let b = 0; b < 3; b++) {
      const bracketArc = new THREE.RingGeometry(
        2.95,
        3.02,
        36,
        1,
        b * ((Math.PI * 2) / 3) + 0.15,
        (Math.PI * 2) / 3 - 0.3
      );
      const bracketMesh = new THREE.Mesh(bracketArc, hudCyanMat1);
      ring3Group.add(bracketMesh);
    }

    // Ring 4: 3D Gyroscopic Orbital Ring (Tilts in 3D perspective, Radius 3.22)
    const gyroRingGeo = new THREE.TorusGeometry(3.22, 0.02, 16, 96);
    const gyroRingMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.9,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const gyroRingMesh = new THREE.Mesh(gyroRingGeo, gyroRingMat);
    gyroRingMesh.rotation.x = 0.35;
    gyroRingMesh.rotation.y = 0.25;
    outerRingsGroup.add(gyroRingMesh);

    // Ring 5: Outer Holographic Coordinate Marker Ring (Radius 3.48)
    const ring5Geo = new THREE.RingGeometry(3.46, 3.5, 64, 1, 0, Math.PI * 1.6);
    const ring5Mesh = new THREE.Mesh(
      ring5Geo,
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      })
    );
    outerRingsGroup.add(ring5Mesh);

    // 6 Holographic Orbital Satellite Nodes
    const nodeGeo = new THREE.CircleGeometry(0.06, 16);
    const nodeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    for (let n = 0; n < 6; n++) {
      const nodeAngle = (n * Math.PI * 2) / 6;
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(Math.cos(nodeAngle) * 3.48, Math.sin(nodeAngle) * 3.48, 0);
      ring5Mesh.add(nodeMesh);
    }

    // Ring 6: Expanding Energy Shockwave Wavefront Ring
    const shockwaveGeo = new THREE.RingGeometry(1.9, 2.02, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    outerRingsGroup.add(shockwaveMesh);

    // =========================================================================
    // 9. QUANTUM ARC PARTICLES & SPARKS (1,200 Cyan & White Energy Particles)
    // =========================================================================
    const PARTICLE_COUNT = 1200;
    const particleGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pAngles = new Float32Array(PARTICLE_COUNT);
    const pRadii = new Float32Array(PARTICLE_COUNT);
    const pSpeeds = new Float32Array(PARTICLE_COUNT);
    const pZOffsets = new Float32Array(PARTICLE_COUNT);

    for (let p = 0; p < PARTICLE_COUNT; p++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.4 + Math.pow(Math.random(), 0.6) * 2.8;
      const z = (Math.random() - 0.5) * 0.8;

      pPositions[p * 3] = Math.cos(angle) * radius;
      pPositions[p * 3 + 1] = Math.sin(angle) * radius;
      pPositions[p * 3 + 2] = z;

      pAngles[p] = angle;
      pRadii[p] = radius;
      pSpeeds[p] = 0.35 + Math.random() * 0.95;
      pZOffsets[p] = z;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: isSoftwareGl ? 0.03 : 0.045,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    masterStage.add(particles);

    // =========================================================================
    // 10. INTERACTIVE POINTER / PARALLAX TILT
    // =========================================================================
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let shockwaveProgress = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = nx * 0.28; // Subtle ~16 degrees tilt
      mouse.targetY = ny * 0.24;
    };

    const onPointerLeave = () => {
      mouse.targetX = 0;
      mouse.targetY = 0;
    };

    const onClickCanvas = () => {
      shockwaveProgress = 0.01;
      onReplayVoice();
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mouseleave', onPointerLeave);
    container.addEventListener('click', onClickCanvas);

    // =========================================================================
    // 11. 60 FPS ANIMATION LOOP (VOICE-REACTIVE PHYSICS)
    // =========================================================================
    let animId = 0;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Read real-time voice telemetry from shared mutable ref
      const telemetry = telemetryRef.current;
      const voiceLevel = telemetry.level || 0;
      const voiceBass = telemetry.bass || 0;
      const voiceTreble = telemetry.treble || 0;
      const speaking = isSpeaking || telemetry.isSpeaking;

      // Smooth pointer parallax interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      masterStage.rotation.y = mouse.x;
      masterStage.rotation.x = -mouse.y;

      // -----------------------------------------------------------------------
      // A. ROTATING HOLOGRAPHIC OUTER RINGS (Alternate speeds & directions)
      // -----------------------------------------------------------------------
      const speedMult = speaking ? 1.0 + voiceLevel * 1.4 : 1.0;
      hudRing1.rotation.z += delta * 0.32 * speedMult;
      tickGroup.rotation.z -= delta * 0.20 * speedMult;
      ring3Group.rotation.z += delta * 0.40 * speedMult;
      ring5Mesh.rotation.z -= delta * 0.16 * speedMult;

      // Gyroscopic 3D Wobble
      gyroRingMesh.rotation.z += delta * 0.55 * speedMult;
      gyroRingMesh.rotation.x = 0.35 + Math.sin(time * 1.8) * 0.10;
      gyroRingMesh.rotation.y = 0.25 + Math.cos(time * 1.5) * 0.10;

      // -----------------------------------------------------------------------
      // B. VOICE-REACTIVE RINGS EXPANSION (Moving outward when agent speaks)
      // -----------------------------------------------------------------------
      // Tuned expansion: gently expands outward during speech, safely bounded to fit in frame
      const idleBreathing = Math.sin(time * 2.2) * 0.02;
      const targetExpansion = speaking
        ? 1.0 + voiceLevel * 0.22 + voiceBass * 0.14
        : 1.0 + idleBreathing;

      const currentScale = outerRingsGroup.scale.x;
      const lerpedScale = THREE.MathUtils.lerp(currentScale, targetExpansion, 0.18);
      outerRingsGroup.scale.set(lerpedScale, lerpedScale, 1.0);

      // Rings pull back slightly in Z to create layered perspective depth
      outerRingsGroup.position.z = THREE.MathUtils.lerp(
        outerRingsGroup.position.z,
        speaking ? -0.12 - voiceLevel * 0.15 : 0.0,
        0.12
      );

      // -----------------------------------------------------------------------
      // C. VOICE-REACTIVE CIRCLE & LOGO BUMPING INSIDE AND OUTSIDE (Z-Axis Depth Pulse)
      // -----------------------------------------------------------------------
      const voiceBounce = Math.sin(time * 8.0) * (voiceLevel * 0.10);
      const bassKick = voiceBass * 0.30;
      const targetCoreZ = speaking ? bassKick + voiceBounce : Math.sin(time * 1.6) * 0.03;

      // Reactor core pumps forward and backward in 3D space
      reactorCoreGroup.position.z = THREE.MathUtils.lerp(
        reactorCoreGroup.position.z,
        targetCoreZ,
        0.20
      );

      // Core scale bumping (expands on speech syllables)
      const targetCoreScale = speaking
        ? 1.0 + voiceBass * 0.12 + voiceLevel * 0.06
        : 1.0 + Math.sin(time * 1.6) * 0.012;

      const currentCoreScale = reactorCoreGroup.scale.x;
      const lerpedCoreScale = THREE.MathUtils.lerp(currentCoreScale, targetCoreScale, 0.20);
      reactorCoreGroup.scale.set(lerpedCoreScale, lerpedCoreScale, 1.0 + bassKick * 0.18);

      // Inner triangular core piston punches forward on bass kicks
      innerCorePistonGroup.position.z = THREE.MathUtils.lerp(
        innerCorePistonGroup.position.z,
        speaking ? 0.05 + voiceBass * 0.20 : 0.0,
        0.25
      );

      // -----------------------------------------------------------------------
      // D. LIGHTING & GLOW SURGE
      // -----------------------------------------------------------------------
      const targetLightIntensity = speaking ? 4.5 + voiceLevel * 5.5 + voiceBass * 3.5 : 3.5;
      corePointLight.intensity = THREE.MathUtils.lerp(
        corePointLight.intensity,
        targetLightIntensity,
        0.15
      );
      coreWhiteLight.intensity = THREE.MathUtils.lerp(
        coreWhiteLight.intensity,
        speaking ? 2.5 + voiceLevel * 3.5 : 1.8,
        0.15
      );

      // Update Shader Uniforms
      singularityMat.uniforms.uTime.value = time;
      singularityMat.uniforms.uVoiceLevel.value = voiceLevel;
      singularityMat.uniforms.uBass.value = voiceBass;

      // -----------------------------------------------------------------------
      // E. SHOCKWAVE PULSE
      // -----------------------------------------------------------------------
      if (speaking && Math.random() < voiceBass * 0.22 && shockwaveProgress === 0) {
        shockwaveProgress = 0.01;
      }

      if (shockwaveProgress > 0) {
        shockwaveProgress += delta * 1.8;
        const swScale = 1.0 + shockwaveProgress * 1.35;
        shockwaveMesh.scale.set(swScale, swScale, 1.0);
        shockwaveMat.opacity = Math.max(0, (1.0 - shockwaveProgress) * 0.85);

        if (shockwaveProgress >= 1.0) {
          shockwaveProgress = 0;
          shockwaveMat.opacity = 0;
        }
      }

      // -----------------------------------------------------------------------
      // F. QUANTUM ARC PARTICLES ORBIT & STREAMING
      // -----------------------------------------------------------------------
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      const pSpeedFactor = speaking ? 1.0 + voiceTreble * 2.2 + voiceLevel * 1.4 : 1.0;

      for (let p = 0; p < PARTICLE_COUNT; p++) {
        pAngles[p] += delta * pSpeeds[p] * 0.6 * pSpeedFactor;
        const a = pAngles[p];
        const r = pRadii[p] * (1.0 + voiceLevel * 0.14);

        posArray[p * 3] = Math.cos(a) * r;
        posArray[p * 3 + 1] = Math.sin(a) * r;
        posArray[p * 3 + 2] = pZOffsets[p] + Math.sin(time * 3 + a) * 0.10;
      }
      posAttr.needsUpdate = true;

      // Render Scene
      renderer.render(scene, camera);
    };

    renderLoop();

    // =========================================================================
    // 12. CLEANUP & DYNAMIC RESIZE HANDLING
    // =========================================================================
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 800;
      const nh = container.clientHeight || 420;
      updateCameraFraming(camera, nw, nh);
      renderer.setSize(nw, nh);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mouseleave', onPointerLeave);
      container.removeEventListener('click', onClickCanvas);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [telemetryRef, isSpeaking, onReplayVoice]);

  return (
    <div
      className="relative w-full h-[360px] sm:h-[440px] md:h-[480px] rounded-2xl overflow-hidden bg-slate-950 border border-cyan-900/50 shadow-[0_0_40px_-5px_rgba(0,240,255,0.22)] select-none cursor-pointer group"
      title="Iron Man JARVIS Arc Reactor — Click to trigger discharge & replay voice"
    >
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Futuristic HUD Framing Overlays (Compact Pill Style in Corners) */}
      <div className="absolute top-3.5 left-3.5 sm:left-4 flex items-center gap-2 pointer-events-none bg-slate-950/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-900/50 shadow-md">
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isSpeaking ? 'bg-cyan-400' : 'bg-slate-500'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isSpeaking ? 'bg-cyan-500 shadow-[0_0_8px_#00f0ff]' : 'bg-slate-400'
            }`}
          />
        </span>
        <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
          JARVIS MK-VI // {isSpeaking ? 'TRANSMITTING' : 'ONLINE'}
        </span>
      </div>

      <div className="absolute top-3.5 right-3.5 sm:right-4 pointer-events-none bg-slate-950/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-900/50 shadow-md hidden sm:block">
        <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400/90 tracking-wider uppercase">
          OUTPUT: 8.2 GJ/S • AUDIO-SYNC
        </span>
      </div>

      {/* Bottom Interactive Directive Hint */}
      <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none px-4">
        <span className="inline-block text-[10px] sm:text-[11px] font-mono tracking-wider text-cyan-300 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-cyan-800/50 shadow-[0_0_15px_rgba(0,240,255,0.15)] opacity-80 group-hover:opacity-100 transition-opacity">
          CLICK REACTOR TO DISCHARGE ENERGY • DRAG TO TILT 3D
        </span>
      </div>
    </div>
  );
}
