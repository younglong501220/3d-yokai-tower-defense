import * as THREE from 'three';
import { TILE_SIZE, type TowerType, type YokaiType } from './constants';

export interface SharedResources {
  geo: {
    padBox: THREE.BoxGeometry;
    pathBox: THREE.BoxGeometry;
    pathEdge: THREE.BoxGeometry;
    towerBase1: THREE.CylinderGeometry;
    towerBase2: THREE.CylinderGeometry;
    towerBaseWide: THREE.CylinderGeometry;
    towerCollar: THREE.ConeGeometry;
    turretHead: THREE.CylinderGeometry;
    turretHeadWide: THREE.CylinderGeometry;
    turretCap: THREE.ConeGeometry;
    frostSpire: THREE.ConeGeometry;
    barrelPulse: THREE.CylinderGeometry;
    tipPulse: THREE.ConeGeometry;
    barrelFrost: THREE.CylinderGeometry;
    ringFrost: THREE.TorusGeometry;
    barrelCannon: THREE.CylinderGeometry;
    tipCannon: THREE.ConeGeometry;
    impTorso: THREE.SphereGeometry;
    impHead: THREE.SphereGeometry;
    impHorn: THREE.ConeGeometry;
    impEar: THREE.ConeGeometry;
    impArm: THREE.SphereGeometry;
    impFang: THREE.ConeGeometry;
    foxBody: THREE.SphereGeometry;
    foxHead: THREE.SphereGeometry;
    foxSnout: THREE.ConeGeometry;
    foxEar: THREE.ConeGeometry;
    foxTail: THREE.ConeGeometry;
    foxTailTip: THREE.ConeGeometry;
    ghostCloak: THREE.ConeGeometry;
    ghostHead: THREE.SphereGeometry;
    ghostArm: THREE.ConeGeometry;
    ghostEyeWhite: THREE.SphereGeometry;
    ghostEyePupil: THREE.SphereGeometry;
    ghostTalisman: THREE.BoxGeometry;
    ghostSeal: THREE.BoxGeometry;
    ghostWisp: THREE.OctahedronGeometry;
    oniTorso: THREE.BoxGeometry;
    oniBelt: THREE.BoxGeometry;
    oniShoulder: THREE.SphereGeometry;
    oniSpike: THREE.ConeGeometry;
    oniHead: THREE.BoxGeometry;
    oniHorn: THREE.ConeGeometry;
    oniFist: THREE.SphereGeometry;
    oniFang: THREE.ConeGeometry;
    yokaiEye: THREE.SphereGeometry;
    yokaiPupil: THREE.SphereGeometry;
    bulletSphere: THREE.SphereGeometry;
    shockwaveSphere: THREE.SphereGeometry;
    shockwaveRing: THREE.RingGeometry;
    particleBox: THREE.BoxGeometry;
    hpBg: THREE.PlaneGeometry;
    hpFg: THREE.PlaneGeometry;
  };
  mat: {
    padNormal: THREE.MeshStandardMaterial;
    padOccupied: THREE.MeshStandardMaterial;
    pathStone: THREE.MeshStandardMaterial;
    pathTrim: THREE.MeshStandardMaterial;
    towerDark: THREE.MeshStandardMaterial;
    towerMetal: THREE.MeshStandardMaterial;
    pulseAccent: THREE.MeshStandardMaterial;
    frostBody: THREE.MeshStandardMaterial;
    frostAccent: THREE.MeshStandardMaterial;
    cannonBody: THREE.MeshStandardMaterial;
    cannonAccent: THREE.MeshStandardMaterial;
    bulletPulse: THREE.MeshStandardMaterial;
    bulletFrost: THREE.MeshStandardMaterial;
    bulletCannon: THREE.MeshStandardMaterial;
    hornIvory: THREE.MeshStandardMaterial;
    hornGold: THREE.MeshStandardMaterial;
    whiteTip: THREE.MeshStandardMaterial;
    ironArmor: THREE.MeshStandardMaterial;
    talismanYellow: THREE.MeshStandardMaterial;
    talismanRed: THREE.MeshBasicMaterial;
    wispBlue: THREE.MeshBasicMaterial;
    eyeWhite: THREE.MeshBasicMaterial;
    eyeYellow: THREE.MeshBasicMaterial;
    eyeRed: THREE.MeshBasicMaterial;
    pupilDark: THREE.MeshBasicMaterial;
    hpBg: THREE.MeshBasicMaterial;
    hpFgGreen: THREE.MeshBasicMaterial;
    hpFgYellow: THREE.MeshBasicMaterial;
    hpFgRed: THREE.MeshBasicMaterial;
  };
  dispose: () => void;
}

