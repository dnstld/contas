import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import { fixedSize, tag } from '@expo/ui/swift-ui/modifiers';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

export interface SortMenuProps<T extends string> {
  label?: string;
  options: readonly SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SortMenu<T extends string>({ label, options, value, onChange }: SortMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const current = options.find((o) => o.value === value)?.label ?? value;
  const displayLabel = label ? `${label}: ${current}` : current;

  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents>
        <SwiftUI.Menu
          label={displayLabel}
          systemImage="line.3.horizontal.decrease.circle"
          modifiers={[fixedSize()]}
        >
          <SwiftUI.Picker selection={value} onSelectionChange={(next: T) => onChange(next)}>
            {options.map((opt) => (
              <SwiftUI.Text key={opt.value} modifiers={[tag(opt.value)]}>
                {opt.label}
              </SwiftUI.Text>
            ))}
          </SwiftUI.Picker>
        </SwiftUI.Menu>
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View style={styles.androidContainer}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          style={[styles.trigger, { backgroundColor: surface, borderColor: border }]}
        >
          <Icon name="line.3.horizontal.decrease.circle" size={16} />
          <Text variant="body" weight="medium">
            {displayLabel}
          </Text>
          <Icon name="chevron.down" size={14} />
        </Pressable>
        <Compose.Host matchContents>
          <Compose.DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
            <Compose.DropdownMenu.Items>
              {options.map((opt) => (
                <Compose.DropdownMenuItem
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Compose.DropdownMenuItem.Text>{opt.label}</Compose.DropdownMenuItem.Text>
                </Compose.DropdownMenuItem>
              ))}
            </Compose.DropdownMenu.Items>
          </Compose.DropdownMenu>
        </Compose.Host>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  androidContainer: {
    alignSelf: 'flex-start',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
});
