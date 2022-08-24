// ==UserScript==
// @name        VNDB At a Glance
// @homepageURL https://github.com/MarvNC/vn-userscripts
// @match       https://vndb.org/s*
// @match       https://vndb.org/p*
// @version     1.1
// @author      Marv
// @description Displays known VNs at a glance on staff and company pages.
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

// TODO: add default labels storage

const listExportUrl = (id) => `https://vndb.org/${id}/list-export/xml`;

const defaultCheckedLabels = ['Playing', 'Finished', 'Stalled', 'Dropped', 'Wishlist'];
const defaultLabels = [...defaultCheckedLabels, 'Blacklist'];
const ignoreLabels = ['Voted'];

const labelFiltersHTML = /* html */ `
<p class="labelfilters">
  <span class="linkradio"></span>
  <br>
  <span class="linkradio theSecond"></span>
</p>`;

const onListText = (onListCount) => `On List (${onListCount})`;
const staffPageTableHTML = /* html */ `
<div id="onlist">
  <h1 class="boxtitle"></h1>

  <div class="mainbox browse staffroles">
    ${labelFiltersHTML}
    <table class="stripe">
      <thead>
        <tr>
          <td class="tc_ulist"></td>
          <td class="tc1">Title</td>
          <td class="tc2">Released</td>
          <td class="tc3">Role/Cast</td>
          <td class="tc4">As</td>
          <td class="tc5">Note</td>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  </div>
</div>
`;

const prodPageTableHTML = /* html */ `
<div id="onlist">
  <div class="mainbox">
    <h1></h1>
    ${labelFiltersHTML}
    <table class="releases">
      <br>
      <tbody>
      </tbody>
    </table>
  </div>
</div>
`;

const vnPageHTML = /* html */ `
<div class="mainbox">
  <h1></h1>
  ${labelFiltersHTML}
  <br>
  <ul class="prodvns">
  </ul>
</div>`;

const type = {
  staff: {
    releaseElem: 'tr',
    insertAfterSelector: '.mainbox.staffpage',
    tableHTML: staffPageTableHTML,
    insertVNsSelector: '.staffroles tbody',
  },
  prodReleases: {
    releaseElem: 'tr',
    insertAfterSelector: '#maincontent > .mainbox',
    tableHTML: prodPageTableHTML,
    insertVNsSelector: '.releases tbody',
  },
  prodVNs: {
    releaseElem: 'li',
    insertAfterSelector: '#maincontent > .mainbox',
    tableHTML: vnPageHTML,
    insertVNsSelector: 'ul.prodvns',
  },
};

(async function () {
  let currentPageType = null;
  const slug = window.location.pathname.replace('/', '');
  if (slug.startsWith('s')) {
    currentPageType = type.staff;
  } else if (slug.startsWith('p')) {
    if (slug.endsWith('vn')) {
      currentPageType = type.prodVNs;
    } else {
      currentPageType = type.prodReleases;
    }
  }

  const listLabels = await getListLabels();
  const onListVNs = getPageOnList(currentPageType);

  const insertAfterElem = document.querySelector(currentPageType.insertAfterSelector);

  const onListTable = createOnListTable(onListVNs, listLabels, currentPageType);

  insertAfter(onListTable, insertAfterElem);
})();

/**
 * Creates the on list table for a given list.
 * @param {array} onList
 * @param {array} listLabels
 * @returns on list table element
 */
function createOnListTable(onList, listLabels, currentPageType) {
  const onListTable = createElem(currentPageType.tableHTML);

  // two rows, first consists of default labels
  const listLabelsDiv = onListTable.querySelector('.linkradio');
  const secondListLabelsDiv = onListTable.querySelector('.linkradio.theSecond');
  for (const label of listLabels) {
    const addTo = defaultLabels.includes(label) ? listLabelsDiv : secondListLabelsDiv;

    const amountOfVns = onList.filter((vn) => vn.labels.includes(label)).length;

    const checkbox = createElem(/* html */ `<input type="checkbox" id="${label}">`);
    const labelElem = createElem(/* html */ `<label for="${label}">${label}</label>`);
    const count = createElem(/* html */ `<span class="count">(${amountOfVns})</span>`);
    const divider = createElem(/* html */ `<em> / </em>`);

    addTo.appendChild(checkbox);
    addTo.appendChild(labelElem);
    addTo.appendChild(count);
    addTo.appendChild(divider);

    checkbox.checked = isDefaultChecked(label);
    checkbox.addEventListener('change', (e) => {
      updateTable(onListTable, onList);
    });
  }
  // remove last divider
  listLabelsDiv.removeChild(listLabelsDiv.lastChild);
  secondListLabelsDiv.removeChild(secondListLabelsDiv.lastChild);

  const tbody = onListTable.querySelector(currentPageType.insertVNsSelector);
  for (const vn of onList) {
    tbody.appendChild(vn.tableRow);
  }

  updateTable(onListTable, onList);
  return onListTable;
}

/**
 * Updates the given table with the given VNs.
 * @param {*} table
 * @param {*} onList
 */
function updateTable(table, onList) {
  const header = table.querySelector('h1');
  header.textContent = onListText(onList.length);
  const checkboxes = [...table.querySelectorAll('input[type="checkbox"]')];
  const checkedLabels = checkboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.id);

  for (const vn of onList) {
    const { tableRow, labels } = vn;
    const isOnList = checkedLabels.some((label) => labels.includes(label));
    tableRow.style.display = isOnList ? '' : 'none';
  }
}

/**
 * Gets the user's known VNs on a staff page.
 * @returns {*} An array of VNs on the logged in user's list.
 */
function getPageOnList(currentPageType) {
  const onListIcons = [...document.getElementsByClassName('liststatus_icon')].filter(
    (elem) => elem.title !== 'Add to list'
  );

  const onList = onListIcons.map((elem) => ({
    tableRow: elem.closest(currentPageType.releaseElem).cloneNode(true),
    labels: elem.title.split(', '),
  }));

  return onList;
}

/**
 * Gets the logged in user's list labels.
 * @returns {*} The logged in user's list labels.
 */
async function getListLabels() {
  const userIDelem = document.querySelector('#menulist > div:nth-child(3) > div > a:nth-child(1)');
  const userID = userIDelem ? userIDelem.href.match(/u\d+/)[0] : null;

  const response = await fetch(listExportUrl(userID));
  const xml = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');

  const labels = [...xmlDoc.querySelectorAll('labels > label')]
    .map((label) => label.attributes.label.textContent)
    .filter((label) => !ignoreLabels.includes(label));

  // keep the default labels in their original sort, but alphabetize user added labels
  const sortedLabels = new Set([...defaultLabels, ...labels.sort()]);

  return sortedLabels;
}

/**
 * Returns whether a label should be checked
 * @param {string} label
 * @returns {boolean} Whether the label should be checked
 */
function isDefaultChecked(label) {
  return defaultCheckedLabels.includes(label);
}

/**
 * Inserts after the given element.
 * @param {*} newNode
 * @param {*} referenceNode
 */
function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

/**
 * Creates an element from the given HTML.
 * @param {*} html
 * @returns
 */
function createElem(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}
