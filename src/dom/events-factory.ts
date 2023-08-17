import {
  EventsFactoryData,
  HTMLElementExtended,
  EventMap,
  EventType,
  EventListener,
  CustomListeners,
  GlobalEventType,
  CustomEventType,
  CustomListenerController,
  EventsDataCollection,
  EventListenerCollection,
  EventCapture,
  CustomListenerControllerCollection,
  CustomListener,
  CallbackEventBundle,
  EventInterfaceMap,
} from "../types";

import { UUID } from "crypto";
import { randomKey, randomUUID, setToMap } from "../utilities";
import css, { remove } from "./css-factory";
import { __DOCBODY__, __DOC__ } from "../globals";

type TargetsCachedNodes = {
  focused: HTMLElementExtended | null;
  entered: HTMLElementExtended | null;
  hold: HTMLElementExtended | null;
};

type Controllers = {
  mouseEnterController: EventListener<EventType>;
  mouseLeaveController: EventListener<EventType>;
  mouseHoldController: EventListener<EventType>;
  mouseReleaseController: EventListener<EventType>;
  mouseDragController: EventListener<EventType>;
};

type ControllerEvents = Map<EventType, Array<EventListener<EventType>>>;

const EVENT_DATA_COLLECTION = "_eventsDataCollection";

function createCustomListener(
  type: GlobalEventType,
  value: EventListenerCollection<keyof WindowEventMap>
): CustomListener {
  return {
    type,
    value,
  };
}

function createEventController(
  ...listeners: CustomListenerControllerCollection
): CustomListenerController {
  return {
    isUse: false,
    listeners,
  };
}

class EventsFactory implements EventsFactoryData {
  private static _instance: EventsFactory;
  private readonly _eventsListenerMap: EventMap;
  private readonly _targetsCachedNodes: TargetsCachedNodes;
  private readonly _controllerEvents: ControllerEvents;
  private readonly _customListeners: CustomListeners;

  private readonly _controllers: Controllers = {
    mouseEnterController: (ev) => {
      // Si cacheTargets.entered ya tiene elementos, significa que se ha procesado un evento
      // de movimiento del mouse en algún elemento anteriormente. En esta situación, la función
      // mouseEnterController se detiene inmediatamente. La verificación de la presencia de
      // elementos en cacheTargets.entered evita procesar nuevamente la lógica de la función
      // cuando ya se ha identificado un elemento objetivo en eventos previos.
      const target = ev.target as HTMLElementExtended;
      const eventsDataCollection = target._eventsDataCollection;
      const mouseEnterUUID = eventsDataCollection?.mouseenter;
      const mouseLeaveUUID = eventsDataCollection?.mouseleave;

      if (
        this._targetsCachedNodes.entered ||
        (mouseEnterUUID && mouseLeaveUUID)
      )
        return;

      this._targetsCachedNodes.entered = target;

      // Si no hay evento "mouseenter" se debe salir.
      if (!mouseEnterUUID) {
        return;
      }

      this._emitListeners(
        ev,
        this._targetsCachedNodes.entered,
        "mouseenter",
        mouseEnterUUID
      );
    },
    mouseLeaveController: (ev) => {
      const target = ev.target as HTMLElementExtended;
      const enteredCache = this._targetsCachedNodes.entered;
      const targetEvents = target._eventsDataCollection;
      const cacheEvents = enteredCache?._eventsDataCollection;

      // Si cacheTargets.entered no tiene elementos o el objetivo es el mismo, salir tempranamente.
      if (!enteredCache || target === enteredCache) {
        return;
      }

      // Verificar si el objetivo actual tiene colección de eventos y si no es un nodo capturador.
      if (!targetEvents?._eventCaptureKeys) {
        this._handleNonCapturingNode(ev, enteredCache);
        return;
      }

      this._handleCapturingNode(
        ev,
        enteredCache,
        target,
        targetEvents,
        cacheEvents
      );
    },
    mouseHoldController: (ev) => {
      const target = ev.target as HTMLElementExtended;
      const eventUUID = target._eventsDataCollection?.mousedraghold;

      if (!eventUUID) return;

      css({ userSelect: "none" }).from(__DOCBODY__);

      this._targetsCachedNodes.hold = target;
    },
    mouseReleaseController: (ev) => {
      if (!this._targetsCachedNodes.hold) return;

      remove("userSelect").from(__DOCBODY__);

      this._targetsCachedNodes.hold = null;
    },
    mouseDragController: (ev) => {
      if (!this._targetsCachedNodes.hold) return;

      const eventsDataCollection =
        this._targetsCachedNodes.hold._eventsDataCollection;
      const eventUUID = eventsDataCollection?.mousedraghold;

      this._emitListeners(
        ev,
        this._targetsCachedNodes.hold,
        "mousedraghold",
        eventUUID as any
      );
    },
  };

