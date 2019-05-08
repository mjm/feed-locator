import { locateFeed } from "../src"
import nock from "nock"

beforeAll(() => nock.disableNetConnect())
afterAll(() => nock.enableNetConnect())

test("finds JSON feed by exact URL", async () => {
  const scope = nock("https://www.example.org")
    .get("/feed.json")
    .reply(200, { feed_url: "https://www.example.org/feed.json" })

  const feedURL = await locateFeed("https://www.example.org/feed.json")
  expect(feedURL).toBe("https://www.example.org/feed.json")

  scope.done()
})

test("throws error if JSON feed has no feed_url", async () => {
  const scope = nock("https://www.example.org")
    .get("/feed.json")
    .reply(200, {})

  expect(locateFeed("https://www.example.org/feed.json")).rejects.toThrow()

  scope.done()
})

test("uses URL in the JSON feed body", async () => {
  const scope = nock("https://www.example.org")
    .get("/feed.json")
    .reply(200, { feed_url: "https://www.example.org/feeds/json" })

  const feedURL = await locateFeed("https://www.example.org/feed.json")
  expect(feedURL).toBe("https://www.example.org/feeds/json")

  scope.done()
})

test("follows redirects", async () => {
  const scope1 = nock("https://example.org")
    .get("/feed.json")
    .reply(301, "", { location: "https://www.example.org/feed.json" })
  const scope2 = nock("https://www.example.org")
    .get("/feed.json")
    .reply(200, { feed_url: "https://www.example.org/feeds/json" })

  const feedURL = await locateFeed("https://example.org/feed.json")
  expect(feedURL).toBe("https://www.example.org/feeds/json")

  scope1.done()
  scope2.done()
})

test("uses request URL for RSS feeds with no self link", async () => {
  const feed = `
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <atom:link href="https://example.org/" />
    </channel>
  </rss>`

  const scope = nock("https://www.example.org")
    .get("/feed.xml")
    .reply(200, feed, { "content-type": "application/rss+xml" })

  const feedURL = await locateFeed("https://www.example.org/feed.xml")
  expect(feedURL).toBe("https://www.example.org/feed.xml")

  scope.done()
})

test("uses self link for RSS feeds if present", async () => {
  const feed = `
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <atom:link href="https://example.org/" />
      <atom:link href="https://www.example.org/feeds/rss" rel="self" type="application/rss+xml" />
    </channel>
  </rss>`

  const scope = nock("https://www.example.org")
    .get("/feed.xml")
    .reply(200, feed, { "content-type": "application/rss+xml" })

  const feedURL = await locateFeed("https://www.example.org/feed.xml")
  expect(feedURL).toBe("https://www.example.org/feeds/rss")

  scope.done()
})

test("uses request URL for Atom feeds with no self link", async () => {
  const feed = `
  <?xml version="1.0" encoding="UTF-8"?>
  <feed
    xmlns="http://www.w3.org/2005/Atom"
    xml:lang="en-US">
    <link rel="alternate" type="text/html" href="https://example.org/" />
    <id>https://example.com/feed.atom</id>
    <author>
      <name>John</name>
      <uri>https://john.example.com</uri>
    </author>
  </feed>`

  const scope = nock("https://www.example.org")
    .get("/feed.atom")
    .reply(200, feed, { "content-type": "application/atom+xml" })

  const feedURL = await locateFeed("https://www.example.org/feed.atom")
  expect(feedURL).toBe("https://www.example.org/feed.atom")

  scope.done()
})

test("uses self link for Atom feeds if present", async () => {
  const feed = `
  <?xml version="1.0" encoding="UTF-8"?>
  <feed
    xmlns="http://www.w3.org/2005/Atom"
    xml:lang="en-US">
    <link rel="alternate" type="text/html" href="https://example.org/" />
    <link rel="self" type="application/atom+xml" href="https://www.example.org/feeds/atom" />
    <id>https://example.com/feed.atom</id>
    <author>
      <name>John</name>
      <uri>https://john.example.com</uri>
    </author>
  </feed>`

  const scope = nock("https://www.example.org")
    .get("/feed.atom")
    .reply(200, feed, { "content-type": "application/atom+xml" })

  const feedURL = await locateFeed("https://www.example.org/feed.atom")
  expect(feedURL).toBe("https://www.example.org/feeds/atom")

  scope.done()
})

