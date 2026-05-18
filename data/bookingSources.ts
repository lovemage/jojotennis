export type BookingSource = {
  city: string;
  name: string;
  url: string;
  notes: string;
};

export const bookingSources: BookingSource[] = [
  {
    city: "台北市",
    name: "臺北市政府體育局場館設施管理系統",
    url: "https://vbs.sports.taipei/",
    notes: "多數市立與河濱網球場可查詢或線上租借。",
  },
  {
    city: "台北市",
    name: "臺北市網球中心 Online Booking",
    url: "https://www.tsc.taipei/online-booking/",
    notes: "臺北市網球中心室內與室外場地可透過電話、APP 或線上資訊預約。",
  },
  {
    city: "新北市",
    name: "新北市高灘地網球場租借",
    url: "https://www.hrcm.ntpc.gov.tw/Service/VenueRental/TennisCourtLeaseInst",
    notes: "高灘地園區網球場提供租借公告與申請資訊。",
  },
  {
    city: "台中市",
    name: "臺中市政府服務 e 櫃台",
    url: "https://eservices.taichung.gov.tw/",
    notes: "臺中市網球中心與部分公立場館可查詢場地租借流程。",
  },
  {
    city: "台南市",
    name: "臺南市政府體育局場地租借",
    url: "https://sports.tainan.gov.tw/html2/sportsvenues_Lease",
    notes: "臺南市委外運動場館已建置線上預約資訊與租借入口。",
  },
  {
    city: "高雄市",
    name: "鳳山運動園區網球場",
    url: "https://kfspwdyg.com.tw/%E7%B6%B2%E7%90%83%E5%A0%B4/",
    notes: "戶外紅土網球場，官網提供場地與預約資訊。",
  },
  {
    city: "新竹市",
    name: "新竹市立體育場場地租借",
    url: "https://stadium.hc.edu.tw/ch/home.jsp?id=47&parentpath=0",
    notes: "三民、公六、景觀大道、府後等公立網球場以球證與租借規則管理。",
  },
  {
    city: "宜蘭縣",
    name: "宜蘭縣政府場地租借資訊",
    url: "https://www.e-land.gov.tw/cp.aspx?n=19023",
    notes: "宜蘭運動公園與羅東運動公園等場地可查詢租借資訊。",
  },
  {
    city: "花蓮縣",
    name: "花蓮縣立體育場縣立網球場",
    url: "https://hcs.hl.gov.tw/cp.aspx?n=2224",
    notes: "美崙網球場可查詢場地、收費與洽詢方式。",
  },
  {
    city: "屏東縣",
    name: "屏東縣體育發展中心",
    url: "https://www.pthg.gov.tw/stadium/",
    notes: "縣立體育場與公立場地租借以公告、申請與電話洽詢為主。",
  },
  {
    city: "桃園市",
    name: "桃園市政府體育局場館資訊",
    url: "https://www.dst.tycg.gov.tw/",
    notes: "中壢網球場等場館可查詢管理單位與使用注意事項。",
  },
  {
    city: "私人",
    name: "LE KLUTCH TENNIS CLUB",
    url: "https://leklutchtennis.com/",
    notes: "私人室內預約制網球俱樂部。",
  },
  {
    city: "私人",
    name: "明巧室內網球場",
    url: "https://www.minc-tennis.com.tw/",
    notes: "桃園平鎮室內網球場，採預約制。",
  },
  {
    city: "私人",
    name: "臺中市國際網球中心",
    url: "https://center.northwest-sports.com/",
    notes: "NorthWest Sports 營運，提供場地、課程與預約資訊。",
  },
];
