import { Host, Switch } from '@expo/ui';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ value, onValueChange, label, disabled }: ToggleProps) {
  return (
    <Host matchContents>
      <Switch value={value} label={label} onValueChange={onValueChange} disabled={disabled} />
    </Host>
  );
}
