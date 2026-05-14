import { Platform, StyleSheet, View } from 'react-native';

import * as SwiftUI from '@expo/ui/swift-ui';

import { Button } from '@/components/ui/atoms/button';
import { Text } from '@/components/ui/atoms/text';

export interface StepperProps {
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
}

export function Stepper({
  value,
  onValueChange,
  label = '',
  step = 1,
  min,
  max,
}: StepperProps) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents>
        <SwiftUI.Stepper
          label={label}
          value={value}
          step={step}
          min={min}
          max={max}
          onValueChange={onValueChange}
        />
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    const decrement = () => {
      const next = value - step;
      if (min === undefined || next >= min) onValueChange(next);
    };
    const increment = () => {
      const next = value + step;
      if (max === undefined || next <= max) onValueChange(next);
    };
    return (
      <View style={styles.row}>
        {label ? (
          <Text variant="body" weight="medium" style={styles.label}>
            {label}
          </Text>
        ) : null}
        <Button label="−" variant="secondary" size="small" onPress={decrement} />
        <Text variant="body" weight="semibold" style={styles.value}>
          {value}
        </Text>
        <Button label="+" variant="secondary" size="small" onPress={increment} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: { flex: 1 },
  value: { minWidth: 32, textAlign: 'center' },
});
