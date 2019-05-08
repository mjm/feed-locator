# feed-locator

Finds the URL for the canonical feed of a given URL. Finds JSON, Atom, and RSS feeds.

## Installation

```
npm install feed-locator
```

## Usage

```javascript
const { locateFeed } = require("feed-locator")

let feedUrl = await locateFeed("https://mattmoriarity.com")
// => https://www.mattmoriarity.com/feed.json
```
