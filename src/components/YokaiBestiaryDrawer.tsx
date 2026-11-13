import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { X } from 'lucide-react';
import { YOKAI_GUIDE, type YokaiType } from '../game/constants';
import { detectSoftwareWebGL } from '../game/YokaiGameEngine';
import {
  buildYokaiBody,
  createEnemyTypeConfig,
  createSharedResources,
} from '../game/yokaiMeshes';

interface YokaiBestiaryDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface PreviewSlot {
  type: YokaiType;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  tailMesh: THREE.Group | null;
  orbitGroup: THREE.Group | null;
  bodyMat: THREE.MeshStandardMaterial;
  canvas: HTMLCanvasElement | null;
}

const PREVIEW_SIZE = 128;

export function YokaiBestiaryDrawer({ open, onClose }: YokaiBestiaryDrawerProps) {
  const canvasRefs = useRef<Record<YokaiType, HTMLCanvasElement | null>>({
    normal: null,
    fast: null,
    ghost: null,
    tank: null,
  });

  useEffect(() => {
    if (!open) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    roomEnv.dispose();
    pmrem.dispose();

    const resources = createSharedResources();

    const scene = new THREE.Scene();
    scene.environment = envRT.texture;

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
    camera.position.set(0, 0.72, 2.35);
    camera.lookAt(0, 0.22, 0);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.3);
    keyLight.position.set(2.5, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    rimLight.position.set(-2.5, 1.5, -2.5);
    scene.add(rimLight);

    const slots: PreviewSlot[] = YOKAI_GUIDE.map((entry) => {
      const cfg = createEnemyTypeConfig(entry.type, 1);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.emissive,
        emissiveIntensity: 0.28,
        roughness: 0.36,
        metalness: 0.15,
      });

      const { bodyGroup, tailMesh, orbitGroup } = buildYokaiBody(
        entry.type,
        bodyMat,
        resources
      );

      const root = new THREE.Group();
      const scale = entry.type === 'tank' ? 0.82 : 1.05;
      root.scale.setScalar(scale);
      root.add(bodyGroup);
      root.visible = false;
      scene.add(root);

      return {
        type: entry.type,
        root,
        bodyGroup,
        tailMesh,
        orbitGroup,
        bodyMat,
        canvas: canvasRefs.current[entry.type],
      };
    });

    const clock = new THREE.Clock();
    let totalTime = 0;
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      totalTime += dt;

      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const targetCanvas = canvasRefs.current[s.type];
        if (!targetCanvas) continue;
        const ctx2d = targetCanvas.getContext('2d');
        if (!ctx2d) continue;

        s.root.visible = true;
        s.root.rotation.y = totalTime * 1.15 + i * 0.8;

        if (s.type === 'ghost') {
          s.bodyGroup.position.y = Math.sin(totalTime * 3.5) * 0.08;
          if (s.orbitGroup) {
            s.orbitGroup.rotation.y += dt * 3.2;
          }
        } else {
          const hopFreq = s.type === 'fast' ? 9 : s.type === 'tank' ? 5 : 7;
          s.bodyGroup.position.y = Math.abs(Math.sin(totalTime * hopFreq)) * 0.06;
          if (s.tailMesh) {
            s.tailMesh.rotation.y = Math.sin(totalTime * 10) * 0.38;
          }
        }

        renderer.render(scene, camera);
        s.root.visible = false;

        ctx2d.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx2d.drawImage(
          renderer.domElement,
          0,
          0,
          targetCanvas.width,
          targetCanvas.height
        );
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      slots.forEach((s) => s.bodyMat.dispose());
      resources.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, [open]);

  if (!open) return null;

  return (
    <aside
      aria-label="妖怪圖鑑"
      className="fixed top-[calc(86px+env(safe-area-inset-top))] sm:top-[calc(68px+env(safe-area-inset-top))] right-3 sm:right-5 z-30 w-[min(360px,calc(100vw-24px))] rounded-2xl bg-[#0f172a]/96 border border-slate-400/30 p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-100">百鬼 3D 圖鑑</h2>
          <p className="text-[11px] text-slate-400">即時旋轉展示各類妖怪模型</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉圖鑑"
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2.5 max-h-[64vh] overflow-y-auto pr-1">
        {YOKAI_GUIDE.map((y) => (
          <div
            key={y.type}
            className="flex items-center gap-3 rounded-xl bg-slate-800/85 border border-slate-700/80 p-2.5"
          >
            <div className="w-[74px] h-[74px] rounded-xl bg-slate-950/90 border border-slate-600/30 shrink-0 overflow-hidden flex items-center justify-center">
              <canvas
                ref={(el) => {
                  canvasRefs.current[y.type] = el;
                }}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                className="w-full h-full block"
                aria-label={`${y.name} 3D 預覽`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className="text-xs font-bold"
                  style={{ color: y.accentHex }}
                >
                  {y.name}
                </span>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {y.debutWave}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">{y.trait}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
