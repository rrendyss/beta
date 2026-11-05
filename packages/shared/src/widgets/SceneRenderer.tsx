import type { Scene } from "../scene";
import { WidgetRenderer } from "./WidgetRenderer";

/**
 * Render seluruh layer scene secara absolut (posisi, rotasi, opasitas, z-index).
 * Dipakai overlay runtime; editor memakai wrapper sendiri karena butuh
 * interaksi seleksi/drag di atas widget yang sama (WidgetRenderer).
 */
export function SceneRenderer({ scene }: { scene: Scene }) {
  const sorted = [...scene.layers].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <>
      {sorted.map((layer) => (
        <div
          key={layer.id}
          style={{
            position: "absolute",
            left: layer.x,
            top: layer.y,
            width: layer.width,
            height: layer.height,
            transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
            opacity: layer.opacity,
            zIndex: layer.zIndex + 1,
            pointerEvents: "none",
          }}
        >
          <WidgetRenderer layer={layer} />
        </div>
      ))}
    </>
  );
}
