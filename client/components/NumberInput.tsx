import { ButtonGroup, ButtonGroupText } from "./ui/button-group";
import { InputGroupInput } from "./ui/input-group";
import { Label } from "./ui/label";

export function NumberInput({
  min,
  step,
  max,
  placeholder,
  id,
  value,
  onChange,
  className = "",
  inputClassName = "",
  disabled = false,
}: {
  min: number;
  step: number;
  max?: number;
  placeholder?: string;
  id: string;
  value: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <ButtonGroup className={className}>
      <ButtonGroupText
        className={`bg-input/50 ${disabled && "opacity-50"}`}
        asChild
        onClick={() => !disabled && onChange(Math.max(min, value - step))}
      >
        <Label htmlFor={id}>-</Label>
      </ButtonGroupText>
      <InputGroupInput
        id={id}
        type="number"
        placeholder={placeholder}
        min={min}
        step={step}
        max={max}
        value={value}
        className={`bg-surface/70 flex h-7 w-16 border-y border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${disabled && "select-none"} ${inputClassName}`}
        disabled={disabled}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
      <ButtonGroupText
        className={`bg-input/50 ${disabled && "opacity-50"}`}
        asChild
        onClick={() => !disabled && onChange(value + step)}
      >
        <Label htmlFor={id}>+</Label>
      </ButtonGroupText>
    </ButtonGroup>
  );
}
