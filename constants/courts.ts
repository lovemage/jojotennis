export type Court = {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  courts: number;
  surface: string;
  light: boolean;
  price_off: number;
  price_peak: number;
  booking_url: string;
  gmaps_url: string;
};

export const COURTS: Court[] = [
  {
    id: 'TPE001',
    name: '臺北網球場',
    city: '台北市',
    district: '松山區',
    address: '南京東路4段6號',
    courts: 6,
    surface: '硬地',
    light: true,
    price_off: 120,
    price_peak: 180,
    booking_url: 'https://www.taipeitenniscourt.com/',
    gmaps_url: 'https://maps.google.com/?q=臺北網球場',
  },
  {
    id: 'TPE002',
    name: '臺北市網球中心（室外）',
    city: '台北市',
    district: '中山區',
    address: '民權東路一段50號',
    courts: 10,
    surface: '硬地',
    light: true,
    price_off: 150,
    price_peak: 250,
    booking_url: 'https://www.tsc.taipei/',
    gmaps_url: 'https://maps.google.com/?q=臺北市網球中心',
  },
  {
    id: 'TPE004',
    name: '大安森林公園網球場',
    city: '台北市',
    district: '大安區',
    address: '新生南路二段1號',
    courts: 8,
    surface: '硬地',
    light: true,
    price_off: 100,
    price_peak: 150,
    booking_url: 'https://vbs.sports.gov.taipei/',
    gmaps_url: 'https://maps.google.com/?q=大安森林公園網球場',
  },
  {
    id: 'TPE009',
    name: '天母運動公園網球場',
    city: '台北市',
    district: '士林區',
    address: '天母東路22號',
    courts: 8,
    surface: '紅土',
    light: true,
    price_off: 150,
    price_peak: 200,
    booking_url: 'https://vbs.sports.gov.taipei/',
    gmaps_url: 'https://maps.google.com/?q=天母運動公園網球場',
  },
  {
    id: 'TYN001',
    name: '桃園市立中壢網球場',
    city: '桃園市',
    district: '中壢區',
    address: '民權路311-3號',
    courts: 8,
    surface: '壓克力',
    light: true,
    price_off: 80,
    price_peak: 120,
    booking_url: 'https://sports.tycg.gov.tw/',
    gmaps_url: 'https://maps.google.com/?q=中壢網球場',
  },
  {
    id: 'KHH001',
    name: '鳳山運動園區網球場',
    city: '高雄市',
    district: '鳳山區',
    address: '光遠路',
    courts: 6,
    surface: '紅土',
    light: true,
    price_off: 100,
    price_peak: 150,
    booking_url: 'https://kfspwdyg.com.tw/',
    gmaps_url: 'https://maps.google.com/?q=鳳山運動園區網球場',
  },
];

export function getCourtById(id: string): Court | undefined {
  return COURTS.find((c) => c.id === id);
}