  private _handleNonCapturingNode(
    ev: WindowEventMap[EventType],
    enteredCache: HTMLElementExtended
  ): void {
    const cacheLeaveEventUUID = enteredCache._eventsDataCollection?.mouseleave;

    if (cacheLeaveEventUUID) {
      this._targetsCachedNodes.entered = null;
      this._emitListeners(ev, enteredCache, "mouseleave", cacheLeaveEventUUID);
    }
  }

  private _handleCapturingNode(
    ev: WindowEventMap[EventType],
    enteredCache: HTMLElementExtended,
    target: HTMLElementExtended,
    targetEvents: EventsDataCollection,
    cacheEvents: EventsDataCollection | undefined
  ): void {
    const targetRootCapture = targetEvents._eventCaptureKeys?.root;
    const cacheRootCapture = cacheEvents?._eventCaptureKeys?.root;

    // Comprobar si las capturas de raíz son diferentes.
    if (cacheRootCapture !== targetRootCapture) {
      this._handleDifferentRootCaptures(ev, enteredCache, targetEvents);
      return;
    }

    this._handleSameRootCaptures(
      ev,
      enteredCache,
      target,
      targetEvents,
      cacheEvents
    );
  }

  private _handleDifferentRootCaptures(
    ev: WindowEventMap[EventType],
    enteredCache: HTMLElementExtended,
    targetEvents: EventsDataCollection
  ): void {
    const cacheLeaveEventUUID = enteredCache._eventsDataCollection?.mouseleave;

    if (cacheLeaveEventUUID) {
      this._emitListeners(ev, enteredCache, "mouseleave", cacheLeaveEventUUID);
    }

    if (targetEvents.mouseenter) {
      this._targetsCachedNodes.entered = null;
    }
  }

  private _handleSameRootCaptures(
    ev: WindowEventMap[EventType],
    enteredCache: HTMLElementExtended,
    target: HTMLElementExtended,
    targetEvents: EventsDataCollection,
    cacheEvents: EventsDataCollection | undefined
  ): void {
    const inheritedCapturesTarget =
      targetEvents._eventCaptureKeys?.inheritedCaptures;
    const ownCaptureCache = cacheEvents?._eventCaptureKeys?.ownCapture;
    const inheritedCapturesCache =
      cacheEvents?._eventCaptureKeys?.inheritedCaptures;

    // Verificar capturas de padre a hijo.
    if (inheritedCapturesTarget?.has(ownCaptureCache ?? "")) {
      this._handleParentToChildCapture(enteredCache, target, targetEvents);
    } else if (
      inheritedCapturesCache?.has(
        targetEvents._eventCaptureKeys?.ownCapture ?? ""
      )
    ) {
      this._handleChildToParentCapture(ev, enteredCache, target, targetEvents);
    } else {
      // Caso de nodo hijo a hijo.
      this._handleSiblingNodes(ev, enteredCache, target, targetEvents);
    }
  }

  private _handleParentToChildCapture(
    enteredCache: HTMLElementExtended,
    target: HTMLElementExtended,
    targetEvents: EventsDataCollection
  ): void {
    const targetEnterEventUUID = targetEvents?.mouseenter;
    const cacheEnterEventUUID = enteredCache._eventsDataCollection?.mouseenter;

    if (!targetEnterEventUUID || targetEnterEventUUID === cacheEnterEventUUID) {
      this._targetsCachedNodes.entered = target;
      return;
    }

    this._targetsCachedNodes.entered = null;
  }

