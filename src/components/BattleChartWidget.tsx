import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import type { TowerType } from '../game/constants';
import type { YokaiTrendPoint } from '../game/YokaiGameEngine';

interface BattleChartWidgetProps {
  wave: number;
  yokaiTrend: YokaiTrendPoint[];
  towerDamageTotals: Record<TowerType, number>;
  totalDamageDealt: number;
}

export function BattleChartWidget({
  wave,
  yokaiTrend,
  towerDamageTotals,
  totalDamageDealt,
}: BattleChartWidgetProps) {
  const [minimized, setMinimized] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const damageData = [
    { name: '脈衝塔', value: towerDamageTotals.pulse, color: '#f59e0b' },
    { name: '冰凍塔', value: towerDamageTotals.frost, color: '#38bdf8' },
    { name: '重砲塔', value: towerDamageTotals.cannon, color: '#ef4444' },
  ];

  const latest = yokaiTrend[yokaiTrend.length - 1];

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-[calc(10px+env(safe-area-inset-bottom))] left-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a]/94 border border-slate-400/25 text-xs font-bold text-slate-200 hover:text-white shadow-lg cursor-pointer"
      >
        <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
        <span>戰況圖表</span>
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      </button>
    );
  }

  return (
    <section
      aria-label="戰況實時圖表"
      className="fixed bottom-[calc(10px+env(safe-area-inset-bottom))] left-3 z-20 flex flex-col w-[276px] max-w-[calc(100vw-24px)] rounded-2xl bg-[#0f172a]/95 border border-slate-400/25 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart3 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-xs font-bold text-slate-100 truncate">
            即時戰況監測
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          aria-label="收起戰況圖表"
          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. LineChart: Current Wave Yokai Count Trend */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-300 font-semibold">
            {wave > 0 ? `第 ${wave} 波妖怪趨勢` : '本波妖怪趨勢'}
          </span>
          <span className="font-num text-emerald-400 font-bold">
            場上 {latest?.active ?? 0} · 剩餘 {latest?.remaining ?? 0}
          </span>
        </div>
        <div className="w-full h-[88px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={yokaiTrend}
              margin={{ top: 4, right: 6, left: -24, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis
                dataKey="tick"
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: 'rgba(148,163,184,0.3)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#f8fafc',
                }}
              />
              <Line
                type="monotone"
                dataKey="remaining"
                name="波次剩餘"
                stroke="#38bdf8"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="active"
                name="場上妖怪"
                stroke="#4ade80"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. BarChart: Total Damage Output by Tower Type */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-300 font-semibold">防禦塔總傷害輸出</span>
          <span className="font-num text-amber-400 font-bold">
            {totalDamageDealt.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-[88px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={damageData}
              margin={{ top: 4, right: 6, left: -18, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#cbd5e1', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: 'rgba(148,163,184,0.3)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#f8fafc',
                }}
              />
              <Bar
                dataKey="value"
                name="總傷害"
                radius={[5, 5, 0, 0]}
                isAnimationActive={false}
              >
                {damageData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
