import { Platform, StyleSheet } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import { frame } from '@expo/ui/swift-ui/modifiers';

export interface DatePickerProps {
  value: Date;
  onValueChange: (date: Date) => void;
  title?: string;
}

export function DatePicker({ value, onValueChange, title }: DatePickerProps) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents={{ vertical: true }} style={styles.host}>
        <SwiftUI.DatePicker
          title={title}
          selection={value}
          onDateChange={onValueChange}
          modifiers={[frame({ maxWidth: 9999, alignment: 'leading' })]}
        />
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents={{ vertical: true }} style={styles.full}>
        <Compose.DateTimePicker
          initialDate={value.toISOString()}
          onDateSelected={onValueChange}
          variant="input"
          showVariantToggle={false}
        />
      </Compose.Host>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  host: { alignSelf: 'stretch', minHeight: 36 },
});
