// ==UserScript==
// @name        VNDB Official Links and Release Dates
// @namespace   Marv
// @homepageURL https://github.com/MarvNC/vn-userscripts
// @match       https://vndb.org/v*
// @grant       none
// @version     1.14
// @author      Marv
// @description Adds links and dates to the VNDB infobox.
// ==/UserScript==

const pathRegex = /^\/v(\d+)$/;
const vnIdRegex = /^\/(v\d+)/;

(async function () {
  const currentURL = new URL(document.URL);
  let linksElem, releasesElem;
  let allLinks, allReleases;

  // if on main tab, get info with existing doc, otherwise fetch main page
  if (currentURL.pathname.match(pathRegex)) {
    ({ allLinks, allReleases } = getLangInfo(document));
  } else {
    const vnID = currentURL.pathname.match(vnIdRegex)[1];
    const vnURL = `https://vndb.org/${vnID}`;
    console.log(`Fetching ${vnURL}`);
    ({ allLinks, allReleases } = await fetch(vnURL)
      .then((res) => res.text())
      .then((text) => getLangInfo(new DOMParser().parseFromString(text, 'text/html'))));
  }

  linksElem = makeHTMLTable(allLinks);
  releasesElem = makeHTMLTable(allReleases);
  // ({ linksElem, releasesElem } = makeHtmlBox(allLinks, allReleases));

  const tbody = document.querySelector('.mainbox .vndetails tbody');

  const firstHeader = tbody.querySelector('tr.nostripe');

  tbody.insertBefore(releasesElem, firstHeader);
  tbody.insertBefore(linksElem, firstHeader);
})();

/**
 * Gets the official links and release dates for the given document.
 * @param {DOM} document
 * @returns {object} allLinks, allReleases
 */
function getLangInfo(document) {
  const langInfo = extractLangInfo(document);
  const allLinks = processLinks(langInfo);
  const allReleases = processReleases(langInfo);
  console.log(allLinks);
  return { allLinks, allReleases };
}

/**
 * Extracts language information from the given document.
 * @param {DOM} document
 * @returns {Array} langInfo
 */
function extractLangInfo(document) {
  const langInfo = [];

  [...document.querySelectorAll('.mainbox.vnreleases > details')].forEach((detail) => {
    const releases = detail.querySelectorAll('tr');
    const lang = detail.querySelector('summary > abbr.lang').outerHTML;
    const info = { lang, links: new Set() };

    for (const release of releases) {
      const grayedout = release.querySelector('b.grayedout')?.textContent ?? '';
      if (
        !grayedout.match(/unofficial|patch|machine translation/) &&
        !release.querySelector('tr')?.classList?.contains('mtl') &&
        !release?.classList?.contains('mtl')
      ) {
        const officialLinks = [...release.querySelectorAll('a')]
          .filter((elem) => elem.innerHTML.includes('Official website'))
          .map((anchor) => anchor.href);
        if (officialLinks.length > 0) {
          info.links.add(officialLinks[0]);
        }
        if (!info.release && release.querySelector(`abbr.icons[title="complete"]`)) {
          info.release = release.querySelector('.tc1').innerHTML;
        }
      }
    }
    langInfo.push(info);
  });

  return langInfo;
}

/**
 * Processes language information to extract all links.
 * @param {Array} langInfo
 * @returns {Map} allLinks
 */
function processLinks(langInfo) {
  const allLinks = new Map();
  for (const lang of langInfo) {
    for (const link of [...lang.links.values()]) {
      try {
        const url = new URL(link);
        let displayLink = url.hostname + url.pathname + url.search + url.hash;
        displayLink = displayLink.replace(/\/$/, '');
        displayLink = displayLink.replace(/^www./, '');
        if (displayLink.length > 53) {
          displayLink = displayLink.slice(0, 50) + '...';
        }
        const linkHTML = `<a href="${link}">${displayLink}</a>`;
        if (allLinks.has(linkHTML)) {
          allLinks.get(linkHTML).push(lang.lang);
        } else {
          allLinks.set(linkHTML, [lang.lang]);
        }
      } catch (error) {
        console.log(link, error);
      }
    }
  }
  return allLinks;
}

/**
 * Processes language information to extract all release dates.
 * @param {Array} langInfo
 * @returns {Map} allReleases
 */
function processReleases(langInfo) {
  const allReleases = new Map();
  for (const lang of langInfo) {
    if (lang.release) {
      if (allReleases.has(lang.release)) {
        allReleases.get(lang.release).push(lang.lang);
      } else {
        allReleases.set(lang.release, [lang.lang]);
      }
    }
  }

  return allReleases;
}

/**
 *
 * @param {object} dataToLangFlags Map of links or data as the key mapped to values of arrays of languages
 */
function makeHTMLTable(dataToLangFlags) {
  let tableHTML = '';
  for (const [data, lang] of dataToLangFlags) {
    tableHTML += lang.join('') + data + '<br>';
  }

  const tableElem = document.createElement('tr');
  if (dataToLangFlags.size > 0) {
    tableElem.innerHTML = `<td>Official Links</td><td>${tableHTML}</td>`;
  }
  return tableElem;
}
