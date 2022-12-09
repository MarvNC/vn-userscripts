// ==UserScript==
// @name        VNDB Localized Timezones
// @namespace   https://github.com/MarvNC
// @match       https://vndb.org/t*
// @grant       none
// @version     1.0
// @author      -
// @description Adjust timestamps to the user's timezone
// ==/UserScript==

// regular post timestamps
const tdArr = [...document.querySelectorAll('tr>td.tc1')];
const dateRegex = /\d{4}-\d{2}-\d{2} at \d{2}:\d{2}/;

for (const td of tdArr) {
  const nodes = [...td.childNodes];
  // last node is text node
  const textNode = nodes[nodes.length - 1];
  const dateText = textNode.textContent;
  if (!dateRegex.test(dateText)) continue;
  const localeText = UTCTextToLocalTime(textNode.textContent);
  textNode.textContent = localeText;
}

// edited timestamp
const lastmodArr = [...document.querySelectorAll('td>i.lastmod')];
for (const lastmod of lastmodArr) {
  const lastModStr = 'Last modified on ';
  if (!lastmod.textContent.startsWith(lastModStr)) continue;
  const dateText = lastmod.textContent.split(lastModStr)[1];
  const localeText = UTCTextToLocalTime(dateText);
  lastmod.textContent = lastModStr + localeText;
}

// last post time
const lastPostTimeArr = [...document.querySelectorAll('td.tc4>a[href]')];
for (const lastPostTime of lastPostTimeArr) {
  const dateText = lastPostTime.textContent;
  if (!dateRegex.test(dateText)) continue;
  const localeText = UTCTextToLocalTime(dateText);
  lastPostTime.textContent = localeText;
}

/**
 * Converts a UTC timestamp to the user's local timezone
 * @param {string} text
 * @returns
 */
function UTCTextToLocalTime(text) {
  const [calendarDate, timestamp] = text.split(' at ');
  // create date using UTC
  const date = new Date(`${calendarDate}T${timestamp}Z`);
  // convert to local timezone and pad zeros
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} at ${hours}:${minutes}`;
}
