# GitHub Lite

> **WARNING**: very early work in progress. Almost nothing works yet. Contributions welcome!

A faster GitHub client built with React Aria Components + Tailwind CSS. [Try it here](https://github-lite.pages.dev/)

<img width="1469" alt="Screenshot of app" src="https://github.com/devongovett/github-lite/assets/19409/af9b61ef-d8a7-44f7-aac3-b8fa6079ce92">

## Why?

I was tired of waiting for full page reloads for every navigation on GitHub's website, so I decided to build my own client as a modern single page app.
It works similarly to their native mobile app, using GraphQL to load data, with pre-fetching, keyboard navigation, and optimistic updates for a fast user experience.

My first priority is notifications. On GitHub's website, you have to navigate from the notifications page to separate issue and pull request pages, and when you go back you
lose your scroll position. I wanted a two-pane UI similar to an email inbox with a notifications list on the left, and a detail view for the selected item on the right.
This way you can easily scan the list, and click between items without losing your place or waiting for full page navigation.

## Stack

* React
* [React Aria Components](https://react-spectrum.adobe.com/react-aria/react-aria-components.html)
* Tailwind CSS
* GitHub's GraphQL API
* [SWR](https://swr.vercel.app) for caching and pre-fetching
* Cloudflare Pages/Workers for deployment

## To do

This app is very early, so most things still need to be implemented. This is a side project, so I'll work through these when I find time,
but contributions are also welcome. Please open an issue if you plan on contributing so we can discuss first.

* Finish implementing rendering for all issue / pull request event types
* Hook up actions like closing issues, adding labels, etc. to the GitHub API
* Add a way to view pull request diffs, ideally using Monaco
* Add support for more notification/object types like commits, discussions, etc.
* Add a repo view in addition to notifications, for viewing issues/prs/code/commits for that repo
* ...
