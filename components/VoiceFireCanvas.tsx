'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface VoiceAudioTelemetry {
  level: number; // 0.0 to 1.0 overall voice amplitude
  bass: number; // 0.0 to 1.0 deep male voice chest resonance
  mid: number; // 0.0 to 1.0 vocal clarity
  treble: number; // 0.0 to 1.0 consonance/sparks
  isSpeaking: boolean;
}

interface VoiceFireCanvasProps {
  telemetryRef: React.MutableRefObject<VoiceAudioTelemetry>;
  isSpeaking: boolean;
  onReplayVoice: () => void;
}

export default function VoiceFireCanvas({
  telemetryRef,
  isSpeaking,
  onReplayVoice,
}: VoiceFireCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection per Three.js skill guidelines
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a12);
    scene.fog = new THREE.FogExp2(0x070a12, 0.08);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 5.2);
    camera.lookAt(0, 0.25, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Studio Environment Map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3. Balanced 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x0f172a, 0.8);
    scene.add(hemiLight);

    const firePointLight = new THREE.PointLight(0xff6b00, 4.5, 14, 1.5);
    firePointLight.position.set(0, 0.3, 0.5);
    scene.add(firePointLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    // 4. Composite Multi-Part 3D Fire Forge Assembly (THREE.Group)
    const forgeGroup = new THREE.Group();
    forgeGroup.position.set(0, -0.35, 0);
    scene.add(forgeGroup);

    // Part A: Base Obsidian Pedestal Ring
    const baseGeo = new THREE.CylinderGeometry(1.55, 1.85, 0.28, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.35,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.95;
    forgeGroup.add(baseMesh);

    // Part B: Brushed Bronze Inner Burner Ring
    const burnerGeo = new THREE.TorusGeometry(1.32, 0.09, 20, 64);
    const burnerMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.92,
      roughness: 0.18,
      emissive: new THREE.Color(0x7c2d12),
      emissiveIntensity: 0.6,
    });
    const burnerMesh = new THREE.Mesh(burnerGeo, burnerMat);
    burnerMesh.rotation.x = Math.PI / 2;
    burnerMesh.position.y = -0.8;
    forgeGroup.add(burnerMesh);

    // Part C: Orbiting Gyroscopic Energy Rings
    const outerRingGeo = new THREE.TorusGeometry(1.65, 0.025, 16, 80);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15,
      emissive: new THREE.Color(0xb45309),
      emissiveIntensity: 0.4,
    });
    const gyroRing1 = new THREE.Mesh(outerRingGeo, outerRingMat);
    gyroRing1.position.y = 0.25;
    forgeGroup.add(gyroRing1);

    const innerRingGeo = new THREE.TorusGeometry(1.38, 0.02, 16, 72);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.88,
      roughness: 0.42,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.5,
    });
    const gyroRing2 = new THREE.Mesh(innerRingGeo, innerRingMat);
    gyroRing2.position.y = 0.25;
    forgeGroup.add(gyroRing2);

    // Part D: Living 3D Fire Core Mesh (Custom GLSL Vertex + Fragment Shader)
    const fireCoreGeo = new THREE.IcosahedronGeometry(0.92, 5);
    const fireCoreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVoiceLevel: { value: 0 },
        uBass: { value: 0 },
        uIntroBurst: { value: 1.0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uVoiceLevel;
        uniform float uBass;
        uniform float uIntroBurst;

        varying vec3 vNormal;
        varying float vDisplacement;
        varying vec2 vUv;

        // Compact 3D procedural turbulence
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(
              mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x),
              f.y
            ),
            mix(
              mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x),
              f.y
            ),
            f.z
          );
        }

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);

          vec3 pos = position;
          // Stretch upward like a roaring flame tongue
          float flameStretch = smoothstep(-0.8, 1.0, pos.y);
          pos.y += flameStretch * (0.35 + uVoiceLevel * 0.55 + uIntroBurst * 0.4);

          float n1 = noise(pos * 2.6 - vec3(0.0, uTime * 3.8, 0.0));
          float n2 = noise(pos * 5.2 - vec3(0.0, uTime * 6.5, 0.0));
          float disp = (n1 * 0.65 + n2 * 0.35) * (0.22 + uVoiceLevel * 0.65 + uBass * 0.35 + uIntroBurst * 0.35);

          pos += normal * disp;
          // Voice scale pulse
          pos *= 1.0 + uVoiceLevel * 0.28 + uBass * 0.18;

          vDisplacement = disp;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uVoiceLevel;
        varying vec3 vNormal;
        varying float vDisplacement;

        void main() {
          vec3 deepCrimson = vec3(0.75, 0.08, 0.04);
          vec3 blazeOrange = vec3(0.98, 0.42, 0.02);
          vec3 solarGold = vec3(1.0, 0.85, 0.35);
          vec3 whiteHot = vec3(1.0, 0.98, 0.90);

          float intensity = clamp(vDisplacement * 2.2 + uVoiceLevel * 0.55 + 0.35, 0.0, 1.0);
          vec3 col = mix(deepCrimson, blazeOrange, smoothstep(0.0, 0.45, intensity));
          col = mix(col, solarGold, smoothstep(0.45, 0.8, intensity));
          col = mix(col, whiteHot, smoothstep(0.8, 1.0, intensity));

          gl_FragColor = vec4(col, 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const fireCoreMesh = new THREE.Mesh(fireCoreGeo, fireCoreMat);
    fireCoreMesh.position.y = 0.25;
    forgeGroup.add(fireCoreMesh);

    // 5. Voice-Reactive Rising Fire & Sparks Particle System (1400 Particles)
    const PARTICLE_COUNT = 1400;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const aPhase = new Float32Array(PARTICLE_COUNT);
    const aRadius = new Float32Array(PARTICLE_COUNT);
    const aSpeed = new Float32Array(PARTICLE_COUNT);
    const aAngle = new Float32Array(PARTICLE_COUNT);
    const aHeat = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.18 + Math.pow(Math.random(), 0.7) * 2.3;
      const y = (Math.random() - 0.3) * 3.2;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      aPhase[i] = Math.random();
      aRadius[i] = radius;
      aSpeed[i] = 0.45 + Math.random() * 1.15;
      aAngle[i] = angle;
      aHeat[i] = Math.random();
    }

    particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
    particleGeo.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1));
    particleGeo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
    particleGeo.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
    particleGeo.setAttribute('aHeat', new THREE.BufferAttribute(aHeat, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVoiceLevel: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uIntroBurst: { value: 1.0 },
        uPixelRatio: {
          value: isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
        },
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aRadius;
        attribute float aSpeed;
        attribute float aAngle;
        attribute float aHeat;

        uniform float uTime;
        uniform float uVoiceLevel;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uIntroBurst;
        uniform float uPixelRatio;

        varying float vLife;
        varying float vHeat;
        varying float vVoiceBoost;

        void main() {
          // Continuous rising cycle modulated by voice energy
          float speedBoost = 1.0 + uVoiceLevel * 1.8 + uIntroBurst * 1.4;
          float life = fract(aPhase + uTime * aSpeed * 0.28 * speedBoost);
          vLife = life;
          vHeat = aHeat;
          vVoiceBoost = uVoiceLevel;

          // Swirl angle accelerates with vocal mid/treble frequencies
          float swirl = aAngle + uTime * (0.7 + aSpeed * 0.5) + life * 2.6 + uMid * 1.4;

          // Radial expansion pulses outward on voice syllables & bass beats
          float voiceWave = sin(life * 12.0 - uTime * 9.0 + aAngle * 2.0) * (0.08 + uVoiceLevel * 0.45);
          float funnel = mix(1.0, 0.32, life * 0.75);
          float r = (aRadius * funnel) * (1.0 + uBass * 0.55 + uIntroBurst * 0.65) + voiceWave;

          // Vertical climb from forge base (-1.0) to top (+2.8)
          float y = mix(-1.05, 2.75 + uVoiceLevel * 1.1 + uIntroBurst * 0.9, life);
          // Add harmonic vocal ripple on Y
          y += cos(aAngle * 4.0 + uTime * 8.0) * (uVoiceLevel * 0.25 + uTreble * 0.2);

          vec3 newPos = vec3(cos(swirl) * r, y, sin(swirl) * r);
          vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Particle size scales with voice amplitude and perspective depth
          float baseSize = mix(18.0, 4.0, life) * (0.7 + aHeat * 0.8);
          float voiceScale = 1.0 + uVoiceLevel * 1.35 + uTreble * 0.6 + uIntroBurst * 0.5;
          gl_PointSize = (baseSize * voiceScale * uPixelRatio) / max(0.5, -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying float vLife;
        varying float vHeat;
        varying float vVoiceBoost;

        void main() {
          // Soft circular glowing fire ember
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          float radialGlow = pow(1.0 - dist * 2.0, 1.8);
          // Fade in at bottom, fade out at peak
          float lifeAlpha = smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.65, 1.0, vLife));

          vec3 emberRed = vec3(0.92, 0.16, 0.05);
          vec3 flameOrange = vec3(1.0, 0.52, 0.06);
          vec3 sparkGold = vec3(1.0, 0.92, 0.55);

          vec3 col = mix( flameOrange, sparkGold, clamp(vHeat + vVoiceBoost * 0.6, 0.0, 1.0) );
          col = mix( col, emberRed, smoothstep(0.45, 0.95, vLife) );

          gl_FragColor = vec4(col, radialGlow * lifeAlpha * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const fireParticles = new THREE.Points(particleGeo, particleMat);
    fireParticles.frustumCulled = false;
    scene.add(fireParticles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 6. Paced Animation Loop with Exponential Damping & Opening Ignition Burst
    const clock = new THREE.Clock();
    let frameId = 0;
    let smoothedLevel = 0;
    let smoothedBass = 0;
    let smoothedMid = 0;
    let smoothedTreble = 0;
    let introBurst = 1.0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Smoothly decay the opening fire burst over the first 2.8 seconds
      introBurst = THREE.MathUtils.damp(introBurst, 0.0, 1.2, delta);

      const t = telemetryRef.current;
      // If voice is speaking, smoothly damp toward live audio telemetry
      smoothedLevel = THREE.MathUtils.damp(
        smoothedLevel,
        t.level,
        14.0,
        delta
      );
      smoothedBass = THREE.MathUtils.damp(smoothedBass, t.bass, 12.0, delta);
      smoothedMid = THREE.MathUtils.damp(smoothedMid, t.mid, 14.0, delta);
      smoothedTreble = THREE.MathUtils.damp(
        smoothedTreble,
        t.treble,
        16.0,
        delta
      );

      // Update Fire Core uniforms
      fireCoreMat.uniforms.uTime.value = elapsed;
      fireCoreMat.uniforms.uVoiceLevel.value = smoothedLevel;
      fireCoreMat.uniforms.uBass.value = smoothedBass;
      fireCoreMat.uniforms.uIntroBurst.value = introBurst;

      // Update Fire Particle uniforms
      particleMat.uniforms.uTime.value = elapsed;
      particleMat.uniforms.uVoiceLevel.value = smoothedLevel;
      particleMat.uniforms.uBass.value = smoothedBass;
      particleMat.uniforms.uMid.value = smoothedMid;
      particleMat.uniforms.uTreble.value = smoothedTreble;
      particleMat.uniforms.uIntroBurst.value = introBurst;

      // Animate Gyro Rings & Point Light with voice intensity
      const rotSpeed = 1.0 + smoothedLevel * 4.5 + introBurst * 3.0;
      gyroRing1.rotation.x = elapsed * 0.55 * rotSpeed;
      gyroRing1.rotation.y = elapsed * 0.35 * rotSpeed;
      gyroRing2.rotation.y = -elapsed * 0.7 * rotSpeed;
      gyroRing2.rotation.z = elapsed * 0.45 * rotSpeed;

      firePointLight.intensity =
        4.0 + smoothedLevel * 6.5 + Math.sin(elapsed * 12.0) * 0.4;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 800;
      const newH = container.clientHeight || 300;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      baseGeo.dispose();
      baseMat.dispose();
      burnerGeo.dispose();
      burnerMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      fireCoreGeo.dispose();
      fireCoreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, [telemetryRef]);

  return (
    <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-slate-800 bg-[#070a12]">
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal Top-Left Spec Badge (No backdrop-blur over WebGL per Three.js skill rules) */}
      <div className="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-amber-500/30 text-[11px] font-mono tabular-nums text-amber-300">
        {isSpeaking
          ? 'VOICE-REACTIVE FIRE ACTIVE · AUDIO SYNCED'
          : '3D FIRE FORGE · TAP READ VOICE TO PULSE PARTICLES'}
      </div>

      {/* Interactive Replay Trigger in Top-Right */}
      <button
        type="button"
        onClick={onReplayVoice}
        className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-[11px] font-semibold text-teal-300 transition-colors cursor-pointer"
      >
        {isSpeaking ? 'Pulse Active' : 'Ignite Voice'}
      </button>
    </div>
  );
}