  private _handleChildToParentCapture(
    ev: WindowEventMap[EventType],
    enteredCache: HTMLElementExtended,
    target: HTMLElementExtended,
    targetEvents: EventsDataCollection
  ): void {
    const cacheLeaveEventUUID = enteredCache._eventsDataCollection?.mouseleave;
    const targetLeaveEventUUID = targetEvents?.mouseleave;

    this._targetsCachedNodes.entered = target;

    if (!cacheLeaveEventUUID || cacheLeaveEventUUID === targetLeaveEventUUID) {
      return;
    }

    this._emitListeners(ev, enteredCache, "mouseleave", cacheLeaveEventUUID);
  }

  private _handleSiblingNodes(
    ev: WindowEventMap[EventType],
    enteredCache: HTMLElementExtended,
    target: HTMLElementExtended,
    targetEvents: EventsDataCollection
  ): void {
    const cacheLeaveEventUUID = enteredCache._eventsDataCollection?.mouseleave;

    if (
      cacheLeaveEventUUID &&
      !this._isInheritEvent(
        enteredCache._eventsDataCollection._uniqueNodeEventKey,
        "mouseleave",
        cacheLeaveEventUUID
      )
    ) {
      this._emitListeners(ev, enteredCache, "mouseleave", cacheLeaveEventUUID);
    }

    const targetEnterEventUUID = targetEvents?.mouseenter;

    if (
      targetEnterEventUUID &&
      !this._isInheritEvent(
        targetEvents._uniqueNodeEventKey,
        "mouseenter",
        targetEnterEventUUID
      )
    ) {
      this._targetsCachedNodes.entered = null;
      return;
    }

    this._targetsCachedNodes.entered = target;
  }

  private constructor() {
    this._eventsListenerMap = new Map();
    this._targetsCachedNodes = {
      focused: null,
      entered: null,
      hold: null,
    };
    this._controllerEvents = new Map();

    const mouseEnterAndLeaveControllers = createEventController(
      createCustomListener("mousemove", [
        this._controllers.mouseEnterController,
        this._controllers.mouseLeaveController,
      ])
    );

    this._customListeners = {
      mouseenter: mouseEnterAndLeaveControllers,
      mouseleave: mouseEnterAndLeaveControllers,
      mousedraghold: createEventController(
        createCustomListener("mousedown", [
          this._controllers.mouseHoldController,
        ]),
        createCustomListener("mouseup", [
          this._controllers.mouseReleaseController,
        ]),
        createCustomListener("mousemove", [
          this._controllers.mouseDragController,
        ])
      ),
    };
  }

  private _isInheritEvent(
    eventNodeKey: string,
    eventType: GlobalEventType,
    eventUUID: UUID | undefined
  ): boolean {
    return (
      this._eventsListenerMap.get(eventType)?.get(eventUUID as UUID)
        ?.eventNodeKey !== eventNodeKey
    );
  }

  private _createEventCapture(): EventCapture {
    return {
      root: randomKey(),
      inheritedCaptures: new Set<string>(),
      ownCapture: randomKey(),
    };
  }

  private _ensureEventsDataCollection(
    node: HTMLElementExtended,
    uniqueNodeEventKey: string | null = null,
    cbArgs: { [key: string]: Array<any> } | null = null
  ): EventsDataCollection {
    if (!node.hasOwnProperty(EVENT_DATA_COLLECTION)) {
      const eventsDataCollection: EventsDataCollection = {
        _eventCaptureKeys: null,
        _uniqueNodeEventKey: uniqueNodeEventKey ?? randomUUID(),
        _cbArgs: cbArgs,
      };

      Object.defineProperty(node, EVENT_DATA_COLLECTION, {
        value: eventsDataCollection,
        enumerable: false,
        configurable: false,
        writable: false,
      });
    }

    // @ts-ignore
    cbArgs && Object.assign(node._eventsDataCollection._cbArgs, cbArgs);

    // @ts-ignore
    return node._eventsDataCollection;
  }

