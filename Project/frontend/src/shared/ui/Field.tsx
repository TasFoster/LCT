import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  warning?: string | null;
  wide?: boolean;
  htmlFor?: string;
  children: ReactNode;
  onFocusCapture?: () => void;
}

/** Подпись, подсказка и сообщения вокруг любого контрола. */
export function Field({ label, required, hint, error, warning, wide, htmlFor, children, onFocusCapture }: FieldShellProps) {
  return (
    <div className={`field${wide ? ' field--wide' : ''}`} onFocusCapture={onFocusCapture}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="field__req" aria-label="обязательное поле">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : warning ? (
        <span className="field__warn">{warning}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

type FieldCommon = Omit<FieldShellProps, 'children' | 'htmlFor'>;

interface TextFieldProps extends FieldCommon {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  autoComplete?: string;
  unit?: string;
  id?: string;
  onBlur?: () => void;
}

export function TextField({ value, onChange, placeholder, type = 'text', autoComplete, unit, id, onBlur, ...shell }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field {...shell} htmlFor={inputId}>
      <div className={`control${shell.error ? ' control--error' : shell.warning ? ' control--warn' : ''}`}>
        <input
          id={inputId}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={shell.error ? true : undefined}
        />
        {unit && <span className="control__unit">{unit}</span>}
      </div>
    </Field>
  );
}

interface NumberFieldProps extends FieldCommon {
  value: number | null;
  onChange: (value: number | null) => void;
  unit: string;
  placeholder?: string;
  min?: number;
  step?: number;
  id?: string;
  onBlur?: () => void;
}

/**
 * Числовое поле с единицей измерения внутри контрола.
 * Ввод свободный, при потере фокуса число показывается с пробелами-разрядами.
 */
export function NumberField({ value, onChange, unit, placeholder = 'не заполнено', min, step, id, onBlur, ...shell }: NumberFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const display = focused
    ? draft
    : value === null
      ? ''
      : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);

  return (
    <Field {...shell} htmlFor={inputId}>
      <div className={`control${shell.error ? ' control--error' : shell.warning ? ' control--warn' : ''}`}>
        <input
          id={inputId}
          inputMode="decimal"
          value={display}
          placeholder={placeholder}
          min={min}
          step={step}
          aria-invalid={shell.error ? true : undefined}
          onFocus={() => {
            setFocused(true);
            setDraft(value === null ? '' : String(value).replace('.', ','));
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const normalized = raw.replace(/\s/g, '').replace(',', '.');
            if (normalized === '') onChange(null);
            else if (!Number.isNaN(Number(normalized))) onChange(Number(normalized));
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
        />
        <span className="control__unit">{unit}</span>
      </div>
    </Field>
  );
}

interface SelectFieldProps extends FieldCommon {
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  id?: string;
  selectProps?: SelectHTMLAttributes<HTMLSelectElement>;
}

export function SelectField({ value, onChange, options, placeholder, id, selectProps, ...shell }: SelectFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field {...shell} htmlFor={inputId}>
      <div className={`control${shell.error ? ' control--error' : ''}`}>
        <select id={inputId} value={value} onChange={(e) => onChange(e.target.value)} {...selectProps}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </select>
      </div>
    </Field>
  );
}

type TagOption = string | { value: string; label: string };

interface TagsFieldProps extends FieldCommon {
  value: string[];
  onChange: (value: string[]) => void;
  /**
   * Варианты. Строки — значение совпадает с подписью. Объекты {value, label} —
   * режим справочника: храним id, а вписанное вручную — как «custom:текст».
   */
  suggestions?: readonly TagOption[];
  placeholder?: string;
  id?: string;
}

const CUSTOM = 'custom:';

/** Список значений: выбор из справочника плюс «своё» по Enter. */
export function TagsField({ value, onChange, suggestions = [], placeholder = 'Добавить…', id, ...shell }: TagsFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [draft, setDraft] = useState('');
  const options = suggestions.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const dictMode = suggestions.some((o) => typeof o !== 'string');

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? (v.startsWith(CUSTOM) ? v.slice(CUSTOM.length) : v);
  const toValue = (text: string) => {
    const found = options.find((o) => o.label.toLowerCase() === text.toLowerCase());
    if (found) return found.value;
    return dictMode ? `${CUSTOM}${text}` : text;
  };

  const add = (raw: string) => {
    const text = raw.trim();
    if (text) {
      const v = toValue(text);
      if (!value.includes(v)) onChange([...value, v]);
    }
    setDraft('');
  };

  return (
    <Field {...shell} htmlFor={inputId}>
      <div className={`tags${shell.error ? ' control--error' : ''}`}>
        {value.map((v) => (
          <span className="tag" key={v} title={v.startsWith(CUSTOM) ? 'Своё значение, не из справочника' : undefined}>
            {labelOf(v)}
            {v.startsWith(CUSTOM) && <span className="faint"> · своё</span>}
            <button type="button" aria-label={`Убрать «${labelOf(v)}»`} onClick={() => onChange(value.filter((t) => t !== v))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="tags__add"
          list={listId}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            if (options.some((o) => o.label === next)) add(next);
            else setDraft(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
            if (e.key === 'Backspace' && draft === '' && value.length) onChange(value.slice(0, -1));
          }}
        />
        <datalist id={listId}>
          {options
            .filter((o) => !value.includes(o.value))
            .map((o) => (
              <option key={o.value} value={o.label} />
            ))}
        </datalist>
      </div>
    </Field>
  );
}

interface ComboFieldProps extends FieldCommon {
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly string[];
  placeholder?: string;
  id?: string;
}

/** Текстовое поле с подсказками: можно выбрать из списка или вписать своё. */
export function ComboField({ value, onChange, suggestions, placeholder, id, ...shell }: ComboFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field {...shell} htmlFor={inputId}>
      <div className={`control${shell.error ? ' control--error' : ''}`}>
        <input id={inputId} list={`${inputId}-list`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={shell.error ? true : undefined} />
        <datalist id={`${inputId}-list`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
    </Field>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  id?: string;
}

export function Checkbox({ checked, onChange, children, id }: CheckboxProps) {
  const autoId = useId();
  return (
    <label className="check" htmlFor={id ?? autoId}>
      <input id={id ?? autoId} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}
