import { UUID } from "crypto";
import { CSSStylesRules, CSSCustomProperties } from "./dom/css-factory";

export function randomUUID(): UUID {
  if (typeof crypto === "undefined" || !crypto.randomUUID) {
    const p4 = () =>
      Math.floor((1 + Math.random()) * (0x2710 - 0x3e8) + 0x3e8).toString(16);
    return `${p4() + p4()}-${p4()}-${p4()}-${p4()}-${p4() + p4() + p4()}`;
  }
  return crypto.randomUUID() as UUID;
}

export function isDef(val: any): boolean {
  return val !== undefined && val !== null;
}

export function isUndef(val: any): boolean {
  return val === undefined || val === null;
}

export function toSnakeCase(
  str: keyof CSSStylesRules | keyof CSSCustomProperties
): string {
  return (str as string).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

export function toPixel(val: string | number | undefined): string {
  return val === undefined ? "" : typeof val === "number" ? `${val}px` : val;
}

export function toStr(val: any): string {
  return typeof val === "object" ? JSON.stringify(val, null, 4) : String(val);
}

export function setToMap<K, V>(map: Map<K, V>, key: K, value: V): Map<K, V> {
  if (map.has(key)) return map;
  return map.set(key, value);
}
