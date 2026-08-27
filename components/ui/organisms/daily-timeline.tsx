import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { TimelineItem } from '@/components/ui/molecules/timeline-item';
import { useFormatters } from '@/hooks/use-formatters';

/**
 * A floor, not a fixed width. 112pt fits every ordinary amount and gives the
 * footer room for a category name, but a card must still be able to grow: at a
 * fixed 112 an amount like `R$ 12.850,00` needs 90pt of an 88pt text box and
 * clips, and silently truncating the number is never acceptable.
 *
 * The cost is that the strip stays slightly ragged, so it cannot snap on a
 * single interval — a trade worth making for never losing a digit.
 */
/**
 * A floor only — cards are free to grow. A long amount or a long user-authored
 * category name widens its own card rather than being clipped or wrapped, which
 * keeps the strip ragged by design and every card the same height.
 */
const CARD_MIN_WIDTH = 112;
const CARD_SPACING = 10;

export interface DailyTimelinePoint {
  /** Day as ISO `YYYY-MM-DD`. */
  date: string;
  /** Total spend for the day. */
  value: number;
  /** Number of expense transactions that day. */
  count: number;
  /**
   * Transactions of any kind recorded that day, income included. Distinct from
   * `count`, which is expense-only: a payday has activity but no spending.
   */
  activityCount?: number;
  /** Whether this is today — emphasized in the strip. */
  current?: boolean;
  /**
   * The category the day's spending mostly went to, by amount. Shown in the
   * card footer in place of a bare transaction count: "Mercado" answers what
   * the money was, where "4 transações" answers nothing the reader can act on.
   */
  topCategoryName?: string;
  /** Expense transactions that day outside `topCategoryName`, for a "+N" suffix. */
  otherCount?: number;
}

export interface DailyTimelineProps {
  points: readonly DailyTimelinePoint[];
  currency?: string;
  /** When provided, a day with any activity opens that day's transactions. */
  onSelectDay?: (date: string) => void;
}

/**
 * Horizontal per-day spend strip for the selected month. Points are expected
 * pre-ordered newest-day-first, one card per calendar day.
 *
 * Amounts are always rendered in the neutral tone. An earlier revision tinted a
 * day red once it passed 1.5x the month's average, which read as an error
 * rather than as information — there is nothing on the card to explain why that
 * number is red, and "above average" is not a problem the user needs alerting
 * to. Spend is reported, not judged.
 */
export function DailyTimeline({ points, currency = 'USD', onSelectDay }: DailyTimelineProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {points.map((p) => {
        const d = new Date(`${p.date}T00:00:00`);
        // Never a transaction count. `count` is expense-only, so a day whose
        // only entry was a salary would announce "0 transactions" — false from
        // the reader's point of view. The card reports spending, so when there
        // is none it says exactly that.
        const footerText =
          p.count === 0
            ? // Same phrase on every empty day, today included: each card is
              // already named by its own date label, and today's is emphasised
              // by its elevated surface, so naming the day again in the footer
              // adds nothing. One line, one string.
              t('overview.daily.noSpending')
            : p.topCategoryName
              ? p.otherCount && p.otherCount > 0
                ? `${p.topCategoryName} +${p.otherCount}`
                : p.topCategoryName
              : t('transactions.countShort', { count: p.count });

        // Openable whenever anything was recorded, including an income-only
        // day — otherwise the one card that needs explaining is the one that
        // cannot be opened.
        const hasActivity = (p.activityCount ?? p.count) > 0;

        return (
          <TimelineItem
            key={p.date}
            label={`${formatDate(d, { weekday: 'short' })} ${d.getDate()}`}
            value={p.value}
            currency={currency}
            current={p.current}
            minWidth={CARD_MIN_WIDTH}
            onPress={onSelectDay && hasActivity ? () => onSelectDay(p.date) : undefined}
            accessibilityHint={t('accessibility.hints.viewDayTransactions')}
            footerLabel={footerText}
            footer={
              <Text
                variant="caption"
                tone={p.current ? 'tint' : 'textMuted'}
                weight="medium"
                // A safety cap only: with no width ceiling on the card the text
                // widens it rather than wrapping, so this never fires in
                // practice — it just stops a pathological name running away if
                // a width constraint is ever reintroduced.
                numberOfLines={2}
              >
                {footerText}
              </Text>
            }
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: CARD_SPACING,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
