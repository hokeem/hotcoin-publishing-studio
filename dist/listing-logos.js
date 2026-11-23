export const fourSlots = [
  { x: 463, y: 537, width: 124, height: 128, angle: -.29, labelX: 468 },
  { x: 727, y: 536, width: 122, height: 124, angle: -.28, labelX: 731 },
  { x: 469.5, y: 793, width: 122, height: 130, angle: -.25, labelX: 474 },
  { x: 721, y: 793, width: 124, height: 130, angle: -.25, labelX: 723 },
];
export const fiveSlots = [
  { x: 484, y: 559, width: 125, height: 132, angle: -.33 },
  { x: 760, y: 559, width: 126, height: 133, angle: -.34 },
  { x: 359, y: 826, width: 126, height: 132, angle: -.28 },
  { x: 623, y: 827, width: 125, height: 135, angle: -.4 },
  { x: 882, y: 826, width: 126, height: 132, angle: -.25 },
];
export const singleSlot = { x: 949, y: 776, width: 178, height: 217, angle: -.17 };

export async function prepareLogo(src, fullFace = false, official = false) {
  const image = new Image();
  image.src = src;
  await image.decode().catch(() => { throw Error('Logo 图片无法打开，请换一份素材。'); });
  const { naturalWidth: width, naturalHeight: height } = image;
  if (Math.min(width, height) < (official ? 16 : 48)) throw Error('Logo 的短边至少需要 48 像素。');

  const scale = Math.min(1, 512 / Math.max(width, height));
  const raster = document.createElement('canvas');
  raster.width = Math.round(width * scale);
  raster.height = Math.round(height * scale);
  const context = raster.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, raster.width, raster.height);
  const w = raster.width, h = raster.height;
  const { data } = context.getImageData(0, 0, w, h);
  let left = w, top = h, right = -1, bottom = -1, visible = 0, luminance = 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (data[i + 3] < 32) continue;
      left = Math.min(left, px); right = Math.max(right, px);
      top = Math.min(top, py); bottom = Math.max(bottom, py);
      visible++;
      luminance += .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2];
    }
  }
  if (!visible) throw Error('Logo 图片是空白透明图，请换一份素材。');

  const edgeSamples = [[.08,.08],[.92,.08],[.08,.92],[.92,.92],[.5,.08],[.5,.92],[.08,.5],[.92,.5]]
    .map(([px,py]) => data.slice((Math.floor(py * h) * w + Math.floor(px * w)) * 4, (Math.floor(py * h) * w + Math.floor(px * w)) * 4 + 4))
    .filter(pixel => pixel[3] > 245);
  const edgeColor = visible >= w * h * .98 && edgeSamples.find(p => edgeSamples.filter(q => [0,1,2].every(i => Math.abs(p[i] - q[i]) <= 16)).length >= 3);
  const background = edgeColor ? 'rgb(' + [...edgeColor.slice(0, 3)].join(',') + ')' : (visible < w * h * .95 && luminance / visible > 170 ? '#191919' : '#fff');
  const bounds = [left, top, right - left + 1, bottom - top + 1];
  return { raster, bounds, background, fullFace, edgeColor: Boolean(edgeColor) };
}

export function drawLogo(context, logo, { x, y, width, height, angle }) {
  const [left, top, sw, sh] = logo.bounds;
  context.save();
  context.beginPath();
  context.ellipse(x, y, width / 2, height / 2, angle, 0, 2 * Math.PI);
  context.clip();
  context.fillStyle = logo.background;
  context.fillRect(x - height, y - height, height * 2, height * 2);

  // Full coin faces bleed to the rim. Brand marks retain their aspect ratio.
  const ratio = Math.min(width / sw, height / sh) * (logo.fullFace || logo.edgeColor ? 1 : .76);
  const fittedWidth = sw * ratio;
  const fittedHeight = sh * ratio;
  context.drawImage(logo.raster, left, top, sw, sh, x - fittedWidth / 2, y - fittedHeight / 2, fittedWidth, fittedHeight);
  context.restore();
}
