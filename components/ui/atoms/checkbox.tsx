import { Platform } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import { toggleStyle } from '@expo/ui/swift-ui/modifiers';

export interface CheckboxProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({ value, onValueChange, label, disabled }: CheckboxProps) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents>
        <SwiftUI.Toggle
          isOn={value}
          label={label ?? ''}
          systemImage={value ? 'checkmark.circle.fill' : 'circle'}
          onIsOnChange={onValueChange}
          modifiers={[toggleStyle('button')]}
        />
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents>
        <Compose.Checkbox value={value} enabled={!disabled} onCheckedChange={onValueChange} />
      </Compose.Host>
    );
  }

  return null;
}
