import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  BudgetMeter,
  Button,
  CategoryCard,
  CategoryGrid,
  Checkbox,
  Chip,
  ChipGroup,
  DatePicker,
  Divider,
  EmptyState,
  Icon,
  MetricCard,
  MetricRow,
  MonthlyTimeline,
  Overview,
  PriceText,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  Slider,
  SortMenu,
  Stepper,
  Surface,
  Text,
  TextField,
  TimeFilterBar,
  TimelineItem,
  Toggle,
  TrendIndicator,
} from '@/components/ui';
import { type CategoryCardData } from '@/components/ui/organisms/category-card';
import { type CategoryFilterItem } from '@/components/ui/organisms/category-filter';
import { type MonthlyTimelinePoint } from '@/components/ui/organisms/monthly-timeline';
import { useThemeColor } from '@/hooks/use-theme-color';

const MOCK_CATEGORIES: CategoryCardData[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'fork.knife',
    total: 426.18,
    percentage: 0.34,
    budget: 500,
    delta: -42.5,
    deltaPercentage: -0.09,
    revenue: 0,
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'car.fill',
    total: 312.4,
    percentage: 0.25,
    budget: 250,
    delta: 78.2,
    deltaPercentage: 0.33,
    revenue: 0,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'cart.fill',
    total: 184.99,
    percentage: 0.15,
    delta: 12.0,
    deltaPercentage: 0.07,
    revenue: 0,
  },
  {
    id: 'salary',
    name: 'Salary',
    icon: 'dollarsign.circle.fill',
    total: 0,
    percentage: 0,
    revenue: 4200,
    delta: 0,
  },
];

const MOCK_TIMELINE: MonthlyTimelinePoint[] = [
  { month: 'jan', value: 1180, delta: 60 },
  { month: 'feb', value: 980, delta: -200 },
  { month: 'mar', value: 1240, delta: 260 },
  { month: 'apr', value: 1320, delta: 80 },
  { month: 'may', value: 1240, delta: -80 },
  { month: 'jun', value: 1450, delta: 210 },
];

const FILTER_ITEMS: CategoryFilterItem[] = MOCK_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.name,
}));

const SAMPLE_SORT_OPTIONS = [
  { value: 'asc' as const, label: 'Ascending' },
  { value: 'desc' as const, label: 'Descending' },
  { value: 'alpha' as const, label: 'A → Z' },
];

const LENS_OPTIONS = [
  { value: 'expenses' as const, label: 'Expenses' },
  { value: 'revenue' as const, label: 'Revenue' },
  { value: 'net' as const, label: 'Net' },
];

