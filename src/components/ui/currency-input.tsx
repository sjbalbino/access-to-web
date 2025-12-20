import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  decimals?: number;
  prefix?: string;
}

const formatBrazilianNumber = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const parseBrazilianNumber = (value: string): number | null => {
  if (!value || value.trim() === "") return null;
  // Remove thousand separators (.) and replace decimal comma with point
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, decimals = 2, prefix = "R$", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => formatBrazilianNumber(value, decimals));

    React.useEffect(() => {
      setDisplayValue(formatBrazilianNumber(value, decimals));
    }, [value, decimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      // Allow only digits, comma, and dot
      const sanitized = rawValue.replace(/[^\d.,]/g, "");
      setDisplayValue(sanitized);
    };

    const handleBlur = () => {
      const parsed = parseBrazilianNumber(displayValue);
      onChange(parsed);
      setDisplayValue(formatBrazilianNumber(parsed, decimals));
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-right",
            prefix && "pl-10",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput, formatBrazilianNumber, parseBrazilianNumber };
