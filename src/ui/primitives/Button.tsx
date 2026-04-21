import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
