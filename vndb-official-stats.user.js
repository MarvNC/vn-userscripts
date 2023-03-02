// ==UserScript==
// @name        VNDB Official Links and Release Dates
// @namespace   Marv
// @homepageURL https://github.com/MarvNC/vn-userscripts
// @match       https://vndb.org/v*
// @grant       GM_addElement
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @version     1.37
// @author      Marv
// @description Adds links and dates to the VNDB infobox.
// ==/UserScript==

const pathRegex = /^\/v(\d+)$/;
const vnIdRegex = /^\/(v\d+)/;
const 税込みRegex = /[\(（]税込([^\)]+)[\)）]/;
const unreleasedEmoji = '🚧';
const outOfStockEmoji = '❌';

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

  fetchPrices(otherLinksElem);
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
  const label = isUnreleased ? `${unreleasedEmoji}:` : '';
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

/**
 * Fetches prices for the given links and adds them to the table.
 * @param {DOM} otherLinksElem
 */
async function fetchPrices(otherLinksElem) {
  const links = [...otherLinksElem.querySelectorAll('a')];
  for (const linkAnchor of links) {
    const link = linkAnchor.href;
    const type = linkAnchor.title;
    const price = await getPrice(link, type);
    if (price) {
      const priceSpan = document.createElement('span');
      priceSpan.textContent = price;
      linkAnchor.appendChild(priceSpan);
    } else {
      console.log(`No price found for ${link}`);
    }
  }
}

/**
 * Gets the price for the given link.
 * @param {string} link
 * @param {string} type
 * @returns {string} price
 */
async function getPrice(link, type) {
  switch (type) {
    case 'Steam':
      return await getSteamPrice(link);
    case 'DMM':
      return await getDMMPrice(link);
    case 'Getchu':
      return await getGetchuPrice(link);
    case 'Toranoana':
      return await getToranoanaPrice(link);
    case 'Melonbooks.co.jp':
      return await getMelonbooksPrice(link);
    case 'Denpasoft':
      return await getDenpasoftPrice(link);
    case 'Nutaku':
      return await getNutakuPrice(link);
    case 'Fakku':
      return await getFakkuPrice(link);
    default:
      console.log(`${type} not supported yet`);
      return null;
  }
}

/**
 * Gets the price for the given Steam link.
 * @param {string} link
 * @returns {string} price
 */
async function getSteamPrice(link) {
  const steamId = link.match(/\/app\/(\d+)/)[1];
  const steamURL = `https://store.steampowered.com/api/appdetails?appids=${steamId}`;
  try {
    const response = await getJSONFromURL(steamURL);
    const data = response[steamId];
    if (data.success) {
      const price = data.data.price_overview.final / 100;
      return `$${price}`;
    }
  } catch (error) {
    console.log(error);
    return null;
  }

  return null;
}

/**
 * Gets the price for the given DMM link.
 * @param {string} link
 * @returns {string} price
 */
async function getDMMPrice(link) {
  const doc = await getDocumentFromURL(link);
  const urlInfo = new URL(link);
  // DL edition site
  if (urlInfo.hostname.startsWith('dlsoft')) {
    const normalPrice = doc.querySelector('td.normal-price.red');
    const couponPrice = doc.querySelector('div.coupon-price');
    if (couponPrice) {
      return couponPrice.textContent;
    }
    if (normalPrice) {
      return normalPrice.textContent;
    }
  } else {
    // physical purchase

    // region blocked
    if (!doc.querySelector('.bg-bskt')) {
      return;
    }
    const priceElem = doc.querySelector('.txt-price-discount');
    if (priceElem) {
      return priceElem.textContent;
    } else {
      return outOfStockEmoji;
    }
  }
  return null;
}

/**
 * Gets the price for the given Getchu link.
 * @param {string} link
 * @returns {string} price
 */
