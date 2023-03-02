// ==UserScript==
// @name        VNDB Official Links and Release Dates
// @namespace   Marv
// @homepageURL https://github.com/MarvNC/vn-userscripts
// @match       https://vndb.org/v*
// @grant       GM_addElement
// @grant       GM_addStyle
// @version     1.34
// @author      Marv
// @description Adds links and dates to the VNDB infobox.
// ==/UserScript==

const pathRegex = /^\/v(\d+)$/;
const vnIdRegex = /^\/(v\d+)/;

const linksBeforeCollapse = 5;

const addCSS = /* css */ `
.otherlink a {
  display: flex;
}
.otherlink a span {
  color: #408;
  margin-left: 10px;
}
.otherlink div {
  display: flex !important;
  flex-grow: 1;
  flex-basis: 400px;
  align-items: center;
}
.scriptLinks div, .otherlink div {
  margin: 3px 0px;
}
.scriptLinks .grayedout {
  margin-left: 10px;
}
.scriptLinks abbr {
  flex-shrink: 0;
}

td#officialLinks div {
  display: flex;
  align-items: center;
}

.scriptLinks img.favicon{
  height: 16px;
  width: 16px;
  margin-right: 5px;
  margin-left: 5px;
}

.platforms .lang {
  margin-right: 5px;
}
.platforms img.unofficial {
  -webkit-filter: grayscale(100%);
}
`;

(async function () {
  GM_addStyle(addCSS);

  const currentURL = new URL(document.URL);
  let allReleases;
  let existingShops;

  // get titles
  const titles = getTitles();

  // if on main tab, get info with existing doc, otherwise fetch main page
  if (currentURL.pathname.match(pathRegex)) {
    existingShops = getShopLinks(document);
    ({ officialLinks, otherLinks, allReleases, langInfo } = getLangInfo(
      document,
      existingShops,
      titles
    ));
  } else {
    const vnID = currentURL.pathname.match(vnIdRegex)[1];
    const vnURL = `https://vndb.org/${vnID}`;
    console.log(`Fetching ${vnURL}`);
    let fetchPage = await fetch(vnURL);
    let fetchText = await fetchDoc.text();
    let fetchDoc = await new DOMParser().parseFromString(fetchText, 'text/html');

    existingShops = getShopLinks(fetchDoc);
    ({ officialLinks, otherLinks, allReleases, langInfo } = getLangInfo(
      fetchDoc,
      existingShops,
      titles
    ));
  }

  const officialLinksElem = makeHTMLTable(officialLinks, 'Official Links');
  const otherLinksElem = makeHTMLTable(otherLinks, 'Other Links', true);
  const releasesElem = makeHTMLTable(allReleases, 'Release Dates');
  const platformsElem = makePlatformTable(langInfo);

  const tbody = document.querySelector('.mainbox .vndetails tbody');

  const firstHeader = tbody.querySelector('tr.nostripe');

  tbody.insertBefore(platformsElem, firstHeader);
  tbody.insertBefore(releasesElem, firstHeader);
  tbody.insertBefore(officialLinksElem, firstHeader);
  tbody.insertBefore(otherLinksElem, firstHeader);
})();

/**
 * Gets all the titles on the page
 * @returns {Set} titles
 */
function getTitles() {
  const titles = new Set();
  const allTds = [...document.querySelectorAll('.mainbox .vndetails tbody tr.title td')];
  for (const td of allTds) {
    const nodes = [...td.childNodes];
    for (const node of nodes) {
      let add = false;
      if (node.nodeType == Node.TEXT_NODE) {
        add = true;
      } else if (node.nodeType == Node.ELEMENT_NODE && node.tagName == 'SPAN') {
        add = true;
      }
      if (add) {
        titles.add(node.textContent.trim());
      }
    }
  }
  console.log(titles);
  return titles;
}

/**
 * Gets the shop links from the given document and returns them as a set.
 * @param {DOM} document
 * @returns {Set} shopLinks
 */
function getShopLinks(document) {
  const buynow = document.getElementById('buynow');
  if (buynow) {
    return new Set([...buynow.querySelectorAll('a')].map((a) => a.href));
  } else {
    return new Set();
  }
}
/**
 * Gets the official links and release dates for the given document.
 * @param {DOM} document
 * @param {Set} existingShops - set of shop links to exclude
 * @returns {object} allLinks, allReleases
 */
function getLangInfo(document, existingShops, titles) {
  const langInfo = extractLangInfo(document);
  const { officialLinks, otherLinks } = processLinks(langInfo, existingShops, titles);
  const allReleases = processReleases(langInfo);
  return { officialLinks, otherLinks, allReleases, langInfo };
}

