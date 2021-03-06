import Vector from "../engine/math/vector";
import Camera, { AffineTransform } from "../engine/math/camera";
import { Dispatch } from "@reduxjs/toolkit";
import {
  changeXY,
  viewportReset,
  viewportTransform,
  toggleGuide,
} from "./rdxengine";
import Hammer from "hammerjs";
import Matrix from "../engine/math/matrix";
import { bindKeys } from "../util/keybinder";
import Engine from "../engine/engine";

const ZOOM = 1.3;
const ZOOM_TAP = 2.5;
const PAN = 0.1;
const SCALE = 0.1; // 1+
const SHEAR = 0.1;
const ANGLE = Math.PI / 18;

export default class Controller {
  private engine: Engine;
  private camera: Camera;

  constructor(engine: Engine, private dispatch: Dispatch<any>) {
    this.engine = engine;
    this.camera = engine.ctx.camera;
    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
  }

  // pan the screen by the given vector (as a ratio of its size)
  pan(scr_vector_delta: Vector) {
    const cam = this.camera;
    const scr_vector = cam.screen.times(scr_vector_delta);
    const cpx_point_0 = cam.scr2cpx(new Vector(0, 0));
    const cpx_point_dest = cam.scr2cpx(scr_vector);
    const cpx_vector = cpx_point_0.minus(cpx_point_dest);
    const cpx_new_point = cam.getPos().plus(cpx_vector);
    this.dispatch(changeXY(cpx_new_point));
  }

  // transforms the current viewport
  viewportTransform(type: AffineTransform, valuex: number, valuey?: number) {
    this.dispatch(viewportTransform(type, valuex, valuey));
  }

  // zoom the screen at the given screen point, using the given delta ratio
  zoom(delta: number, scr_point_arg?: Vector) {
    const cam = this.camera;
    if (delta < 1 && cam.isZoomLimit()) {
      this.engine.ctx.event.notify("zoom.limit");
      return;
    }
    // zoom @ center of screen by default
    const scr_point = scr_point_arg || cam.screen.times(0.5);
    const cpx_point = cam.scr2cpx(scr_point);
    const cpx_center = cam.getPos();
    // complex vector from point to view center
    const cpx_vector = cpx_center.minus(cpx_point);
    // scale vector and compute new center
    const cpx_new_point = cpx_point.plus(cpx_vector.times(delta));
    this.dispatch(changeXY(cpx_new_point, cam.w * delta));
  }

  setupKeyboard() {
    bindKeys("up", (Δ: number) => this.pan(new Vector(0, PAN * Δ)));
    bindKeys("down", (Δ: number) => this.pan(new Vector(0, -PAN * Δ)));
    bindKeys("right", (Δ: number) => this.pan(new Vector(-PAN * Δ, 0)));
    bindKeys("left", (Δ: number) => this.pan(new Vector(PAN * Δ, 0)));
    bindKeys("+", (Δ: number) => this.zoom(1 / (ZOOM * Δ)));
    bindKeys("-", (Δ: number) => this.zoom(ZOOM * Δ));
    bindKeys("V", () => this.dispatch(viewportReset()));
    bindKeys("R left", (Δ: number) =>
      this.viewportTransform("rotation", -ANGLE * Δ),
    );
    bindKeys("R right", (Δ: number) =>
      this.viewportTransform("rotation", +ANGLE * Δ),
    );
    bindKeys("S right", (Δ: number) =>
      this.viewportTransform("scale", 1 / (1 + SCALE * Δ), 1),
    );
    bindKeys("S left", (Δ: number) =>
      this.viewportTransform("scale", 1 + SCALE * Δ, 1),
    );
    bindKeys("S up", (Δ: number) =>
      this.viewportTransform("scale", 1, 1 / (1 + SCALE * Δ)),
    );
    bindKeys("S down", (Δ: number) =>
      this.viewportTransform("scale", 1, 1 + SCALE * Δ),
    );
    bindKeys("H right", (Δ: number) =>
      this.viewportTransform("shear", -SHEAR * Δ, 0),
    );
    bindKeys("H left", (Δ: number) =>
      this.viewportTransform("shear", SHEAR * Δ, 0),
    );
    bindKeys("H up", (Δ: number) =>
      this.viewportTransform("shear", 0, -SHEAR * Δ),
    );
    bindKeys("H down", (Δ: number) =>
      this.viewportTransform("shear", 0, SHEAR * Δ),
    );
    bindKeys("G", () => this.dispatch(toggleGuide()));
  }

