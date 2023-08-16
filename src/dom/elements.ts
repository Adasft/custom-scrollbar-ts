import { __DOC__ } from "../globals";
import {
  InteractiveElement,
  InteractiveElementSymbol,
  InteractiveElementProps,
  AttrsMap,
  ListenerMap,
  HTMLElementExtended,
  EventType,
  InteractiveTextNode,
  InteractiveTextNodeSymbol,
  CurrentRefNode,
} from "../types";
import { toStr } from "../utilities";
import { inheritOn, on } from "./events-factory";

function setAttrs(node: HTMLElementExtended, attrs: AttrsMap): void {
  let attrNameList = Object.keys(attrs);

  for (let i = 0; i < attrNameList.length; i++) {
    const attrName = attrNameList[i];
    const attrValue = attrs[attrName] ?? "";

    node.setAttribute(attrName, attrValue);
  }
}

function addListeners(node: HTMLElementExtended, listeners: ListenerMap): void {
  let eventTypeList = Object.keys(listeners);
  for (let i = 0; i < eventTypeList.length; i++) {
    const eventType = eventTypeList[i] as EventType;
    on(eventType, node, listeners[eventType] ?? (() => {}));
  }
}

function appendChildToParent(
  parent: HTMLElementExtended,
  child: InteractiveElement | InteractiveTextNode,
  listeners: ListenerMap | null
) {
  parent.appendChild(child.node);

  if (child.$$type === InteractiveElementSymbol) {
    for (const eventType in listeners) {
      inheritOn(eventType as EventType, child.node, parent);
    }
    child.append(listeners);
  }
}

function appendChilds(
  parent: HTMLElementExtended,
  listeners: ListenerMap | null,
  children: Array<InteractiveElement | InteractiveTextNode>
): void {
  for (const child of children) {
    appendChildToParent(parent, child, listeners);
  }
}

function createInteractiveElement(
  node: HTMLElementExtended,
  listeners: ListenerMap,
  children: Array<InteractiveElement | InteractiveTextNode>
): InteractiveElement {
  function append(
    inheritListeners: ListenerMap | null,
    ...newChildren: Array<InteractiveElement | InteractiveTextNode>
  ) {
    appendChilds(
      node,
      inheritListeners ?? listeners,
      newChildren.length ? newChildren : children
    );
  }

  return {
    node,
    append,
    $$type: InteractiveElementSymbol,
  };
}

function createInteractiveTextNode(node: Text): InteractiveTextNode {
  return {
    node,
    $$type: InteractiveTextNodeSymbol,
  };
}

export function createTextNode(
  value: any,
  ref?: CurrentRefNode
): InteractiveTextNode {
  value = toStr(value);
  const node = __DOC__.createTextNode(value);
  const refTextNode = createInteractiveTextNode(node);

  if (ref) {
    ref.value = refTextNode;
  }

  return refTextNode;
}

export function createRef(key?: string): CurrentRefNode {
  return { key: key ?? null, value: null };
}

export function createElement(
  type: keyof HTMLElementTagNameMap,
  props?: InteractiveElementProps | null,
  ...children: Array<InteractiveElement | InteractiveTextNode>
): InteractiveElement {
  const node = __DOC__.createElement(type) as HTMLElementExtended;

  const ref = props?.ref;
  const attrs = props?.attrs ?? {};
  const listeners = props?.on ?? {};

  setAttrs(node, attrs);
  addListeners(node, listeners);
  appendChilds(node, listeners, children);

  const interactiveElement = createInteractiveElement(
    node,
    listeners,
    children
  );

  if (ref) {
    ref.value = interactiveElement;
  }

  return interactiveElement;
}

// const root = createElement(
//   "div",
//   { on: { click: () => {} } },
//   createElement("span", null, createTextNode("Click in span")),
//   createElement("button", null, createTextNode("Click in button")),
//   createElement(
//     "div",
//     { on: { mousedown: () => {} } },
//     createTextNode("Click in div"),
//     createElement("span", null, createElement("span"), createElement("span"), createElement("span"), createElement("span"), createElement("span")),
//     createElement("span"),
//     createElement("span")
//   )
// );
