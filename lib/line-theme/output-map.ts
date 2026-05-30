/** LINE 主題基本必要包：6 張母圖 → 41 張 PNG */

export const LINE_THEME_ZIP_NAME = "line_theme_basic_pack.zip";

export const COVER_OUTPUTS = [
  { name: "ios_thumbnail.png", width: 200, height: 284 },
  { name: "android_thumbnail.png", width: 136, height: 202 },
  { name: "store_thumbnail.png", width: 198, height: 278 },
] as const;

/** 九宮格視覺順序（列優先）：Home, Chats, Voom / Shopping, Calls, News / TODAY, Wallet, MINI */
export const MENU_OFF_FILES = [
  "i_29.png",
  "i_03.png",
  "i_33.png",
  "i_35.png",
  "i_07.png",
  "i_25.png",
  "i_31.png",
  "i_27.png",
  "i_37.png",
] as const;

export const MENU_ON_FILES = [
  "i_30.png",
  "i_04.png",
  "i_34.png",
  "i_36.png",
  "i_08.png",
  "i_26.png",
  "i_32.png",
  "i_28.png",
  "i_38.png",
] as const;

export const MENU_ICON_W = 128;
export const MENU_ICON_H = 150;

export const PROFILE_OUTPUTS = [
  { name: "i_20.png", width: 240, height: 240, side: "left" as const },
  { name: "a_20.png", width: 247, height: 247, side: "left" as const },
  { name: "i_21.png", width: 240, height: 240, side: "right" as const },
  { name: "a_21.png", width: 247, height: 247, side: "right" as const },
] as const;

export const PASSCODE_OFF_FILES = [
  { ios: "i_12.png", android: "a_12.png" },
  { ios: "i_14.png", android: "a_14.png" },
  { ios: "i_16.png", android: "a_16.png" },
  { ios: "i_18.png", android: "a_18.png" },
] as const;

export const PASSCODE_ON_FILES = [
  { ios: "i_13.png", android: "a_13.png" },
  { ios: "i_15.png", android: "a_15.png" },
  { ios: "i_17.png", android: "a_17.png" },
  { ios: "i_19.png", android: "a_19.png" },
] as const;

export const PASSCODE_IOS_SIZE = 120;
export const PASSCODE_ANDROID_SIZE = 116;

export const EXPECTED_OUTPUT_COUNT = 41;

export type LineThemeSlotId =
  | "cover"
  | "menu-off"
  | "menu-on"
  | "profile"
  | "passcode-off"
  | "passcode-on";

export interface LineThemeSlotDefinition {
  id: LineThemeSlotId;
  label: string;
  expectedRatio: number;
  ratioLabel: string;
}

export const LINE_THEME_SLOTS: readonly LineThemeSlotDefinition[] = [
  { id: "cover", label: "主題封面圖", expectedRatio: 1000 / 1420, ratioLabel: "直式（約 1000×1420）" },
  { id: "menu-off", label: "選單圖示（未選取）", expectedRatio: 1, ratioLabel: "正方形九宮格" },
  { id: "menu-on", label: "選單圖示（已選取）", expectedRatio: 1, ratioLabel: "正方形九宮格" },
  { id: "profile", label: "個人／群組頭像", expectedRatio: 2, ratioLabel: "橫式 2:1" },
  { id: "passcode-off", label: "密碼鎖（未按）", expectedRatio: 1, ratioLabel: "正方形四宮格" },
  { id: "passcode-on", label: "密碼鎖（已按）", expectedRatio: 1, ratioLabel: "正方形四宮格" },
];
