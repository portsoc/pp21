/* Libraries */
const path = require('path');
const { registerFont, createCanvas, loadImage } = require('canvas');

/* Values */
const logoName = 'linelogo.png';
const logoWidth = 100;
const xborder = 30;
const yborder = 30;
const defaultStep = 50;

const logoPromise = loadImage(path.join(__dirname, 'i', logoName));

/**
 * Creates an image on demand and streams it to a client.
 * 
 * @param res     An Express.js response object that this function
 *                uses to send the generated image to a client.    
 * @param width   The width of the image to be generated
 *                (a positive integer).
 * @param height  The height of the image to be generated
 *                (a positive integer).
 * @param square  Optional: The preferred square size of the image
 *                (positive integer, null, or can be omitted).
 * @param text    Optional: Text to be rendered in the image
 *                (string, null, or can be omitted).
 */
async function sendImage(res, width, height, square = defaultStep, text) {

  // set the width and hight of the canvas.
  c.width = width;
  c.height = height;

  const min = Math.min(width, height);
  const max = Math.max(width, height);

  if (square == null) square = defaultStep;
  if (square > max) square = max;

  for (let x = 0; x < width; x += square) {
    for (let y = 0; y < height; y += square) {
      const r = Math.floor(255 - 255 * x / width);
      const g = Math.floor(255 - 255 * y / height);
      const b = Math.floor(Math.sin(x / width * Math.PI) * 200);
      ctx.fillStyle = `rgb( ${r}, ${g}, ${b} )`;
      ctx.fillRect(x, y, square, square);
    }
  }

  text = text || `${width} x ${height}`;

  /** show size */
  ctx.font = `bold ${min / 8}px Pacifico`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(text, width / 2, height / 2 + 14);

  const logo = await logoPromise;

  const logow = Math.min(width - 2 * xborder, logoWidth);
  const logoh = logow / logo.width * logo.height;
  ctx.drawImage(logo, width - xborder - logow, height - yborder - logoh, logow, logoh);

  /** Send response */
  res.setHeader('Content-Type', 'image/png');

  // this async pipe means we might have race conditions
  // when another request starts and draws over the canvas before the streaming ends
  c.pngStream().pipe(res);
}

/* Program */

console.log('Getting canvas and context...');
registerFont(path.join(__dirname, 'fonts', 'Pacifico', 'Pacifico-Regular.ttf'), { family: 'Pacifico' });
const c = createCanvas(100, 100);
const ctx = c.getContext('2d', { pixelFormat: 'RGBA32' });

/** This module's only public export is the `sendImage` function. */
module.exports = {
  sendImage
};
