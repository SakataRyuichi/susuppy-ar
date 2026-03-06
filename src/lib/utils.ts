import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 条件付きクラス名を結合し、Tailwind の競合を解消する。
 * UI部品側でクラス結合処理を重複させないために共通化する。
 *
 * @param inputs - 結合対象のクラス名トークン。
 * @returns 正規化済みのクラス名文字列。
 * @public
 */
export function mergeClassNames(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
