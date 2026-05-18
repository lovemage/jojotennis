export type MatchPostStatus = "open" | "almostFull" | "full" | "closed";

export type MatchPost = {
  id: string;
  title: string;
  city: string;
  district?: string;
  courtName: string;
  date: string;
  time: string;
  level: string;
  spotsNeeded: number;
  format: string;
  status: MatchPostStatus;
  host: string;
  notes: string;
};

export const matchPosts: MatchPost[] = [
  {
    id: "match-001",
    title: "下班後穩定對拉",
    city: "台北市",
    courtName: "大安森林公園網球場",
    date: "週二",
    time: "19:00-21:00",
    level: "NTRP 3.0",
    spotsNeeded: 2,
    format: "雙打/練球",
    status: "open",
    host: "Mina",
    notes: "以多拍穩定和基本發球練習為主，新手友善。",
  },
  {
    id: "match-002",
    title: "週末室內場單打",
    city: "台北市",
    courtName: "臺北市網球中心（室內）",
    date: "週六",
    time: "10:00-12:00",
    level: "NTRP 3.5",
    spotsNeeded: 1,
    format: "單打",
    status: "almostFull",
    host: "Ryan",
    notes: "希望能打完整盤，來回穩定即可。",
  },
  {
    id: "match-003",
    title: "新北夜間雙打缺二",
    city: "新北市",
    courtName: "新莊運動公園網球場",
    date: "週三",
    time: "20:00-22:00",
    level: "NTRP 3.0",
    spotsNeeded: 2,
    format: "雙打",
    status: "open",
    host: "阿哲",
    notes: "固定球友臨時請假，程度接近即可。",
  },
  {
    id: "match-004",
    title: "台中進階對打",
    city: "台中市",
    courtName: "台中市立水湳網球場",
    date: "週日",
    time: "08:00-10:00",
    level: "NTRP 4.0+",
    spotsNeeded: 1,
    format: "單打/搶七",
    status: "open",
    host: "Howard",
    notes: "適合有比賽經驗、想練發球局和接發球的人。",
  },
  {
    id: "match-005",
    title: "高雄紅土輕鬆打",
    city: "高雄市",
    courtName: "高雄鳳山運動園區網球場",
    date: "週五",
    time: "18:00-20:00",
    level: "NTRP 2.0",
    spotsNeeded: 3,
    format: "練球/雙打",
    status: "open",
    host: "小林",
    notes: "紅土場適應練習，歡迎剛入門球友。",
  },
  {
    id: "match-006",
    title: "新竹固定練球團",
    city: "新竹市",
    courtName: "新竹市立體育場三民網球場",
    date: "週四",
    time: "19:30-21:30",
    level: "NTRP 3.5",
    spotsNeeded: 0,
    format: "團練",
    status: "full",
    host: "Ivy",
    notes: "本週已滿，可追蹤下週場次。",
  },
];
