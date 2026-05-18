export type TennisLevel = {
  level: string;
  label: string;
  description: string;
};

export const tennisLevels: TennisLevel[] = [
  {
    level: "1.0",
    label: "完全初學",
    description: "剛開始接觸網球，仍在學習基本握拍與擊球動作。",
  },
  {
    level: "1.5",
    label: "初學",
    description: "有少量打球經驗，能勉力將球打回去。",
  },
  {
    level: "2.0",
    label: "入門",
    description: "能與同級球友進行幾個慢速回合。",
  },
  {
    level: "2.5",
    label: "入門穩定",
    description: "能進行慢速對打，開始嘗試完整揮拍。",
  },
  {
    level: "3.0",
    label: "中級入門",
    description: "正反手趨於穩定，開始有戰術意識。",
  },
  {
    level: "3.5",
    label: "中級",
    description: "能控制中速球的方向與深度。",
  },
  {
    level: "4.0",
    label: "中高級",
    description: "底線穩定，能執行截擊與上網戰術。",
  },
  {
    level: "4.5",
    label: "高級",
    description: "能根據對手靈活調整戰術。",
  },
  {
    level: "5.0",
    label: "頂尖業餘",
    description: "具備業餘公開賽競爭力。",
  },
  {
    level: "5.5",
    label: "國家級",
    description: "頂尖大學校隊或國家隊培訓水準。",
  },
  {
    level: "6.0",
    label: "職業",
    description: "具備參加 ITF / ATP 挑戰賽的實力。",
  },
  {
    level: "6.5",
    label: "職業",
    description: "具備晉升 7.0 的實力。",
  },
  {
    level: "7.0",
    label: "世界級",
    description: "ATP / WTA 積分排名選手。",
  },
];
