import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { toNepaliDigits } from '../data/nvcStructure';

export type CategoricalChartMode = 'donut' | 'pie' | 'bar' | 'line';
export type MonthlyChartMode = 'bar' | 'line' | 'area';

export interface ChartDatum {
  name: string;
  value: number;
}

export interface MonthlyChartDatum {
  month: string;
  darta: number;
  farchhaut: number;
}

const CHART_PALETTE = [
  '#1e3a8a', // Deep Sovereign Navy
  '#b91c1c', // Official Crimson
  '#0284c7', // Civic Cerulean
  '#0f766e', // Deep Teal
  '#d97706', // Amber Ochre
  '#475569', // Slate
  '#4f46e5', // Indigo
  '#15803d', // Forest Green
];

interface SwitchableCategoricalChartProps {
  title: string;
  subtitle: string;
  data: ChartDatum[];
  defaultMode?: CategoricalChartMode;
}

export const SwitchableCategoricalChart: React.FC<SwitchableCategoricalChartProps> = ({
  title,
  subtitle,
  data,
  defaultMode = 'donut',
}) => {
  const [mode, setMode] = useState<CategoricalChartMode>(defaultMode);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Interactive Chart Type Switcher */}
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md shrink-0">
          {(
            [
              { id: 'donut', label: 'डनट' },
              { id: 'pie', label: 'पाई' },
              { id: 'bar', label: 'बार' },
              { id: 'line', label: 'रेखा' },
            ] as { id: CategoricalChartMode; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === opt.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 || total === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          चार्टका लागि पर्याप्त तथ्याङ्क उपलब्ध छैन।
        </div>
      ) : (
        <div className="pt-3">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {mode === 'donut' || mode === 'pie' ? (
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={mode === 'donut' ? 52 : 0}
                    outerRadius={82}
                    paddingAngle={mode === 'donut' ? 2 : 0}
                  >
                    {data.map((entry, idx) => (
                      <Cell
                        key={`${entry.name}-${idx}`}
                        fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${toNepaliDigits(Number(val))} उजुरी`, 'संख्या']}
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#e2e8f0',
                    }}
                  />
                </PieChart>
              ) : mode === 'bar' ? (
                <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    interval={0}
                    angle={-16}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any) => [`${toNepaliDigits(Number(val))} उजुरी`, 'संख्या']}
                    contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry, idx) => (
                      <Cell
                        key={`${entry.name}-${idx}`}
                        fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    interval={0}
                    angle={-16}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any) => [`${toNepaliDigits(Number(val))} उजुरी`, 'संख्या']}
                    contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1e3a8a"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#b91c1c' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Clean unboxed legend breakdown */}
          <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 gap-1 max-h-28 overflow-y-auto pr-1">
            {data.slice(0, 5).map((item, idx) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs text-slate-600"
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-mono-num text-slate-900 shrink-0">
                    {toNepaliDigits(item.value)}{' '}
                    <span className="text-slate-400">({toNepaliDigits(pct)}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface SwitchableMonthlyChartProps {
  data: MonthlyChartDatum[];
  fiscalYearLabel: string;
}

export const SwitchableMonthlyChart: React.FC<SwitchableMonthlyChartProps> = ({
  data,
  fiscalYearLabel,
}) => {
  const [mode, setMode] = useState<MonthlyChartMode>('bar');

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            मासिक उजुरी दर्ता र फर्छ्यौटको तुलनात्मक विवरण ({fiscalYearLabel})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            बैशाखदेखि चैत्रसम्म महिनागत उजुरी दर्ता तथा फर्छ्यौट प्रगति
          </p>
        </div>

        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md shrink-0">
          {(
            [
              { id: 'bar', label: 'बार चार्ट' },
              { id: 'line', label: 'लाइन चार्ट' },
              { id: 'area', label: 'एरिया चार्ट' },
            ] as { id: MonthlyChartMode; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === opt.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#334155' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${toNepaliDigits(Number(val))} उजुरी`,
                  name === 'darta' ? 'दर्ता भएका' : 'फर्छ्यौट भएका',
                ]}
                contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
              />
              <Legend
                formatter={(val) => (val === 'darta' ? 'मासिक उजुरी दर्ता' : 'मासिक फर्छ्यौट')}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="darta" fill="#1e3a8a" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="farchhaut" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          ) : mode === 'line' ? (
            <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#334155' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${toNepaliDigits(Number(val))} उजुरी`,
                  name === 'darta' ? 'दर्ता भएका' : 'फर्छ्यौट भएका',
                ]}
                contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
              />
              <Legend
                formatter={(val) => (val === 'darta' ? 'मासिक उजुरी दर्ता' : 'मासिक फर्छ्यौट')}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="darta"
                stroke="#1e3a8a"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="farchhaut"
                stroke="#0f766e"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#334155' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${toNepaliDigits(Number(val))} उजुरी`,
                  name === 'darta' ? 'दर्ता भएका' : 'फर्छ्यौट भएका',
                ]}
                contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
              />
              <Legend
                formatter={(val) => (val === 'darta' ? 'मासिक उजुरी दर्ता' : 'मासिक फर्छ्यौट')}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="darta"
                stroke="#1e3a8a"
                fill="#dbeafe"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="farchhaut"
                stroke="#0f766e"
                fill="#ccfbf1"
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
