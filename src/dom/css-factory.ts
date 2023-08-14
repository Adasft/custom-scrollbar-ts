import { toPixel, toSnakeCase } from "../utilities";

export interface CSSStyler {
  from(target: HTMLElement | undefined | null): void;
  toStr(): string;
}

export type CSSStylesRules = {
  [style in keyof CSSStyleDeclaration]?: string | number | undefined;
};

type CSSCustomProperty = string | number;

export type CSSCustomProperties = {
  [key: CSSCustomProperty]: string | number;
};

const enum CSSTypeDeclaration {
  NORMAL,
  CUSTOM,
  DELETE,
}

class CSSStylerFactory implements CSSStyler {
  private static _instance: CSSStylerFactory;
  private _styles: CSSStylesRules = {};
  private _customProperties: CSSCustomProperties = {};
  private _removedRules: Array<keyof CSSStylesRules> = [];
  private _declaredType: CSSTypeDeclaration = CSSTypeDeclaration.NORMAL;

  private constructor() {}

  private _getRules() {
    const isCustom = this._declaredType === CSSTypeDeclaration.CUSTOM;
    const isGoingDelete = this._declaredType === CSSTypeDeclaration.DELETE;
    const properties = isCustom ? this._customProperties : this._styles;
    const rules = (
      isGoingDelete ? this._removedRules : Object.keys(properties)
    ) as Array<keyof typeof properties>;

    return { isCustom, isGoingDelete, properties, rules };
  }

  public static Styler(): CSSStylerFactory {
    if (!CSSStylerFactory._instance) {
      CSSStylerFactory._instance = new CSSStylerFactory();
    }
    return CSSStylerFactory._instance;
  }

  public declareStyles(styles: CSSStylesRules): void {
    this._styles = styles;
    this._declaredType = CSSTypeDeclaration.NORMAL;
  }

  public declareVar(customProperties: CSSCustomProperties): void {
    this._customProperties = customProperties;
    this._declaredType = CSSTypeDeclaration.CUSTOM;
  }

  public declareRemovedStyles(rules: Array<keyof CSSStylesRules>): void {
    this._removedRules = rules;
    this._declaredType = CSSTypeDeclaration.DELETE;
  }

  public from(target: HTMLElement | null): void {
    if (!target) return;

    const { isCustom, isGoingDelete, properties, rules } = this._getRules();

    rules.forEach((prop) => {
      isGoingDelete
        ? target.style.removeProperty(toSnakeCase(prop))
        : target.style.setProperty(
            (isCustom ? "--" : "") + toSnakeCase(prop),
            toPixel(properties[prop])
          );
    });
  }

  public toStr(): string {
    const { properties, isGoingDelete, rules } = this._getRules();

    return isGoingDelete
      ? String(this._removedRules)
      : rules.reduce((acc, style) => {
          return `${String(acc)}${toSnakeCase(style)}:${toPixel(
            properties[style]
          )};`;
        }, "");
  }
}

const styler = CSSStylerFactory.Styler();

export function setCustom(customProperties: CSSCustomProperties): CSSStyler {
  styler.declareVar(customProperties);
  return styler;
}

export function remove(...rules: Array<keyof CSSStylesRules>): CSSStyler {
  styler.declareRemovedStyles(rules);
  return styler;
}

export default function css(styles: CSSStylesRules): CSSStyler {
  styler.declareStyles(styles);
  return styler;
}
