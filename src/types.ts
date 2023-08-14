import { UUID } from "crypto";

export interface EventsFactoryData {
  eventTriggerEmitter(
    invokerFn?: Function
  ): <T extends keyof WindowEventMap>(ev: WindowEventMap[T]) => void;
  addEvent(
    eventType: EventType,
    node: HTMLElementExtended,
    listener: EventListener<EventType>
  ): void;
  addInheritEvent(
    eventType: UIEventType,
    node: HTMLElementExtended,
    parent: HTMLElementExtended
  ): void;
  hasEvent(eventType: UIEventType): boolean;
  isCustomEvent(eventType: UIEventType): boolean;
}

export interface HTMLElementExtended extends HTMLElement {
  readonly __eventUUIDCollection?: EventsUUIDCollection;
}

// export interface HTMLElementExtended extends HTMLElement, ElementExtended {}

type EventsUUID = {
  [eventType in UIEventType]?: UUID;
};

export type EventsUUIDCollection = EventsUUID & {
  __refEventsUUID: { inherit: UUID | undefined; own: UUID | undefined };
};

export type CustomListenerController = {
  isUse: boolean;
  listeners: Array<{
    type: UIEventType;
    value: Array<EventListener<keyof WindowEventMap>>;
  }>;
};

export type CustomListeners = {
  mouseenter?: CustomListenerController;
  mouseleave?: CustomListenerController;
  mousedraghold?: CustomListenerController;
};

export type EventType = keyof WindowEventMap;
export type CustomEventType = keyof CustomListeners;

export type UIEventType = EventType | CustomEventType;

export type EventListener<T extends EventType> = (ev: WindowEventMap[T]) => any;

export type EventListenerCollection<T extends EventType> = Array<
  EventListener<T>
>;

export type EventInterface<T extends EventType> = {
  node: HTMLElementExtended;
  listeners: EventListenerCollection<T>;
};

export type EventInterfaceMap<T extends EventType> = Map<
  UUID,
  EventInterface<T>
>;

export type EventMap = Map<
  UIEventType,
  EventInterfaceMap<Exclude<UIEventType, "mousedraghold">>
>;

export type ListenerMap = {
  [eventType in UIEventType]?: EventListener<EventType>;
};

export type AttrsMap = {
  [attr: string]: string | undefined;
};

export type CurrentRefNode = {
  key: string | undefined;
  value: RefElement | RefTextNode | undefined;
};

export type RefElementProps = {
  ref?: CurrentRefNode;
  attrs?: AttrsMap;
  on?: ListenerMap;
};

export const RefElementSymbol = Symbol.for("ref-element");
export const RefTextNodeSymbol = Symbol.for("ref-text-node");

export type RefElement = {
  readonly node: HTMLElementExtended;
  readonly $$type: typeof RefElementSymbol;
  append: (
    inheritListeners: ListenerMap | undefined,
    ...newChildren: Array<RefElement | RefTextNode>
  ) => void;
};

export type RefTextNode = {
  readonly node: Text;
  readonly text: string;
  readonly $$type: typeof RefTextNodeSymbol;
};
