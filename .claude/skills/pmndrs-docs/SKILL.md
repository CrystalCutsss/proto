---
name: pmndrs-docs
description: Use when code or an answer depends on react-three-fiber, drei or zustand APIs; look them up in the official pmndrs docs instead of recalling them.
---

# pmndrs docs

The `pmndrs` MCP server (project `.mcp.json`, https://docs.pmnd.rs/api/mcp) serves the official docs of
react-three-fiber, drei, zustand and react-postprocessing. Prefer it over memory: these libraries move fast and
recalled APIs go stale. Our pinned versions: fiber 9.8.1, drei 10.7.9.

## With the MCP server

1. `mcp__pmndrs__search_docs` with the question → up to 10 matching pages with `lib` and `path`.
2. `mcp__pmndrs__get_page_content` with `lib` and `path` taken verbatim from a hit. Never guess a path:
   route shapes differ per library (`/api/hooks` for fiber, `/abstractions/...` for drei). A bad path returns
   "Page not found" — search again instead of retrying variants.
3. `mcp__pmndrs__get_example` for a whole working scene; confirm its API against the docs page.

## Without it (server not loaded in this session)

`curl -s https://r3f.docs.pmnd.rs/llms.txt` lists fiber pages; `https://r3f.docs.pmnd.rs/llms-full.txt` is the
full text (~175 kB, grep it, do not read it whole). drei.docs.pmnd.rs is not reachable from the cloud VM; use the
installed package's types in `node_modules/@react-three/drei/` instead.

## Budget

Pages run 1,200–4,000 tokens. Fetch the one page that answers the question; narrow by search titles first.
