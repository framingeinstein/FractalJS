/* global navigator */
import Logger from "../util/logger";
import Event from "../util/event";
import Renderer from "./renderer";
import Painter from "./painter";
import Camera from "../../engine/math/camera";
import Vector from "../../engine/math/vector";

const log = Logger.get("engine").level(Logger.INFO);

export default class FractalJS {
  constructor(p) {
    log.debug("start", p);

    if (!p.canvas) throw new Error();
    this.canvas = p.canvas;
    this.nbThreads = p.nbThreads || navigator.hardwareConcurrency || 4;
    this.nbTiles = p.nbTiles;

    this.event = new Event();
    this.camera = new Camera(
      new Vector(p.canvas.width, p.canvas.height),
      new Vector(p.x, p.y),
      p.w,
      p.viewport,
    );
    this.painter = new Painter(p.colors);
    this.renderer = new Renderer(
      this.canvas,
      this.nbThreads,
      this.painter,
      this,
    );

    this.set(p);
  }

  on(...args) {
    this.event.on(...args);
  }
  notify(...args) {
    this.event.notify(...args);
  }

  // realtime modification of engine parameters
  set(p) {
    if ("type" in p) this.type = p.type;
    if ("smooth" in p) this.smooth = p.smooth;
    if ("iter" in p) this.iter = p.iter;
    if ("x" in p) this.camera.setPos(new Vector(p.x, p.y), p.w);
    if ("colors" in p) this.painter.set(p.colors);
  }

  draw(params) {
    // if (!params) params = { details: "normal" };
    return this.renderer.draw(params);
  }

  drawColor() {
    this.renderer.drawColor();
  }

  resize(width, height) {
    this.camera.resize(width, height);
    this.renderer.resize(width, height);
  }
}