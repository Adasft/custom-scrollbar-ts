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
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    parent: HTMLElementExtended
  ): void;
  hasEvent(eventType: GlobalEventType): boolean;
  isCustomEvent(eventType: GlobalEventType): boolean;
}

export interface HTMLElementExtended extends HTMLElement {
  readonly __eventUUIDCollection?: EventsUUIDCollection;
}

// export interface HTMLElementExtended extends HTMLElement, ElementExtended {}

type EventsUUID = {
  [eventType in GlobalEventType]?: UUID;
};

export type EventsUUIDCollection = EventsUUID & {
  __refEventsUUID: { inherit: UUID | undefined; own: UUID | undefined };
};

export type CustomListenerController = {
  isUse: boolean;
  listeners: Array<{
    type: GlobalEventType;
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

export type GlobalEventType = EventType | CustomEventType;

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
  GlobalEventType,
  EventInterfaceMap<Exclude<GlobalEventType, "mousedraghold">>
>;

export type ListenerMap = {
  [eventType in GlobalEventType]?: EventListener<EventType>;
};

export type AttrsMap = {
  [attr: string]: string | undefined;
};

export type CurrentRefNode = {
  key: string | undefined;
  value: InteractiveElement | InteractiveTextNode | undefined;
};

export type InteractiveElementProps = {
  ref?: CurrentRefNode;
  attrs?: AttrsMap;
  on?: ListenerMap;
};

export const InteractiveElementSymbol = Symbol.for("int-element");
export const InteractiveTextNodeSymbol = Symbol.for("int-text-node");

export type InteractiveElement = {
  readonly node: HTMLElementExtended;
  readonly $$type: typeof InteractiveElementSymbol;
  append: (
    inheritListeners: ListenerMap | undefined,
    ...newChildren: Array<InteractiveElement | InteractiveTextNode>
  ) => void;
};

export type InteractiveTextNode = {
  readonly node: Text;
  readonly $$type: typeof InteractiveTextNodeSymbol;
};
