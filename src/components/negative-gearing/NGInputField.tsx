import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface InputFieldProps {
  label: string;
  id: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

function formatNumberWithCommas(value: number): string {
  return new Intl.NumberFormat('en-AU').format(value);
}

function parseFormattedNumber(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

export function NGInputField({
  label, id, value, onChange, prefix, suffix, helperText,
  min = 0, max, step = 1, disabled = false,
}: InputFieldProps) {
  const [displayValue, setDisplayValue] = useState(formatNumberWithCommas(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setDisplayValue(formatNumberWithCommas(value));
  }, [value, isFocused]);

  const handleFocus = () => { setIsFocused(true); setDisplayValue(value.toString()); };
  const handleBlur = () => { setIsFocused(false); setDisplayValue(formatNumberWithCommas(parseFormattedNumber(displayValue))); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setDisplayValue(rawValue);
    if (rawValue !== '' && rawValue !== '.' && rawValue !== '-') {
      const numericValue = parseFormattedNumber(rawValue);
      if (!isNaN(numericValue)) onChange(numericValue);
    } else if (rawValue === '') onChange(0);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input
          id={id}
          type={isFocused ? "number" : "text"}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`h-11 rounded-lg ${prefix ? "pl-8" : "pl-4"} ${suffix ? "pr-12" : "pr-4"}`}
          min={min} max={max} step={step} disabled={disabled}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