  setupTouch() {
    var hammer = new Hammer(this.engine.canvas, {});
    let isDragging = false;
    let dragStart: Vector;
    let cameraStart: Camera;

    hammer.get("pan").set({
      direction: Hammer.DIRECTION_ALL,
      threshold: 1,
    });
    hammer.get("pinch").set({
      enable: true,
    });

    hammer.on("doubletap", evt => {
      // console.log("double", evt);
      const pos = new Vector(evt.center.x, evt.center.y);
      this.zoom(1 / ZOOM_TAP, new Vector(pos));
    });

    hammer.on("panstart", evt => {
      isDragging = true;
      dragStart = new Vector(evt.center.x, evt.center.y);
      cameraStart = this.camera.clone();
    });

    hammer.on("panend", evt => {
      isDragging = false;
    });

    hammer.on("panmove", evt => {
      if (isDragging) {
        const pos = new Vector(evt.center.x, evt.center.y);
        const scr_vector = pos.minus(dragStart);
        const cpx_point_0 = cameraStart.scr2cpx(new Vector(0, 0));
        const cpx_point_dest = cameraStart.scr2cpx(scr_vector);
        const cpx_vector = cpx_point_dest.minus(cpx_point_0);
        const cpx_new = cameraStart.getPos().minus(cpx_vector);
        this.dispatch(changeXY(cpx_new));
      }
    });

    var isPinching = false;
    let pinchStart: Vector;

    hammer.on("pinchstart", ev => {
      console.log("pinchstart");
      isPinching = true;
      pinchStart = new Vector(ev.center.x, ev.center.y);
      cameraStart = this.camera.clone();
    });

    hammer.on("pinchend", function (ev) {
      console.log("pinchend");
      isPinching = false;
    });

    hammer.on("pinch", ev => {
      if (isPinching) {
        // compute matrix that transforms an original triangle to the transformed triangle
        var pc1 = cameraStart.scr2cpx(pinchStart);
        var pc2 = cameraStart.scr2cpx(new Vector(ev.center.x, ev.center.y));
        var m = Matrix.GetTriangleToTriangle(
          pc1.x,
          pc1.y,
          pc1.x + 1,
          pc1.y,
          pc1.x,
          pc1.y + 1,
          pc2.x,
          pc2.y,
          pc2.x + ev.scale,
          pc2.y,
          pc2.x,
          pc2.y + ev.scale,
        );

        // apply inverse of this matrix to starting point
        var pc0A = m.inverse().transform(cameraStart.pos);

        let z = cameraStart.w / m.a;
        if (z < this.camera.resolutionLimit) {
          this.engine.ctx.event.notify("zoom.limit");
          z = this.camera.resolutionLimit;
        }
        this.dispatch(changeXY(pc0A, z));
      }
    });
  }

  setupMouse() {
    const canvas = this.engine.canvas;

    // disable mouse pan because it is handled by hammer
    // let isDragging = false;
    // let dragStart: Vector;
    // let cameraStart: Camera;

    // canvas.addEventListener("mousedown", (e: MouseEvent) => {
    //   const evt = e || window.event;
    //   if (evt.button !== 0) return;
    //   isDragging = true;
    //   dragStart = new Vector(evt.screenX, evt.screenY);
    //   cameraStart = this.camera.clone();
    // });

    // window.addEventListener("mouseup", () => {
    //   isDragging = false;
    // });

    // window.addEventListener("mousemove", e => {
    //   const evt = e || window.event;
    //   if (isDragging) {
    //     console.log("mousemove", e);
    //     const pos = new Vector(evt.screenX, evt.screenY);
    //     const scr_vector = pos.minus(dragStart);
    //     const cpx_point_0 = cameraStart.scr2cpx(new Vector(0, 0));
    //     const cpx_point_dest = cameraStart.scr2cpx(scr_vector);
    //     const cpx_vector = cpx_point_dest.minus(cpx_point_0);
    //     const cpx_new = cameraStart.getPos().minus(cpx_vector);
    //     this.dispatch(changeXY(cpx_new));
    //   }
    // });

    const wheelFunction = (e: WheelEvent) => {
      const evt = e || window.event;
      evt.preventDefault();
      const modifier = evt.shiftKey ? 1 / 10 : 1;
      let delta = evt.deltaY;
      delta = delta > 0 ? ZOOM * modifier : 1 / (ZOOM * modifier);
      const point = new Vector(evt.offsetX, evt.offsetY);
      this.zoom(delta, point);
    };

    canvas.addEventListener("wheel", wheelFunction);
  }
}
