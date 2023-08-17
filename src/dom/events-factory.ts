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
  private readonly _cbEventBundleSet: Set<CallbackEventBundle>;
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
        !(mouseEnterUUID || mouseLeaveUUID)
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
      const targetEnterEventUUID = targetEvents?.mouseenter;
      const targetLeaveEventUUID = targetEvents?.mouseleave;
      const cacheEnterEventUUID = cacheEvents?.mouseenter;
      const cacheLeaveEventUUID = cacheEvents?.mouseleave;

      // Si cacheTargets.entered no tiene elementos o el objetivo es el mismo, salir tempranamente.
      if (!enteredCache || target === enteredCache) {
        return;
      }

      // Verificar si el objetivo actual tiene colección de eventos y si no es un nodo capturador.
      if (!targetEvents?._eventCaptureKeys) {
        if (cacheLeaveEventUUID) {
          this._targetsCachedNodes.entered = null;
          this._emitListeners(
            ev,
            enteredCache,
            "mouseleave",
            cacheLeaveEventUUID
          );
        }
        return;
      }

      const targetRootCapture = targetEvents._eventCaptureKeys.root;
      const cacheRootCapture = cacheEvents?._eventCaptureKeys?.root;

      // Comprobar si las capturas de raíz son diferentes.
      if (cacheRootCapture !== targetRootCapture) {
        if (cacheLeaveEventUUID) {
          this._emitListeners(
            ev,
            enteredCache,
            "mouseleave",
            cacheLeaveEventUUID
          );
        }
        if (targetEnterEventUUID) {
          this._targetsCachedNodes.entered = null;
        }
        return;
      }

      const inheritedCapturesTarget =
        targetEvents._eventCaptureKeys.inheritedCaptures;
      const ownCaptureCache = cacheEvents?._eventCaptureKeys?.ownCapture;
      const inheritedCapturesCache =
        cacheEvents?._eventCaptureKeys?.inheritedCaptures;

      // Verificar capturas de padre a hijo.
      if (inheritedCapturesTarget.has(ownCaptureCache ?? "")) {
        if (
          !targetEnterEventUUID ||
          targetEnterEventUUID === cacheEnterEventUUID
        ) {
          this._targetsCachedNodes.entered = target;
          return;
        }
        this._targetsCachedNodes.entered = null;
      } else if (
        inheritedCapturesCache?.has(targetEvents._eventCaptureKeys.ownCapture)
      ) {
        this._targetsCachedNodes.entered = target;
        if (
          !cacheLeaveEventUUID ||
          cacheLeaveEventUUID === targetLeaveEventUUID
        ) {
          return;
        }
        this._emitListeners(
          ev,
          enteredCache,
          "mouseleave",
          cacheLeaveEventUUID
        );
      } else {
        // Caso de nodo hijo a hijo.
        cacheLeaveEventUUID &&
          !this._isInheritEvent(
            enteredCache,
            "mouseleave",
            cacheLeaveEventUUID
          ) &&
          this._emitListeners(
            ev,
            enteredCache,
            "mouseleave",
            cacheLeaveEventUUID
          );

        if (
          targetEnterEventUUID &&
          !this._isInheritEvent(target, "mouseenter", targetEnterEventUUID)
        ) {
          this._targetsCachedNodes.entered = null;
          return;
        }

        this._targetsCachedNodes.entered = target;
      }
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

  private constructor() {
    this._eventsListenerMap = new Map();
    this._cbEventBundleSet = new Set();
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
    node: HTMLElementExtended,
    eventType: GlobalEventType,
    eventUUID: UUID | undefined
  ): boolean {
    return (
      this._eventsListenerMap.get(eventType)?.get(eventUUID as UUID)?.node !==
      node
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
    cbArgs: { [key: string]: Array<any> } | null = null
  ): EventsDataCollection {
    if (!node.hasOwnProperty(EVENT_DATA_COLLECTION)) {
      const eventsDataCollection: EventsDataCollection = {
        _eventCaptureKeys: null,
        _uniqueNodeEventId: randomUUID(),
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
    return node._eventsDataCollection;
  }

  private _configEventsUUID(
    node: HTMLElementExtended,
    eventType: GlobalEventType,
    uuid: UUID,
    cbArgs: { [key: string]: Array<any> } | null = null,
    parentRootCaptureKey: string | null = null,
    parentInheritedCaptureKey: Set<string> | null = null,
    parentOwnCaptureKey: string | null = null
  ): void {
    const isMouseEnterOrLeaveEvent =
      eventType === "mouseenter" || eventType === "mouseleave";

    const eventsDataCollection = this._ensureEventsDataCollection(node, cbArgs);

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

  public addEvent(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    listener: EventListener<EventType>
  ): void {
    if (this.isCustomEvent(eventType)) {
      this._configCustomEvents(eventType as CustomEventType);
    }

    const listenerCbEventBundle = listener._cbEventBundle;
    const interfaceEventMap = this.getInterfaceEventMap(eventType);
    const eventUUID = node._eventsDataCollection?.[eventType];

    if (!this.hasNode(eventUUID, interfaceEventMap)) {
      this.handleNewNode(
        eventType,
        node,
        listener,
        listenerCbEventBundle,
        interfaceEventMap
      );
    } else {
      this.handleExistingNode(eventUUID, listener, interfaceEventMap);
    }
  }

  private getInterfaceEventMap(
    eventType: GlobalEventType
  ): Map<string, any> | undefined {
    return setToMap(this._eventsListenerMap, eventType, new Map()).get(
      eventType
    );
  }

  private hasNode(
    eventUUID: string | undefined,
    interfaceEventMap: Map<string, any> | undefined
  ): boolean {
    return !!(eventUUID && interfaceEventMap?.has(eventUUID));
  }

  private handleNewNode(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    listener: EventListener<EventType>,
    listenerCbEventBundle: any,
    interfaceEventMap: Map<string, any> | undefined
  ): void {
    if (!listenerCbEventBundle) {
      const uuid = randomUUID();
      this._configEventsUUID(node, eventType, uuid);
      interfaceEventMap?.set(uuid, { node, listeners: [listener] });
    } else {
      this.handleNewNodeWithBundle(
        eventType,
        node,
        listener,
        listenerCbEventBundle,
        interfaceEventMap
      );
    }
  }

  private handleNewNodeWithBundle(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    listener: EventListener<EventType>,
    listenerCbEventBundle: any,
    interfaceEventMap: Map<string, any> | undefined
  ): void {
    const eventBundle = Array.from(this._cbEventBundleSet).find(
      (bundle: CallbackEventBundle) => bundle.key === listenerCbEventBundle.key
    );

    if (!eventBundle) return;

    if (!eventBundle.eventType || !eventBundle.eventUUID) {
      eventBundle.eventType = eventType;
      eventBundle.eventUUID = randomUUID();
      interfaceEventMap?.set(eventBundle.eventUUID, {
        node,
        listeners: [listener],
      });
    }

    this._configEventsUUID(node, eventBundle.eventType, eventBundle.eventUUID, {
      [eventBundle.key]: listener._args ?? [],
    });
  }

  private handleExistingNode(
    eventUUID: string | undefined,
    listener: EventListener<EventType>,
    interfaceEventMap: Map<string, any> | undefined
  ): void {
    eventUUID && interfaceEventMap?.get(eventUUID)?.listeners.push(listener);
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

  public logCallbackEventBundle(eventBundle: CallbackEventBundle): void {
    this._cbEventBundleSet.add(eventBundle);
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

  eventsFactory.logCallbackEventBundle(eventBundle);

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