async function getGetchuPrice(link) {
  const adultLink = link + '&gc=gc';
  const doc = await getDocumentFromURL(adultLink);
  const taxIn = doc.querySelector('.taxin');
  if (taxIn) {
    return getTaxPrice(taxIn.textContent);
  }

  // out of stock, get 定価 price
  const softTable = doc.getElementById('soft_table');
  const priceLabel = [...softTable.querySelectorAll('td')].find(
    (td) => td.textContent === '定価：'
  );
  if (priceLabel) {
    return outOfStockEmoji + getTaxPrice(priceLabel.nextElementSibling.textContent);
  }
  return null;
}

/**
 * Gets the price for the given Toranoana link.
 * @param {string} link
 * @returns {string} price
 */
async function getToranoanaPrice(link) {
  const doc = await getDocumentFromURL(link);

  let stock = false;
  let price = '';

  const addToCart = doc.querySelector('div.product-detail-cart-block a.product-detail-cart-btn');
  if (addToCart) {
    stock = addToCart.innerText.includes('お取り寄せ');
  }

  const priceElem = doc.querySelector('ul.pricearea li');
  if (priceElem) {
    price = priceElem.dataset.price;
  }
  return (stock ? '' : outOfStockEmoji) + price;
}

/**
 * Gets the price for the given Melonbooks link.
 * @param {string} link
 * @returns {string} price
 */
async function getMelonbooksPrice(link) {
  const adultURL = link + '&adult_view=1';
  const doc = await getDocumentFromURL(adultURL);
  let stock = false;
  let price = '';

  const cartInput = doc.querySelector('div.btn-cart');
  if (cartInput) {
    stock = cartInput.innerText.includes('カートに入れる');
  }

  const priceElem = doc.querySelector('p.price span.yen');
  if (priceElem) {
    const delElem = priceElem.querySelector('del');
    if (delElem) {
      delElem.remove();
    }
    price = priceElem.innerText.trim();
  }
  return (stock ? '' : outOfStockEmoji) + price;
}

/**
 * Gets the price for the given Denpasoft link.
 * @param {string} link
 * @returns {string} price
 */
async function getDenpasoftPrice(link) {
  const doc = await getDocumentFromURL(link);
  const priceElem = doc.querySelector('p.price span.woocommerce-Price-amount.amount');
  if (priceElem) {
    return priceElem.innerText;
  }
  return null;
}

/**
 * Gets the price for the given Nutaku link.
 * @param {string} link
 * @returns {string} price
 */
async function getNutakuPrice(link) {
  const doc = await getDocumentFromURL(link);
  const priceElem = doc.querySelector('div.premium-purchase div.price-line');
  if (priceElem) {
    return priceElem.childNodes[0].textContent;
  }
  return null;
}

/**
 * Gets the price for the given Fakku link.
 * @param {string} link
 * @returns {string} price
 */
async function getFakkuPrice(link) {
  const doc = await getDocumentFromURL(link);
  const priceElem = doc.querySelector(
    '.w-full.table div[data-tippy-content="Add to Cart"].js-purchase-product'
  );
  if (priceElem) {
    return priceElem.innerText;
  }
}
/**
 * Gets the tax-included price from a string.
 * @param {string} priceString
 * @returns {string} price
 */
function getTaxPrice(priceString) {
  try {
    const price = priceString.match(税込みRegex)[1];
    return price;
  } catch (error) {
    console.log(`Error parsing price: ${priceString}`);
    return priceString;
  }
}

/**
 * Gets the document from a URL using GM_xmlhttpRequest to access other domains
 * @param {string} url
 * @returns {Promise<Document>}
 */
async function getDocumentFromURL(url) {
  console.log(`Fetching ${url}...`);
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function (response) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.responseText, 'text/html');
        resolve(doc);
      },
      onerror: function (error) {
        reject(error);
      },
    });
  });
}

/**
 * Gets the JSON from a URL using GM_xmlhttpRequest to access other domains
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function getJSONFromURL(url) {
  console.log(`Fetching ${url}...`);
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function (response) {
        resolve(JSON.parse(response.responseText));
      },
      onerror: function (error) {
        reject(error);
      },
    });
  });
}
