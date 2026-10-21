import type { RequestSelections } from "./outfit-prompt";
// Designs and source photos are saved only in this browser.
export type SavedDesign = {
  id: string;
  created_at: string;
  audience: string;
  age: string | null;
  style: string;
  model_type: string;
  outfit: string;
  blouse: string;
  sleeve: string;
  matching: string;
  inspiration: string;
  fabric: [number, number];
  image: string;
  front_image?: string;
  back_image?: string;
  source_image?: string;
  selections?: RequestSelections;
};

const KEY = "resha-designs";
const MAX = 30;

export function loadDesigns(): SavedDesign[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedDesign[];
  } catch {
    return [];
  }
}

export function saveDesign(d: SavedDesign) {
  let list = [d, ...loadDesigns().filter(item => item.id !== d.id)].slice(0, MAX);
  while (list.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch {
      list = list.slice(0, -1); // storage full: drop oldest
    }
  }
  return false;
}

export async function toThumbnail(blob: Blob, max = 600): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const context = c.getContext("2d");
  if (!context) throw new Error("Could not save this image.");
  context.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL("image/jpeg", 0.8);
}