  private _configEventsUUID(
    node: HTMLElementExtended,
    eventType: GlobalEventType,
    uuid: UUID,
    uniqueNodeEventKey: string | null = null,
    cbArgs: { [key: string]: Array<any> } | null = null,
    parentRootCaptureKey: string | null = null,
    parentInheritedCaptureKey: Set<string> | null = null,
    parentOwnCaptureKey: string | null = null
  ): void {
    const isMouseEnterOrLeaveEvent =
      eventType === "mouseenter" || eventType === "mouseleave";

    const eventsDataCollection = this._ensureEventsDataCollection(
      node,
      uniqueNodeEventKey,
      cbArgs
    );

    if (isMouseEnterOrLeaveEvent && !eventsDataCollection._eventCaptureKeys) {
      eventsDataCollection._eventCaptureKeys = this._createEventCapture();
    }

    if (
      eventsDataCollection._eventCaptureKeys &&
      isMouseEnterOrLeaveEvent &&
      parentRootCaptureKey &&
      parentInheritedCaptureKey &&
      parentOwnCaptureKey
    ) {
      const { _eventCaptureKeys: eventCaptureKeys } = eventsDataCollection;
      eventCaptureKeys.root = parentRootCaptureKey;
      eventCaptureKeys.inheritedCaptures.add(parentOwnCaptureKey);

      for (const key of parentInheritedCaptureKey.keys()) {
        eventCaptureKeys.inheritedCaptures.add(key);
      }
    }

    if (!eventsDataCollection.hasOwnProperty(eventType)) {
      eventsDataCollection[eventType] = uuid;
    }
  }

  private _addControllerFocusedNode(): void {
    if (!EventsFactory._instance) return;

    addListener(
      __DOC__,
      "click",
      this.eventTriggerEmitter((ev: any) => {
        this._targetsCachedNodes.focused = ev.target as HTMLElementExtended;
      })
    );

    setToMap(this._eventsListenerMap, "click", new Map());
  }

  private _invokeListenerWithArgsIfHas(
    ev: WindowEventMap[EventType],
    node: HTMLElementExtended,
    listener: EventListener<EventType>
  ): void {
    const args = node._eventsDataCollection?._cbArgs;
    if (!args || !listener._cbEventBundle) {
      listener(ev);
      return;
    }

    const cbArgs = args[listener._cbEventBundle.key];
    if (cbArgs) {
      listener.apply(null, [ev, ...cbArgs]);
    }
  }

  private _emitListeners<T extends keyof WindowEventMap>(
    ev: WindowEventMap[T],
    node: HTMLElementExtended,
    eventType: GlobalEventType,
    eventUUID: UUID
  ): void {
    const listeners = this._eventsListenerMap
      .get(eventType)
      ?.get(eventUUID)?.listeners;

    listeners &&
      (listeners.length === 1
        ? this._invokeListenerWithArgsIfHas(ev, node, listeners[0])
        : listeners.forEach((handler) =>
            this._invokeListenerWithArgsIfHas(ev, node, handler)
          ));
  }

  private _emitCustomListeners<T extends keyof WindowEventMap>(
    ev: WindowEventMap[T],
    eventType: EventType
  ): void {
    this._controllerEvents
      .get(eventType)
      ?.forEach((listener) => typeof listener === "function" && listener(ev));
  }

  private _handlerEventListener<T extends keyof WindowEventMap>(
    ev: WindowEventMap[T]
  ): void {
    const target =
      ev instanceof KeyboardEvent
        ? this._targetsCachedNodes.focused
        : (ev.target as HTMLElementExtended);
    const eventType = ev.type as EventType;

    if (target === null) return;

    const eventsDataCollection = target._eventsDataCollection;
    // @ts-ignore
    const eventUUID = eventsDataCollection[eventType];

    this._emitListeners(ev, target, eventType, eventUUID as any);
  }

