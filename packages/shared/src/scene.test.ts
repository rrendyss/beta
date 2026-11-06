// Regresi (ditemukan saat drag widget Image/Game di editor): schema config
// wajib punya .default() untuk SEMUA field agar defaultLayerConfig(type)
// bisa mem-parse {} dan scene hasilnya tetap lolos parseScene saat disimpan.
import { describe, expect, it } from "vitest";
import {
  defaultLayerConfig,
  emptyScene,
  parseScene,
  WIDGET_LABELS,
  type LayerType,
} from "./scene.js";

const ALL_TYPES = Object.keys(WIDGET_LABELS) as LayerType[];

describe("defaultLayerConfig", () => {
  it("menghasilkan config valid untuk semua tipe widget", () => {
    for (const type of ALL_TYPES) {
      expect(() => defaultLayerConfig(type), `tipe: ${type}`).not.toThrow();
    }
  });

  it("config default image & game-canvas boleh kosong (placeholder)", () => {
    expect(defaultLayerConfig("image")).toMatchObject({ src: "", fit: "contain" });
    // game bawaan — tanpa URL, tinggal drag-drop
    expect(defaultLayerConfig("game-canvas")).toMatchObject({ difficulty: "normal" });
  });
});

describe("parseScene roundtrip", () => {
  it("scene berisi layer image & game-canvas dengan config default lolos validasi", () => {
    const scene = emptyScene();
    scene.layers.push(
      {
        id: "l-img", type: "image", x: 0, y: 0, width: 200, height: 200,
        config: defaultLayerConfig("image"),
      } as never,
      {
        id: "l-game", type: "game-canvas", x: 220, y: 0, width: 400, height: 300,
        config: defaultLayerConfig("game-canvas"),
      } as never,
    );
    const parsed = parseScene(JSON.parse(JSON.stringify(scene)));
    expect(parsed.layers).toHaveLength(2);
    expect(parsed.layers[0].config).toMatchObject({ src: "" });
    expect(parsed.layers[1].config).toMatchObject({ difficulty: "normal" });
  });
});