export function createSharedResources(): SharedResources {
  const geo = {
    padBox: new THREE.BoxGeometry(TILE_SIZE * 0.9, 0.28, TILE_SIZE * 0.9),
    pathBox: new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.14, TILE_SIZE * 0.98),
    pathEdge: new THREE.BoxGeometry(TILE_SIZE * 0.25, 0.05, TILE_SIZE * 0.25),

    towerBase1: new THREE.CylinderGeometry(0.76, 0.88, 0.28, 16),
    towerBase2: new THREE.CylinderGeometry(0.56, 0.68, 0.62, 16),
    towerBaseWide: new THREE.CylinderGeometry(0.68, 0.82, 0.65, 16),
    towerCollar: new THREE.ConeGeometry(0.68, 0.28, 16),

    turretHead: new THREE.CylinderGeometry(0.42, 0.48, 0.42, 12),
    turretHeadWide: new THREE.CylinderGeometry(0.52, 0.56, 0.48, 12),
    turretCap: new THREE.ConeGeometry(0.32, 0.38, 12),
    frostSpire: new THREE.ConeGeometry(0.36, 0.62, 8),

    barrelPulse: new THREE.CylinderGeometry(0.11, 0.14, 0.95, 12),
    tipPulse: new THREE.ConeGeometry(0.14, 0.2, 12),

    barrelFrost: new THREE.CylinderGeometry(0.13, 0.18, 0.88, 12),
    ringFrost: new THREE.TorusGeometry(0.24, 0.05, 8, 18),

    barrelCannon: new THREE.CylinderGeometry(0.2, 0.24, 1.05, 14),
    tipCannon: new THREE.ConeGeometry(0.26, 0.24, 14),

    impTorso: new THREE.SphereGeometry(0.36, 12, 10),
    impHead: new THREE.SphereGeometry(0.3, 12, 10),
    impHorn: new THREE.ConeGeometry(0.075, 0.26, 8),
    impEar: new THREE.ConeGeometry(0.065, 0.24, 6),
    impArm: new THREE.SphereGeometry(0.11, 8, 8),
    impFang: new THREE.ConeGeometry(0.035, 0.1, 6),

    foxBody: new THREE.SphereGeometry(0.31, 12, 10),
    foxHead: new THREE.SphereGeometry(0.24, 12, 10),
    foxSnout: new THREE.ConeGeometry(0.1, 0.24, 8),
    foxEar: new THREE.ConeGeometry(0.085, 0.3, 6),
    foxTail: new THREE.ConeGeometry(0.14, 0.56, 8),
    foxTailTip: new THREE.ConeGeometry(0.09, 0.2, 8),

    ghostCloak: new THREE.ConeGeometry(0.4, 0.84, 12),
    ghostHead: new THREE.SphereGeometry(0.29, 12, 10),
    ghostArm: new THREE.ConeGeometry(0.075, 0.34, 6),
    ghostEyeWhite: new THREE.SphereGeometry(0.135, 10, 10),
    ghostEyePupil: new THREE.SphereGeometry(0.07, 8, 8),
    ghostTalisman: new THREE.BoxGeometry(0.14, 0.28, 0.03),
    ghostSeal: new THREE.BoxGeometry(0.07, 0.16, 0.035),
    ghostWisp: new THREE.OctahedronGeometry(0.09, 0),

    oniTorso: new THREE.BoxGeometry(0.84, 0.68, 0.58),
    oniBelt: new THREE.BoxGeometry(0.88, 0.16, 0.62),
    oniShoulder: new THREE.SphereGeometry(0.23, 10, 8),
    oniSpike: new THREE.ConeGeometry(0.08, 0.26, 6),
    oniHead: new THREE.BoxGeometry(0.46, 0.4, 0.42),
    oniHorn: new THREE.ConeGeometry(0.1, 0.44, 8),
    oniFist: new THREE.SphereGeometry(0.16, 8, 8),
    oniFang: new THREE.ConeGeometry(0.05, 0.15, 6),

    yokaiEye: new THREE.SphereGeometry(0.065, 8, 8),
    yokaiPupil: new THREE.SphereGeometry(0.035, 6, 6),

    bulletSphere: new THREE.SphereGeometry(1.0, 12, 12),
    shockwaveSphere: new THREE.SphereGeometry(1.0, 24, 16),
    shockwaveRing: new THREE.RingGeometry(0.84, 1.0, 36),
    particleBox: new THREE.BoxGeometry(0.18, 0.18, 0.18),
    hpBg: new THREE.PlaneGeometry(1.05, 0.15),
    hpFg: new THREE.PlaneGeometry(1.0, 0.11),
  };

  const mat = {
    padNormal: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.15,
    }),
    padOccupied: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    }),
    pathStone: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.05,
    }),
    pathTrim: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.8,
    }),
    towerDark: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.6,
    }),
    towerMetal: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.25,
      metalness: 0.8,
    }),
    pulseAccent: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.6,
    }),
    frostBody: new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.3,
      metalness: 0.25,
    }),
    frostAccent: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.4,
    }),
    cannonBody: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.75,
    }),
    cannonAccent: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.5,
    }),
    bulletPulse: new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    }),
    bulletFrost: new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.3,
      roughness: 0.1,
    }),
    bulletCannon: new THREE.MeshStandardMaterial({
      color: 0xfca5a5,
      emissive: 0xef4444,
      emissiveIntensity: 1.3,
      roughness: 0.15,
    }),

    hornIvory: new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 }),
    hornGold: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.28,
      metalness: 0.45,
    }),
    whiteTip: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }),
    ironArmor: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.85,
    }),
    talismanYellow: new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xca8a04,
      emissiveIntensity: 0.25,
      roughness: 0.7,
    }),
    talismanRed: new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
    wispBlue: new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
    eyeWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    eyeYellow: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    eyeRed: new THREE.MeshBasicMaterial({ color: 0xfb7185 }),
    pupilDark: new THREE.MeshBasicMaterial({ color: 0x0f172a }),

    hpBg: new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }),
    hpFgGreen: new THREE.MeshBasicMaterial({ color: 0x4ade80, side: THREE.DoubleSide }),
    hpFgYellow: new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide }),
    hpFgRed: new THREE.MeshBasicMaterial({ color: 0xf87171, side: THREE.DoubleSide }),
  };

  return {
    geo,
    mat,
    dispose: () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
    },
  };
}

