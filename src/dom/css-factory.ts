import { toPixel, toSnakeCase } from "../utilities";

export interface CSSStyler {
  from(target: HTMLElement | null): void;
  toStr(): string;
}

export type CSSStylesRules = {
  [style in keyof CSSStyleDeclaration]?: string | number | undefined;
};

type CSSCustomProperty = string | number;

export type CSSCustomProperties = {
  [key: CSSCustomProperty]: string | number;
};

type CSSRules = CSSStylesRules | CSSCustomProperties;

const enum CSSTypeDeclaration {
  NORMAL,
  CUSTOM,
  DELETE,
}

class CSSInlineStyleFactory implements CSSStyler {
  private static _instance: CSSInlineStyleFactory;
  private _styleVariations: CSSRules | Array<keyof CSSRules> | null = null;
  private _declaredType: CSSTypeDeclaration = CSSTypeDeclaration.NORMAL;

  private constructor() {}

  private _getRules() {
    const isCustom = this._declaredType === CSSTypeDeclaration.CUSTOM;
    const isDelete = this._declaredType === CSSTypeDeclaration.DELETE;
    const styleVariations = this._styleVariations;
    const rules =
      (styleVariations &&
        (Array.isArray(styleVariations)
          ? styleVariations
          : (Object.keys(styleVariations) as Array<
              keyof typeof styleVariations
            >))) ||
      [];

    return { isCustom, isDelete, rules };
  }

  private _getRuleValue(rule: string): string | number {
    if (!this._styleVariations || Array.isArray(this._styleVariations))
      return "";

    return this._styleVariations[rule as keyof CSSRules] ?? "";
  }

  public static getFactory(): CSSInlineStyleFactory {
    if (!CSSInlineStyleFactory._instance) {
      CSSInlineStyleFactory._instance = new CSSInlineStyleFactory();
    }
    return CSSInlineStyleFactory._instance;
  }

  public declareStyles(styles: CSSStylesRules): void {
    this._styleVariations = styles;
    this._declaredType = CSSTypeDeclaration.NORMAL;
  }

  public declareVar(customProperties: CSSCustomProperties): void {
    this._styleVariations = customProperties;
    this._declaredType = CSSTypeDeclaration.CUSTOM;
  }

  public declareRemovedStyles(rules: Array<keyof CSSRules>): void {
    this._styleVariations = rules;
    this._declaredType = CSSTypeDeclaration.DELETE;
  }

  public from(target: HTMLElement | null): void {
    if (!target) return;

    const { isCustom, isDelete, rules } = this._getRules();

    if (rules.length === 0) return;

    for (const rule of rules) {
      isDelete
        ? target.style.removeProperty(toSnakeCase(rule))
        : target.style.setProperty(
            (isCustom ? "--" : "") + toSnakeCase(rule),
            toPixel(rule as string)
          );
    }

    this._styleVariations = null;
  }

  public toStr(): string {
    const { isDelete, rules } = this._getRules();

    if (rules.length === 0) return "";

    const str = isDelete
      ? String(rules)
      : rules.reduce((acc, rule) => {
          return `${String(acc)}${toSnakeCase(rule)}:${toPixel(
            this._getRuleValue(rule as string)
          )};`;
        }, "");

    this._styleVariations = null;

    return str;
  }
}

const styler = CSSInlineStyleFactory.getFactory();

export function setCustom(customProperties: CSSCustomProperties): CSSStyler {
  styler.declareVar(customProperties);
  return styler;
}

export function remove(...rules: Array<keyof CSSRules>): CSSStyler {
  styler.declareRemovedStyles(rules);
  return styler;
}

export default function css(styles: CSSStylesRules): CSSStyler {
  styler.declareStyles(styles);
  return styler;
}
