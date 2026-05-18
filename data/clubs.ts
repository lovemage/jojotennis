export type Club = {
  id: string;
  name: string;
  city: string;
  baseCourt: string;
  levelRange: string;
  schedule: string;
  memberCount: number;
  tags: string[];
  description: string;
};

export const clubs: Club[] = [
  {
    id: "club-001",
    name: "台北夜貓網球團",
    city: "台北市",
    baseCourt: "大安森林公園網球場",
    levelRange: "NTRP 2.5-3.5",
    schedule: "週二、週四 19:00",
    memberCount: 42,
    tags: ["固定團練", "新手友善"],
    description: "下班後固定練球，適合想建立穩定球感和球友圈的人。",
  },
  {
    id: "club-002",
    name: "新北河濱雙打社",
    city: "新北市",
    baseCourt: "新莊運動公園網球場",
    levelRange: "NTRP 3.0-4.0",
    schedule: "週三 20:00、週日 08:00",
    memberCount: 35,
    tags: ["雙打", "賽事交流"],
    description: "以雙打跑位、發接發和短局練習為主。",
  },
  {
    id: "club-003",
    name: "台中晨練 Tennis Crew",
    city: "台中市",
    baseCourt: "台中市立水湳網球場",
    levelRange: "NTRP 3.0-4.0+",
    schedule: "週六、週日 07:00",
    memberCount: 28,
    tags: ["晨練", "進階對打"],
    description: "週末早場高效率練球，偏向多拍、搶七與單打戰術。",
  },
  {
    id: "club-004",
    name: "高雄紅土練習會",
    city: "高雄市",
    baseCourt: "高雄鳳山運動園區網球場",
    levelRange: "NTRP 2.0-3.5",
    schedule: "週五 18:00",
    memberCount: 31,
    tags: ["紅土", "新手友善"],
    description: "熟悉紅土步伐與穩定來回，適合初中階球友。",
  },
];