/**
 * Extracts language information from the given document.
 * @param {DOM} document
 * @returns {Array} langInfo
 */
function extractLangInfo(document) {
  const langInfo = [];

  [...document.querySelectorAll('.mainbox.vnreleases > details')].forEach((detail) => {
    // Exclude collapsed languages
    if (detail.open == false) {
      return;
    }
    const releases = detail.querySelectorAll('tr');
    const lang = detail.querySelector('summary > abbr.lang').outerHTML;
    const info = { lang, links: {}, platforms: {} };

    for (const release of releases) {
      const releaseTitle = release.querySelector('.tc4 a').innerText;
      // ignore unofficial/mtl/patches
      const grayedout = release.querySelector('b.grayedout')?.textContent ?? '';
      const unofficial = !!grayedout.match(/unofficial/);
      const patch = !!grayedout.match(/patch/);
      const mtl =
        grayedout.match(/machine translation/) ||
        release.querySelector('tr')?.classList?.contains('mtl') ||
        release?.classList?.contains('mtl');
      const complete = !!release.querySelector(`abbr.icons[title="complete"]`);
      if (!unofficial && !mtl) {
        // get official link first for the case where there is only one link
        const officialLinkIcon = release.querySelector('abbr.external[title="Official website"]');
        if (officialLinkIcon) {
          info.links[officialLinkIcon.parentElement.href] = {
            type: patch ? 'Patch' : 'Official website',
            title: releaseTitle,
          };
        }

        // get rest of links in dropdown
        const otherLinks = [...release.querySelectorAll('.elm_dd_relextlink li > a')];
        if (otherLinks.length > 0) {
          otherLinks.forEach((linkAnchor) => {
            if (!info.links[linkAnchor.href]) {
              info.links[linkAnchor.href] = { type: linkAnchor.innerHTML, title: releaseTitle };
              const priceSpan = linkAnchor.querySelector('span');
              if (priceSpan) {
                const price = priceSpan.textContent;
                info.links[linkAnchor.href].price = price;
                info.links[linkAnchor.href].type = linkAnchor.childNodes[1].textContent;
              }
              // set type to patch if it's a patch
              if (patch) {
                info.links[linkAnchor.href].type = 'Patch';
              }
            }
          });
        }

        // get release date
        if (!info.release && complete && !patch) {
          info.release = release.querySelector('.tc1').innerHTML;
        }
      }
      // check if release date is set so that there's an official release, add platform if so
      if (info.release && complete && !mtl) {
        const platform = release.querySelector('.platicon').outerHTML;
        const released = !release.querySelector('.future');
        // add platform, set officiality
        if (!info.platforms[platform]) {
          info.platforms[platform] = { official: !unofficial, released };
        }
        // set to official if not already set
        if (!info.platforms[platform].official && !unofficial) {
          info.platforms[platform].official = true;
        }
        // set to released if not already set
        if (!info.platforms[platform].released && released) {
          info.platforms[platform].released = true;
        }
      }
    }

    langInfo.push(info);
  });

  return langInfo;
}

/**
 * Given a map of links to platforms and their release status, returns an HTML string of platform images and labels.
 * @param {array} platforms
 * @param {boolean} isUnreleased
 */
function createPlatformHtmlString(platforms, isUnreleased = false) {
  let htmlString = '';
  const label = isUnreleased ? '🚧:' : '';
  for (const [platformHTML, info] of platforms) {
    const platformImg = createElementFromHTML(platformHTML);
    if (!info.official) {
      platformImg.title += ' (unofficial)';
      platformImg.classList.add('unofficial');
    }
    if (isUnreleased) {
      platformImg.title += ' (unreleased)';
      platformImg.classList.add('unreleased');
    }
    htmlString += platformImg.outerHTML;
    platformImg.remove();
  }
  return `${label} ${htmlString}`;
}

/**
 * Given a map of links to languages, returns a table element about platform support.
 * @param {object[]} langInfo
 */
function makePlatformTable(langInfo) {
  let htmlString = '';
  for (const lang of langInfo) {
    const platforms = Object.entries(lang.platforms);
    const released = platforms.filter(([, info]) => info.released);
    const unreleased = platforms.filter(([, info]) => !info.released);

    const flag = lang.lang;
    htmlString += `<div>${flag}`;

    if (released.length > 0) {
      htmlString += createPlatformHtmlString(released);
    }
    if (unreleased.length > 0) {
      if (released.length > 0) {
        htmlString += '　';
      }
      htmlString += createPlatformHtmlString(unreleased, true);
    }
  }
  const platformsElem = document.createElement('tr');
  platformsElem.className = 'platforms';
  platformsElem.innerHTML = `
  <td>Platforms</td>
  <td>
    ${htmlString}
  </td>
  `;
  return platformsElem;
}

