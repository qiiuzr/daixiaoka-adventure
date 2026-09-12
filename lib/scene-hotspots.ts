export type SceneSize = { width: number; height: number };
export type SceneHotspot = { centerX: number; top: number; width: number; height: number };

// Positions are relative to each clip's own source pixels, before object-fit: cover.
export const SCENE_HOTSPOTS = {
  bell: { centerX: 0.831, top: 0.055, width: 0.11, height: 0.31 },
  bed: { centerX: 0.47, top: 0.38, width: 0.42, height: 0.5 },
  // The lower door is behind the IP. Only the visible door and handle are clickable.
  door: { centerX: 0.5255, top: 0.352, width: 0.105, height: 0.214 },
  clothingDoor: { centerX: 0.595, top: 0.255, width: 0.115, height: 0.37 },
  stageBed: { centerX: 0.5, top: 0.575, width: 0.34, height: 0.29 },
  stageEntrance: { centerX: 0.5, top: 0.15, width: 0.52, height: 0.76 },
  campArrival: { centerX: 0.69, top: 0.3, width: 0.08, height: 0.16 },
  campHomeBed: { centerX: 0.5, top: 0.54, width: 0.34, height: 0.34 },
  campChair: { centerX: 0.655, top: 0.37, width: 0.16, height: 0.42 },
  campCoffee: { centerX: 0.178, top: 0.43, width: 0.09, height: 0.2 },
  campSnack: { centerX: 0.263, top: 0.43, width: 0.09, height: 0.2 },
  campFlower: { centerX: 0.25, top: 0.67, width: 0.15, height: 0.2 },
} satisfies Record<string, SceneHotspot>;

export function positionHotspot(viewport: SceneSize, source: SceneSize, hotspot: SceneHotspot) {
  const scale = Math.max(viewport.width / source.width, viewport.height / source.height);
  const renderedWidth = source.width * scale;
  const renderedHeight = source.height * scale;

  return {
    left: (viewport.width - renderedWidth) / 2 + renderedWidth * hotspot.centerX,
    top: (viewport.height - renderedHeight) / 2 + renderedHeight * hotspot.top,
    width: renderedWidth * hotspot.width,
    height: renderedHeight * hotspot.height,
  };
}

// Keep a hint near its object, but inside the visible window even with a cover crop.
export function positionInteractionLabel(
  viewport: SceneSize,
  hotspot: ReturnType<typeof positionHotspot>,
  placement: 'above' | 'below' = 'below',
) {
  const width = Math.min(320, Math.max(0, viewport.width - 32));
  const center = Math.max(width / 2 + 16, Math.min(viewport.width - width / 2 - 16, hotspot.left));
  const preferredTop = placement === 'above' ? hotspot.top - 40 : hotspot.top + hotspot.height + 4;
  const top = Math.max(16, Math.min(viewport.height - 64, preferredTop));
  return { left: center - (hotspot.left - hotspot.width / 2), top: top - hotspot.top, width };
}
