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
  EventsUUIDCollection,
  EventListenerCollection,
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

const EVENT_UUID_COLLECTION = "__eventsUUIDCollection";

function createCustomListener(
  type: GlobalEventType,
  value: EventListenerCollection<keyof WindowEventMap>
): {
  type: GlobalEventType;
  value: EventListenerCollection<keyof WindowEventMap>;
} {
  return {
    type,
    value,
  };
}

function createEventController(
  ...listeners: Array<{
    type: GlobalEventType;
    value: EventListenerCollection<keyof WindowEventMap>;
  }>
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
      const eventsUUIDCollection = target.__eventsUUIDCollection;
      const mouseEnterUUID = eventsUUIDCollection?.mouseenter;
      const mouseLeaveUUID = eventsUUIDCollection?.mouseleave;

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

      this._emitListeners(ev, "mouseenter", mouseEnterUUID);
    },
    mouseLeaveController: (ev) => {
      const target = ev.target as HTMLElementExtended;

      const enteredCache = this._targetsCachedNodes.entered;
      const targetEvents = target.__eventsUUIDCollection;
      const cacheEvents = enteredCache?.__eventsUUIDCollection;
      const targetEnterEventUUID = targetEvents?.mouseenter;
      const targetLeaveEventUUID = targetEvents?.mouseleave;
      const cacheEnterEventUUID = cacheEvents?.mouseenter;
      const cacheLeaveEventUUID = cacheEvents?.mouseleave;

      // Si cacheTargets.entered no tiene elementos o el objetivo es el mismo, salir tempranamente.
      if (!enteredCache || target === enteredCache) {
        return;
      }

      // Verificar si el objetivo actual tiene colección de eventos y si no es un nodo capturador.
      if (!targetEvents?.eventCaptureKeys) {
        if (cacheLeaveEventUUID) {
          this._targetsCachedNodes.entered = null;
          this._emitListeners(ev, "mouseleave", cacheLeaveEventUUID);
        }
        return;
      }

      const targetRootCapture = targetEvents.eventCaptureKeys.root;
      const cacheRootCapture = cacheEvents?.eventCaptureKeys?.root;

      // Comprobar si las capturas de raíz son diferentes.
      if (cacheRootCapture !== targetRootCapture) {
        if (cacheLeaveEventUUID) {
          this._emitListeners(ev, "mouseleave", cacheLeaveEventUUID);
        }
        if (targetEnterEventUUID) {
          this._targetsCachedNodes.entered = null;
        }
        return;
      }

      const inheritedCapturesTarget =
        targetEvents.eventCaptureKeys.inheritedCaptures;
      const ownCaptureCache = cacheEvents?.eventCaptureKeys?.ownCapture;
      const inheritedCapturesCache =
        cacheEvents?.eventCaptureKeys?.inheritedCaptures;

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
        inheritedCapturesCache?.has(targetEvents.eventCaptureKeys.ownCapture)
      ) {
        this._targetsCachedNodes.entered = target;
        if (
          !cacheLeaveEventUUID ||
          cacheLeaveEventUUID === targetLeaveEventUUID
        ) {
          return;
        }
        this._emitListeners(ev, "mouseleave", cacheLeaveEventUUID);
      } else {
        // Caso de nodo hijo a hijo.
        cacheLeaveEventUUID &&
          !this._isInheritEvent(
            enteredCache,
            "mouseleave",
            cacheLeaveEventUUID
          ) &&
          this._emitListeners(ev, "mouseleave", cacheLeaveEventUUID);

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
      const eventUUID = target.__eventsUUIDCollection?.mousedraghold;

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

      const eventsUUIDCollection =
        this._targetsCachedNodes.hold.__eventsUUIDCollection;
      const eventUUID = eventsUUIDCollection?.mousedraghold;

      this._emitListeners(ev, "mousedraghold", eventUUID as any);
    },
  };

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
    node: HTMLElementExtended,
    eventType: GlobalEventType,
    eventUUID: UUID | undefined
  ): boolean {
    return (
      this._eventsListenerMap.get(eventType)?.get(eventUUID as UUID)?.node !==
      node
    );
  }

  private _configurateEventsUUID(
    node: HTMLElementExtended,
    eventType: GlobalEventType,
    uuid: UUID,
    parentRootCaptureKey: string | null = null,
    parentInheritedCaptureKey: Set<string> | null = null,
    parentOwnCaptureKey: string | null = null
  ): void {
    const isMouseEnterOrLeaveEvent =
      eventType === "mouseenter" || eventType === "mouseleave";
    const createEventCapture = () => ({
      root: randomKey(),
      inheritedCaptures: new Set<string>(),
      ownCapture: randomKey(),
    });
    if (!node.hasOwnProperty(EVENT_UUID_COLLECTION)) {
      // console.log(isMouseEnterOrLeaveEvent, node);
      // console.log({ eventType, node });
      // console.log("asdasdas");
      const eventsUUIDCollection: EventsUUIDCollection = {
        eventCaptureKeys: isMouseEnterOrLeaveEvent
          ? createEventCapture()
          : null,
      };

      Object.defineProperty(node, EVENT_UUID_COLLECTION, {
        value: eventsUUIDCollection,
        enumerable: false,
        configurable: false,
        writable: false,
      });
    }

    /**
     * div -> mouseenter.123 { own: key1, parent: null }
     *    div -> mouseenter.098 { own: key2, parent: [key1] }
     *      div -> mouseenter.098, mouseleave.456 { own: key3, parent: [key1, key2] }
     *        div -> { own: key45, [key1, key2, key3] }
     *      div -> mouseenter.098, mouseleave.735 { own: key3, parent: [key1, key2] }
     *
     * div -> mouseenter.723 { own: key9, parent: null }
     * div -> mouseenter.549 { own: key44, parent: null }
     *
     *
     * div -> mouseenter { root: 1, own: key1, parent: [key23, key67] }
     *    div -> null
     *
     *  cache.own === target.parent -> parent to child
     *  cache.parent === target.own -> child to parent
     *  else -> child to child
     */

    const eventsUUIDCollection = node.__eventsUUIDCollection;

    if (!eventsUUIDCollection) return;

    if (isMouseEnterOrLeaveEvent && !eventsUUIDCollection.eventCaptureKeys) {
      eventsUUIDCollection.eventCaptureKeys = createEventCapture();
    }

    if (
      eventsUUIDCollection.eventCaptureKeys &&
      isMouseEnterOrLeaveEvent &&
      parentRootCaptureKey &&
      parentInheritedCaptureKey &&
      parentOwnCaptureKey
    ) {
      eventsUUIDCollection.eventCaptureKeys.root = parentRootCaptureKey;
      eventsUUIDCollection.eventCaptureKeys.inheritedCaptures.add(
        parentOwnCaptureKey
      );

      for (const key of parentInheritedCaptureKey.keys()) {
        eventsUUIDCollection.eventCaptureKeys.inheritedCaptures.add(key);
      }
    }

    if (!eventsUUIDCollection.hasOwnProperty(eventType)) {
      eventsUUIDCollection[eventType] = uuid;
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

  private _emitListeners<T extends keyof WindowEventMap>(
    ev: WindowEventMap[T],
    eventType: GlobalEventType,
    eventUUID: UUID
  ): void {
    const listeners = this._eventsListenerMap
      .get(eventType)
      ?.get(eventUUID)?.listeners;

    listeners &&
      (listeners.length === 1
        ? listeners[0](ev)
        : listeners.forEach((handler) => {
            handler(ev);
          }));
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

    const eventsUUIDCollection = target.__eventsUUIDCollection;
    // @ts-ignore
    const eventUUID = eventsUUIDCollection[eventType];

    this._emitListeners(ev, eventType, eventUUID as any);
  }

  private _addCustomEvent(controllers: CustomListenerController): void {
    controllers.listeners.forEach((listener) => {
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
    });
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

    const interfaceMap = setToMap(
      this._eventsListenerMap,
      eventType,
      new Map()
    ).get(eventType);
    const eventUUID = node?.__eventsUUIDCollection?.[eventType];
    const hasNode = eventUUID && interfaceMap?.has(eventUUID);

    if (!hasNode) {
      const uuid = randomUUID();
      this._configurateEventsUUID(node, eventType, uuid);
      interfaceMap?.set(uuid, { node, listeners: [listener] });
    } else {
      interfaceMap?.get(eventUUID)?.listeners.push(listener);
    }
  }

  public addInheritEvent(
    eventType: GlobalEventType,
    node: HTMLElementExtended,
    parent: HTMLElementExtended
  ): void {
    const parentEventsUUIDCollection = parent?.__eventsUUIDCollection;
    const eventUUID = parentEventsUUIDCollection?.[eventType];
    if (!parentEventsUUIDCollection || !eventUUID) return;

    const parentRootCaptureKey =
      parentEventsUUIDCollection.eventCaptureKeys?.root;
    const parentInheritedCaptureKey =
      parentEventsUUIDCollection.eventCaptureKeys?.inheritedCaptures;
    const parentOwnCaptureKey =
      parentEventsUUIDCollection.eventCaptureKeys?.ownCapture;

    this._configurateEventsUUID(
      node,
      eventType,
      eventUUID,
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
        !(ev.target as HTMLElementExtended).__eventsUUIDCollection &&
        !(ev instanceof KeyboardEvent)
      )
        return;
      if (typeof callback === "function") {
        callback(ev);
      }
      this._handlerEventListener(ev);
    };
  }

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

const eventsFactory = EventsFactory.getFactory();

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