export function createTowerMesh(
  type: TowerType,
  resources: SharedResources
): { root: THREE.Group; turret: THREE.Group; muzzle: THREE.Object3D } {
  const { geo, mat } = resources;
  const root = new THREE.Group();
  const turret = new THREE.Group();
  const muzzle = new THREE.Object3D();

  if (type === 'frost') {
    const base1 = new THREE.Mesh(geo.towerBase1, mat.towerDark);
    base1.position.y = 0.14;
    base1.castShadow = true;
    base1.receiveShadow = true;
    root.add(base1);

    const base2 = new THREE.Mesh(geo.towerBase2, mat.frostBody);
    base2.position.y = 0.59;
    base2.castShadow = true;
    base2.receiveShadow = true;
    root.add(base2);

    const collar = new THREE.Mesh(geo.towerCollar, mat.frostAccent);
    collar.position.y = 0.96;
    collar.castShadow = true;
    root.add(collar);

    turret.position.y = 1.24;
    const head = new THREE.Mesh(geo.turretHead, mat.frostBody);
    head.castShadow = true;
    turret.add(head);

    const spire = new THREE.Mesh(geo.frostSpire, mat.frostAccent);
    spire.position.y = 0.48;
    spire.castShadow = true;
    turret.add(spire);

    const barrel = new THREE.Mesh(geo.barrelFrost, mat.frostBody);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.5);
    barrel.castShadow = true;
    turret.add(barrel);

    const ring1 = new THREE.Mesh(geo.ringFrost, mat.frostAccent);
    ring1.position.set(0, 0.02, 0.65);
    turret.add(ring1);

    const ring2 = new THREE.Mesh(geo.ringFrost, mat.frostAccent);
    ring2.scale.setScalar(0.8);
    ring2.position.set(0, 0.02, 0.92);
    turret.add(ring2);

    muzzle.position.set(0, 0.02, 1.05);
    turret.add(muzzle);
  } else if (type === 'cannon') {
    const base1 = new THREE.Mesh(geo.towerBase1, mat.cannonBody);
    base1.scale.set(1.08, 1.15, 1.08);
    base1.position.y = 0.16;
    base1.castShadow = true;
    base1.receiveShadow = true;
    root.add(base1);

    const base2 = new THREE.Mesh(geo.towerBaseWide, mat.towerDark);
    base2.position.y = 0.62;
    base2.castShadow = true;
    base2.receiveShadow = true;
    root.add(base2);

    const collar = new THREE.Mesh(geo.towerCollar, mat.cannonAccent);
    collar.scale.set(1.12, 1.1, 1.12);
    collar.position.y = 1.02;
    collar.castShadow = true;
    root.add(collar);

    turret.position.y = 1.32;
    const head = new THREE.Mesh(geo.turretHeadWide, mat.cannonBody);
    head.castShadow = true;
    turret.add(head);

    const cap = new THREE.Mesh(geo.turretCap, mat.cannonAccent);
    cap.scale.set(1.15, 0.9, 1.15);
    cap.position.y = 0.38;
    cap.castShadow = true;
    turret.add(cap);

    const barrel = new THREE.Mesh(geo.barrelCannon, mat.towerMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.58);
    barrel.castShadow = true;
    turret.add(barrel);

    const tip = new THREE.Mesh(geo.tipCannon, mat.cannonAccent);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.02, 1.14);
    turret.add(tip);

    muzzle.position.set(0, 0.02, 1.3);
    turret.add(muzzle);
  } else {
    const base1 = new THREE.Mesh(geo.towerBase1, mat.towerDark);
    base1.position.y = 0.14;
    base1.castShadow = true;
    base1.receiveShadow = true;
    root.add(base1);

    const base2 = new THREE.Mesh(geo.towerBase2, mat.towerMetal);
    base2.position.y = 0.59;
    base2.castShadow = true;
    base2.receiveShadow = true;
    root.add(base2);

    const collar = new THREE.Mesh(geo.towerCollar, mat.pulseAccent);
    collar.position.y = 0.96;
    collar.castShadow = true;
    root.add(collar);

    turret.position.y = 1.24;
    const head = new THREE.Mesh(geo.turretHead, mat.towerDark);
    head.castShadow = true;
    turret.add(head);

    const cap = new THREE.Mesh(geo.turretCap, mat.pulseAccent);
    cap.position.y = 0.36;
    cap.castShadow = true;
    turret.add(cap);

    const barrel = new THREE.Mesh(geo.barrelPulse, mat.towerMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.52);
    barrel.castShadow = true;
    turret.add(barrel);

    const tip = new THREE.Mesh(geo.tipPulse, mat.pulseAccent);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.02, 1.02);
    turret.add(tip);

    muzzle.position.set(0, 0.02, 1.15);
    turret.add(muzzle);
  }

  root.add(turret);
  return { root, turret, muzzle };
}

