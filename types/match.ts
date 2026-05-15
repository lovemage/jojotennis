export type MatchPeriod = 'morning' | 'noon' | 'evening';

export type MatchPost = {
  id: string;
  published_at: string;
  organizer_name: string;
  ntrp: number;
  city: string;
  district: string;
  slots_label: string;
  periods: MatchPeriod[];
  hours: number[];
  indoor: boolean;
  outdoor: boolean;
  match_pct: number;
  description: string;
};

export type MatchSortMode = 'latest' | 'ntrp';

export type MatchFilters = {
  ntrpMin: number;
  ntrpMax: number;
  city: string;
  district: string;
  periods: MatchPeriod[];
  hours: number[];
  requireIndoor: boolean;
  requireOutdoor: boolean;
  keyword: string;
};

export const DEFAULT_MATCH_FILTERS: MatchFilters = {
  ntrpMin: 1.0,
  ntrpMax: 7.0,
  city: '',
  district: '',
  periods: [],
  hours: [],
  requireIndoor: false,
  requireOutdoor: false,
  keyword: '',
};

export function filterMatchPosts(posts: MatchPost[], f: MatchFilters): MatchPost[] {
  const kw = f.keyword.trim().toLowerCase();

  return posts.filter((p) => {
    if (p.ntrp < f.ntrpMin || p.ntrp > f.ntrpMax) return false;

    if (f.city) {
      if (p.city !== f.city) return false;
      if (f.district && p.district !== f.district) return false;
    }

    if (f.requireIndoor && !p.indoor) return false;
    if (f.requireOutdoor && !p.outdoor) return false;

    const hasPeriodFilter = f.periods.length > 0;
    const hasHourFilter = f.hours.length > 0;
    if (hasPeriodFilter || hasHourFilter) {
      const periodOk = hasPeriodFilter && f.periods.some((x) => p.periods.includes(x));
      const hourOk = hasHourFilter && f.hours.some((h) => p.hours.includes(h));
      if (hasPeriodFilter && hasHourFilter) {
        if (!periodOk && !hourOk) return false;
      } else if (hasPeriodFilter && !periodOk) {
        return false;
      } else if (hasHourFilter && !hourOk) {
        return false;
      }
    }

    if (kw) {
      const blob = `${p.description} ${p.organizer_name} ${p.slots_label}`.toLowerCase();
      if (!blob.includes(kw)) return false;
    }

    return true;
  });
}

export function sortMatchPosts(posts: MatchPost[], mode: MatchSortMode): MatchPost[] {
  const copy = [...posts];
  if (mode === 'latest') {
    copy.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  } else {
    copy.sort((a, b) => b.ntrp - a.ntrp);
  }
  return copy;
}

export function formatFilterSummary(f: MatchFilters): string {
  const ntrp =
    f.ntrpMin <= 1.0 && f.ntrpMax >= 7.0 ? 'NTRP 不限' : `NTRP ${f.ntrpMin}–${f.ntrpMax}`;
  const loc =
    !f.city ? '地點不限' : f.district ? `${f.city}${f.district}` : `${f.city}（全區）`;
  const periodLabels: Record<MatchPeriod, string> = {
    morning: '早',
    noon: '中',
    evening: '晚',
  };
  let time = '時間不限';
  if (f.periods.length || f.hours.length) {
    const parts: string[] = [];
    if (f.periods.length) parts.push(f.periods.map((p) => periodLabels[p]).join('、'));
    if (f.hours.length) parts.push(`${f.hours.length} 個小時段`);
    time = parts.join(' · ');
  }
  const venue: string[] = [];
  if (f.requireIndoor) venue.push('室內');
  if (f.requireOutdoor) venue.push('室外');
  const v = venue.length ? venue.join('／') : '場地不限';
  const k = f.keyword.trim() ? `「${f.keyword.trim().slice(0, 12)}${f.keyword.trim().length > 12 ? '…' : ''}」` : '';
  return [ntrp, loc, time, v, k].filter(Boolean).join(' · ');
}
