/**
 * 地獄二選一 — 題庫設定（改這裡即可，存檔後重新部署）
 *
 * - title：遊戲名稱（開始頁大標）
 * - question：遊戲進行中上方題目
 * - options：選項池，至少 2 個；前 2 個為開局左右選項，其餘依選完順序輪替
 */

export interface FacePickGameData {
  title: string;
  question: string;
  options: string[];
}

export const FACE_PICK_GAME_DATA: FacePickGameData = {
  title: "地獄二選一",
  question: "給你一百萬，你能接受做什麼？",
  options: [
    "吃自己的屎一次",
    "持續一年 每天上班15小時",
    "連續舔馬桶一個禮拜",
    "請你姐妹吃你的屎",
    "請你兄弟吃你的屎",
    "一年不用手機",
    "找一個禿頭拔他的頭髮",
    "把自己的頭髮剃光",
  ],
};