export interface EnemyTypeConfig {
  type: YokaiType;
  color: number;
  emissive: number;
  speed: number;
  maxHp: number;
  hpBarY: number;
}

export function createEnemyTypeConfig(typeName: YokaiType, waveNum: number): EnemyTypeConfig {
  const hpScale = 1 + (waveNum - 1) * 0.28;
  if (typeName === 'fast') {
    return {
      type: 'fast',
      color: 0x14b8a6,
      emissive: 0x0f766e,
      speed: 4.15,
      maxHp: Math.round(46 * hpScale),
      hpBarY: 1.0,
    };
  }
  if (typeName === 'ghost') {
    return {
      type: 'ghost',
      color: 0x8b5cf6,
      emissive: 0x4c1d95,
      speed: 3.25,
      maxHp: Math.round(78 * hpScale),
      hpBarY: 1.18,
    };
  }
  if (typeName === 'tank') {
    return {
      type: 'tank',
      color: 0xe11d48,
      emissive: 0x881337,
      speed: 2.05,
      maxHp: Math.round(165 * hpScale),
      hpBarY: 1.42,
    };
  }
  return {
    type: 'normal',
    color: 0x22c55e,
    emissive: 0x15803d,
    speed: 2.95,
    maxHp: Math.round(70 * hpScale),
    hpBarY: 1.08,
  };
}

