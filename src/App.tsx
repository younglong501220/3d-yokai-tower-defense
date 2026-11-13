import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Coins,
  FastForward,
  Heart,
  HeartPulse,
  Lock,
  RotateCcw,
  ShieldAlert,
  Skull,
  Snowflake,
  Swords,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  DIFFICULTY_CONFIGS,
  INITIAL_GOLD,
  INITIAL_HP,
  SKILL_CONFIGS,
  TOWER_TYPES,
  type AchievementDef,
  type DifficultyLevel,
  type SkillId,
  type TowerType,
} from './game/constants';
import {
  YokaiGameEngine,
  type GameUISnapshot,
} from './game/YokaiGameEngine';
import { BattleChartWidget } from './components/BattleChartWidget';
import { YokaiBestiaryDrawer } from './components/YokaiBestiaryDrawer';

const INITIAL_SNAPSHOT: GameUISnapshot = {
  gold: INITIAL_GOLD,
  hp: INITIAL_HP,
  wave: 0,
  kills: 0,
  lifetimeKills: 0,
  enemiesRemaining: 0,
  buildMode: true,
  selectedBuildType: 'pulse',
  speedMultiplier: 1,
  difficulty: 'normal',
  isWaveRunning: false,
  gameOver: false,
  soundEnabled: true,
  masterVolume: 0.7,
  skillCooldowns: { freeze: 0, heal: 0 },
  unlockedAchievements: {},
  yokaiTrend: [{ tick: '0s', active: 0, remaining: 0, damage: 0 }],
  towerDamageTotals: { pulse: 0, frost: 0, cannon: 0 },
  totalDamageDealt: 0,
  selectedTower: null,
};

const TOWER_ORDER: TowerType[] = ['pulse', 'frost', 'cannon'];
const DIFFICULTY_ORDER: DifficultyLevel[] = ['easy', 'normal', 'hard'];

