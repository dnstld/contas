import { Platform } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ value, onValueChange, label, disabled }: ToggleProps) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents>
        <SwiftUI.Toggle
          isOn={value}
          label={label ?? ''}
          onIsOnChange={onValueChange}
        />
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents>
        <Compose.Switch
          value={value}
          enabled={!disabled}
          onCheckedChange={onValueChange}
        />
      </Compose.Host>
    );
  }

  return null;
}
