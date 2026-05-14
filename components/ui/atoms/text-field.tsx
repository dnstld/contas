import { Platform, StyleSheet } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';

export interface TextFieldProps {
  defaultValue?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  secure?: boolean;
  autoFocus?: boolean;
}

export function TextField({
  defaultValue = '',
  placeholder,
  onValueChange,
  secure = false,
  autoFocus,
}: TextFieldProps) {
  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents={{ vertical: true }} style={styles.full}>
        {secure ? (
          <SwiftUI.SecureField
            placeholder={placeholder ?? ''}
            defaultValue={defaultValue}
            onValueChange={onValueChange}
          />
        ) : (
          <SwiftUI.TextField
            placeholder={placeholder ?? ''}
            defaultValue={defaultValue}
            autoFocus={autoFocus}
            onValueChange={onValueChange}
          />
        )}
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents={{ vertical: true }} style={styles.full}>
        <Compose.TextField
          defaultValue={defaultValue}
          singleLine
          onValueChange={onValueChange}
          keyboardOptions={secure ? { keyboardType: 'password' } : undefined}
        >
          {placeholder ? (
            <Compose.TextField.Placeholder>{placeholder}</Compose.TextField.Placeholder>
          ) : null}
        </Compose.TextField>
      </Compose.Host>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
});
