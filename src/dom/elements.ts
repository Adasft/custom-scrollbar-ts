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

function addEventIfMissing(
  parent: HTMLElementExtended,
  child: HTMLElementExtended,
  eventType: EventType
) {
  const parentEventsUUIDCollection = parent.__eventUUIDCollection;
  const eventsUUIDCollection = child.__eventUUIDCollection;

  if (!parentEventsUUIDCollection) return;

  if (
    (eventsUUIDCollection && !eventsUUIDCollection.hasOwnProperty(eventType)) ||
    !eventsUUIDCollection
  ) {
    inheritOn(eventType, child, parent);
  }

  if (
    child.__eventUUIDCollection &&
    (parentEventsUUIDCollection.hasOwnProperty("mouseenter") ||
      parentEventsUUIDCollection.hasOwnProperty("mouseleave"))
  ) {
    child.__eventUUIDCollection.__refEventsUUID.inherit =
      parentEventsUUIDCollection.__refEventsUUID.own;
  }
}

function appendChildToParent(
  parent: HTMLElementExtended,
  child: InteractiveElement | InteractiveTextNode,
  listeners: ListenerMap | undefined
) {
  parent.appendChild(child.node);

  if (child.$$type === InteractiveElementSymbol) {
    for (const eventType in listeners) {
      addEventIfMissing(parent, child.node, eventType as EventType);
    }
    child.append(listeners);
  }
}

function appendChilds(
  parent: HTMLElementExtended,
  listeners: ListenerMap | undefined,
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
    inheritListeners: ListenerMap | undefined,
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
  return { key, value: undefined };
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