export function buildYokaiBody(
  typeName: YokaiType,
  bodyMat: THREE.MeshStandardMaterial,
  resources: SharedResources
): {
  bodyGroup: THREE.Group;
  tailMesh: THREE.Group | null;
  orbitGroup: THREE.Group | null;
} {
  const { geo, mat } = resources;
  const bodyGroup = new THREE.Group();
  let tailMesh: THREE.Group | null = null;
  let orbitGroup: THREE.Group | null = null;

  if (typeName === 'fast') {
    const body = new THREE.Mesh(geo.foxBody, bodyMat);
    body.scale.set(0.85, 0.8, 1.32);
    body.position.set(0, -0.02, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    bodyGroup.add(body);

    const head = new THREE.Mesh(geo.foxHead, bodyMat);
    head.position.set(0, 0.26, 0.24);
    head.castShadow = true;
    bodyGroup.add(head);

    const snout = new THREE.Mesh(geo.foxSnout, bodyMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.22, 0.46);
    bodyGroup.add(snout);

    const leftEar = new THREE.Mesh(geo.foxEar, bodyMat);
    leftEar.position.set(-0.14, 0.52, 0.2);
    leftEar.rotation.z = 0.28;
    leftEar.castShadow = true;

    const rightEar = new THREE.Mesh(geo.foxEar, bodyMat);
    rightEar.position.set(0.14, 0.52, 0.2);
    rightEar.rotation.z = -0.28;
    rightEar.castShadow = true;
    bodyGroup.add(leftEar, rightEar);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.08, -0.32);
    const tail = new THREE.Mesh(geo.foxTail, bodyMat);
    tail.rotation.x = -0.95;
    tail.position.set(0, 0.14, -0.18);
    tail.castShadow = true;
    const tailTip = new THREE.Mesh(geo.foxTailTip, mat.whiteTip);
    tailTip.rotation.x = -0.95;
    tailTip.position.set(0, 0.29, -0.36);
    tailPivot.add(tail, tailTip);
    bodyGroup.add(tailPivot);
    tailMesh = tailPivot;

    const lEye = new THREE.Mesh(geo.yokaiEye, mat.eyeYellow);
    lEye.position.set(-0.1, 0.31, 0.41);
    const rEye = new THREE.Mesh(geo.yokaiEye, mat.eyeYellow);
    rEye.position.set(0.1, 0.31, 0.41);
    const lPupil = new THREE.Mesh(geo.yokaiPupil, mat.pupilDark);
    lPupil.position.set(-0.1, 0.31, 0.45);
    const rPupil = new THREE.Mesh(geo.yokaiPupil, mat.pupilDark);
    rPupil.position.set(0.1, 0.31, 0.45);
    bodyGroup.add(lEye, rEye, lPupil, rPupil);
  } else if (typeName === 'ghost') {
    const cloak = new THREE.Mesh(geo.ghostCloak, bodyMat);
    cloak.position.set(0, 0.02, 0);
    cloak.castShadow = true;
    cloak.receiveShadow = true;
    bodyGroup.add(cloak);

    const head = new THREE.Mesh(geo.ghostHead, bodyMat);
    head.position.set(0, 0.42, 0);
    head.castShadow = true;
    bodyGroup.add(head);

    const cyclopsEye = new THREE.Mesh(geo.ghostEyeWhite, mat.eyeWhite);
    cyclopsEye.position.set(0, 0.43, 0.24);
    const cyclopsPupil = new THREE.Mesh(geo.ghostEyePupil, mat.eyeRed);
    cyclopsPupil.position.set(0, 0.43, 0.34);
    bodyGroup.add(cyclopsEye, cyclopsPupil);

    const talisman = new THREE.Mesh(geo.ghostTalisman, mat.talismanYellow);
    talisman.position.set(0, 0.62, 0.27);
    talisman.rotation.x = -0.22;
    const seal = new THREE.Mesh(geo.ghostSeal, mat.talismanRed);
    seal.position.set(0, 0.62, 0.285);
    seal.rotation.x = -0.22;
    bodyGroup.add(talisman, seal);

    const lArm = new THREE.Mesh(geo.ghostArm, bodyMat);
    lArm.rotation.x = Math.PI / 2;
    lArm.position.set(-0.28, 0.24, 0.24);
    const rArm = new THREE.Mesh(geo.ghostArm, bodyMat);
    rArm.rotation.x = Math.PI / 2;
    rArm.position.set(0.28, 0.24, 0.24);
    bodyGroup.add(lArm, rArm);

    orbitGroup = new THREE.Group();
    orbitGroup.position.set(0, 0.35, 0);
    const wisp1 = new THREE.Mesh(geo.ghostWisp, mat.wispBlue);
    wisp1.position.set(0.52, 0.1, 0);
    const wisp2 = new THREE.Mesh(geo.ghostWisp, mat.wispBlue);
    wisp2.position.set(-0.52, -0.05, 0);
    orbitGroup.add(wisp1, wisp2);
    bodyGroup.add(orbitGroup);
  } else if (typeName === 'tank') {
    const torso = new THREE.Mesh(geo.oniTorso, bodyMat);
    torso.position.set(0, 0.04, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    const belt = new THREE.Mesh(geo.oniBelt, mat.ironArmor);
    belt.position.set(0, -0.16, 0);
    belt.castShadow = true;
    bodyGroup.add(belt);

    const lShoulder = new THREE.Mesh(geo.oniShoulder, mat.ironArmor);
    lShoulder.position.set(-0.46, 0.28, 0);
    lShoulder.castShadow = true;
    const rShoulder = new THREE.Mesh(geo.oniShoulder, mat.ironArmor);
    rShoulder.position.set(0.46, 0.28, 0);
    rShoulder.castShadow = true;

    const lSpike = new THREE.Mesh(geo.oniSpike, mat.hornIvory);
    lSpike.position.set(-0.5, 0.5, 0);
    lSpike.rotation.z = 0.25;
    const rSpike = new THREE.Mesh(geo.oniSpike, mat.hornIvory);
    rSpike.position.set(0.5, 0.5, 0);
    rSpike.rotation.z = -0.25;
    bodyGroup.add(lShoulder, rShoulder, lSpike, rSpike);

    const head = new THREE.Mesh(geo.oniHead, bodyMat);
    head.position.set(0, 0.56, 0.05);
    head.castShadow = true;
    bodyGroup.add(head);

    const lHorn = new THREE.Mesh(geo.oniHorn, mat.hornGold);
    lHorn.position.set(-0.24, 0.86, 0.08);
    lHorn.rotation.set(0.32, 0, 0.45);
    lHorn.castShadow = true;
    const rHorn = new THREE.Mesh(geo.oniHorn, mat.hornGold);
    rHorn.position.set(0.24, 0.86, 0.08);
    rHorn.rotation.set(0.32, 0, -0.45);
    rHorn.castShadow = true;
    bodyGroup.add(lHorn, rHorn);

    const lEye = new THREE.Mesh(geo.yokaiEye, mat.eyeYellow);
    lEye.position.set(-0.12, 0.6, 0.25);
    const rEye = new THREE.Mesh(geo.yokaiEye, mat.eyeYellow);
    rEye.position.set(0.12, 0.6, 0.25);
    const lFang = new THREE.Mesh(geo.oniFang, mat.hornIvory);
    lFang.position.set(-0.13, 0.44, 0.26);
    const rFang = new THREE.Mesh(geo.oniFang, mat.hornIvory);
    rFang.position.set(0.13, 0.44, 0.26);
    bodyGroup.add(lEye, rEye, lFang, rFang);

    const lFist = new THREE.Mesh(geo.oniFist, bodyMat);
    lFist.position.set(-0.48, -0.08, 0.24);
    const rFist = new THREE.Mesh(geo.oniFist, bodyMat);
    rFist.position.set(0.48, -0.08, 0.24);
    bodyGroup.add(lFist, rFist);
  } else {
    const torso = new THREE.Mesh(geo.impTorso, bodyMat);
    torso.scale.set(1.0, 0.92, 0.9);
    torso.position.set(0, -0.05, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    const head = new THREE.Mesh(geo.impHead, bodyMat);
    head.position.set(0, 0.33, 0.04);
    head.castShadow = true;
    bodyGroup.add(head);

    const lHorn = new THREE.Mesh(geo.impHorn, mat.hornIvory);
    lHorn.position.set(-0.16, 0.63, 0.08);
    lHorn.rotation.set(0.22, 0, 0.34);
    lHorn.castShadow = true;
    const rHorn = new THREE.Mesh(geo.impHorn, mat.hornIvory);
    rHorn.position.set(0.16, 0.63, 0.08);
    rHorn.rotation.set(0.22, 0, -0.34);
    rHorn.castShadow = true;
    bodyGroup.add(lHorn, rHorn);

    const lEar = new THREE.Mesh(geo.impEar, bodyMat);
    lEar.position.set(-0.34, 0.35, 0);
    lEar.rotation.z = 1.2;
    const rEar = new THREE.Mesh(geo.impEar, bodyMat);
    rEar.position.set(0.34, 0.35, 0);
    rEar.rotation.z = -1.2;
    bodyGroup.add(lEar, rEar);

    const lEye = new THREE.Mesh(geo.yokaiEye, mat.eyeYellow);
    lEye.position.set(-0.12, 0.36, 0.3);
    const rEye = new THREE.Mesh(geo.yokaiEye, mat.eyeYellow);
    rEye.position.set(0.12, 0.36, 0.3);
    const lPupil = new THREE.Mesh(geo.yokaiPupil, mat.pupilDark);
    lPupil.position.set(-0.12, 0.36, 0.35);
    const rPupil = new THREE.Mesh(geo.yokaiPupil, mat.pupilDark);
    rPupil.position.set(0.12, 0.36, 0.35);

    const lFang = new THREE.Mesh(geo.impFang, mat.hornIvory);
    lFang.position.set(-0.09, 0.22, 0.31);
    const rFang = new THREE.Mesh(geo.impFang, mat.hornIvory);
    rFang.position.set(0.09, 0.22, 0.31);
    bodyGroup.add(lEye, rEye, lPupil, rPupil, lFang, rFang);

    const lArm = new THREE.Mesh(geo.impArm, bodyMat);
    lArm.position.set(-0.34, 0.02, 0.14);
    const rArm = new THREE.Mesh(geo.impArm, bodyMat);
    rArm.position.set(0.34, 0.02, 0.14);
    bodyGroup.add(lArm, rArm);
  }

  return { bodyGroup, tailMesh, orbitGroup };
}
