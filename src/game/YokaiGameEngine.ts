import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ACHIEVEMENTS,
  DIFFICULTY_CONFIGS,
  GRID_COLS,
  GRID_ROWS,
  INITIAL_GOLD,
  INITIAL_HP,
  KILL_REWARD,
  PATH_GRID_SET,
  SKILL_CONFIGS,
  TILE_SIZE,
  TOWER_TYPES,
  WORLD_WAYPOINTS,
  gridToWorld,
  type AchievementDef,
  type DifficultyLevel,
  type SkillId,
  type TowerType,
  type YokaiType,
} from './constants';
import { SoundFX } from './sound';
import {
  buildYokaiBody,
  createEnemyTypeConfig,
  createSharedResources,
  createTowerMesh,
  type SharedResources,
} from './yokaiMeshes';

const STORAGE_ACHIEVEMENTS_KEY = 'yokai_td_achievements_v1';
const STORAGE_LIFETIME_KILLS_KEY = 'yokai_td_lifetime_kills_v1';

export interface SelectedTowerSnapshot {
  type: TowerType;
  name: string;
  level: number;
  damage: number;
  range: number;
  slowDuration: number;
  aoeRadiusTiles: number;
  upgradeCost: number;
  sellRefund: number;
}

export interface YokaiTrendPoint {
  tick: string;
  active: number;
  remaining: number;
  damage: number;
}

export interface GameUISnapshot {
  gold: number;
  hp: number;
  wave: number;
  kills: number;
  lifetimeKills: number;
  enemiesRemaining: number;
  buildMode: boolean;
  selectedBuildType: TowerType;
  speedMultiplier: 1 | 2;
  difficulty: DifficultyLevel;
  isWaveRunning: boolean;
  gameOver: boolean;
  soundEnabled: boolean;
  masterVolume: number;
  skillCooldowns: Record<SkillId, number>;
  unlockedAchievements: Record<string, number>;
  yokaiTrend: YokaiTrendPoint[];
  towerDamageTotals: Record<TowerType, number>;
  totalDamageDealt: number;
  selectedTower: SelectedTowerSnapshot | null;
}

export interface EngineCallbacks {
  onStateChange: (snapshot: GameUISnapshot) => void;
  onToast: (message: string) => void;
  onBaseDamage: () => void;
  onAchievementUnlocked: (achievement: AchievementDef) => void;
  onContextLost: (lost: boolean) => void;
}

interface PadEntity {
  c: number;
  r: number;
  worldPos: THREE.Vector3;
  mesh: THREE.Mesh;
  tower: TowerEntity | null;
}

interface TowerEntity {
  type: TowerType;
  name: string;
  pad: PadEntity;
  mesh: THREE.Group;
  turret: THREE.Group;
  muzzle: THREE.Object3D;
  position: THREE.Vector3;
  level: number;
  baseCost: number;
  totalSpent: number;
  range: number;
  damage: number;
  fireInterval: number;
  bulletSpeed: number;
  bulletRadius: number;
  bulletColor: number;
  ringColor: number;
  slowFactor: number;
  slowDuration: number;
  aoeRadius: number;
  cooldown: number;
}

interface EnemyEntity {
  type: YokaiType;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  tailMesh: THREE.Group | null;
  orbitGroup: THREE.Group | null;
  bodyMat: THREE.MeshStandardMaterial;
  baseColor: number;
  baseEmissive: number;
  hpBarGroup: THREE.Group;
  hpFg: THREE.Mesh;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  slowFactor: number;
  slowTimer: number;
  waypointIndex: number;
  progress: number;
  bobPhase: number;
  hitFlashTimer: number;
  alive: boolean;
}

interface BulletEntity {
  mesh: THREE.Mesh;
  towerType: TowerType;
  target: EnemyEntity;
  velocity: THREE.Vector3;
  speed: number;
  damage: number;
  slowFactor: number;
  slowDuration: number;
  aoeRadius: number;
  color: number;
  ttl: number;
}

interface ShockwaveEntity {
  sphere: THREE.Mesh;
  sphereMat: THREE.MeshBasicMaterial;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  maxRadius: number;
  elapsed: number;
  duration: number;
}

interface ParticleEntity {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function loadStoredAchievements(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_ACHIEVEMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, number>;
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

function loadLifetimeKills(): number {
  try {
    const raw = localStorage.getItem(STORAGE_LIFETIME_KILLS_KEY);
    const num = raw ? Number(raw) : 0;
    return Number.isFinite(num) && num >= 0 ? num : 0;
  } catch {
    return 0;
  }
}

// Pre-allocated math helpers outside the animation loop
const _lookTargetVec = new THREE.Vector3();
const _toTargetVec = new THREE.Vector3();
const _desiredDirVec = new THREE.Vector3();
const _startPosVec = new THREE.Vector3();
const _tempPosVec = new THREE.Vector3();
const _bulletBox = new THREE.Box3();
const _enemyBox = new THREE.Box3();

export class YokaiGameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private resources: SharedResources;

  private mapGroup: THREE.Group;
  private portalRing: THREE.Mesh;
  private portalCore: THREE.Mesh;
  private baseCrystal: THREE.Mesh;

  private hoverHighlight: THREE.Mesh;
  private hoverHighlightMat: THREE.MeshBasicMaterial;
  private rangeGroup: THREE.Group;
  private rangeIndicatorMat: THREE.MeshBasicMaterial;
  private rangeFillMat: THREE.MeshBasicMaterial;

  private pads: PadEntity[] = [];
  private padMeshes: THREE.Mesh[] = [];
  private towers: TowerEntity[] = [];
  private enemies: EnemyEntity[] = [];
  private bullets: BulletEntity[] = [];
  private particles: ParticleEntity[] = [];
  private shockwaves: ShockwaveEntity[] = [];

  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };

  private clock = new THREE.Clock();
  private totalTime = 0;
  private frameId = 0;
  private disposed = false;
  private lastHoverRaycast = 0;

