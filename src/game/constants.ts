import * as THREE from 'three';

export const GRID_COLS = 11;
export const GRID_ROWS = 9;
export const TILE_SIZE = 2.2;

export const INITIAL_GOLD = 500;
export const INITIAL_HP = 10;
export const KILL_REWARD = 20;

export type TowerType = 'pulse' | 'frost' | 'cannon';
export type YokaiType = 'normal' | 'fast' | 'ghost' | 'tank';

export interface TowerConfig {
  type: TowerType;
  name: string;
  shortName: string;
  cost: number;
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
  desc: string;
  shortDesc: string;
}

export const TOWER_TYPES: Record<TowerType, TowerConfig> = {
  pulse: {
    type: 'pulse',
    name: '黃金脈衝塔',
    shortName: '脈衝塔',
    cost: 100,
    range: 6.2,
    damage: 28,
    fireInterval: 0.72,
    bulletSpeed: 23,
    bulletRadius: 0.19,
    bulletColor: 0xfde047,
    ringColor: 0xf59e0b,
    slowFactor: 1,
    slowDuration: 0,
    aoeRadius: 0,
    desc: '快速單體射擊',
    shortDesc: '100G · 快速連射',
  },
  frost: {
    type: 'frost',
    name: '藍色冰凍塔',
    shortName: '冰凍塔',
    cost: 120,
    range: 6.5,
    damage: 18,
    fireInterval: 1.45,
    bulletSpeed: 19,
    bulletRadius: 0.22,
    bulletColor: 0x38bdf8,
    ringColor: 0x38bdf8,
    slowFactor: 0.5,
    slowDuration: 3.0,
    aoeRadius: 0,
    desc: '擊中減速50% (3秒)',
    shortDesc: '120G · 減速 50%',
  },
  cannon: {
    type: 'cannon',
    name: '紅色重砲塔',
    shortName: '重砲塔',
    cost: 200,
    range: 7.2,
    damage: 56,
    fireInterval: 1.75,
    bulletSpeed: 17,
    bulletRadius: 0.28,
    bulletColor: 0xf97316,
    ringColor: 0xef4444,
    slowFactor: 1,
    slowDuration: 0,
    aoeRadius: 2 * TILE_SIZE,
    desc: '半徑2格範圍爆傷',
    shortDesc: '200G · 2格爆傷',
  },
};

export interface GridPoint {
  c: number;
  r: number;
}

export const GRID_WAYPOINTS: GridPoint[] = [
  { c: 0, r: 1 },
  { c: 8, r: 1 },
  { c: 8, r: 4 },
  { c: 2, r: 4 },
  { c: 2, r: 7 },
  { c: 10, r: 7 },
];

export function gridToWorld(c: number, r: number, y = 0): THREE.Vector3 {
  const x = (c - (GRID_COLS - 1) / 2) * TILE_SIZE;
  const z = (r - (GRID_ROWS - 1) / 2) * TILE_SIZE;
  return new THREE.Vector3(x, y, z);
}

export const WORLD_WAYPOINTS: THREE.Vector3[] = GRID_WAYPOINTS.map((wp) =>
  gridToWorld(wp.c, wp.r, 0.55)
);

export const PATH_GRID_SET: Set<string> = (() => {
  const set = new Set<string>();
  for (let i = 0; i < GRID_WAYPOINTS.length - 1; i++) {
    const a = GRID_WAYPOINTS[i];
    const b = GRID_WAYPOINTS[i + 1];
    const dc = Math.sign(b.c - a.c);
    const dr = Math.sign(b.r - a.r);
    let c = a.c;
    let r = a.r;
    set.add(`${c},${r}`);
    while (c !== b.c || r !== b.r) {
      c += dc;
      r += dr;
      set.add(`${c},${r}`);
    }
  }
  return set;
})();

export interface YokaiGuideEntry {
  type: YokaiType;
  name: string;
  debutWave: string;
  trait: string;
  accentHex: string;
}

export const YOKAI_GUIDE: YokaiGuideEntry[] = [
  {
    type: 'normal',
    name: '綠皮小鬼',
    debutWave: '第 1 波起',
    trait: '圓胖妖身、雙白鬼角與獠牙，沿路跳躍前進。',
    accentHex: '#4ade80',
  },
  {
    type: 'fast',
    name: '疾風狐妖',
    debutWave: '第 2 波起',
    trait: '青藍修長獸身、尖吻與搖擺大尾，移動速度極快。',
    accentHex: '#2dd4bf',
  },
  {
    type: 'ghost',
    name: '符咒獨眼靈',
    debutWave: '第 2 波起',
    trait: '紫袍飄浮幽靈、額貼鎮妖黃符，雙團鬼火環繞旋轉。',
    accentHex: '#a78bfa',
  },
  {
    type: 'tank',
    name: '赤紅鬼王',
    debutWave: '第 3 波起',
    trait: '黑鐵肩刺重甲、金角獠牙，超高血量坦型頭目。',
    accentHex: '#fb7185',
  },
];

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  hpMultiplier: number;
  speedMultiplier: number;
  spawnIntervalMultiplier: number;
  summary: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: '簡單',
    hpMultiplier: 0.78,
    speedMultiplier: 0.88,
    spawnIntervalMultiplier: 1.2,
    summary: '妖怪血量 -22% · 移速 -12% · 生成較慢',
  },
  normal: {
    id: 'normal',
    label: '普通',
    hpMultiplier: 1.0,
    speedMultiplier: 1.0,
    spawnIntervalMultiplier: 1.0,
    summary: '標準妖怪強度與生成節奏',
  },
  hard: {
    id: 'hard',
    label: '困難',
    hpMultiplier: 1.38,
    speedMultiplier: 1.16,
    spawnIntervalMultiplier: 0.8,
    summary: '妖怪血量 +38% · 移速 +16% · 密集進攻',
  },
};

export type SkillId = 'freeze' | 'heal';

export interface SkillConfig {
  id: SkillId;
  name: string;
  cooldown: number;
  desc: string;
}

export const SKILL_CONFIGS: Record<SkillId, SkillConfig> = {
  freeze: {
    id: 'freeze',
    name: '全屏冰凍',
    cooldown: 24,
    desc: '全場妖怪減速 80%，持續 4.5 秒',
  },
  heal: {
    id: 'heal',
    name: '緊急治療',
    cooldown: 28,
    desc: '立即恢復基地 3 點 HP（上限 10）',
  },
};

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardGold: number;
  badgeColor: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_kill',
    title: '初試啼聲',
    description: '成功斬除第 1 隻妖怪',
    rewardGold: 25,
    badgeColor: '#4ade80',
  },
  {
    id: 'hundred_kills',
    title: '百鬼剋星',
    description: '累計斬除 100 隻妖怪',
    rewardGold: 120,
    badgeColor: '#f59e0b',
  },
  {
    id: 'perfect_defense',
    title: '完美防線',
    description: '在基地滿血 (10 HP) 下完成第 3 波守備',
    rewardGold: 80,
    badgeColor: '#38bdf8',
  },
  {
    id: 'tower_architect',
    title: '陣地建築師',
    description: '場上同時部署 6 座以上防禦塔',
    rewardGold: 50,
    badgeColor: '#a78bfa',
  },
  {
    id: 'master_upgrade',
    title: '宗師鍛造',
    description: '將任一防禦塔升級至 Lv.3',
    rewardGold: 60,
    badgeColor: '#fb7185',
  },
  {
    id: 'tactical_skill',
    title: '術法掌控',
    description: '在戰鬥中施放任一主動技能',
    rewardGold: 30,
    badgeColor: '#2dd4bf',
  },
];

