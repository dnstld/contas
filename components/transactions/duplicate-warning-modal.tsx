import { Image } from 'expo-image';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { PriceText } from '@/components/ui/atoms/price-text';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { transactionDate, type Transaction } from '@/data/finance-types';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import type { WalletMember } from '@/hooks/use-wallet-members';

export interface DuplicateWarningModalProps {
  visible: boolean;
  transactions: Transaction[];
  members: WalletMember[];
  onConfirm: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function DuplicateWarningModal({
  visible,
  transactions,
  members,
  onConfirm,
  onCancel,
  isSaving = false,
}: DuplicateWarningModalProps) {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const borderColor = useThemeColor({}, 'border');

  const memberById = useMemo(() => {
    return new Map(members.map((m) => [m.userId, m]));
  }, [members]);

  const body =
    transactions.length === 1
      ? t('create.duplicateWarning.bodyOne')
      : t('create.duplicateWarning.bodyMany', { count: transactions.length });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.sheet, { backgroundColor, borderColor }]}>
          <View style={styles.header}>
            <Text variant="title" weight="bold">
              {t('create.duplicateWarning.title')}
            </Text>
            <Text variant="body" tone="textMuted">
              {body}
            </Text>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {transactions.map((tx) => (
              <DuplicateTransactionPreviewCard
                key={tx.id}
                transaction={tx}
                member={tx.createdByUserId ? (memberById.get(tx.createdByUserId) ?? null) : null}
              />
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <PressableButton
              label={t('create.duplicateWarning.saveAnyway')}
              variant="primary"
              size="large"
              loading={isSaving}
              onPress={onConfirm}
            />
            <PressableButton
              label={t('create.duplicateWarning.cancel')}
              variant="secondary"
              size="large"
              disabled={isSaving}
              onPress={onCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface DuplicateTransactionPreviewCardProps {
  transaction: Transaction;
  member: WalletMember | null;
}

function initials(name: string | null | undefined): string {
  const source = (name ?? '').trim();
  if (!source) return '?';
  return source
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function DuplicateTransactionPreviewCard({
  transaction,
  member,
}: DuplicateTransactionPreviewCardProps) {
  const { t } = useTranslation();
  const { currency } = useWallet();
  const { locale } = useFormatters();

  const isIncome = transaction.type === 'income';
  const signedAmount = isIncome ? transaction.amount : -transaction.amount;

  const creatorName = member?.displayName ?? t('wallet.partner.unnamed');
  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(transactionDate(transaction)),
    );
  }, [locale, transaction]);

  return (
    <Surface variant="muted" padding={14} radius={14} style={styles.card}>
      <View style={styles.cardHeader}>
        {member?.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            cachePolicy="memory-disk"
            style={styles.avatar}
          />
        ) : (
          <Surface
            variant="elevated"
            padding={0}
            radius={18}
            style={[styles.avatar, styles.avatarFallback]}
          >
            <Text variant="caption" weight="semibold">
              {initials(creatorName)}
            </Text>
          </Surface>
        )}
        <View style={styles.cardHeaderText}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {creatorName}
          </Text>
          <Text variant="caption" tone="textMuted" numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
        <PriceText
          value={signedAmount}
          currency={currency}
          locale={locale}
          tone={isIncome ? 'positive' : 'neutral'}
          size="md"
          showSign
        />
      </View>
      <View style={styles.cardBody}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {transaction.categoryName}
        </Text>
        {transaction.description ? (
          <Text variant="caption" tone="textMuted" numberOfLines={2}>
            {transaction.description}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '85%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    gap: 6,
    marginBottom: 16,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  card: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    gap: 2,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
});