export default function UiDemoScreen() {
  const background = useThemeColor({}, 'background');
  const [toggle, setToggle] = useState(false);
  const [check, setCheck] = useState(true);
  const [slider, setSlider] = useState(0.4);
  const [text, setText] = useState('');
  const [step, setStep] = useState(2);
  const [date, setDate] = useState(new Date());
  const [seg, setSeg] = useState<'expenses' | 'revenue' | 'net'>('expenses');
  const [sort, setSort] = useState<'asc' | 'desc' | 'alpha'>('asc');
  const [chipPicked, setChipPicked] = useState<readonly string[]>(['1y']);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webShell, { backgroundColor: background }]}>
        <EmptyState
          icon="chart.bar.fill"
          title="Open on iOS or Android"
          body="Expo UI primitives render via SwiftUI on iOS and Jetpack Compose on Android. The web demo is intentionally not supported."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Text variant="display" weight="bold">Design System</Text>
        <Text variant="body" tone="textMuted">
          {Platform.OS === 'ios'
            ? 'Rendered with SwiftUI on iOS.'
            : 'Rendered with Jetpack Compose on Android.'}
        </Text>
      </View>

      {/* ================ ATOMS ================ */}
      <SectionHeader title="Atoms" subtitle="Pure primitives" />

      <DemoBlock title="Text">
        <Text variant="display">Display 34</Text>
        <Text variant="title">Title 24</Text>
        <Text variant="subtitle">Subtitle 18</Text>
        <Text variant="body">Body 15 — quick brown fox</Text>
        <Text variant="caption" tone="textMuted">Caption 12 — muted</Text>
        <Text variant="mono">Mono 14 — 1.2345</Text>
      </DemoBlock>

      <DemoBlock title="Icon">
        <View style={styles.row}>
          <Icon name="house.fill" />
          <Icon name="chart.bar.fill" />
          <Icon name="chart.line.uptrend.xyaxis" />
          <Icon name="dollarsign.circle.fill" />
          <Icon name="creditcard.fill" />
          <Icon name="arrow.up.right" />
          <Icon name="arrow.down.right" />
          <Icon name="checkmark" />
        </View>
      </DemoBlock>

      <DemoBlock title="Chip">
        <View style={styles.row}>
          <Chip label="Primary" variant="primary" selected onPress={() => {}} />
          <Chip label="Secondary" variant="secondary" selected onPress={() => {}} />
          <Chip label="Tertiary" variant="tertiary" selected onPress={() => {}} />
          <Chip label="Default" variant="default" onPress={() => {}} />
        </View>
        <View style={styles.row}>
          <Chip label="May" variant="primary" selected showCheckWhenSelected onPress={() => {}} />
          <Chip label="2025" variant="secondary" selected onPress={() => {}} />
          <Chip label="2024" variant="default" onPress={() => {}} />
        </View>
      </DemoBlock>

      <DemoBlock title="Button">
        <View style={styles.row}>
          <Button label="Primary" variant="primary" onPress={() => {}} />
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Tertiary" variant="tertiary" onPress={() => {}} />
          <Button label="Destructive" variant="destructive" onPress={() => {}} />
        </View>
      </DemoBlock>

      <DemoBlock title="PriceText">
        <View style={styles.row}>
          <PriceText value={1234.56} size="sm" />
          <PriceText value={1234.56} size="md" />
          <PriceText value={1234.56} size="lg" tone="positive" />
          <PriceText value={-987.65} size="xl" tone="negative" showSign />
        </View>
      </DemoBlock>

      <DemoBlock title="TrendIndicator">
        <View style={styles.row}>
          <TrendIndicator delta={42.5} percentage={0.034} />
          <TrendIndicator delta={-128.0} percentage={-0.087} />
          <TrendIndicator delta={12.0} hideValue />
        </View>
      </DemoBlock>

      <DemoBlock title="ProgressBar">
        <ProgressBar value={0.33} />
        <ProgressBar value={0.66} tone="positive" />
        <ProgressBar value={1.1} tone="negative" />
      </DemoBlock>

      <DemoBlock title="SegmentedControl">
        <SegmentedControl options={LENS_OPTIONS} value={seg} onChange={setSeg} />
      </DemoBlock>

      <DemoBlock title="Toggle">
        <Toggle value={toggle} onValueChange={setToggle} label="Enable feature" />
      </DemoBlock>

      <DemoBlock title="Checkbox">
        <Checkbox value={check} onValueChange={setCheck} label="Include weekends" />
      </DemoBlock>

      <DemoBlock title="Slider">
        <Slider value={slider} onValueChange={setSlider} />
        <Text variant="caption" tone="textMuted">{slider.toFixed(2)}</Text>
      </DemoBlock>

      <DemoBlock title="TextField">
        <TextField placeholder="Search categories" defaultValue={text} onValueChange={setText} />
      </DemoBlock>

      <DemoBlock title="Stepper">
        <Stepper value={step} onValueChange={setStep} label="Quantity" min={0} max={10} />
      </DemoBlock>

      <DemoBlock title="DatePicker">
        <DatePicker value={date} onValueChange={setDate} title="Pick a date" />
      </DemoBlock>

      <DemoBlock title="Badge">
        <View style={styles.row}>
          <Badge label="Default" />
          <Badge label="Up 4.2%" tone="positive" />
          <Badge label="Down 2.1%" tone="negative" />
          <Badge label="Tag" tone="tint" variant="solid" />
        </View>
      </DemoBlock>

      <DemoBlock title="Surface">
        <Surface variant="plain" bordered>
          <Text>Plain bordered surface</Text>
        </Surface>
        <Surface variant="muted">
          <Text>Muted surface</Text>
        </Surface>
        <Surface variant="elevated">
          <Text>Elevated surface (shadow)</Text>
        </Surface>
      </DemoBlock>

      <DemoBlock title="Divider">
        <Text variant="body">Above</Text>
        <Divider />
        <Text variant="body">Below</Text>
      </DemoBlock>

      {/* ================ MOLECULES ================ */}
      <SectionHeader title="Molecules" subtitle="Compositions of atoms" />

      <DemoBlock title="ChipGroup">
        <ChipGroup
          items={[
            { id: '1d', label: '1D' },
            { id: '1w', label: '1W' },
            { id: '1m', label: '1M' },
            { id: '3m', label: '3M' },
            { id: '1y', label: '1Y' },
            { id: 'ytd', label: 'YTD' },
            { id: 'all', label: 'All' },
          ]}
          selectedIds={chipPicked}
          onToggle={(id) => setChipPicked([id])}
        />
      </DemoBlock>

      <DemoBlock title="MetricCard">
        <MetricCard
          label="May expenses"
          value={1240.62}
          delta={-82.4}
          deltaPercentage={-0.062}
        />
      </DemoBlock>

      <DemoBlock title="MetricRow">
        <MetricRow label="Subtotal" value="$1,240.00" />
        <MetricRow label="Tax" value="$24.80" />
        <MetricRow label="Total" value="$1,264.80" emphasis="strong" />
      </DemoBlock>

      <DemoBlock title="BudgetMeter">
        <BudgetMeter spent={233} budget={500} />
        <BudgetMeter spent={612} budget={500} />
      </DemoBlock>

      <DemoBlock title="TimelineItem">
        <View style={styles.row}>
          <TimelineItem label="May" value={1240.62} delta={-82} current />
          <TimelineItem label="Apr" value={1322.91} delta={210} />
          <TimelineItem label="Mar" value={1112.0} delta={-44} />
        </View>
      </DemoBlock>

      <DemoBlock title="SortMenu">
        <SortMenu options={SAMPLE_SORT_OPTIONS} value={sort} onChange={setSort} />
      </DemoBlock>

      <DemoBlock title="EmptyState">
        <EmptyState
          icon="chart.pie.fill"
          title="No data yet"
          body="Add transactions to see them here."
          actionLabel="Add transaction"
          onAction={() => {}}
        />
      </DemoBlock>

      {/* ================ ORGANISMS ================ */}
      <SectionHeader title="Organisms" subtitle="Feature-level compositions" />

      <DemoBlock title="TimeFilterBar">
        <TimeFilterBar storageKey="ui-demo:filter" />
      </DemoBlock>

      <DemoBlock title="Overview · month">
        <Overview
          mode="month"
          primaryLabel="May 2026"
          primaryValue={1240.62}
          comparisonLabel="Apr 2026"
          previousExpenses={1322.91}
          previousRevenue={4500}
          revenue={4500}
          expenses={1240.62}
          net={3259.38}
        />
      </DemoBlock>

      <DemoBlock title="Overview · year">
        <Overview
          mode="year"
          primaryLabel="2026 YTD"
          primaryValue={6480.42}
          comparisonLabel="2025 YTD"
          previousExpenses={5912.18}
          previousRevenue={54000}
          revenue={22500}
          expenses={6480.42}
          net={16019.58}
        />
      </DemoBlock>

      <DemoBlock title="Overview · all + revenue">
        <Overview
          mode="all"
          primaryLabel="All time expenses"
          primaryValue={48230.18}
          previousExpenses={46989.56}
          previousRevenue={59500}
          revenueVisible
          revenue={62500}
          expenses={48230.18}
          net={14269.82}
          yearTotals={[
            { year: 2026, value: 6480 },
            { year: 2025, value: 14322 },
            { year: 2024, value: 13980 },
            { year: 2023, value: 13448 },
          ]}
          timeline={MOCK_TIMELINE}
          currentMonth="may"
        />
      </DemoBlock>

      <DemoBlock title="MonthlyTimeline">
        <MonthlyTimeline points={MOCK_TIMELINE} currentMonth="may" />
      </DemoBlock>

      <DemoBlock title="CategoryGrid">
        <CategoryGrid categories={MOCK_CATEGORIES} filterItems={FILTER_ITEMS} />
      </DemoBlock>

      <DemoBlock title="CategoryCard · over budget">
        <CategoryCard data={MOCK_CATEGORIES[1]} />
      </DemoBlock>

      <DemoBlock title="CategoryCard · with revenue">
        <CategoryCard data={MOCK_CATEGORIES[3]} revenueVisible />
      </DemoBlock>
    </ScrollView>
  );
}

function DemoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text variant="caption" tone="textMuted" weight="semibold">
        {title.toUpperCase()}
      </Text>
      <View style={styles.blockBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 56,
    paddingBottom: 64,
    gap: 18,
  },
  webShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  block: {
    gap: 8,
  },
  blockBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
});
