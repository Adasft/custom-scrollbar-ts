import { createElement as h, createTextNode as t } from "./dom/elements";
import { InteractiveElement, InteractiveTextNode } from "./types";

const fn = () => {};
const click = fn;
const keypress = fn;
const keyup = fn;
const keydown = fn;
const mousedown = fn;
const mouseleave = fn;
const mouseenter = fn;
const mousemove = fn;
const mouseover = fn;
const mouseup = fn;
const touchcancel = fn;
const touchend = fn;
const touchmove = fn;
const touchstart = fn;

console.time("start");
const root = h(
  "div",
  { on: { click, keydown, keypress } },
  h(
    "div",
    null,
    h(
      "div",
      { on: { mousedown, mouseleave } },
      h(
        "div",
        { on: { touchstart } },
        h(
          "div",
          null,
          h(
            "div",
            { on: { mousedown, mouseleave } },
            h("div"),
            h("div"),
            h("div"),
            h("div"),
            h("div")
          )
        )
      ),
      h("div"),
      h("div"),
      h("div"),
      h("div")
    ),
    h(
      "div",
      null,
      h(
        "div",
        { on: { mousedown, mouseleave } },
        h("div"),
        h("div"),
        h("div"),
        h("div"),
        h("div")
      )
    )
  ),
  h(
    "div",
    { on: { mouseenter, mouseleave, mousemove, click } },
    h(
      "div",
      null,
      h(
        "div",
        { on: { mousedown, mouseleave } },
        h(
          "div",
          { on: { touchstart } },
          h(
            "div",
            null,
            h(
              "div",
              { on: { mousedown, mouseleave } },
              h("div"),
              h("div"),
              h("div"),
              h("div"),
              h("div")
            )
          )
        ),
        h("div"),
        h("div"),
        h("div"),
        h("div")
      ),
      h(
        "div",
        null,
        h(
          "div",
          { on: { mousedown, mouseleave } },
          h("div"),
          h("div"),
          h("div"),
          h("div"),
          h("div")
        )
      )
    )
  ),
  h(
    "div",
    null,
    h(
      "div",
      null,
      h(
        "div",
        { on: { mousedown, mouseleave } },
        h(
          "div",
          { on: { touchstart } },
          h(
            "div",
            null,
            h(
              "div",
              { on: { mousedown, mouseleave } },
              h("div"),
              h("div"),
              h("div"),
              h("div"),
              h("div")
            )
          )
        ),
        h("div"),
        h("div"),
        h("div"),
        h("div")
      ),
      h(
        "div",
        null,
        h(
          "div",
          { on: { mousedown, mouseleave } },
          h("div"),
          h("div"),
          h("div"),
          h("div"),
          h("div")
        )
      )
    )
  ),
  h(
    "div",
    { on: { click, mousedown, mousemove } },
    h(
      "div",
      null,
      h(
        "div",
        null,
        h(
          "div",
          { on: { mousedown, mouseleave } },
          h(
            "div",
            { on: { touchstart } },
            h(
              "div",
              null,
              h(
                "div",
                { on: { mousedown, mouseleave } },
                h(
                  "div",
                  null,
                  h(
                    "div",
                    null,
                    h(
                      "div",
                      null,
                      h(
                        "div",
                        { on: { mousedown, mouseleave } },
                        h(
                          "div",
                          { on: { touchstart } },
                          h(
                            "div",
                            null,
                            h(
                              "div",
                              { on: { mousedown, mouseleave } },
                              h("div"),
                              h("div"),
                              h("div"),
                              h("div"),
                              h("div")
                            )
                          )
                        ),
                        h(
                          "div",
                          null,
                          h(
                            "div",
                            null,
                            h(
                              "div",
                              null,
                              h(
                                "div",
                                { on: { mousedown, mouseleave } },
                                h(
                                  "div",
                                  { on: { touchstart } },
                                  h(
                                    "div",
                                    null,
                                    h(
                                      "div",
                                      { on: { mousedown, mouseleave } },
                                      h("div"),
                                      h("div"),
                                      h("div"),
                                      h("div"),
                                      h("div")
                                    )
                                  )
                                ),
                                h("div"),
                                h("div"),
                                h("div"),
                                h("div")
                              ),
                              h(
                                "div",
                                null,
                                h(
                                  "div",
                                  { on: { mousedown, mouseleave } },
                                  h("div"),
                                  h("div"),
                                  h("div"),
                                  h("div"),
                                  h("div")
                                )
                              )
                            )
                          )
                        ),
                        h("div"),
                        h("div"),
                        h("div")
                      ),
                      h(
                        "div",
                        null,
                        h(
                          "div",
                          { on: { mousedown, mouseleave } },
                          h("div"),
                          h("div"),
                          h("div"),
                          h("div"),
                          h("div")
                        )
                      )
                    )
                  )
                ),
                h("div"),
                h("div"),
                h("div"),
                h("div")
              )
            )
          ),
          h("div"),
          h("div"),
          h("div"),
          h("div")
        ),
        h(
          "div",
          null,
          h(
            "div",
            { on: { mousedown, mouseleave } },
            h("div"),
            h("div"),
            h("div"),
            h("div"),
            h("div")
          )
        )
      )
    )
  ),
  h("div", null)
);
console.timeEnd("start");

// console.log(root);

document.body.appendChild(root.node);