test("handles XML feeds with generic application/xml type", async () => {
  const feed = `
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <atom:link href="https://example.org/" />
      <atom:link href="https://www.example.org/feeds/rss" rel="self" type="application/rss+xml" />
    </channel>
  </rss>`
  const scope = nock("https://www.example.org")
    .get("/feed.xml")
    .reply(200, feed, { "content-type": "application/xml" })

  const feedURL = await locateFeed("https://www.example.org/feed.xml")
  expect(feedURL).toBe("https://www.example.org/feeds/rss")

  scope.done()
})

test("finds JSON feed from HTML page", async () => {
  const links = [
    { type: "application/json", href: "https://www.example.org/feed.json" },
  ]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })
    .get("/feed.json")
    .reply(200, { feed_url: "https://www.example.org/feed.json" })

  const feedURL = await locateFeed("https://www.example.org/")
  expect(feedURL).toBe("https://www.example.org/feed.json")

  scope.done()
})

test("finds JSON feed from HTML page with relative path", async () => {
  const links = [{ type: "application/json", href: "/feed.json" }]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })
    .get("/feed.json")
    .reply(200, { feed_url: "https://www.example.org/feed.json" })

  const feedURL = await locateFeed("https://www.example.org/")
  expect(feedURL).toBe("https://www.example.org/feed.json")

  scope.done()
})

test("finds Atom feed from HTML page", async () => {
  const links = [{ type: "application/atom+xml", href: "/feed.atom" }]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })
    .get("/feed.atom")
    .reply(200, "<feed></feed>", { "content-type": "application/atom+xml" })

  const feedURL = await locateFeed("https://www.example.org/")
  expect(feedURL).toBe("https://www.example.org/feed.atom")

  scope.done()
})

test("finds RSS feed from HTML page", async () => {
  const links = [{ type: "application/rss+xml", href: "/feed.xml" }]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })
    .get("/feed.xml")
    .reply(200, "<rss></rss>", { "content-type": "application/rss+xml" })

  const feedURL = await locateFeed("https://www.example.org/")
  expect(feedURL).toBe("https://www.example.org/feed.xml")

  scope.done()
})

test("chooses JSON feed when others are present", async () => {
  const links = [
    { type: "application/json", href: "/feed.json" },
    { type: "application/atom+xml", href: "/feed.atom" },
    { type: "application/rss+xml", href: "/feed.xml" },
  ]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })
    .get("/feed.json")
    .reply(200, { feed_url: "https://www.example.org/feed.json" })

  const feedURL = await locateFeed("https://www.example.org/")
  expect(feedURL).toBe("https://www.example.org/feed.json")

  scope.done()
})

test("chooses Atom feed if no JSON feed is present", async () => {
  const links = [
    { type: "application/atom+xml", href: "/feed.atom" },
    { type: "application/rss+xml", href: "/feed.xml" },
  ]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })
    .get("/feed.atom")
    .reply(200, "<feed></feed>", { "content-type": "application/atom+xml" })

  const feedURL = await locateFeed("https://www.example.org/")
  expect(feedURL).toBe("https://www.example.org/feed.atom")

  scope.done()
})

test("ignores feeds of unknown types", async () => {
  const links = [
    { type: "application/atom+xml", href: "/feed.atom" },
    { type: "application/foobar+xml", href: "/feed.foo" },
  ]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })
    .get("/feed.atom")
    .reply(200, "<feed></feed>", { "content-type": "application/atom+xml" })

  const feedURL = await locateFeed("https://www.example.org/")
  expect(feedURL).toBe("https://www.example.org/feed.atom")

  scope.done()
})

test("throws error when no feeds are found on HTML page", async () => {
  const links = [{ type: "application/foobar+xml", href: "/feed.foo" }]
  const scope = nock("https://www.example.org")
    .get("/")
    .reply(200, htmlWithLinks(links), { "content-type": "text/html" })

  expect(locateFeed("https://www.example.org")).rejects.toThrow()

  scope.done()
})

interface FeedLink {
  type: string
  href: string
}

function htmlWithLinks(links: FeedLink[] = []): string {
  return `
<!DOCTYPE html>
<html>
<head>
${links
  .map(
    ({ type, href }) => `<link rel="alternate" type="${type}" href="${href}">`
  )
  .join("\n")}
</head>
<body>Hello!</body>
</html>`
}
