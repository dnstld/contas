import { Platform, StyleSheet } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents={{ vertical: true }} style={styles.full}>
        <SwiftUI.Picker
          selection={value}
          onSelectionChange={(next: T) => onChange(next)}
          modifiers={[pickerStyle('segmented')]}
        >
          {options.map((opt) => (
            <SwiftUI.Text key={opt.value} modifiers={[tag(opt.value)]}>
              {opt.label}
            </SwiftUI.Text>
          ))}
        </SwiftUI.Picker>
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents={{ vertical: true }} style={styles.full}>
        <Compose.SingleChoiceSegmentedButtonRow>
          {options.map((opt) => (
            <Compose.SegmentedButton
              key={opt.value}
              selected={opt.value === value}
              onClick={() => onChange(opt.value)}
            >
              <Compose.SegmentedButton.Label>{opt.label}</Compose.SegmentedButton.Label>
            </Compose.SegmentedButton>
          ))}
        </Compose.SingleChoiceSegmentedButtonRow>
      </Compose.Host>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
});