/**
 * Processes language information to extract official and other links.
 * @param {Array} langInfo
 * @param {Set} existingShops - set of shop links to exclude
 * @returns {object} officialLinks, otherLinks - maps of linkHTML to languages
 */
function processLinks(langInfo, existingShops, titles) {
  const officialLinks = new Map();
  const otherLinks = new Map();
  const existingLinks = new Set();

  for (const lang of langInfo) {
    for (const link of Object.keys(lang.links)) {
      if (existingShops.has(link)) {
        console.log(`Skipping shop link: ${link}`);
        continue;
      }
      if (existingLinks.has(link)) {
        console.log(`Skipping duplicate link: ${link}`);
        continue;
      }
      existingLinks.add(link);
      const linkType = lang.links[link].type;

      let linkTitle = lang.links[link].title;
      // trim edition title by removing main title
      let titleReplaced = false;
      let i = 0;
      while (!titleReplaced && i < titles.size) {
        const title = [...titles][i];
        if (linkTitle.includes(title)) {
          linkTitle = linkTitle.replace(title, '');
          titleReplaced = true;
        }
        i++;
      }
      linkTitle = linkTitle.trim();

      const linkPrice = lang.links[link].price;
      try {
        const url = new URL(link);
        let displayLink;
        let faviconURL = 'https://www.google.com/s2/favicons?sz=16&domain=' + url;
        if (linkType === 'Official website') {
          displayLink = url.hostname + url.pathname + url.search + url.hash;
          displayLink = displayLink.replace(/\/$/, '');
          displayLink = displayLink.replace(/^www./, '');
          if (displayLink.length > 53) {
            displayLink = displayLink.slice(0, 50) + '...';
          }
        } else {
          displayLink = linkType;
        }
        // merge language flags on each link, create html
        let linkHTML = `
<img src="${faviconURL}" alt="favicon" class="favicon">
<a href="${link}" title="${displayLink}">
  ${displayLink}
  ${linkPrice ? `<span>${linkPrice}</span>` : ''}
</a>`;
        if (linkType === 'Official website') {
          if (officialLinks.has(linkHTML)) {
            officialLinks.get(linkHTML).push(lang.lang);
          } else {
            officialLinks.set(linkHTML, [lang.lang]);
          }
        } else {
          // add title to other links
          linkHTML += `<span class="grayedout" title="${linkTitle}">${linkTitle}</span>`;
          if (otherLinks.has(linkHTML)) {
            otherLinks.get(linkHTML).push(lang.lang);
          } else {
            otherLinks.set(linkHTML, [lang.lang]);
          }
        }
      } catch (error) {
        console.log(link, error);
      }
    }
  }
  return { officialLinks, otherLinks };
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
 * Creates an HTML table from the given data. If collapsible is true, the table will be collapsed by default but include linksBeforeCollapse links in the summary.
 * @param {object} dataToLangFlags Map of links or data as the key mapped to values of arrays of languages
 */
function makeHTMLTable(dataToLangFlags, title, collapsible = false) {
  if (!collapsible || dataToLangFlags.size <= linksBeforeCollapse) {
    let tableHTML = createTableHTML(dataToLangFlags);

    const tableElem = document.createElement('tr');
    if (dataToLangFlags.size > 0) {
      tableElem.innerHTML = `<td>${title}</td><td id="officialLinks" class="scriptLinks">${tableHTML}</td>`;
    }
    return tableElem;
  } else {
    const summaryRows = [...dataToLangFlags].slice(0, linksBeforeCollapse);
    let summaryHTML = createTableHTML(summaryRows);

    const remainingRows = [...dataToLangFlags].slice(linksBeforeCollapse);
    let remainingHTML = createTableHTML(remainingRows);

    const tableHTML = `
<td class="titles scriptLinks" colspan="2">
  <details>
    <summary>
      <div>${title}</div>
      <table>
        <tbody>
          <tr class="title nostripe otherlink">
            <td>${summaryHTML}
          </tr>
        </tbody>
      </table>
    </summary>
    <table>
      <tbody>
        <tr class="title nostripe otherlink">
          <td>${remainingHTML}</td>
        </tr>
      </tbody>
    </table>
  </details>
</td>
`;
    const tableElem = document.createElement('tr');
    tableElem.innerHTML = tableHTML;
    return tableElem;
  }
}

function createTableHTML(dataToLangFlags) {
  let tableHTML = '';
  for (const [data, lang] of dataToLangFlags) {
    tableHTML += '<div>' + lang.join('') + data + '</div>';
  }
  return tableHTML;
}

function createElementFromHTML(htmlString) {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}
