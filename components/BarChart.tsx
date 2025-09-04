import React from 'react';

interface BarChartData {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-slate-400">Sem dados para exibir.</div>;
  }
  const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero

  return (
    <div className="w-full p-4 bg-slate-700/50 rounded-lg">
      <h4 className="text-center font-bold text-slate-200 mb-4">{title}</h4>
      <div className="space-y-2">
        {data.map(({ label, value, color }) => (
          <div key={label} className="grid grid-cols-4 items-center gap-2 text-sm">
            <span className="col-span-1 text-slate-300 truncate text-right">{label}</span>
            <div className="col-span-3 flex items-center gap-2">
              <div className="w-full bg-slate-600 rounded-full h-5">
                <div
                  className="h-5 rounded-full text-xs font-medium text-white text-center flex items-center justify-center leading-5 transition-all duration-500"
                  style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }}
                >
                </div>
              </div>
              <span className="font-bold text-slate-100 w-8 text-left">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
