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
  const text = SwiftUI.useNativeState(defaultValue);

  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents={{ vertical: true }} style={styles.full}>
        {secure ? (
          <SwiftUI.SecureField
            placeholder={placeholder ?? ''}
            text={text}
            onTextChange={onValueChange}
          />
        ) : (
          <SwiftUI.TextField
            placeholder={placeholder ?? ''}
            text={text}
            autoFocus={autoFocus}
            onTextChange={onValueChange}
          />
        )}
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents={{ vertical: true }} style={styles.full}>
        <Compose.TextField
          value={text}
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
