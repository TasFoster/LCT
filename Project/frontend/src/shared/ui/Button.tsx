import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

function classes(variant: Variant, size: Size, block?: boolean, extra?: string) {
  return [
    'btn',
    variant !== 'secondary' && `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', block, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={classes(variant, size, block, className)} {...rest} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  disabled?: boolean;
}

/** Ссылка, которая выглядит как кнопка: навигация остаётся навигацией. */
export function ButtonLink({ variant = 'secondary', size = 'md', block, disabled, className, ...rest }: ButtonLinkProps) {
  return (
    <Link
      className={classes(variant, size, block, className)}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      {...rest}
    />
  );
}
