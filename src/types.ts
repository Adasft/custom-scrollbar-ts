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
  readonly _eventsDataCollection?: EventsDataCollection;
}

// export interface HTMLElementExtended extends HTMLElement, ElementExtended {}

type EventsUUID = {
  [eventType in GlobalEventType]?: UUID;
};

export type EventCapture = {
  inheritedCaptures: Set<string>;
  ownCapture: string;
  root: string;
};

export type EventsDataCollection = EventsUUID & {
  _eventCaptureKeys: EventCapture | null;
  _uniqueNodeEventId: UUID;
  _cbArgs: { [key: string]: Array<any> } | null;
};

export type CustomListener = {
  type: GlobalEventType;
  value: EventListenerCollection<keyof WindowEventMap>;
};

export type CustomListenerControllerCollection = Array<CustomListener>;

export type CustomListenerController = {
  isUse: boolean;
  listeners: CustomListenerControllerCollection;
};

export type CustomListeners = {
  mouseenter?: CustomListenerController;
  mouseleave?: CustomListenerController;
  mousedraghold?: CustomListenerController;
};

export type EventType = keyof WindowEventMap;
export type CustomEventType = keyof CustomListeners;

export type GlobalEventType = EventType | CustomEventType;

export type CallbackEventBundle = {
  key: string;
  eventType: GlobalEventType | null;
  eventUUID: UUID | null;
};

export type EventListener<T extends EventType> = {
  (ev: WindowEventMap[T]): any;
  _cbEventBundle?: CallbackEventBundle;
  _args?: Array<any>;
};

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
  key: string | null;
  value: InteractiveElement | InteractiveTextNode | null;
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
    inheritListeners: ListenerMap | null,
    ...newChildren: Array<InteractiveElement | InteractiveTextNode>
  ) => void;
};

export type InteractiveTextNode = {
  readonly node: Text;
  readonly $$type: typeof InteractiveTextNodeSymbol;
};