  // Game state
  private gold = INITIAL_GOLD;
  private hp = INITIAL_HP;
  private wave = 0;
  private kills = 0;
  private lifetimeKills = loadLifetimeKills();
  private buildMode = true;
  private selectedBuildType: TowerType = 'pulse';
  private speedMultiplier: 1 | 2 = 1;
  private difficulty: DifficultyLevel = 'normal';
  private isWaveRunning = false;
  private spawnQueue: YokaiType[] = [];
  private spawnTimer = 0;
  private gameOver = false;
  private selectedTower: TowerEntity | null = null;
  private hoveredPad: PadEntity | null = null;
  private skillCooldowns: Record<SkillId, number> = { freeze: 0, heal: 0 };
  private unlockedAchievements: Record<string, number> = loadStoredAchievements();
  private yokaiTrend: YokaiTrendPoint[] = [{ tick: '0s', active: 0, remaining: 0, damage: 0 }];
  private towerDamageTotals: Record<TowerType, number> = { pulse: 0, frost: 0, cannon: 0 };
  private totalDamageDealt = 0;
  private trendSampleTimer = 0;
  private battleElapsed = 0;

  // Bound event listeners
  private handleResizeBound: () => void;
  private handlePointerMoveBound: (e: PointerEvent) => void;
  private handlePointerLeaveBound: () => void;
  private handlePointerDownBound: (e: PointerEvent) => void;
  private handlePointerUpBound: (e: PointerEvent) => void;
  private handleContextLostBound: (e: Event) => void;
  private handleContextRestoredBound: () => void;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1120);
    this.scene.fog = new THREE.FogExp2(0x0b1120, 0.011);

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.updateCameraFraming();

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.72);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.15);
    dirLight.position.set(14, 26, 14);
    dirLight.castShadow = !this.isSoftwareGl;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 70;
    const shadowBound = 18;
    dirLight.shadow.camera.left = -shadowBound;
    dirLight.shadow.camera.right = shadowBound;
    dirLight.shadow.camera.top = shadowBound;
    dirLight.shadow.camera.bottom = -shadowBound;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-16, 12, -14);
    this.scene.add(fillLight);

    this.resources = createSharedResources();
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    const { portalRing, portalCore, baseCrystal } = this.buildBattlefield();
    this.portalRing = portalRing;
    this.portalCore = portalCore;
    this.baseCrystal = baseCrystal;

    this.hoverHighlightMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.hoverHighlight = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.34, TILE_SIZE * 0.92),
      this.hoverHighlightMat
    );
    this.hoverHighlight.visible = false;
    this.scene.add(this.hoverHighlight);

    this.rangeFillMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.rangeIndicatorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1.0, 48),
      this.rangeIndicatorMat
    );
    rangeRing.rotation.x = -Math.PI / 2;

    const rangeFill = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 48),
      this.rangeFillMat
    );
    rangeFill.rotation.x = -Math.PI / 2;

    this.rangeGroup = new THREE.Group();
    this.rangeGroup.add(rangeRing, rangeFill);
    this.rangeGroup.visible = false;
    this.scene.add(this.rangeGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.handleResizeBound = this.onResize.bind(this);
    this.handlePointerMoveBound = this.onPointerMove.bind(this);
    this.handlePointerLeaveBound = this.onPointerLeave.bind(this);
    this.handlePointerDownBound = this.onPointerDown.bind(this);
    this.handlePointerUpBound = this.onPointerUp.bind(this);
    this.handleContextLostBound = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextLost(true);
    };
    this.handleContextRestoredBound = () => {
      this.callbacks.onContextLost(false);
    };

    const dom = this.renderer.domElement;
    window.addEventListener('resize', this.handleResizeBound);
    dom.addEventListener('pointermove', this.handlePointerMoveBound);
    dom.addEventListener('pointerleave', this.handlePointerLeaveBound);
    dom.addEventListener('pointerdown', this.handlePointerDownBound);
    dom.addEventListener('pointerup', this.handlePointerUpBound);
    dom.addEventListener('webglcontextlost', this.handleContextLostBound);
    dom.addEventListener('webglcontextrestored', this.handleContextRestoredBound);

    this.emitState();
    this.callbacks.onToast('選擇下方防禦塔佈陣，點擊「開始波次」迎戰各路妖怪！');

    this.clock.start();
    this.tick();
  }

  private buildBattlefield(): {
    portalRing: THREE.Mesh;
    portalCore: THREE.Mesh;
    baseCrystal: THREE.Mesh;
  } {
    const { geo, mat } = this.resources;
    const boardW = GRID_COLS * TILE_SIZE + 1.2;
    const boardD = GRID_ROWS * TILE_SIZE + 1.2;

    const baseBoard = new THREE.Mesh(
      new THREE.BoxGeometry(boardW, 0.8, boardD),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 })
    );
    baseBoard.position.y = -0.45;
    baseBoard.receiveShadow = true;
    this.mapGroup.add(baseBoard);

    const borderMesh = new THREE.Mesh(
      new THREE.BoxGeometry(boardW + 0.3, 0.6, boardD + 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x0284c7,
        emissiveIntensity: 0.15,
        roughness: 0.5,
      })
    );
    borderMesh.position.y = -0.5;
    this.mapGroup.add(borderMesh);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const pos = gridToWorld(c, r, 0);
        const isPath = PATH_GRID_SET.has(`${c},${r}`);

        if (isPath) {
          const pathMesh = new THREE.Mesh(geo.pathBox, mat.pathStone);
          pathMesh.position.set(pos.x, 0.02, pos.z);
          pathMesh.receiveShadow = true;
          this.mapGroup.add(pathMesh);

          const marker = new THREE.Mesh(geo.pathEdge, mat.pathTrim);
          marker.position.set(pos.x, 0.1, pos.z);
          marker.receiveShadow = true;
          this.mapGroup.add(marker);
        } else {
          const padMesh = new THREE.Mesh(geo.padBox, mat.padNormal);
          padMesh.position.set(pos.x, 0.12, pos.z);
          padMesh.castShadow = true;
          padMesh.receiveShadow = true;

          const padData: PadEntity = {
            c,
            r,
            worldPos: new THREE.Vector3(pos.x, 0.26, pos.z),
            mesh: padMesh,
            tower: null,
          };
          padMesh.userData.pad = padData;
          this.pads.push(padData);
          this.padMeshes.push(padMesh);
          this.mapGroup.add(padMesh);
        }
      }
    }

    const pathLinePoints = WORLD_WAYPOINTS.map((wp) => new THREE.Vector3(wp.x, 0.16, wp.z));
    const pathLineGeo = new THREE.BufferGeometry().setFromPoints(pathLinePoints);
    const pathLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    this.mapGroup.add(new THREE.Line(pathLineGeo, pathLineMat));

    const spawnPortalGroup = new THREE.Group();
    const startPos = WORLD_WAYPOINTS[0];
    spawnPortalGroup.position.set(startPos.x, 0.2, startPos.z);

    const portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.12, 12, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.9,
      })
    );
    portalRing.position.y = 0.85;
    portalRing.castShadow = true;
    spawnPortalGroup.add(portalRing);

    const portalCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfda4af, transparent: true, opacity: 0.75 })
    );
    portalCore.position.y = 0.85;
    spawnPortalGroup.add(portalCore);
    this.mapGroup.add(spawnPortalGroup);

    const playerBaseGroup = new THREE.Group();
    const endPos = WORLD_WAYPOINTS[WORLD_WAYPOINTS.length - 1];
    playerBaseGroup.position.set(endPos.x, 0.15, endPos.z);

    const basePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.96, 0.4, 8),
      mat.towerDark
    );
    basePedestal.position.y = 0.2;
    basePedestal.castShadow = true;
    basePedestal.receiveShadow = true;
    playerBaseGroup.add(basePedestal);

    const baseCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    baseCrystal.position.y = 1.15;
    baseCrystal.castShadow = true;
    playerBaseGroup.add(baseCrystal);
    this.mapGroup.add(playerBaseGroup);

    return { portalRing, portalCore, baseCrystal };
  }

  private updateCameraFraming(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / Math.max(1, h);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const scale = aspect < 1.18 ? Math.min(2.75, 1.18 / aspect) : 1.0;
    this.camera.position.set(0, 23 * scale, 18.5 * scale);
    this.camera.lookAt(0, 0, 0.6);
  }

  private onResize(): void {
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.updateCameraFraming();
  }

  private getIntersectedPad(clientX: number, clientY: number): PadEntity | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.padMeshes, false);
    if (hits.length > 0) {
      return (hits[0].object.userData.pad as PadEntity) ?? null;
    }
    return null;
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.gameOver || e.pointerType === 'touch') return;
    const now = performance.now();
    if (now - this.lastHoverRaycast < 25) return;
    this.lastHoverRaycast = now;

    const pad = this.getIntersectedPad(e.clientX, e.clientY);
    this.hoveredPad = pad;

    if (pad && !pad.tower && this.buildMode) {
      const cfg = TOWER_TYPES[this.selectedBuildType];
      this.hoverHighlight.position.set(pad.worldPos.x, 0.14, pad.worldPos.z);
      const canAfford = this.gold >= cfg.cost;
      this.hoverHighlightMat.color.setHex(canAfford ? cfg.ringColor : 0xf87171);
      this.hoverHighlight.visible = true;
      this.renderer.domElement.style.cursor = canAfford ? 'pointer' : 'not-allowed';

      if (!this.selectedTower) {
        this.showRangeRing(
          pad.worldPos.x,
          pad.worldPos.z,
          cfg.range,
          canAfford ? cfg.ringColor : 0xf87171
        );
      }
    } else if (pad && pad.tower) {
      this.hoverHighlight.visible = false;
      this.renderer.domElement.style.cursor = 'pointer';
      if (!this.selectedTower) this.hideRangeRing();
    } else {
      this.hoverHighlight.visible = false;
      this.renderer.domElement.style.cursor = 'default';
      if (!this.selectedTower) this.hideRangeRing();
    }
  }

  private onPointerLeave(): void {
    this.hoveredPad = null;
    this.hoverHighlight.visible = false;
    if (!this.selectedTower) this.hideRangeRing();
  }

  private onPointerDown(e: PointerEvent): void {
    this.pointerDownPos.x = e.clientX;
    this.pointerDownPos.y = e.clientY;
    SoundFX.ensureCtx();
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.gameOver) return;
    const dist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y
    );
    if (dist > 14) return;

    const pad = this.getIntersectedPad(e.clientX, e.clientY);
    if (!pad) {
      this.selectTower(null);
      return;
    }

    if (pad.tower) {
      this.selectTower(pad.tower);
    } else if (this.buildMode) {
      this.selectTower(null);
      this.buildTowerOnPad(pad, this.selectedBuildType);
    } else {
      this.selectTower(null);
      this.callbacks.onToast('請先在下方選擇一種防禦塔再點擊空地建造');
    }
  }

  private showRangeRing(x: number, z: number, radius: number, colorHex: number): void {
    this.rangeGroup.position.set(x, 0.32, z);
    this.rangeGroup.scale.set(radius, 1, radius);
    this.rangeIndicatorMat.color.setHex(colorHex);
    this.rangeFillMat.color.setHex(colorHex);
    this.rangeGroup.visible = true;
  }

  private hideRangeRing(): void {
    this.rangeGroup.visible = false;
  }

  private selectTower(tower: TowerEntity | null): void {
    this.selectedTower = tower;
    if (tower) {
      this.showRangeRing(tower.position.x, tower.position.z, tower.range, tower.ringColor);
    } else if (!this.hoveredPad) {
      this.hideRangeRing();
    }
    this.emitState();
  }

  private buildTowerOnPad(pad: PadEntity, type: TowerType): void {
    if (this.gameOver || pad.tower) return;
    const cfg = TOWER_TYPES[type];
    if (this.gold < cfg.cost) {
      this.callbacks.onToast(`金幣不足！建造${cfg.name}需要 ${cfg.cost} 金幣`);
      return;
    }

    this.gold -= cfg.cost;
    pad.mesh.material = this.resources.mat.padOccupied;

    const parts = createTowerMesh(type, this.resources);
    parts.root.position.copy(pad.worldPos);
    this.scene.add(parts.root);

    const tower: TowerEntity = {
      type,
      name: cfg.name,
      pad,
      mesh: parts.root,
      turret: parts.turret,
      muzzle: parts.muzzle,
      position: pad.worldPos.clone(),
      level: 1,
      baseCost: cfg.cost,
      totalSpent: cfg.cost,
      range: cfg.range,
      damage: cfg.damage,
      fireInterval: cfg.fireInterval,
      bulletSpeed: cfg.bulletSpeed,
      bulletRadius: cfg.bulletRadius,
      bulletColor: cfg.bulletColor,
      ringColor: cfg.ringColor,
      slowFactor: cfg.slowFactor,
      slowDuration: cfg.slowDuration,
      aoeRadius: cfg.aoeRadius,
      cooldown: 0.1,
    };

    pad.tower = tower;
    this.towers.push(tower);
    SoundFX.playBuild();
    _tempPosVec.copy(pad.worldPos).setY(0.9);
    this.spawnParticles(_tempPosVec, cfg.ringColor, 12);

    if (this.towers.length >= 6) {
      this.unlockAchievement('tower_architect');
    }

    this.emitState();
  }

  private removeTower(tower: TowerEntity): void {
    this.scene.remove(tower.mesh);
    tower.pad.tower = null;
    tower.pad.mesh.material = this.resources.mat.padNormal;
    const idx = this.towers.indexOf(tower);
    if (idx !== -1) this.towers.splice(idx, 1);
  }

  private getUpgradeCost(tower: TowerEntity): number {
    return Math.round(tower.baseCost * 1.1 * tower.level);
  }

  private getSellRefund(tower: TowerEntity): number {
    return Math.floor(tower.totalSpent * 0.5);
  }

  /* ================= Achievements ================= */

  private unlockAchievement(id: string): void {
    if (this.unlockedAchievements[id]) return;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return;

    this.unlockedAchievements = {
      ...this.unlockedAchievements,
      [id]: Date.now(),
    };
    try {
      localStorage.setItem(
        STORAGE_ACHIEVEMENTS_KEY,
        JSON.stringify(this.unlockedAchievements)
      );
    } catch {
      // Ignore storage errors
    }

    this.gold += def.rewardGold;
    SoundFX.playAchievement();
    this.callbacks.onAchievementUnlocked(def);
    this.emitState();
  }

  private saveLifetimeKills(): void {
    try {
      localStorage.setItem(STORAGE_LIFETIME_KILLS_KEY, String(this.lifetimeKills));
    } catch {
      // Ignore storage errors
    }
  }

  /* ================= Public React Controls ================= */

  public selectBuildType(type: TowerType): void {
    SoundFX.ensureCtx();
    if (this.buildMode && this.selectedBuildType === type) {
      this.buildMode = false;
      this.hoverHighlight.visible = false;
      if (!this.selectedTower) this.hideRangeRing();
      this.callbacks.onToast('已關閉蓋塔模式');
    } else {
      this.buildMode = true;
      this.selectedBuildType = type;
      this.selectTower(null);
      const cfg = TOWER_TYPES[type];
      this.callbacks.onToast(`已選擇【${cfg.name}】(${cfg.cost}G)：${cfg.desc}`);
    }
    this.emitState();
  }

  public setDifficulty(level: DifficultyLevel): void {
    SoundFX.ensureCtx();
    if (this.difficulty === level) return;
    this.difficulty = level;
    const diff = DIFFICULTY_CONFIGS[level];

    if (this.wave === 0 && this.towers.length === 0 && !this.isWaveRunning) {
      this.callbacks.onToast(`已切換難度為【${diff.label}】：${diff.summary}`);
      this.emitState();
    } else {
      this.resetGame(`難度已切換為【${diff.label}】並重置戰場：${diff.summary}`);
    }
  }

  public activateSkill(skillId: SkillId): void {
    SoundFX.ensureCtx();
    if (this.gameOver) return;

    if (this.skillCooldowns[skillId] > 0) {
      const remaining = Math.ceil(this.skillCooldowns[skillId]);
      this.callbacks.onToast(
        `【${SKILL_CONFIGS[skillId].name}】冷卻中，剩餘 ${remaining} 秒`
      );
      return;
    }

    if (skillId === 'freeze') {
      if (this.enemies.length === 0) {
        this.callbacks.onToast('場上目前沒有妖怪可冰凍');
        return;
      }

      this.skillCooldowns.freeze = SKILL_CONFIGS.freeze.cooldown;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (!e.alive) continue;
        e.slowFactor = Math.min(e.slowFactor, 0.2);
        e.slowTimer = Math.max(e.slowTimer, 4.5);
        _tempPosVec.copy(e.root.position).setY(0.85);
        this.spawnParticles(_tempPosVec, 0x7dd3fc, 8);
      }

      _tempPosVec.set(0, 0.4, 0);
      this.spawnShockwave(_tempPosVec, 15, 0x38bdf8);
      SoundFX.playGlobalFreeze();
      this.unlockAchievement('tactical_skill');
      this.callbacks.onToast('施放【全屏冰凍】！全場妖怪減速 80% 持續 4.5 秒');
      this.emitState();
    } else if (skillId === 'heal') {
      if (this.hp >= INITIAL_HP) {
        this.callbacks.onToast('基地 HP 已滿，無需緊急治療');
        return;
      }

      this.skillCooldowns.heal = SKILL_CONFIGS.heal.cooldown;
      const prevHp = this.hp;
      this.hp = Math.min(INITIAL_HP, this.hp + 3);
      const gained = this.hp - prevHp;

      const basePos = WORLD_WAYPOINTS[WORLD_WAYPOINTS.length - 1];
      _tempPosVec.set(basePos.x, 1.0, basePos.z);
      this.spawnParticles(_tempPosVec, 0x4ade80, 18);
      this.spawnShockwave(_tempPosVec, 4.2, 0x4ade80);
      SoundFX.playHeal();
      this.unlockAchievement('tactical_skill');
      this.callbacks.onToast(`施放【緊急治療】！基地恢復 +${gained} HP`);
      this.emitState();
    }
  }

  public startNextWave(): void {
    SoundFX.ensureCtx();
    if (this.isWaveRunning || this.gameOver) return;

    this.wave += 1;
    this.isWaveRunning = true;
    this.spawnQueue = [];
    this.spawnTimer = 0.2;

    const count = 6 + this.wave * 3;
    for (let i = 0; i < count; i++) {
      if (this.wave >= 3 && i === count - 1) {
        this.spawnQueue.push('tank');
      } else if (this.wave >= 2 && i % 5 === 2) {
        this.spawnQueue.push('fast');
      } else if (this.wave >= 2 && i % 5 === 4) {
        this.spawnQueue.push('ghost');
      } else if (this.wave >= 4 && i % 6 === 5) {
        this.spawnQueue.push('tank');
      } else {
        this.spawnQueue.push('normal');
      }
    }

    this.callbacks.onToast(
      `第 ${this.wave} 波百鬼夜行開始（${DIFFICULTY_CONFIGS[this.difficulty].label}）！共 ${count} 隻妖怪`
    );
    this.battleElapsed = 0;
    this.trendSampleTimer = 0;
    this.yokaiTrend = [
      { tick: '0s', active: 0, remaining: count, damage: this.totalDamageDealt },
    ];
    this.emitState();
  }

  public toggleSpeed(): void {
    SoundFX.ensureCtx();
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    this.emitState();
  }

  public toggleSound(): void {
    SoundFX.setMuted(SoundFX.enabled);
    if (SoundFX.enabled) SoundFX.ensureCtx();
    this.emitState();
  }

  public setMasterVolume(volume: number): void {
    SoundFX.setMasterVolume(volume);
    if (volume > 0) SoundFX.ensureCtx();
    this.emitState();
  }

  public upgradeSelectedTower(): void {
    const t = this.selectedTower;
    if (!t || t.level >= 3) return;
    const cost = this.getUpgradeCost(t);
    if (this.gold < cost) {
      this.callbacks.onToast(`金幣不足！升級需要 ${cost} 金幣`);
      return;
    }

    this.gold -= cost;
    t.totalSpent += cost;
    t.level += 1;
    t.damage = Math.round(t.damage * 1.48);
    t.range += 0.7;
    t.fireInterval = Math.max(0.38, t.fireInterval * 0.88);
    if (t.type === 'frost') {
      t.slowDuration += 0.5;
    } else if (t.type === 'cannon') {
      t.aoeRadius += 0.35;
    }

    const scaleBonus = 1 + (t.level - 1) * 0.08;
    t.mesh.scale.set(scaleBonus, scaleBonus, scaleBonus);

    SoundFX.playBuild();
    _tempPosVec.copy(t.position).setY(1.4);
    this.spawnParticles(_tempPosVec, t.ringColor, 12);
    this.showRangeRing(t.position.x, t.position.z, t.range, t.ringColor);

    if (t.level >= 3) {
      this.unlockAchievement('master_upgrade');
    }

    this.emitState();
    this.callbacks.onToast(`${t.name} 已升級至 Lv.${t.level}！`);
  }

  public sellSelectedTower(): void {
    const t = this.selectedTower;
    if (!t) return;
    const refund = this.getSellRefund(t);
    this.gold += refund;
    this.removeTower(t);
    this.selectTower(null);
    this.callbacks.onToast(`已拆除防禦塔，返還 ${refund} 金幣`);
  }

  public deselectTower(): void {
    this.selectTower(null);
  }

  public resetGame(customToast?: string): void {
    while (this.enemies.length > 0) this.removeEnemy(this.enemies[0]);
    while (this.bullets.length > 0) this.removeBullet(this.bullets[0]);
    while (this.towers.length > 0) this.removeTower(this.towers[0]);
    while (this.particles.length > 0) {
      const p = this.particles.pop()!;
      this.scene.remove(p.mesh);
      p.mat.dispose();
    }
    while (this.shockwaves.length > 0) {
      const sw = this.shockwaves.pop()!;
      this.scene.remove(sw.sphere);
      this.scene.remove(sw.ring);
      sw.sphereMat.dispose();
      sw.ringMat.dispose();
    }

    this.gold = INITIAL_GOLD;
    this.hp = INITIAL_HP;
    this.wave = 0;
    this.kills = 0;
    this.buildMode = true;
    this.selectedBuildType = 'pulse';
    this.speedMultiplier = 1;
    this.isWaveRunning = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.skillCooldowns = { freeze: 0, heal: 0 };
    this.yokaiTrend = [{ tick: '0s', active: 0, remaining: 0, damage: 0 }];
    this.towerDamageTotals = { pulse: 0, frost: 0, cannon: 0 };
    this.totalDamageDealt = 0;
    this.trendSampleTimer = 0;
    this.battleElapsed = 0;
    this.gameOver = false;
    this.selectTower(null);
    this.callbacks.onToast(
      customToast ?? '戰役已重置！可自由搭配脈衝、冰凍與重砲塔抵禦妖怪'
    );
  }

  /* ================= Yokai, Bullets & VFX ================= */

  private spawnEnemy(typeName: YokaiType): void {
    const cfg = createEnemyTypeConfig(typeName, this.wave);
    const diff = DIFFICULTY_CONFIGS[this.difficulty];
    const scaledHp = Math.max(10, Math.round(cfg.maxHp * diff.hpMultiplier));
    const scaledSpeed = cfg.speed * diff.speedMultiplier;

    const root = new THREE.Group();
    root.position.copy(WORLD_WAYPOINTS[0]);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: 0.25,
      roughness: 0.38,
      metalness: 0.12,
    });

    const { bodyGroup, tailMesh, orbitGroup } = buildYokaiBody(
      typeName,
      bodyMat,
      this.resources
    );
    root.add(bodyGroup);

    const hpBarGroup = new THREE.Group();
    hpBarGroup.position.y = cfg.hpBarY;

    const hpBg = new THREE.Mesh(this.resources.geo.hpBg, this.resources.mat.hpBg);
    const hpFg = new THREE.Mesh(this.resources.geo.hpFg, this.resources.mat.hpFgGreen);
    hpFg.position.z = 0.01;
    hpBarGroup.add(hpBg, hpFg);
    root.add(hpBarGroup);

    this.scene.add(root);

    this.enemies.push({
      type: typeName,
      root,
      bodyGroup,
      tailMesh,
      orbitGroup,
      bodyMat,
      baseColor: cfg.color,
      baseEmissive: cfg.emissive,
      hpBarGroup,
      hpFg,
      hp: scaledHp,
      maxHp: scaledHp,
      baseSpeed: scaledSpeed,
      slowFactor: 1.0,
      slowTimer: 0,
      waypointIndex: 1,
      progress: 0,
      bobPhase: Math.random() * Math.PI * 2,
      hitFlashTimer: 0,
      alive: true,
    });

    this.emitState();
  }

  private removeEnemy(enemy: EnemyEntity): void {
    enemy.alive = false;
    this.scene.remove(enemy.root);
    enemy.bodyMat.dispose();
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
  }

  private recordTrendPoint(): void {
    const label = `${Math.round(this.battleElapsed)}s`;
    const nextPoint: YokaiTrendPoint = {
      tick: label,
      active: this.enemies.length,
      remaining: this.enemies.length + this.spawnQueue.length,
      damage: this.totalDamageDealt,
    };
    const updated = [...this.yokaiTrend, nextPoint];
    if (updated.length > 24) {
      updated.shift();
    }
    this.yokaiTrend = updated;
  }

  private applyEnemyDamage(
    enemy: EnemyEntity,
    dmg: number,
    sourceColor: number,
    towerType: TowerType
  ): void {
    if (!enemy.alive) return;
    const actualDamage = Math.min(enemy.hp, dmg);
    this.towerDamageTotals[towerType] += actualDamage;
    this.totalDamageDealt += actualDamage;

    enemy.hp -= dmg;
    enemy.bodyMat.color.setHex(0xffffff);
    enemy.hitFlashTimer = 0.08;

    if (enemy.hp <= 0) {
      this.gold += KILL_REWARD;
      this.kills += 1;
      this.lifetimeKills += 1;
      this.saveLifetimeKills();

      SoundFX.playKill();
      _tempPosVec.copy(enemy.root.position).setY(0.8);
      this.spawnParticles(_tempPosVec, enemy.baseColor, 12);
      this.removeEnemy(enemy);

      if (this.lifetimeKills >= 1) {
        this.unlockAchievement('first_kill');
      }
      if (this.lifetimeKills >= 100) {
        this.unlockAchievement('hundred_kills');
      }

      this.emitState();
    } else {
      _tempPosVec.copy(enemy.root.position).setY(0.7);
      this.spawnParticles(_tempPosVec, sourceColor, 4);
      const ratio = Math.max(0.01, enemy.hp / enemy.maxHp);
      enemy.hpFg.scale.x = ratio;
      enemy.hpFg.position.x = -(1 - ratio) * 0.5;
      if (ratio < 0.35) {
        enemy.hpFg.material = this.resources.mat.hpFgRed;
      } else if (ratio < 0.65) {
        enemy.hpFg.material = this.resources.mat.hpFgYellow;
      }
    }
  }

  private triggerBaseDamage(): void {
    this.hp = Math.max(0, this.hp - 1);
    SoundFX.playDamage();
    this.callbacks.onBaseDamage();

    if (this.hp <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.isWaveRunning = false;
      this.selectTower(null);
    }
    this.emitState();
  }

  private spawnBullet(tower: TowerEntity, targetEnemy: EnemyEntity): void {
    tower.muzzle.getWorldPosition(_startPosVec);

    const bulletMat =
      tower.type === 'frost'
        ? this.resources.mat.bulletFrost
        : tower.type === 'cannon'
        ? this.resources.mat.bulletCannon
        : this.resources.mat.bulletPulse;

    const mesh = new THREE.Mesh(this.resources.geo.bulletSphere, bulletMat);
    mesh.scale.setScalar(tower.bulletRadius);
    mesh.position.copy(_startPosVec);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const velocity = new THREE.Vector3()
      .subVectors(targetEnemy.root.position, _startPosVec)
      .normalize()
      .multiplyScalar(tower.bulletSpeed);

    this.bullets.push({
      mesh,
      towerType: tower.type,
      target: targetEnemy,
      velocity,
      speed: tower.bulletSpeed,
      damage: tower.damage,
      slowFactor: tower.slowFactor,
      slowDuration: tower.slowDuration,
      aoeRadius: tower.aoeRadius,
      color: tower.bulletColor,
      ttl: 1.8,
    });

    SoundFX.playShoot(tower.type);
  }

  private removeBullet(bullet: BulletEntity): void {
    this.scene.remove(bullet.mesh);
    const idx = this.bullets.indexOf(bullet);
    if (idx !== -1) this.bullets.splice(idx, 1);
  }

  private spawnShockwave(pos: THREE.Vector3, maxRadius: number, colorHex: number): void {
    const sphereMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const sphere = new THREE.Mesh(this.resources.geo.shockwaveSphere, sphereMat);
    sphere.position.copy(pos);
    sphere.scale.setScalar(0.35);
    this.scene.add(sphere);

    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex === 0xf97316 ? 0xfef08a : colorHex,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.resources.geo.shockwaveRing, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.25, pos.z);
    ring.scale.setScalar(0.35);
    this.scene.add(ring);

    this.shockwaves.push({
      sphere,
      sphereMat,
      ring,
      ringMat,
      maxRadius,
      elapsed: 0,
      duration: 0.34,
    });
  }

  private spawnParticles(pos: THREE.Vector3, colorHex: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.resources.geo.particleBox, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vx = (Math.random() - 0.5) * 6.5;
      const vy = Math.random() * 5.2 + 2;
      const vz = (Math.random() - 0.5) * 6.5;

      this.particles.push({
        mesh,
        mat,
        vel: new THREE.Vector3(vx, vy, vz),
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.65,
      });
    }
  }

  private updateGame(dt: number): void {
    if (this.gameOver) return;

    this.portalRing.rotation.z += dt * 1.8;
    this.portalCore.scale.setScalar(1 + Math.sin(this.totalTime * 4) * 0.12);
    this.baseCrystal.rotation.y += dt * 1.4;
    this.baseCrystal.position.y = 1.15 + Math.sin(this.totalTime * 2.5) * 0.12;

    // 0. Skill Cooldowns
    let cooldownDisplayChanged = false;
    (['freeze', 'heal'] as SkillId[]).forEach((id) => {
      if (this.skillCooldowns[id] > 0) {
        const prevSec = Math.ceil(this.skillCooldowns[id]);
        this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - dt);
        const nextSec = Math.ceil(this.skillCooldowns[id]);
        if (prevSec !== nextSec) {
          cooldownDisplayChanged = true;
        }
      }
    });
    if (cooldownDisplayChanged) {
      this.emitState();
    }

    // 0b. Real-time chart sampling
    if (this.isWaveRunning || this.enemies.length > 0) {
      this.battleElapsed += dt;
      this.trendSampleTimer += dt;
      if (this.trendSampleTimer >= 0.85) {
        this.trendSampleTimer = 0;
        this.recordTrendPoint();
        this.emitState();
      }
    }

    // 1. Wave Spawning
    if (this.isWaveRunning) {
      if (this.spawnQueue.length > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          const nextType = this.spawnQueue.shift()!;
          this.spawnEnemy(nextType);
          const diff = DIFFICULTY_CONFIGS[this.difficulty];
          const baseInterval = Math.max(0.45, 0.92 - this.wave * 0.04);
          this.spawnTimer = Math.max(0.3, baseInterval * diff.spawnIntervalMultiplier);
        }
      } else if (this.enemies.length === 0) {
        this.isWaveRunning = false;
        const waveBonus = 40 + this.wave * 10;
        this.gold += waveBonus;
        SoundFX.playKill();
        this.callbacks.onToast(`第 ${this.wave} 波守備成功！獲得獎勵 +${waveBonus} 金幣`);

        if (this.wave >= 3 && this.hp === INITIAL_HP) {
          this.unlockAchievement('perfect_defense');
        }

        this.recordTrendPoint();
        this.emitState();
      }
    }

    // 2. Yokai Movement & Animation
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) continue;

      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) {
          e.slowTimer = 0;
          e.slowFactor = 1.0;
        }
      }

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
      }
      if (e.hitFlashTimer <= 0) {
        if (e.slowTimer > 0) {
          e.bodyMat.color.setHex(0x38bdf8);
          e.bodyMat.emissive.setHex(0x0369a1);
        } else {
          e.bodyMat.color.setHex(e.baseColor);
          e.bodyMat.emissive.setHex(e.baseEmissive);
        }
      }

      const currentSpeed = e.baseSpeed * e.slowFactor;
      let moveRemaining = currentSpeed * dt;

      while (moveRemaining > 0 && e.waypointIndex < WORLD_WAYPOINTS.length) {
        const targetWp = WORLD_WAYPOINTS[e.waypointIndex];
        const prevWp = WORLD_WAYPOINTS[e.waypointIndex - 1];
        _toTargetVec.subVectors(targetWp, e.root.position);
        const dist = _toTargetVec.length();

        if (dist <= moveRemaining) {
          e.root.position.copy(targetWp);
          moveRemaining -= dist;
          e.waypointIndex += 1;
        } else {
          _toTargetVec.normalize().multiplyScalar(moveRemaining);
          e.root.position.add(_toTargetVec);
          moveRemaining = 0;

          const segLen = targetWp.distanceTo(prevWp) || 1;
          const distFromPrev = e.root.position.distanceTo(prevWp);
          e.progress = e.waypointIndex - 1 + distFromPrev / segLen;
        }
      }

      if (e.waypointIndex >= WORLD_WAYPOINTS.length) {
        _tempPosVec.copy(e.root.position).setY(0.9);
        this.spawnParticles(_tempPosVec, 0xf87171, 10);
        this.removeEnemy(e);
        this.triggerBaseDamage();
        continue;
      }

      const nextWp = WORLD_WAYPOINTS[e.waypointIndex];
      _lookTargetVec.set(nextWp.x, e.root.position.y, nextWp.z);
      e.bodyGroup.lookAt(_lookTargetVec);

      const animRate = e.slowTimer > 0 ? 0.45 : 1.0;
      if (e.type === 'ghost') {
        e.bodyGroup.position.y =
          0.22 + Math.sin(this.totalTime * 4.5 * animRate + e.bobPhase) * 0.12;
        if (e.orbitGroup) {
          e.orbitGroup.rotation.y += dt * 3.8 * animRate;
        }
      } else {
        const hopFreq = e.type === 'fast' ? 13 : e.type === 'tank' ? 6.5 : 9.5;
        const hopAmp = e.type === 'tank' ? 0.09 : 0.15;
        e.bodyGroup.position.y =
          Math.abs(Math.sin(this.totalTime * hopFreq * animRate + e.bobPhase)) * hopAmp;
        if (e.tailMesh) {
          e.tailMesh.rotation.y =
            Math.sin(this.totalTime * 15 * animRate + e.bobPhase) * 0.42;
        }
      }

      e.hpBarGroup.quaternion.copy(this.camera.quaternion);
    }

    // 3. Towers Target & Fire
    for (let i = 0; i < this.towers.length; i++) {
      const tower = this.towers[i];
      tower.cooldown -= dt;

      let bestTarget: EnemyEntity | null = null;
      let maxProgress = -1;

      for (let j = 0; j < this.enemies.length; j++) {
        const enemy = this.enemies[j];
        if (!enemy.alive) continue;

        const dist3D = tower.position.distanceTo(enemy.root.position);
        if (dist3D <= tower.range && enemy.progress > maxProgress) {
          maxProgress = enemy.progress;
          bestTarget = enemy;
        }
      }

      if (bestTarget) {
        tower.turret.lookAt(bestTarget.root.position);
        if (tower.cooldown <= 0) {
          this.spawnBullet(tower, bestTarget);
          tower.cooldown = tower.fireInterval;
        }
      }
    }

    // 4. Bullets & Collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.ttl -= dt;
      if (b.ttl <= 0) {
        this.removeBullet(b);
        continue;
      }

      if (b.target && b.target.alive) {
        _desiredDirVec
          .subVectors(b.target.root.position, b.mesh.position)
          .normalize()
          .multiplyScalar(b.speed);
        b.velocity.copy(_desiredDirVec);
      }

      b.mesh.position.addScaledVector(b.velocity, dt);
      _bulletBox.setFromObject(b.mesh);
      let hit = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (!e.alive) continue;

        _enemyBox.setFromObject(e.bodyGroup);
        if (_bulletBox.intersectsBox(_enemyBox)) {
          hit = true;

          if (b.towerType === 'cannon' && b.aoeRadius > 0) {
            const impactPos = e.root.position.clone();
            SoundFX.playExplosion();
            this.spawnShockwave(impactPos, b.aoeRadius, 0xf97316);
            _tempPosVec.copy(impactPos).setY(0.8);
            this.spawnParticles(_tempPosVec, 0xf97316, 18);

            for (let k = this.enemies.length - 1; k >= 0; k--) {
              const targetInArea = this.enemies[k];
              if (!targetInArea.alive) continue;
              const dist3D = impactPos.distanceTo(targetInArea.root.position);
              if (dist3D <= b.aoeRadius) {
                this.applyEnemyDamage(targetInArea, b.damage, b.color, b.towerType);
              }
            }
          } else if (b.towerType === 'frost') {
            e.slowFactor = Math.min(e.slowFactor, b.slowFactor);
            e.slowTimer = Math.max(e.slowTimer, b.slowDuration);
            SoundFX.playFreeze();
            _tempPosVec.copy(e.root.position).setY(0.8);
            this.spawnParticles(_tempPosVec, 0x38bdf8, 8);
            this.applyEnemyDamage(e, b.damage, b.color, b.towerType);
          } else {
            SoundFX.playHit();
            this.applyEnemyDamage(e, b.damage, b.color, b.towerType);
          }
          break;
        }
      }

      if (hit) {
        this.removeBullet(b);
      }
    }

    // 5. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.elapsed += dt;
      const t = Math.min(1, sw.elapsed / sw.duration);

      const curRadius = 0.35 + (sw.maxRadius - 0.35) * (1 - Math.pow(1 - t, 2));
      sw.sphere.scale.setScalar(curRadius);
      sw.ring.scale.setScalar(curRadius);
      sw.sphereMat.opacity = 0.42 * (1 - t);
      sw.ringMat.opacity = 0.78 * (1 - t);

      if (t >= 1) {
        this.scene.remove(sw.sphere);
        this.scene.remove(sw.ring);
        sw.sphereMat.dispose();
        sw.ringMat.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    // 6. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 8;
      const alpha = p.life / p.maxLife;
      p.mat.opacity = alpha;
      p.mesh.scale.setScalar(alpha);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    const dt = rawDt * this.speedMultiplier;
    this.totalTime += dt;
    this.updateGame(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private emitState(): void {
    const t = this.selectedTower;
    this.callbacks.onStateChange({
      gold: this.gold,
      hp: this.hp,
      wave: this.wave,
      kills: this.kills,
      lifetimeKills: this.lifetimeKills,
      enemiesRemaining: this.enemies.length + this.spawnQueue.length,
      buildMode: this.buildMode,
      selectedBuildType: this.selectedBuildType,
      speedMultiplier: this.speedMultiplier,
      difficulty: this.difficulty,
      isWaveRunning: this.isWaveRunning,
      gameOver: this.gameOver,
      soundEnabled: SoundFX.enabled && SoundFX.masterVolume > 0,
      masterVolume: SoundFX.masterVolume,
      skillCooldowns: {
        freeze: this.skillCooldowns.freeze,
        heal: this.skillCooldowns.heal,
      },
      unlockedAchievements: this.unlockedAchievements,
      yokaiTrend: this.yokaiTrend,
      towerDamageTotals: { ...this.towerDamageTotals },
      totalDamageDealt: this.totalDamageDealt,
      selectedTower: t
        ? {
            type: t.type,
            name: t.name,
            level: t.level,
            damage: t.damage,
            range: t.range,
            slowDuration: t.slowDuration,
            aoeRadiusTiles: t.aoeRadius / TILE_SIZE,
            upgradeCost: this.getUpgradeCost(t),
            sellRefund: this.getSellRefund(t),
          }
        : null,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);

    const dom = this.renderer.domElement;
    window.removeEventListener('resize', this.handleResizeBound);
    dom.removeEventListener('pointermove', this.handlePointerMoveBound);
    dom.removeEventListener('pointerleave', this.handlePointerLeaveBound);
    dom.removeEventListener('pointerdown', this.handlePointerDownBound);
    dom.removeEventListener('pointerup', this.handlePointerUpBound);
    dom.removeEventListener('webglcontextlost', this.handleContextLostBound);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestoredBound);

    this.enemies.forEach((e) => e.bodyMat.dispose());
    this.particles.forEach((p) => p.mat.dispose());
    this.shockwaves.forEach((sw) => {
      sw.sphereMat.dispose();
      sw.ringMat.dispose();
    });

    this.hoverHighlight.geometry.dispose();
    this.hoverHighlightMat.dispose();
    this.rangeIndicatorMat.dispose();
    this.rangeFillMat.dispose();
    this.resources.dispose();
    this.envRT?.dispose();
    this.renderer.dispose();

    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
