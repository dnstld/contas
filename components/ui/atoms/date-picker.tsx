import { Platform, StyleSheet } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';

export interface DatePickerProps {
  value: Date;
  onValueChange: (date: Date) => void;
  title?: string;
}

export function DatePicker({ value, onValueChange, title }: DatePickerProps) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents>
        <SwiftUI.DatePicker
          title={title}
          selection={value}
          onDateChange={onValueChange}
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
});
