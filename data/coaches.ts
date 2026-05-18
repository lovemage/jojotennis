export type Coach = {
  id: string;
  name: string;
  city: string;
  levelRange: string;
  price: number;
  rating: number;
  tagline: string;
  bio: string;
};

export type StudentNeed = {
  id: string;
  title: string;
  city: string;
  district: string;
  targetLevel: string;
  preferredTime: string;
  budget: string;
  intro: string;
};

export const coaches: Coach[] = [
  {
    id: "coach-001",
    name: "王教練",
    city: "台北市",
    levelRange: "NTRP 1.0–2.5",
    price: 800,
    rating: 4.8,
    tagline: "新手啟蒙與基本動作修正專長",
    bio: "擅長協助初學者建立正確握拍、揮拍與移位習慣，課程節奏清楚，適合第一次接觸網球的學員。",
  },
  {
    id: "coach-002",
    name: "林教練",
    city: "新北市",
    levelRange: "NTRP 2.0–3.5",
    price: 1200,
    rating: 4.9,
    tagline: "穩定對拉、發球與比賽觀念養成",
    bio: "以多拍穩定與落點控制為核心，協助學員從會打球進階到能打比賽。",
  },
  {
    id: "coach-003",
    name: "陳教練",
    city: "台中市",
    levelRange: "NTRP 3.0–4.5",
    price: 1500,
    rating: 4.7,
    tagline: "進階單打戰術與競賽訓練",
    bio: "適合已有穩定基本功、想提升比賽策略、發接發和主動得分能力的球友。",
  },
];

export const studentNeeds: StudentNeed[] = [
  {
    id: "student-001",
    title: "初學者找啟蒙教練",
    city: "台北市",
    district: "大安區",
    targetLevel: "NTRP 2.0",
    preferredTime: "週末上午",
    budget: "NT$800–1,200",
    intro: "剛開始學網球，希望建立正確動作，想每週固定上一堂課。",
  },
  {
    id: "student-002",
    title: "想改善發球與反手",
    city: "新北市",
    district: "板橋區",
    targetLevel: "NTRP 3.0",
    preferredTime: "週一至五晚上",
    budget: "NT$1,200–1,500",
    intro: "已有一年球齡，來回可以但發球不穩，希望找能安排訓練菜單的教練。",
  },
  {
    id: "student-003",
    title: "準備參加業餘賽事",
    city: "台中市",
    district: "西屯區",
    targetLevel: "NTRP 4.0",
    preferredTime: "彈性配合",
    budget: "面議",
    intro: "想加強單打戰術、接發球和體能，希望教練有比賽經驗。",
  },
];