  private _setupCustomEvent(listener: CustomListener): void {
    const type = listener.type;

    if (!this._eventsListenerMap.has(type)) {
      addListener(
        __DOC__,
        type,
        this.eventTriggerEmitter((ev: any) =>
          this._emitCustomListeners(ev, type as EventType)
        )
      );
      this._eventsListenerMap.set(type, new Map());
    }

    setToMap(this._controllerEvents, type, [])
      .get(type)
      ?.push(...listener.value);
  }

  private _addCustomEvent(controllers: CustomListenerController): void {
    const listeners = controllers.listeners;

    listeners.length === 1
      ? this._setupCustomEvent(listeners[0])
      : controllers.listeners.forEach((listener) =>
          this._setupCustomEvent(listener)
        );
  }

  private _configCustomEvents(customEventType: CustomEventType) {
    const controllers = this._customListeners[customEventType];

    if (controllers && !controllers.isUse) {
      this._addCustomEvent(controllers);
      controllers.isUse = true;
    }
  }

  private _getInterfaceEventMap(
    eventType: GlobalEventType
  ): EventInterfaceMap<EventType> | undefined {
    return setToMap(this._eventsListenerMap, eventType, new Map()).get(
      eventType
    );
  }

  private _hasNode(
    eventUUID: UUID | undefined,
    interfaceEventMap: EventInterfaceMap<EventType> | undefined
  ): boolean {
    return !!(eventUUID && interfaceEventMap?.has(eventUUID));
  }

  private _handleNewNode(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    listener: EventListener<EventType>,
    listenerCbEventBundle: CallbackEventBundle | undefined,
    interfaceEventMap: EventInterfaceMap<EventType> | undefined
  ): void {
    if (!listenerCbEventBundle) {
      const uuid = randomUUID();
      this._configEventsUUID(node, eventType, uuid);
      interfaceEventMap?.set(uuid, {
        // @ts-ignore
        eventNodeKey: node._eventsDataCollection._uniqueNodeEventKey,
        listeners: [listener],
      });
    } else {
      this._handleNewNodeWithBundle(
        eventType,
        node,
        listener,
        listenerCbEventBundle,
        interfaceEventMap
      );
    }
  }

  private _handleNewNodeWithBundle(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    listener: EventListener<EventType>,
    listenerCbEventBundle: CallbackEventBundle,
    interfaceEventMap: EventInterfaceMap<EventType> | undefined
  ): void {
    if (!listenerCbEventBundle.eventType || !listenerCbEventBundle.eventUUID) {
      listenerCbEventBundle.eventType = eventType;
      listenerCbEventBundle.eventUUID = randomUUID();
      interfaceEventMap?.set(listenerCbEventBundle.eventUUID, {
        eventNodeKey: randomKey(),
        listeners: [listener],
      });
    }

    const eventNodeKey = interfaceEventMap?.get(
      listenerCbEventBundle.eventUUID
    )?.eventNodeKey;
    const cbArgs = node._eventsDataCollection?._cbArgs ?? {};

    cbArgs[listenerCbEventBundle.key] = listener._args ?? [];

    this._configEventsUUID(
      node,
      listenerCbEventBundle.eventType,
      listenerCbEventBundle.eventUUID,
      eventNodeKey,
      cbArgs
    );
  }

  private _handleExistingNode(
    eventUUID: UUID | undefined,
    listener: EventListener<EventType>,
    interfaceEventMap: EventInterfaceMap<EventType> | undefined
  ): void {
    eventUUID && interfaceEventMap?.get(eventUUID)?.listeners.push(listener);
  }

  public addEvent(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    listener: EventListener<EventType>
  ): void {
    if (this.isCustomEvent(eventType)) {
      this._configCustomEvents(eventType as CustomEventType);
    }

    const listenerCbEventBundle = listener._cbEventBundle;
    const interfaceEventMap = this._getInterfaceEventMap(eventType);
    const eventUUID = node._eventsDataCollection?.[eventType];

    if (!this._hasNode(eventUUID, interfaceEventMap)) {
      this._handleNewNode(
        eventType,
        node,
        listener,
        listenerCbEventBundle,
        interfaceEventMap
      );
    } else {
      this._handleExistingNode(eventUUID, listener, interfaceEventMap);
    }
  }

