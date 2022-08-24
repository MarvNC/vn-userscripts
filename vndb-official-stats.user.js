// ==UserScript==
// @name        VNDB Official Links and Release Dates
// @namespace   Marv
// @homepageURL https://github.com/MarvNC/vn-userscripts
// @match       https://vndb.org/v*
// @grant       none
// @version     1.1
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

  ({ linksElem, releasesElem } = makeHtmlBox(allLinks, allReleases));

  const tbody = document.querySelector('.mainbox .vndetails tbody');

  const firstHeader = tbody.querySelector('tr.nostripe');

  tbody.insertBefore(releasesElem, firstHeader);
  tbody.insertBefore(linksElem, firstHeader);
})();

/**
 * Gets the official links and release dates for the given document.
 * @param {DOM} document
 * @returns {object} {links, releases}
 */
function getLangInfo(document) {
  /**
   * array of objects with links and dates for each language
   */
  const langInfo = [];

  // check each language element
  [...document.querySelectorAll('.mainbox.vnreleases > details')].forEach((detail) => {
    const releases = detail.querySelectorAll('tr');
    // get flag element as language
    const lang = detail.querySelector('summary > abbr.lang').outerHTML;
    const info = { lang, links: new Set() };

    for (const release of releases) {
      const grayedout = release.querySelector('b.grayedout')?.textContent ?? '';
      // exclude unofficial/mtl
      if (
        !grayedout.match(/unofficial|patch|machine translation/) &&
        !release.querySelector('tr')?.classList?.contains('mtl') &&
        !release?.classList?.contains('mtl')
      ) {
        // links
        const officialLinks = [...release.querySelectorAll('a')]
          .filter((elem) => elem.innerHTML.includes('Official website'))
          .map((anchor) => anchor.href);
        if (officialLinks.length > 0) {
          info.links.add(officialLinks[0]);
        }
        // release date
        if (!info.release && release.querySelector(`abbr.icons[title="complete"]`)) {
          info.release = release.querySelector('.tc1').innerHTML;
        }
      }
    }
    langInfo.push(info);
  });

  const allLinks = new Map();
  const allReleases = new Map();
  for (const lang of langInfo) {
    for (const link of [...lang.links.values()]) {
      // clean and shorten link
      try {
        const url = new URL(link);
        let displayLink = url.hostname + url.pathname + url.search;
        displayLink = displayLink.replace(/\/$/, '');
        displayLink = displayLink.replace(/^www./, '');
        if (displayLink.length > 53) {
          displayLink = displayLink.slice(0, 50) + '...';
        }
        const linkHTML = `<a href="${link}">${displayLink}</a>`;

        // combine flags to one link for each unique link
        if (allLinks.has(linkHTML)) {
          allLinks.get(linkHTML).push(lang.lang);
        } else {
          allLinks.set(linkHTML, [lang.lang]);
        }
      } catch (error) {
        console.log(link, error);
      }
    }

    // combine flags to one entry for each release date
    if (lang.release) {
      if (allReleases.has(lang.release)) {
        allReleases.get(lang.release).push(lang.lang);
      } else {
        allReleases.set(lang.release, [lang.lang]);
      }
    }
  }

  console.log(allLinks);
  return { allLinks, allReleases };
}

/**
 * Given link and release information, creates html rows of the information.
 * @param {object} allLinks
 * @param {object} allReleases
 * @returns {object} linksElem, releasesElem
 */
function makeHtmlBox(allLinks, allReleases) {
  let linksHTML = '';
  for (const [link, lang] of allLinks) {
    linksHTML += `${lang.join('')} ${link}<br>`;
  }
  let releasesHTML = '';
  for (const [release, lang] of allReleases) {
    releasesHTML += `${lang.join('')} ${release}<br>`;
  }

  const linksElem = document.createElement('tr');
  if (allLinks.size > 0) {
    linksElem.innerHTML = `<td>Official Links</td><td>${linksHTML}</td>`;
  }
  const releasesElem = document.createElement('tr');
  if (allReleases.size > 0) {
    releasesElem.innerHTML = `<td>Release Date</td><td>${releasesHTML}</td>`;
  }
  return { linksElem, releasesElem };
}
