export interface LoadedImage {
  image: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
}

export const loadImageFromUrl = (url: string): Promise<LoadedImage> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      resolve({
        image: img,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
    img.onerror = reject;
    img.src = url;
  });

export interface MergeResult {
  blob: Blob;
  dataUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  segmentHeights: number[];
}

export const mergeImagesVertically = async (urls: string[]): Promise<MergeResult> => {
  if (urls.length === 0) {
    throw new Error("沒有可合併的圖片");
  }
  const loaded = await Promise.all(urls.map((u) => loadImageFromUrl(u)));
  const targetWidth = Math.max(...loaded.map((l) => l.naturalWidth));
  const scaledHeights = loaded.map((l) =>
    Math.round((l.naturalHeight / l.naturalWidth) * targetWidth),
  );
  const totalHeight = scaledHeights.reduce((acc, h) => acc + h, 0);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("無法建立繪圖環境");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  let y = 0;
  loaded.forEach((item, idx) => {
    const h = scaledHeights[idx];
    ctx.drawImage(item.image, 0, y, targetWidth, h);
    y += h;
  });
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("輸出失敗"))), "image/png"),
  );
  return {
    blob,
    dataUrl,
    canvasWidth: targetWidth,
    canvasHeight: totalHeight,
    segmentHeights: scaledHeights,
  };
};

export const splitMergedByHeights = async (
  mergedDataUrl: string,
  heights: number[],
): Promise<string[]> => {
  if (heights.length === 0) {
    return [];
  }
  const { image, naturalWidth, naturalHeight } = await loadImageFromUrl(mergedDataUrl);
  const sumHeights = heights.reduce((a, b) => a + b, 0);
  const scale = naturalHeight / sumHeights;
  let yPx = 0;
  const outs: string[] = [];
  heights.forEach((h, index) => {
    const projected = Math.round(h * scale);
    const sliceH =
      index === heights.length - 1 ? Math.max(naturalHeight - yPx, 1) : Math.max(projected, 1);
    const c = document.createElement("canvas");
    c.width = naturalWidth;
    c.height = sliceH;
    const cctx = c.getContext("2d");
    if (!cctx) {
      throw new Error("無法建立切片");
    }
    cctx.drawImage(image, 0, yPx, naturalWidth, sliceH, 0, 0, naturalWidth, sliceH);
    outs.push(c.toDataURL("image/png"));
    yPx += sliceH;
  });
  return outs;
};

export const splitImageEqualParts = async (
  mergedDataUrl: string,
  parts: number,
): Promise<string[]> => {
  if (parts < 2) {
    throw new Error("切片數至少需要 2");
  }
  const { image, naturalWidth, naturalHeight } = await loadImageFromUrl(mergedDataUrl);
  const sliceH = Math.floor(naturalHeight / parts);
  const outs: string[] = [];
  for (let i = 0; i < parts; i++) {
    const height = i === parts - 1 ? naturalHeight - sliceH * (parts - 1) : sliceH;
    const yPx = sliceH * i;
    const c = document.createElement("canvas");
    c.width = naturalWidth;
    c.height = height;
    const cctx = c.getContext("2d");
    if (!cctx) {
      throw new Error("無法建立切片");
    }
    cctx.drawImage(image, 0, yPx, naturalWidth, height, 0, 0, naturalWidth, height);
    outs.push(c.toDataURL("image/png"));
  }
  return outs;
};
