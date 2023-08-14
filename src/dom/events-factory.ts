import {
  EventsFactoryData,
  HTMLElementExtended,
  EventMap,
  EventType,
  EventListener,
  CustomListeners,
  UIEventType,
  CustomEventType,
  CustomListenerController,
  EventsUUIDCollection,
  EventListenerCollection,
} from "../types";

import { UUID } from "crypto";
import { randomUUID, setToMap } from "../utilities";
import css, { remove } from "./css-factory";
import { __DOCBODY__, __DOC__ } from "../globals";

type TargetsCachedNodes = {
  focused: HTMLElementExtended | undefined;
  entered: HTMLElementExtended | undefined;
  hold: HTMLElementExtended | undefined;
};

type Controllers = {
  mouseEnterController: EventListener<EventType>;
  mouseLeaveController: EventListener<EventType>;
  mouseHoldController: EventListener<EventType>;
  mouseReleaseController: EventListener<EventType>;
  mouseDragController: EventListener<EventType>;
};

type ControllerEvents = Map<EventType, Array<EventListener<EventType>>>;

const EVENT_UUID_COLLECTION = "__eventUUIDCollection";

function createCustomListener(
  type: UIEventType,
  value: EventListenerCollection<keyof WindowEventMap>
): {
  type: UIEventType;
  value: EventListenerCollection<keyof WindowEventMap>;
} {
  return {
    type,
    value,
  };
}

