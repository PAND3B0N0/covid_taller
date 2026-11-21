import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  fieldKey: string;
  secondaryText?: string;
  tone?: 'default' | 'positive' | 'caution' | 'danger';
}

const VALUE_TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-slate-900',
  positive: 'text-emerald-700',
  caution: 'text-amber-700',
  danger: 'text-red-700',
};

/**
 * Ampliación #5: Tarjeta de datos reutilizable para separar la interfaz en componentes pequeños.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  fieldKey,
  secondaryText,
  tone = 'default',
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <code className="font-mono text-xs text-slate-400 shrink-0">
          {fieldKey}
        </code>
      </div>

      <div
        className={`font-mono text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums ${VALUE_TONE_CLASSES[tone]}`}
      >
        {value}
      </div>

      {secondaryText ? (
        <p className="text-xs text-slate-500 leading-relaxed">{secondaryText}</p>
      ) : null}
    </div>
  );
};
