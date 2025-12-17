import { NumberInput } from "./NumberInput";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (e: number) => void;
  valueDisplay?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SliderInput({
  className = "",
  label,
  valueDisplay,
  min,
  max,
  step = 1,
  value,
  disabled = false,
  onChange,
}: SliderProps) {
  const handleSliderChange = (value: number) => {
    onChange(value);
  };

  const id = label.replaceAll(" ", "") + "Slider";
  return (
    <div className="w-full space-y-3">
      {(label || valueDisplay) && (
        <div className="flex items-center justify-between">
          {label && (
            <Label htmlFor={id} className={disabled ? "opacity-50" : ""}>
              {label}
            </Label>
          )}
          <NumberInput
            id={id}
            min={min}
            value={value}
            step={step}
            disabled={disabled}
            onChange={(e) => handleSliderChange(e)}
            className="mt-1 w-30"
          />
        </div>
      )}
      <Slider
        min={min}
        defaultValue={[value]}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={(e) => onChange(e[0] || 0)}
        className={`relative flex w-full touch-none items-center select-none ${className}`}
      />
    </div>
  );
}
SliderInput.displayName = "Slider";
