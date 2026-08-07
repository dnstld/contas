import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { useArchiveCategoryItem } from '@/hooks/use-category-item-mutations';
import { useArchiveCategory } from '@/hooks/use-finance-mutations';
import { subscribeSnackbar, type SnackbarOptions } from '@/utils/snackbar';
import { toast } from '@/utils/toast';

const VISIBLE_MS = 4000;
const FADE_MS = 180;

/**
 * Single, app-root host for {@link snackbar}. Renders the current message with
 * an optional Undo button, fades in/out, and auto-dismisses. Mounted under the
 * wallet + query providers so its archive mutations have the wallet context and
 * outlive the (modal) screen that fired the message.
 */
export function SnackbarHost() {
  const { t } = useTranslation();
  const [options, setOptions] = useState<SnackbarOptions | null>(null);
  // Lazy state (not a ref) keeps a stable Animated.Value without reading a ref
  // during render.
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate: archiveCategory } = useArchiveCategory();
  const { mutate: archiveCategoryItem } = useArchiveCategoryItem();

  useEffect(() => {
    return subscribeSnackbar((next) => setOptions(next));
  }, []);

  const dismiss = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(() => setOptions(null));
  };

  useEffect(() => {
    if (!options) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
    hideTimer.current = setTimeout(dismiss, VISIBLE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  if (!options) return null;

  const handleUndo = () => {
    const undo = options.undo;
    if (!undo) return dismiss();
    if (undo.kind === 'category') {
      archiveCategory(
        { id: undo.id, archived: false },
        { onSuccess: () => toast.success(t('feedback.categoryUnarchived')) },
      );
    } else {
      archiveCategoryItem(
        { id: undo.id, archived: false },
        { onSuccess: () => toast.success(t('feedback.categoryItemUnarchived')) },
      );
    }
    dismiss();
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View style={{ opacity }}>
        <Surface variant="elevated" bordered padding={14} style={styles.card}>
          <Text variant="body" numberOfLines={2} style={styles.message}>
            {options.message}
          </Text>
          {options.undo ? (
            <Pressable
              onPress={handleUndo}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.undo')}
            >
              {({ pressed }) => (
                <Text
                  variant="body"
                  weight="semibold"
                  tone="tint"
                  style={{ opacity: pressed ? 0.6 : 1 }}
                >
                  {t('common.undo')}
                </Text>
              )}
            </Pressable>
          ) : null}
        </Surface>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  message: {
    flex: 1,
  },
});
