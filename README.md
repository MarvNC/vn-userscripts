# VN(db) Userscripts <!-- omit in toc -->

I recommend using [Violentmonkey](https://violentmonkey.github.io/) to install userscripts.

- [vndb Links and Release Dates](#vndb-links-and-release-dates)
- [vndb At A Glance](#vndb-at-a-glance)
- [vndb Score History Graph](#vndb-score-history-graph)
  - [Usage](#usage)
- [vndb Localized Timezones](#vndb-localized-timezones)
- [Seiya Saiga Spoilers](#seiya-saiga-spoilers)

## vndb Links and Release Dates

**[Install](https://github.com/MarvNC/vn-userscripts/raw/master/vndb-official-stats.user.js)**

A userscript that adds official links and release dates to the main infobox on vndb entries.

![](images/chrome_%E3%83%8F%E3%83%9F%E3%83%80%E3%82%B7%E3%82%AF%E3%83%AA%E3%82%A8%E3%82%A4%E3%83%86%E3%82%A3%E3%83%96__vndb_-_httpsvndb.org_-_Google_Ch_2022-08-22_19-27-22.png)

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
