# VN(db) Userscripts <!-- omit in toc -->

I recommend using [Violentmonkey](https://violentmonkey.github.io/) to install userscripts.

- [vndb Links, Prices, and Release Dates](#vndb-links-prices-and-release-dates)
- [vndb At A Glance](#vndb-at-a-glance)
- [vndb Score History Graph](#vndb-score-history-graph)
  - [Usage](#usage)
- [Seiya Saiga Spoilers](#seiya-saiga-spoilers)

## vndb Links, Prices, and Release Dates

**[Install](https://github.com/MarvNC/vn-userscripts/raw/master/vndb-official-stats.user.js)**

A userscript that adds:

- Platform support information by language, with icons greyed out for unofficial releases and a 🚧 symbol to indicate that a release has not yet been released.
- Release dates by language
- Official links
- All other links linked in releases, which includes info sites like ErogameScape and retail sites.
- Price fetching is currently supported for the following sites:
  - Steam
  - DMM
  - Getchu
  - Toranoana
  - Melonbooks
  - Denpasoft
  - Nutaku
  - Fakku
- Note that prices will usually be 税込 (tax included) for JP retail sites. The ❌ symbol indicates that the product is likely out of stock.

![links script example](images/chrome_%E8%92%BC%E3%81%AE%E5%BD%BC%E6%96%B9%E3%81%AE%E3%83%95%E3%82%A9%E3%83%BC%E3%83%AA%E3%82%BA%E3%83%A0_EXTRA1__vndb_-_Google_Chrome_2023-03-02_13-04-14.png)

Also note that some sites may not display prices for you due to region blocks.

## vndb At A Glance

**[Install](https://github.com/MarvNC/vn-userscripts/raw/master/vndb-at-a-glance.user.js)**

A userscript that adds a table at the top of staff and producer pages showing the VNs on your list at a glance, with toggleable options to show different list labels.

![](images/2022-08-23_18-12-15.gif)

## vndb Score History Graph

**[Install](https://github.com/MarvNC/vn-userscripts/raw/master/vndb-score-graph.user.js)**

A userscript that adds score history graphs to pages on [vndb](http://vndb.org/).

### Usage

This script works on `vndb.org/v*` pages for visual novel entries, where you can click on a link next to the vote stats to display a graph of the score history. It isn't historically accurate because people can change their VNDB votes retroactively, and because the vndb weighted score algorithm changes over time based on overall database averages.

- Click on the legends at the top of the graph to toggle visibility of that dataset.
- You can zoom in the graph using the scroll wheel.
- Hit `ctrl+c` while focused on the table to copy its contents.

![usage](images/score-graphs/usage.png)

![example](images/score-graphs/example.png)

<details>
  <summary>Reveal more images</summary>

![table](images/score-graphs/table.png)

![releases tooltip](images/score-graphs/releases%20tooltip.png)

</details>

## Seiya Saiga Spoilers

**[Install](https://github.com/MarvNC/vn-userscripts/raw/master/seiya-saiga-spoilers.user.js)**

A userscript that hides choices on seiya-saiga behind clickable spoiler bars until checked.

![](images/2022-08-22_19-32-54.gif)
