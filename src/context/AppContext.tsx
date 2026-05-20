/**
 * @deprecated 請使用根目錄 `@/context/AppContext`（唯一 AppProvider 入口）。
 * 此檔保留以避免舊 import 路徑失效。
 */
export { AppProvider, useApp } from "../../context/AppContext";
export type {
  User,
  Message,
  Match,
  ChatMessage,
  Conversation,
  StudentNeedRecord,
  CourtReport,
  NewsArticle,
} from "@/lib/uiTypes";