const TOWER_ACTIVE_STYLES: Record<TowerType, string> = {
  pulse:
    'bg-gradient-to-br from-amber-700 to-amber-500 border-amber-300/80 text-white shadow-[0_0_16px_rgba(245,158,11,0.4)]',
  frost:
    'bg-gradient-to-br from-sky-700 to-sky-500 border-sky-300/85 text-white shadow-[0_0_16px_rgba(56,189,248,0.45)]',
  cannon:
    'bg-gradient-to-br from-red-700 to-red-500 border-red-300/85 text-white shadow-[0_0_16px_rgba(239,68,68,0.45)]',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<YokaiGameEngine | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const achievementTimerRef = useRef<number | null>(null);

  const [ui, setUi] = useState<GameUISnapshot>(INITIAL_SNAPSHOT);
  const [toast, setToast] = useState<{ text: string; visible: boolean }>({
    text: '',
    visible: false,
  });
  const [unlockedBanner, setUnlockedBanner] = useState<AchievementDef | null>(null);
  const [damageFlash, setDamageFlash] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const showToast = (msg: string) => {
      setToast({ text: msg, visible: true });
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 2500);
    };

    const triggerDamageFlash = () => {
      setDamageFlash(true);
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = window.setTimeout(() => {
        setDamageFlash(false);
      }, 220);
    };

    const handleAchievementUnlocked = (achievement: AchievementDef) => {
      setUnlockedBanner(achievement);
      if (achievementTimerRef.current !== null) {
        window.clearTimeout(achievementTimerRef.current);
      }
      achievementTimerRef.current = window.setTimeout(() => {
        setUnlockedBanner(null);
      }, 3200);
    };

    const engine = new YokaiGameEngine(mountEl, {
      onStateChange: (snapshot) => setUi(snapshot),
      onToast: showToast,
      onBaseDamage: triggerDamageFlash,
      onAchievementUnlocked: handleAchievementUnlocked,
      onContextLost: (lost) => setContextLost(lost),
    });

    engineRef.current = engine;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'q' || e.key === 'Q') {
        engine.activateSkill('freeze');
      } else if (e.key === 'e' || e.key === 'E') {
        engine.activateSkill('heal');
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      if (achievementTimerRef.current !== null) {
        window.clearTimeout(achievementTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const selectedTower = ui.selectedTower;
  const unlockedCount = Object.keys(ui.unlockedAchievements).length;
  const volumePercent = Math.round((ui.soundEnabled ? ui.masterVolume : 0) * 100);
  const freezeCd = Math.ceil(ui.skillCooldowns.freeze);
  const healCd = Math.ceil(ui.skillCooldowns.heal);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b1120] text-slate-50 select-none">
      {/* Isolated WebGL Canvas Mount */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full z-0"
        aria-label="3D 妖怪塔防戰場"
      />

      {/* Base Damage Vignette Flash */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-150 ${
          damageFlash ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle, transparent 50%, rgba(239, 68, 68, 0.45) 100%)',
        }}
      />

      {/* Top HUD */}
      <header className="fixed top-[calc(10px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-[#0f172a]/94 border border-slate-400/25 shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-[calc(100vw-16px)]">
        {/* Core Stats */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/85 border border-white/5 text-xs sm:text-sm font-bold whitespace-nowrap">
          <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-400 text-[11px] sm:text-xs font-medium">金幣</span>
          <span className="font-num text-amber-400">{ui.gold}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/85 border border-white/5 text-xs sm:text-sm font-bold whitespace-nowrap">
          <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="text-slate-400 text-[11px] sm:text-xs font-medium">基地 HP</span>
          <span className="font-num text-rose-400">{ui.hp}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/85 border border-white/5 text-xs sm:text-sm font-bold whitespace-nowrap">
          <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-slate-400 text-[11px] sm:text-xs font-medium">波次</span>
          <span className="font-num text-sky-400">{ui.wave}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/85 border border-white/5 text-xs sm:text-sm font-bold whitespace-nowrap">
          <Skull className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400 text-[11px] sm:text-xs font-medium">妖怪</span>
          <span className="font-num text-emerald-400">{ui.enemiesRemaining}</span>
        </div>

        {/* Difficulty Segmented Control */}
        <div
          role="group"
          aria-label="遊戲難度"
          className="flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-slate-400/20"
        >
          {DIFFICULTY_ORDER.map((lvl) => {
            const cfg = DIFFICULTY_CONFIGS[lvl];
            const active = ui.difficulty === lvl;
            return (
              <button
                key={lvl}
                type="button"
                title={cfg.summary}
                onClick={() => engineRef.current?.setDifficulty(lvl)}
                className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? lvl === 'hard'
                      ? 'bg-rose-600 text-white'
                      : lvl === 'easy'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Master Volume Slider */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-800/90 border border-slate-400/20">
          <button
            type="button"
            onClick={() => engineRef.current?.toggleSound()}
            title={ui.soundEnabled ? '靜音' : '取消靜音'}
            aria-label={ui.soundEnabled ? '靜音' : '取消靜音'}
            className="text-slate-100 hover:text-sky-300 cursor-pointer shrink-0"
          >
            {ui.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-sky-300" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volumePercent}
            aria-label="主音量"
            title={`主音量 ${volumePercent}%`}
            onChange={(e) => {
              const nextVol = Number(e.target.value) / 100;
              engineRef.current?.setMasterVolume(nextVol);
            }}
            className="w-16 sm:w-20 h-1.5 accent-sky-400 cursor-pointer"
          />
          <span className="hidden sm:inline text-[11px] font-num text-slate-300 w-8 text-right">
            {volumePercent}%
          </span>
        </div>

        {/* Achievements Modal Button */}
        <button
          type="button"
          onClick={() => {
            setAchievementsOpen((prev) => !prev);
            setGuideOpen(false);
          }}
          title="成就勳章"
          aria-label="成就勳章"
          className={`h-8 px-2.5 rounded-xl border inline-flex items-center gap-1 text-xs font-bold transition-transform active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
            achievementsOpen
              ? 'bg-amber-600 border-amber-400 text-white'
              : 'bg-slate-800/90 hover:bg-slate-700 border-slate-400/25 text-amber-300'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="font-num">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </button>

        {/* Yokai Bestiary Toggle */}
        <button
          type="button"
          onClick={() => {
            setGuideOpen((prev) => !prev);
            setAchievementsOpen(false);
          }}
          title="妖怪圖鑑"
          aria-label="妖怪圖鑑"
          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-transform active:scale-90 cursor-pointer shrink-0 ${
            guideOpen
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-slate-800/90 hover:bg-slate-700 border-slate-400/25 text-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
        </button>
      </header>

      {/* Toast Message */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-[calc(86px+env(safe-area-inset-top))] sm:top-[calc(66px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-[#0f172a]/95 border border-sky-400/45 text-sky-100 text-xs sm:text-sm font-semibold shadow-[0_6px_20px_rgba(0,0,0,0.45)] pointer-events-none whitespace-nowrap max-w-[calc(100vw-24px)] truncate transition-all duration-200 ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        {toast.text}
      </div>

      {/* Achievement Unlocked Celebration Toast */}
      {unlockedBanner && (
        <div
          role="status"
          className="fixed top-[calc(126px+env(safe-area-inset-top))] sm:top-[calc(106px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/96 border border-amber-400/70 shadow-[0_10px_30px_rgba(245,158,11,0.28)] max-w-[calc(100vw-24px)]"
        >
          <Award
            className="w-5 h-5 shrink-0"
            style={{ color: unlockedBanner.badgeColor }}
          />
          <div className="text-left">
            <div className="text-xs font-bold text-amber-300">
              解鎖成就：{unlockedBanner.title}
            </div>
            <div className="text-[11px] text-slate-300">
              {unlockedBanner.description} · 獎勵 +{unlockedBanner.rewardGold}G
            </div>
          </div>
        </div>
      )}

      {/* Achievements Small Modal */}
      {achievementsOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#020617]/70"
          onClick={() => setAchievementsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="戰役成就系統"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-2xl bg-slate-900 border border-amber-400/35 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">戰役成就徽章</h2>
              </div>
              <button
                type="button"
                onClick={() => setAchievementsOpen(false)}
                aria-label="關閉成就視窗"
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pb-3 mb-3 border-b border-slate-800">
              <span>
                已解鎖{' '}
                <strong className="text-amber-300 font-num">
                  {unlockedCount} / {ACHIEVEMENTS.length}
                </strong>
              </span>
              <span>
                累計斬除妖怪{' '}
                <strong className="text-emerald-400 font-num">
                  {ui.lifetimeKills}
                </strong>
              </span>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = Boolean(ui.unlockedAchievements[ach.id]);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border ${
                      isUnlocked
                        ? 'bg-slate-800/90 border-amber-400/35'
                        : 'bg-slate-950/60 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                        style={{
                          backgroundColor: isUnlocked
                            ? `${ach.badgeColor}22`
                            : 'rgba(30,41,59,0.7)',
                        }}
                      >
                        {isUnlocked ? (
                          <Award
                            className="w-4 h-4"
                            style={{ color: ach.badgeColor }}
                          />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">
                          {ach.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {ach.description}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className={`text-[11px] font-bold font-num ${
                          isUnlocked ? 'text-amber-300' : 'text-slate-500'
                        }`}
                      >
                        +{ach.rewardGold}G
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isUnlocked ? '已達成' : '未解鎖'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3D Yokai Bestiary Drawer */}
      <YokaiBestiaryDrawer
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />

      {/* Corner Real-time Battle Chart */}
      <BattleChartWidget
        wave={ui.wave}
        yokaiTrend={ui.yokaiTrend}
        towerDamageTotals={ui.towerDamageTotals}
        totalDamageDealt={ui.totalDamageDealt}
      />

      {/* Selected Tower Action Panel */}
      {selectedTower && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#0f172a]/96 border border-sky-400/45 shadow-[0_12px_32px_rgba(0,0,0,0.55)] max-w-[calc(100vw-20px)] transition-all duration-200 ${
            dockCollapsed
              ? 'bottom-[calc(64px+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(194px+env(safe-area-inset-bottom))]'
          }`}
        >
          <div className="flex flex-col gap-0.5 sm:pr-3 sm:border-r sm:border-slate-400/20 text-center sm:text-left w-full sm:w-auto">
            <div className="text-xs sm:text-sm font-bold text-sky-400 whitespace-nowrap">
              {selectedTower.name} Lv.<span className="font-num">{selectedTower.level}</span>
            </div>
            <div className="text-[11px] text-slate-400 whitespace-nowrap font-num">
              傷害: {selectedTower.damage} | 射程: {selectedTower.range.toFixed(1)}
              {selectedTower.type === 'frost'
                ? ` | 減速: 50% (${selectedTower.slowDuration.toFixed(1)}s)`
                : ''}
              {selectedTower.type === 'cannon'
                ? ` | 爆炸半徑: ${selectedTower.aoeRadiusTiles.toFixed(1)}格`
                : ''}
            </div>
          </div>

          <button
            type="button"
            disabled={selectedTower.level >= 3 || ui.gold < selectedTower.upgradeCost}
            onClick={() => engineRef.current?.upgradeSelectedTower()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 border border-white/15 text-xs font-bold text-white cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            {selectedTower.level >= 3 ? (
              '已達最高等'
            ) : (
              <span>
                升級 (<span className="font-num">{selectedTower.upgradeCost}</span>G)
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => engineRef.current?.sellSelectedTower()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-red-700 to-red-500 border border-white/15 text-xs font-bold text-white cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              拆除 (+<span className="font-num">{selectedTower.sellRefund}</span>G)
            </span>
          </button>

          <button
            type="button"
            onClick={() => engineRef.current?.deselectTower()}
            aria-label="關閉防禦塔面板"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-400/25 flex items-center justify-center text-slate-200 cursor-pointer active:scale-90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div
        className={`fixed bottom-[calc(10px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[calc(100vw-16px)] transition-transform duration-200 ${
          dockCollapsed ? 'translate-y-[calc(100%-34px)]' : 'translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="mb-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0f172a]/94 border border-slate-400/25 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>展開操作列 (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>收起操作列 (H)</span>
            </>
          )}
        </button>

        <div className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-[#0f172a]/95 border border-slate-400/25 shadow-[0_14px_36px_rgba(0,0,0,0.65)] w-full">
          {/* Tower Selection Row */}
          <div className="flex items-center justify-center gap-2 w-full">
            {TOWER_ORDER.map((type) => {
              const cfg = TOWER_TYPES[type];
              const isActive = ui.buildMode && ui.selectedBuildType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => engineRef.current?.selectBuildType(type)}
                  className={`flex-1 min-w-[90px] flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                    isActive
                      ? TOWER_ACTIVE_STYLES[type]
                      : 'bg-slate-800/85 hover:bg-slate-800 border-slate-400/20 text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1">
                    {type === 'pulse' ? '⚡' : type === 'frost' ? '❄️' : '💣'}{' '}
                    {cfg.shortName}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isActive ? 'text-white/90' : 'text-slate-400'
                    }`}
                  >
                    {cfg.shortDesc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Skills Row */}
          <div className="flex items-center justify-center gap-2 w-full">
            {(['freeze', 'heal'] as SkillId[]).map((skillId) => {
              const cfg = SKILL_CONFIGS[skillId];
              const cd = skillId === 'freeze' ? freezeCd : healCd;
              const isCooling = cd > 0;
              const isFreeze = skillId === 'freeze';
              return (
                <button
                  key={skillId}
                  type="button"
                  disabled={ui.gameOver || isCooling}
                  title={`${cfg.desc}（冷卻 ${cfg.cooldown} 秒）`}
                  onClick={() => engineRef.current?.activateSkill(skillId)}
                  className={`flex-1 inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed whitespace-nowrap ${
                    isCooling
                      ? 'bg-slate-900/90 border-slate-700 text-slate-400'
                      : isFreeze
                      ? 'bg-sky-900/85 hover:bg-sky-800 border-sky-400/50 text-sky-100'
                      : 'bg-emerald-900/85 hover:bg-emerald-800 border-emerald-400/50 text-emerald-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isFreeze ? (
                      <Snowflake className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    ) : (
                      <HeartPulse className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    )}
                    <span>{cfg.name}</span>
                  </span>
                  <span className="font-num text-[11px] opacity-90">
                    {isCooling ? `${cd}s` : isFreeze ? 'Q 就緒' : 'E 就緒'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Wave & Speed Row */}
          <div className="flex items-center justify-center gap-2 w-full">
            <button
              type="button"
              disabled={ui.isWaveRunning || ui.gameOver}
              onClick={() => engineRef.current?.startNextWave()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 border border-emerald-300/45 shadow-[0_4px_14px_rgba(16,185,129,0.35)] text-xs sm:text-sm font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
            >
              <Swords className="w-4 h-4 shrink-0" />
              <span>
                {ui.isWaveRunning
                  ? `第 ${ui.wave} 波進行中`
                  : ui.wave === 0
                  ? '開始波次'
                  : `開始第 ${ui.wave + 1} 波`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => engineRef.current?.toggleSpeed()}
              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-white/15 text-amber-400 text-xs sm:text-sm font-bold font-num cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <FastForward className="w-4 h-4 shrink-0" />
              <span>{ui.speedMultiplier}x</span>
            </button>
          </div>
        </div>
      </div>

      {/* WebGL Context Lost Overlay */}
      {contextLost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-5 bg-[#020617]/90">
          <div className="max-w-sm w-full rounded-2xl bg-slate-900 border border-amber-400/40 p-6 text-center shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">3D 畫面暫時中斷</h2>
            <p className="text-sm text-slate-300">
              偵測到 WebGL 繪圖內容重置，正在嘗試自動恢復戰場渲染…
            </p>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {ui.gameOver && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-5 bg-[#020617]/82">
          <div className="w-full max-w-[380px] rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-rose-400/35 p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.75)]">
            <span className="inline-block px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-400/40 text-rose-400 text-xs font-bold tracking-wider mb-3">
              BASE DESTROYED
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              基地防線失守
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              百鬼突破了你的 3D 戰術防線，調整脈衝、冰凍與重砲的搭配再戰一次吧！
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              <div className="rounded-2xl bg-slate-900/80 border border-slate-400/15 py-3 px-2">
                <div className="text-2xl font-extrabold text-sky-400 font-num">
                  {ui.wave}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">堅守波次</div>
              </div>
              <div className="rounded-2xl bg-slate-900/80 border border-slate-400/15 py-3 px-2">
                <div className="text-2xl font-extrabold text-emerald-400 font-num">
                  {ui.kills}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">斬除妖怪</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => engineRef.current?.resetGame()}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white text-base font-extrabold shadow-[0_8px_24px_rgba(37,99,235,0.45)] inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              <span>重新開始戰役</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
