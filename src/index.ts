import { URL } from "url"
import fetch from "isomorphic-unfetch"
import * as typeis from "type-is"
import * as cheerio from "cheerio"
import * as xpath from "xpath"
import { DOMParser } from "xmldom"

export async function locateFeed(url: string): Promise<string> {
  const found = await attempt(url)
  if (!found) {
    throw new Error(`Could not find a feed for ${url}`)
  }

  return found
}

async function attempt(url: string): Promise<string | null> {
  const response = await fetch(url)
  const mimeType = response.headers.get("content-type")
  if (!mimeType) {
    return null
  }

  switch (typeis.is(mimeType, ["html", "rss", "atom", "xml", "json"])) {
    case "html":
      return handleHtml(url, response)
    case "rss":
    case "atom":
    case "xml":
      return handleFeed(url, response)
    case "json":
      return handleJson(url, response)
    default:
      throw new Error(`Not sure how to handle content-type ${mimeType}`)
  }
}

const prioritizedFeedTypes = ["json", "atom", "rss"]

async function handleHtml(
  url: string,
  response: fetch.IsomorphicResponse
): Promise<string | null> {
  const content = await response.text()
  const $ = cheerio.load(content)

  // collect all rel="alternate" links, as they may be potential feeds
  const potentialFeedLinks = $("link[rel=alternate]").toArray()

  // now try each feed type in priority order, looking for a match
  for (let type of prioritizedFeedTypes) {
    for (let link of potentialFeedLinks) {
      if (link.attribs.type && typeis.is(link.attribs.type, [type])) {
        if (link.attribs.href) {
          const feedUrl = new URL(link.attribs.href, url)
          const resolved = await attempt(feedUrl.toString())

          // if we found a feed at this URL, return it.
          // otherwise, keep trying until all options are exhausted
          if (resolved) {
            return resolved
          }
        }
      }
    }
  }

  return null
}

const xpathSelect = xpath.useNamespaces({
  atom: "http://www.w3.org/2005/Atom",
})

async function handleFeed(
  url: string,
  response: fetch.IsomorphicResponse
): Promise<string | null> {
  const content = await response.text()
  const document = new DOMParser().parseFromString(content)

  const selfLink = xpathSelect(
    '//atom:link[@rel="self"]/@href',
    document,
    true
  ) as any
  if (selfLink && selfLink.value) {
    return selfLink.value
  }

  return url
}

async function handleJson(
  url: string,
  response: fetch.IsomorphicResponse
): Promise<string | null> {
  const json = await response.json()
  if (!json.feed_url) {
    throw new Error(`No feed_url found in JSON feed at ${url}`)
  }

  return json.feed_url
}