function createEventController(
  ...listeners: Array<{
    type: UIEventType;
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
  private _shouldStopPropagation: boolean = false;

  private readonly _controllers: Controllers = {
    mouseEnterController: (ev) => {
      // Si cacheTargets.entered ya tiene elementos, significa que se ha procesado un evento
      // de movimiento del mouse en algún elemento anteriormente. En esta situación, la función
      // mouseEnterController se detiene inmediatamente. La verificación de la presencia de
      // elementos en cacheTargets.entered evita procesar nuevamente la lógica de la función
      // cuando ya se ha identificado un elemento objetivo en eventos previos.
      if (this._targetsCachedNodes.entered) return;

      const target = ev.target as HTMLElementExtended;
      const eventsUUIDCollection = target.__eventUUIDCollection;
      const mouseEnterUUID = eventsUUIDCollection?.mouseenter;

      // Establecer cacheTargets.entered al objetivo si tiene eventos "mouseenter" o "mouseleave".
      (eventsUUIDCollection?.mouseenter || eventsUUIDCollection?.mouseleave) &&
        (this._targetsCachedNodes.entered = target);

      // Si no hay evento "mouseenter" o se debe detener la propagación, salir.
      if (!mouseEnterUUID || this._shouldStopPropagation) {
        this._shouldStopPropagation = false;
        return;
      }

      this._emitListeners(ev, "mouseenter", mouseEnterUUID);
    },
    mouseLeaveController: (ev) => {
      // Si cacheTargets.entered no tiene elementos, se sale tempranamente de la función para evitar
      // procesamiento innecesario y optimizar el rendimiento cuando no hay un elemento objetivo válido.
      if (!this._targetsCachedNodes.entered) return;

      const target = ev.target as HTMLElementExtended;
      const targetEventsUUIDCollection = target.__eventUUIDCollection;
      const cacheEventsUUIDCollection =
        this._targetsCachedNodes.entered.__eventUUIDCollection;
      const targetEnterEventUUID = targetEventsUUIDCollection?.mouseenter;
      const targetLeaveEventUUID = targetEventsUUIDCollection?.mouseleave;
      const cacheEnterEventUUID = cacheEventsUUIDCollection?.mouseenter;
      const cacheLeaveEventUUID = cacheEventsUUIDCollection?.mouseleave;

      // Si el UUID del evento "leave" del elemento en caché es idéntico al UUID del evento "leave" del objetivo,
      // y además el UUID del evento "enter" del elemento en caché coincide con el del evento "enter" del objetivo,
      // se finaliza la ejecución de la función. Esta situación indica que el cursor del mouse se encuentra dentro
      // del mismo elemento que tiene el evento "MouseEnter" o "MouseLeave", lo que implica que no es necesario
      // invocar los controladores de eventos.
      if (
        cacheLeaveEventUUID === targetLeaveEventUUID &&
        cacheEnterEventUUID === targetEnterEventUUID
      ) {
        return;
      }

      // Determinar si el evento mouseenter se hereda en el elemento objetivo
      const isInheritingMouseEnter = this._isInheritEvent(
        target,
        "mouseenter",
        targetEnterEventUUID
      );
      // Determinar si el evento mouseleave se hereda en el elemento objetivo
      const isInheritingMouseLeave = this._isInheritEvent(
        target,
        "mouseleave",
        targetLeaveEventUUID
      );

      this._targetsCachedNodes.entered = undefined;

      const cacheInheritUUID =
        cacheEventsUUIDCollection?.__refEventsUUID.inherit;
      const cacheOwnUUID = cacheEventsUUIDCollection?.__refEventsUUID.own;
      const targetOwnUUID = targetEventsUUIDCollection?.__refEventsUUID.own;
      const targetInheritUUID =
        targetEventsUUIDCollection?.__refEventsUUID.inherit;

      // Verificar si la propagación es de hijo a padre
      if (
        cacheInheritUUID === targetOwnUUID ||
        (cacheInheritUUID === targetInheritUUID && !isInheritingMouseEnter)
      ) {
        this._shouldStopPropagation = true;
      }

      // Verificar si la propagación es de padre a hijo
      if (
        !cacheLeaveEventUUID ||
        cacheLeaveEventUUID === targetLeaveEventUUID ||
        cacheOwnUUID === targetInheritUUID ||
        (cacheInheritUUID === targetInheritUUID && isInheritingMouseLeave)
      ) {
        return;
      }

      this._emitListeners(ev, "mouseleave", cacheLeaveEventUUID);
    },
    mouseHoldController: (ev) => {
      const target = ev.target as HTMLElementExtended;
      const eventUUID = target.__eventUUIDCollection?.mousedraghold;

      if (!eventUUID) return;

      css({ userSelect: "none" }).from(__DOCBODY__);

      this._targetsCachedNodes.hold = target;
    },
    mouseReleaseController: (ev) => {
      if (!this._targetsCachedNodes.hold) return;

      remove("userSelect").from(__DOCBODY__);

      this._targetsCachedNodes.hold = undefined;
    },
    mouseDragController: (ev) => {
      if (!this._targetsCachedNodes.hold) return;

      const eventsUUIDCollection =
        this._targetsCachedNodes.hold.__eventUUIDCollection;
      const eventUUID = eventsUUIDCollection?.mousedraghold;

      this._emitListeners(ev, "mousedraghold", eventUUID as any);
    },
  };

  private constructor() {
    this._eventsListenerMap = new Map();
    this._targetsCachedNodes = {
      focused: undefined,
      entered: undefined,
      hold: undefined,
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
    eventType: UIEventType,
    eventUUID: UUID | undefined
  ): boolean {
    return (
      this._eventsListenerMap.get(eventType)?.get(eventUUID as UUID)?.node ===
      node
    );
  }

  private _configurateEventsUUID(
    node: HTMLElementExtended,
    eventType: UIEventType,
    uuid: UUID
  ): void {
    const emptyEventsUUID = (): EventsUUIDCollection => ({
      __refEventsUUID: { inherit: undefined, own: randomUUID() },
    });
    const eventsUUIDCollection = emptyEventsUUID();

    if (!node.hasOwnProperty(EVENT_UUID_COLLECTION)) {
      Object.defineProperty(node, EVENT_UUID_COLLECTION, {
        value: eventsUUIDCollection,
        enumerable: false,
        configurable: false,
        writable: false,
      });
    }

    (node.__eventUUIDCollection ?? eventsUUIDCollection)[eventType] = uuid;
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
    eventType: UIEventType,
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

  private _runCustomListeners<T extends keyof WindowEventMap>(
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

    if (
      target === undefined ||
      typeof target.__eventUUIDCollection === "undefined"
    )
      return;

    const eventsUUIDCollection = target.__eventUUIDCollection;
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
            this._runCustomListeners(ev, type as EventType)
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
    eventType: UIEventType,
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
    const eventUUID = node?.__eventUUIDCollection?.[eventType];
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
    eventType: UIEventType,
    node: HTMLElementExtended,
    parent: HTMLElementExtended
  ): void {
    const eventUUID = parent?.__eventUUIDCollection?.[eventType];
    if (typeof eventUUID === "undefined") return;
    this._configurateEventsUUID(node, eventType, eventUUID);
  }

  public hasEvent(eventType: UIEventType): boolean {
    return this._eventsListenerMap.has(eventType);
  }

  public isCustomEvent(eventType: UIEventType): boolean {
    return ["mouseenter", "mouseleave", "mousedraghold"].includes(eventType);
  }

  public eventTriggerEmitter(
    callback?: Function
  ): <T extends keyof WindowEventMap>(ev: WindowEventMap[T]) => void {
    return (ev) => {
      if (typeof callback === "function") {
        callback(ev);
      }
      this._handlerEventListener(ev);
    };
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

// declare global {
//   interface Window {
//     as: any;
//   }
// }

const eventsFactory = EventsFactory.getFactory();

// window.as = eventsFactory;

function addListener(
  node: HTMLElementExtended | Document,
  eventType: UIEventType,
  handler: EventListener<EventType>,
  options?: boolean | AddEventListenerOptions | undefined
): void {
  node &&
    node.addEventListener &&
    node.addEventListener(eventType, handler, options);
}

export function on(
  eventType: UIEventType,
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

export function off(eventType: EventType, node: HTMLElementExtended): void {}

export function inheritOn(
  eventType: UIEventType,
  node: HTMLElementExtended,
  parent: HTMLElementExtended
): any {
  eventsFactory.addInheritEvent(eventType, node, parent);
}
