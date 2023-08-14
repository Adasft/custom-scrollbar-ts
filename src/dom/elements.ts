import { __DOC__ } from "../globals";
import {
  RefElement,
  RefElementSymbol,
  RefElementProps,
  AttrsMap,
  ListenerMap,
  HTMLElementExtended,
  EventType,
  RefTextNode,
  RefTextNodeSymbol,
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

function appendChilds(
  parent: HTMLElementExtended,
  listeners: ListenerMap | undefined,
  children: Array<RefElement | RefTextNode>
): void {
  function addEventIfMissing(
    element: HTMLElementExtended,
    eventType: EventType
  ) {
    const parentEventsUUIDCollection = parent.__eventUUIDCollection;
    const eventsUUIDCollection = element.__eventUUIDCollection;

    if (!parentEventsUUIDCollection) return;

    if (
      (eventsUUIDCollection &&
        !eventsUUIDCollection.hasOwnProperty(eventType)) ||
      !eventsUUIDCollection
    ) {
      inheritOn(eventType, element, parent);
    }

    if (
      element.__eventUUIDCollection &&
      (parentEventsUUIDCollection.hasOwnProperty("mouseenter") ||
        parentEventsUUIDCollection.hasOwnProperty("mouseleave"))
    ) {
      element.__eventUUIDCollection.__refEventsUUID.inherit =
        parentEventsUUIDCollection.__refEventsUUID.own;
    }
  }

  function appendChildToParent(child: RefElement | RefTextNode) {
    parent.appendChild(child.node);

    if (child.$$type === RefElementSymbol) {
      for (const eventType in listeners) {
        addEventIfMissing(child.node, eventType as EventType);
      }
      child.append(listeners);
    }
  }

  for (const child of children) {
    appendChildToParent(child);
  }
}

function createRefElement(
  node: HTMLElementExtended,
  listeners: ListenerMap,
  children: Array<RefElement | RefTextNode>
): RefElement {
  let childRefs: Map<string, RefElement | RefTextNode | undefined> | null =
    null;

  const append = (
    inheritListeners: ListenerMap | undefined,
    ...newChildren: Array<RefElement | RefTextNode>
  ) => {
    appendChilds(
      node,
      inheritListeners ?? listeners,
      newChildren.length ? newChildren : children
    );
  };

  const storeChildRef = (...refs: Array<CurrentRefNode>) => {
    if (!childRefs)
      childRefs = new Map<string, RefElement | RefTextNode | undefined>();
    for (const ref of refs) {
      if (!ref.key) {
        throw new Error(
          "If you want to store a reference to a child node inside the parent, it is essential to assign a key to that reference."
        );
      }
      childRefs.set(ref.key, ref.value);
    }
  };

  const getChildRef = (key: string) => {
    if (!childRefs) return;
    return childRefs.get(key);
  };

  return {
    node,
    append,
    storeChildRef,
    getChildRef,
    $$type: RefElementSymbol,
  };
}

function createRefTextNode(node: Text, text: string): RefTextNode {
  return {
    node,
    text,
    $$type: RefTextNodeSymbol,
  };
}

export function createTextNode(value: any, ref?: CurrentRefNode): RefTextNode {
  value = toStr(value);
  const node = __DOC__.createTextNode(value);
  const refTextNode = createRefTextNode(node, value);

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
  props?: RefElementProps | null,
  ...children: Array<RefElement | RefTextNode>
): RefElement {
  const node = __DOC__.createElement(type) as HTMLElementExtended;

  const ref = props?.ref;
  const attrs = props?.attrs ?? {};
  const listeners = props?.on ?? {};

  setAttrs(node, attrs);
  addListeners(node, listeners);
  appendChilds(node, listeners, children);

  const refElement = createRefElement(node, listeners, children);

  if (ref) {
    ref.value = refElement;
  }

  return refElement;
}
