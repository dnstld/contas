import { TimeFilterBar } from '@/components/ui/organisms/time-filter-bar';
import { type TimeFilterApi } from '@/hooks/use-time-filter';

export interface FinanceTimeFilterProps {
  api: TimeFilterApi;
  now?: Date;
}

export function FinanceTimeFilter({ api, now }: FinanceTimeFilterProps) {
  return <TimeFilterBar api={api} now={now} yearsRange={2} />;
}
