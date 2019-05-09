# feed-locator

[![npm version](https://img.shields.io/npm/v/feed-locator.svg)](https://npm.im/feed-locator)
[![CircleCI](https://img.shields.io/circleci/project/github/mjm/feed-locator/master.svg)](https://circleci.com/gh/mjm/feed-locator)
![ISC License](https://img.shields.io/npm/l/feed-locator.svg)

Finds the URL for the canonical feed of a given URL. Finds JSON, Atom, and RSS feeds.

## Installation

```
npm install feed-locator
```

## Usage

```javascript
const { locateFeed } = require("feed-locator")

// Find feeds by starting at the home page and looking for <link> tags

let feedUrl = await locateFeed("https://mattmoriarity.com")
// => https://www.mattmoriarity.com/feed.json

feedUrl = await locateFeed("https://overreacted.io/")
// => https://overreacted.io/rss.xml

feedUrl = await locateFeed("https://netlify.com")
// => https://www.netlify.com/index.xml

// It's also fine to just give a feed URL directly.
// We will still see if the feed has a canonical URL specified in it.

feedUrl = await "https://mattmoriarity.com/feed.json"
// => https://www.mattmoriarity.com/feed.json
```
