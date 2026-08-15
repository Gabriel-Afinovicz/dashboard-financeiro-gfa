import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { maskCurrency, maskPercent } from '../../lib/format';

export const inputClass =
  'w-full rounded-xl border border-line bg-card2 px-3 py-2.5 text-sm text-fg placeholder:text-faint transition-colors focus:border-accent focus:outline-none disabled:opacity-50';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-faint hover:text-fg active:scale-[0.98]';

export const btnIcon =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-card2 hover:text-fg active:scale-95';

/** Campo com rótulo, dica e mensagem de erro. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-xs font-medium text-muted">
        {label}
        {required && <span className="ml-0.5 text-neg">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-neg">{error}</span>
      ) : hint ? (
        <span className="text-xs text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={`${inputClass} ${invalid ? 'border-neg' : ''} ${className ?? ''}`}
    />
  );
}

/** Entrada monetária com prefixo R$ e máscara automática (centavos). */
export function MoneyInput({
  value,
  onChange,
  invalid,
  ...rest
}: {
  value: string;
  onChange: (masked: string) => void;
  invalid?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-faint">R$</span>
      <input
        {...rest}
        inputMode="numeric"
        placeholder="0,00"
        value={value}
        onChange={(e) => onChange(maskCurrency(e.target.value))}
        className={`${inputClass} pl-9 tabular-nums ${invalid ? 'border-neg' : ''}`}
      />
    </div>
  );
}

/** Entrada de percentual com sufixo % e máscara (até 2 casas decimais). */
export function PercentInput({
  value,
  onChange,
  invalid,
  ...rest
}: {
  value: string;
  onChange: (masked: string) => void;
  invalid?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <input
        {...rest}
        inputMode="decimal"
        placeholder="12,5"
        value={value}
        onChange={(e) => onChange(maskPercent(e.target.value))}
        className={`${inputClass} pr-9 tabular-nums ${invalid ? 'border-neg' : ''}`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-faint">%</span>
    </div>
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  const { invalid, className, children, ...rest } = props;
  return (
    <div className="relative">
      <select
        {...rest}
        className={`${inputClass} appearance-none pr-9 ${invalid ? 'border-neg' : ''} ${className ?? ''}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-faint" />
    </div>
  );
}

/** Grupo segmentado (abas pequenas / opções exclusivas). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-card2 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg font-medium transition-colors ${
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
            } ${active ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-fg'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Interruptor liga/desliga. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-card2 border border-line'}`}
    >
      <span
        className={`absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full shadow transition-all ${
          checked ? 'left-[calc(100%-1.35rem)] bg-accent-contrast' : 'left-1 bg-faint'
        }`}
      />
    </button>
  );
}

/** Cartão base do dashboard. */
export function Card({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`anim-fade-up rounded-2xl border border-line bg-card p-4 transition-colors duration-300 hover:border-faint/60 sm:p-5 ${className ?? ''}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </section>
  );
}

/** Título de seção dentro de um cartão. */
export function CardTitle({ icon, title, subtitle, right }: { icon?: ReactNode; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card2 text-muted">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-faint">{subtitle}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}
