import { Platform, StyleSheet } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Slider({ value, onValueChange, min = 0, max = 1, step }: SliderProps) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents={{ vertical: true }} style={styles.full}>
        <SwiftUI.Slider
          value={value}
          min={min}
          max={max}
          step={step}
          onValueChange={onValueChange}
        />
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents={{ vertical: true }} style={styles.full}>
        <Compose.Slider
          value={value}
          min={min}
          max={max}
          steps={step ? Math.floor((max - min) / step) - 1 : undefined}
          onValueChange={onValueChange}
        />
      </Compose.Host>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
});
