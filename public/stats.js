'use strict';

/* global fetch */

function init () {
  const T1 = 2000;
  const T2 = 500;

  updateRecentPaths.interval = setInterval(updateRecentPaths, T1);
  updateRecentPaths();

  updateRecentSizes.interval = setInterval(updateRecentSizes, T1);
  updateRecentSizes();

  updateRecentTexts.interval = setInterval(updateRecentTexts, T1);
  updateRecentTexts();

  updateTopSizes.interval = setInterval(updateTopSizes, T1);
  updateTopSizes();

  updateTopReferrers.interval = setInterval(updateTopReferrers, T1);
  updateTopReferrers();

  updateHitCounts.interval = setInterval(updateHitCounts, T2);
  updateHitCounts();

  document.querySelector('#resetStats').addEventListener('click', resetStats);

  async function resetStats () {
    const resp = await fetch('/stats', { method: 'DELETE' });
    console.log('faa');
    if (!resp.ok) {
      console.error('error resetting stats');
      return;
    }

    console.log('foo');
    updateRecentPaths();
    updateRecentSizes();
    updateRecentTexts();
    updateTopSizes();
    updateTopReferrers();
    updateHitCounts();
    console.log('bar');
  }

  async function updateRecentPaths () {
    const data = await doFetch('/stats/paths/recent', updateRecentPaths.interval);
    populateList('#recentPaths', data, x => {
      const a = document.createElement('a');
      a.href = x;
      a.textContent = decodeURIComponent(x);
      return a;
    });
  }

  async function updateRecentSizes () {
    const data = await doFetch('/stats/sizes/recent', updateRecentSizes.interval);
    populateList('#recentSizes', data, x => `${x.w} x ${x.h}`);
  }

  async function updateTopSizes () {
    const data = await doFetch('/stats/sizes/top', updateTopSizes.interval);
    populateList('#topSizes', data, x => `${x.n} requests for ${x.w} x ${x.h}`);
  }

  async function updateTopReferrers () {
    const data = await doFetch('/stats/referrers/top', updateTopReferrers.interval);
    populateList('#topReferrers', data, x => {
      const span = document.createElement('span');
      span.textContent = `${x.n} requests from `;
      const a = document.createElement('a');
      a.href = x.ref;
      a.textContent = x.ref;
      span.appendChild(a);
      return span;
    });
  }

  async function updateRecentTexts () {
    const data = await doFetch('/stats/texts/recent', updateRecentTexts.interval);
    populateList('#recentTexts', data, x => `"${x}"`);
  }

  async function updateHitCounts () {
    const data = await doFetch('/stats/hits', updateHitCounts.interval);
    populateList('#hitCounts', data, x => `${x.title}: ${x.count}`);
  }

  function populateList (selector, data, itemToHTML) {
    const listEl = document.querySelector(selector);
    listEl.textContent = '';
    for (const x of data) {
      const el = document.createElement('li');
      const result = itemToHTML(x);
      if (typeof result === 'string') el.textContent = result;
      else el.appendChild(result);
      listEl.appendChild(el);
    }

    if (!data.length) {
      const el = document.createElement('li');
      el.classList.add('nodata');
      el.textContent = 'no data';
      listEl.appendChild(el);
    }
  }

  async function doFetch (url, intervalToCancel) {
    try {
      // console.log('getting', url);
      let resp = await fetch(url);
      if (!resp.ok) throw new Error('error');
      return await resp.json();
    } catch (e) {
      console.error('error fetching ', url);
      console.error('refresh page to try again');
      clearInterval(intervalToCancel);
      return null;
    }
  }
}

window.addEventListener('load', init);
