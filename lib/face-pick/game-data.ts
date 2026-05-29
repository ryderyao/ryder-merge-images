export interface FacePickGameData {
  title: string;
  question: string;
  options: string[];
}

export const FACE_PICK_GAME_DATA: FacePickGameData = {
  title: "地獄二選一",
  question: "給你一百萬，你能接受做什麼？",
  options: [
    "一年不能喝手搖飲",
    "每天早上五點起床",
    "一個月只能吃水煮餐",
    "一年不能滑短影音",
    "三個月不能吃宵夜",
    "一年不能買新衣服",
    "每天跑步 5 公里",
    "手機每天只能用 1 小時",
  ],
};
