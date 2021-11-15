'use strict';

function init () {
  const elMasthead = document.querySelector('#masthead');
  const elWidth = document.querySelector('#w');
  const elHeight = document.querySelector('#h');
  const elBox = document.querySelector('#b');
  const elTxt = document.querySelector('#t');
  const inputs = [elWidth, elHeight, elBox, elTxt];

  let debounce = null;

  function imgURL (width, height, square, text) {
    const params = [];
    if (text) params.push(`text=${text}`);
    if (square) params.push(`square=${square}`);
    let paramString = '';
    if (params.length) paramString = '?' + params.join('&');

    return `/img/${width}/${height}${paramString}`;
  }

  function refreshMasthead () {
    const square = encodeURIComponent(elBox.value);
    const text = encodeURIComponent(elTxt.value);
    elMasthead.src = imgURL(elWidth.value, elHeight.value, square, text);
  }

  function suggestSizes () {
    elWidth.value = window.innerWidth;
    elHeight.value = Math.floor(window.innerHeight / 4);
  }

  function resizeFinished () {
    suggestSizes();
    refreshMasthead();
  }

  function copyToClipboard () {
    const tmpElement = document.createElement('input');
    tmpElement.value = elMasthead.src;
    tmpElement.setAttribute('readonly', '');
    tmpElement.style = {display: 'none'};
    document.body.appendChild(tmpElement);
    tmpElement.select();
    document.execCommand('copy');
    tmpElement.remove();

    const fbk = document.getElementById('feedback');
    fbk.innerHTML = `Copied <code>${tmpElement.value}</code> to clipboard`;
  }

  /**
   * Resize listener includes a 500millisecond debounce timer so that
   * the masthead image is reloaded half a second after the last
   * resize.  This avoids a self-DoS attack by merely resizing the page.
   */
  window.addEventListener('resize', () => {
    clearTimeout(debounce);
    debounce = window.setTimeout(resizeFinished, 500);
  });

  resizeFinished();

  for (const i of inputs) {
    console.log(i);
    i.addEventListener('change', refreshMasthead);
  }

  const adjuster = document.querySelector('#adjuster');
  const adjusterButton = document.querySelector('#adjuster #opener');
  adjusterButton.addEventListener(
    'click', () => {
      adjuster.classList.toggle('open');
    }
  );

  document.getElementById('copy').addEventListener('click', copyToClipboard);
}

window.addEventListener('load', init);
