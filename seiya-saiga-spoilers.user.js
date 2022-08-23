// ==UserScript==
// @name        Seiya Saiga Spoilers
// @namespace   Marv
// @homepageURL https://github.com/MarvNC/vn-userscripts
// @match       https://seiya-saiga.com/game/*
// @grant       GM_addStyle
// @version     1.0
// @author      Marv
// @description Seiya Saiga Spoilers
// @run-at      document-load
// ==/UserScript==

const addCSS = /* css */ `
.spoiler {
  background-color: grey;
  border-radius: 4px;
  transition: 0.1s;
  cursor: pointer;
}

.spoilerContents {
  opacity: 0;
  cursor: pointer;
}

.spoiler:hover {
  background-color: unset !important;
  transition: 0.1s;
  cursor: pointer;
}

.spoiler:hover > .spoilerContents {
  opacity: 1 !important;
  cursor: pointer;
}

.headerThing {
  cursor: pointer;
}

`;

(function () {
  GM_addStyle(addCSS);
  let checkboxes = [...document.querySelectorAll('input[type=checkbox]')];

  checkboxes.forEach((checkbox) => {
    let spoilerSpan = document.createElement('span');
    spoilerSpan.className = 'spoiler';
    let spoilerContents = document.createElement('span');
    spoilerContents.className = 'spoilerContents';
    
    if(checkbox.parentNode.tagName != 'TD'){
      checkbox.parentNode.parentNode.insertBefore(checkbox, checkbox.parentNode);
    }
    while (checkbox.nextSibling && checkbox.nextSibling.tagName !== 'BR' && checkbox.nextSibling.tagName !== 'HR') {
      spoilerContents.appendChild(checkbox.nextSibling);
    }

    const toggleSpoiler = (spoilerTrue) => {
      if (spoilerTrue) {
        spoilerContents.style.opacity = 1;
        spoilerSpan.style.backgroundColor = 'unset';
      } else {
        spoilerContents.style.opacity = 0;
        spoilerSpan.style.backgroundColor = 'grey';
      }
    };

    spoilerSpan.addEventListener('click', () => checkbox.click());
    // spoilerContents.addEventListener('click', () => checkbox.click());

    const checkCheckbox = (_checkbox) => {
      if (!_checkbox.checked) {
        toggleSpoiler(false);
      } else {
        toggleSpoiler(true);
      }
    };

    checkbox.addEventListener('click', () => checkCheckbox(checkbox));
    checkCheckbox(checkbox);
    setInterval(() => checkCheckbox(checkbox), 10000);

    checkbox.parentNode.insertBefore(spoilerSpan, checkbox.nextElementSibling);
    spoilerSpan.appendChild(spoilerContents);
  });

  let routes = checkboxes.map((checkbox) => checkbox.parentElement);
  routes = [...new Set(routes)].filter((route) => route.tagName == 'TD');
  routes.forEach((route) => {

    let cellIndex = route.cellIndex;
    let header = route.parentElement.previousElementSibling.cells[cellIndex];
    header.classList.add('headerThing');
    header.addEventListener('click', () => {
      let checkboxes = [...route.querySelectorAll('input[type=checkbox]')];
      checkboxes.forEach((checkbox) => checkbox.click());
    });
  });
})();
