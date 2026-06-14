import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "green" | "ghost" | "cancel" | "primary" | "icon";

const CLASS: Record<Variant, string> = {
  green: "btn-green",
  ghost: "btn-ghost",
  cancel: "btn-cancel",
  primary: "btn-primary",
  icon: "icon-btn",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children?: ReactNode;
}

/** イベントは onClick プロパティで束縛（インライン onclick 文字列を排除）。 */
export function Button({ variant = "ghost", className, children, ...rest }: ButtonProps) {
  return (
    <button className={[CLASS[variant], className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}