  public addInheritEvent(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    parent: HTMLElementExtended
  ): void {
    const parentEventsDataCollection = parent?._eventsDataCollection;
    const eventUUID = parentEventsDataCollection?.[eventType];

    if (!parentEventsDataCollection || !eventUUID) return;

    const parentRootCaptureKey =
      parentEventsDataCollection._eventCaptureKeys?.root;
    const parentInheritedCaptureKey =
      parentEventsDataCollection._eventCaptureKeys?.inheritedCaptures;
    const parentOwnCaptureKey =
      parentEventsDataCollection._eventCaptureKeys?.ownCapture;

    this._configEventsUUID(
      node,
      eventType,
      eventUUID,
      null,
      parentEventsDataCollection._cbArgs,
      parentRootCaptureKey,
      parentInheritedCaptureKey,
      parentOwnCaptureKey
    );
  }

  public hasEvent(eventType: GlobalEventType): boolean {
    return this._eventsListenerMap.has(eventType);
  }

  public isCustomEvent(eventType: GlobalEventType): boolean {
    return Object.keys(this._customListeners).includes(eventType);
  }

  public eventTriggerEmitter(
    callback?: Function
  ): <T extends keyof WindowEventMap>(ev: WindowEventMap[T]) => void {
    return (ev) => {
      if (
        !(ev.target as HTMLElementExtended)._eventsDataCollection &&
        !(ev instanceof KeyboardEvent)
      )
        return;
      if (typeof callback === "function") {
        callback(ev);
      }
      this._handlerEventListener(ev);
    };
  }

  // TODO: implementar
  public removeEvent(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    listener?: EventListener<EventType>
  ): boolean {
    if (!this._eventsListenerMap.has(eventType)) return false;

    console.log(this._eventsListenerMap);

    return true;
  }

  public static getFactory(): EventsFactory {
    let instance = EventsFactory._instance;

    if (!instance) {
      instance = EventsFactory._instance = new EventsFactory();
      instance._addControllerFocusedNode();
    }

    return instance;
  }
}

declare global {
  interface Window {
    fac: any;
  }
}

const eventsFactory = EventsFactory.getFactory();

window.fac = eventsFactory;

function addListener(
  node: HTMLElementExtended | Document,
  eventType: GlobalEventType,
  handler: EventListener<EventType>,
  options?: boolean | AddEventListenerOptions | undefined
): void {
  node &&
    node.addEventListener &&
    node.addEventListener(eventType, handler, options);
}

export function on(
  eventType: GlobalEventType,
  node: HTMLElementExtended | Document,
  listener: EventListener<EventType>,
  ignoreDocument: boolean = false
): void {
  if (ignoreDocument) {
    addListener(node, eventType, listener);
    return;
  }

  if (
    !eventsFactory.hasEvent(eventType) &&
    !eventsFactory.isCustomEvent(eventType)
  ) {
    addListener(__DOC__, eventType, eventsFactory.eventTriggerEmitter());
  }

  if (node instanceof HTMLElement)
    eventsFactory.addEvent(eventType, node, listener);
}

export function off(
  eventType: GlobalEventType,
  node: HTMLElementExtended,
  listener?: EventListener<EventType>
): void {
  eventsFactory.removeEvent(eventType, node, listener);
}

export function inheritOn(
  eventType: GlobalEventType,
  node: HTMLElementExtended,
  parent: HTMLElementExtended
): any {
  eventsFactory.addInheritEvent(eventType, node, parent);
}

export function cb(callback: Function) {
  const eventBundle = {
    key: randomKey(),
    eventType: null,
    eventUUID: null,
  };

  return function (...args: any) {
    const wrapper: EventListener<EventType> = (...args: any) => {
      callback.apply(null, args);
    };

    if (!wrapper._cbEventBundle) {
      wrapper._cbEventBundle = eventBundle;
    }

    wrapper._args = args;

    return wrapper;
  };
}
