import { FractalDef } from "./example";

const escape = 4;
var iLog4 = 1.0 / Math.log(4.0);

export default {
  fractalId: "mandelbrot3",
  uiOrder: 3,
  name: "Multibrot *3",
  preset: { x: 0.0, y: 0.0, w: 3.0, iter: 50 },
  fn: {
    normal: (cx, cy, iter) => {
      var zx = 0,
        zy = 0,
        sqx = 0,
        sqy = 0,
        i = 0,
        znx,
        zny;
      while (true) {
        znx = sqx * zx - 3 * zx * sqy + cx;
        zny = 3 * sqx * zy - sqy * zy + cy;
        zx = znx;
        zy = zny;
        if (++i >= iter) break;
        sqx = zx * zx;
        sqy = zy * zy;
        if (sqx + sqy > escape) break;
      }
      return i;
    },
    smooth: (cx, cy, iter) => {
      var zx = 0,
        zy = 0,
        sqx = 0,
        sqy = 0,
        i = 0,
        j,
        znx,
        zny;
      while (true) {
        znx = sqx * zx - 3 * zx * sqy + cx;
        zny = 3 * sqx * zy - sqy * zy + cy;
        zx = znx;
        zy = zny;
        if (++i >= iter) break;
        sqx = zx * zx;
        sqy = zy * zy;
        if (sqx + sqy > escape) break;
      }
      if (i === iter) return i;
      for (j = 0; j < 4; ++j) {
        znx = sqx * zx - 3 * zx * sqy + cx;
        zny = 3 * sqx * zy - sqy * zy + cy;
        zx = znx;
        zy = zny;
        sqx = zx * zx;
        sqy = zy * zy;
      }
      return 5 + i - Math.log(Math.log(sqx + sqy)) * iLog4;
    },
  },
} as FractalDef;
