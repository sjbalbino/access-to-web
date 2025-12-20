import * as React from "react";
import { cn } from "@/lib/utils";

interface QuantityInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  decimals?: number;
}

const formatBrazilianQuantity = (value: number | null | undefined, decimals: number = 3): string => {
  if (value === null || value === undefined || isNaN(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const parseBrazilianQuantity = (value: string): number | null => {
  if (!value || value.trim() === "") return null;
  // Remove thousand separators (.) and replace decimal comma with point
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  ({ className, value, onChange, decimals = 3, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => formatBrazilianQuantity(value, decimals));

    React.useEffect(() => {
      setDisplayValue(formatBrazilianQuantity(value, decimals));
    }, [value, decimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      // Allow only digits, comma, and dot
      const sanitized = rawValue.replace(/[^\d.,]/g, "");
      setDisplayValue(sanitized);
    };

    const handleBlur = () => {
      const parsed = parseBrazilianQuantity(displayValue);
      onChange(parsed);
      setDisplayValue(formatBrazilianQuantity(parsed, decimals));
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-right",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
QuantityInput.displayName = "QuantityInput";

export { QuantityInput, formatBrazilianQuantity, parseBrazilianQuantity };
