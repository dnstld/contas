import type { SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import { disabled as disabledMod, fixedSize, font } from '@expo/ui/swift-ui/modifiers';
import { Button as SwiftUIButton } from '@expo/ui/swift-ui';

import { Icon } from '@/components/ui/atoms/icon';

/**
 * SF Symbol name. Derived from `expo-symbols` (which is already used by
 * `IconSymbol`) rather than a separate `sf-symbols-typescript` dep. We extract
 * the plain string side of `SymbolViewProps['name']` so it matches the
 * `SFSymbols7_0` union that `@expo/ui/swift-ui` Button's `systemImage` expects
 * — same trick used by `components/ui/icon-symbol.tsx`.
 */
type SFSymbol = Extract<SymbolViewProps['name'], string>;

export interface ActionMenuItem {
  label: string;
  action: () => void;
  destructive?: boolean;
  systemImage?: SFSymbol;
  dividerBefore?: boolean;
  disabled?: boolean;
  subtitle?: string;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible label for the menu trigger button. */
  accessibilityLabel?: string;
}

function groupBySections(items: ActionMenuItem[]): ActionMenuItem[][] {
  const sections: ActionMenuItem[][] = [];
  let current: ActionMenuItem[] = [];
  for (const item of items) {
    if (item.dividerBefore && current.length > 0) {
      sections.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length > 0) sections.push(current);
  return sections;
}

export function ActionMenu({ items, accessibilityLabel = 'Open menu' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'ios') {
    const sections = groupBySections(items);
    return (
      <SwiftUI.Host matchContents>
        <SwiftUI.Menu label="" systemImage="ellipsis.circle" modifiers={[fixedSize()]}>
          {sections.map((section, i) => (
            <SwiftUI.Section key={i}>
              {section.flatMap((item) => [
                <SwiftUIButton
                  key={item.label}
                  label={item.label}
                  systemImage={item.systemImage}
                  role={item.destructive ? 'destructive' : 'default'}
                  onPress={item.disabled ? undefined : item.action}
                  modifiers={item.disabled ? [disabledMod()] : undefined}
                />,
                ...(item.subtitle
                  ? [
                      <SwiftUI.Text key={`${item.label}-sub`} modifiers={[font({ size: 12 })]}>
                        {item.subtitle}
                      </SwiftUI.Text>,
                    ]
                  : []),
              ])}
            </SwiftUI.Section>
          ))}
        </SwiftUI.Menu>
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="ellipsis.circle" size={22} />
        </Pressable>
        <Compose.Host matchContents>
          <Compose.DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
            <Compose.DropdownMenu.Items>
              {items.flatMap((item, i) => {
                const menuItem = (
                  <Compose.DropdownMenuItem
                    key={item.label}
                    enabled={!item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        item.action();
                        setOpen(false);
                      }
                    }}
                  >
                    <Compose.DropdownMenuItem.Text>{item.label}</Compose.DropdownMenuItem.Text>
                  </Compose.DropdownMenuItem>
                );
                return item.dividerBefore && i > 0
                  ? [<Compose.HorizontalDivider key={`divider-${i}`} />, menuItem]
                  : [menuItem];
              })}
            </Compose.DropdownMenu.Items>
          </Compose.DropdownMenu>
        </Compose.Host>
      </View>
    );
  }

  return null;
}
