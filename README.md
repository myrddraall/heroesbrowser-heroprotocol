# heroesbrowser-heroprotocol

> **Superseded by [myrddraall/heroprotocol](https://github.com/myrddraall/heroprotocol), published as
> [`@myrddraall/heroprotocol`](https://github.com/myrddraall/heroprotocol/pkgs/npm/heroprotocol),
> `@myrddraall/heroprotocol-db`, `@myrddraall/heroprotocol-analysis` and `@myrddraall/hero-data`.**
>
> This repository is kept for its history and is no longer maintained.

A TypeScript decoder and analyser for Heroes of the Storm `.StormReplay` files, for the
browser. Published to npm as `@heroesbrowser/heroprotocol`, last released as **0.1.2**.

## Why it stopped working

- Protocols were fetched at runtime as Python from
  `Blizzard/heroprotocol/master/protocolNNNNN.py`; Blizzard moved them to
  `heroprotocol/versions/` in June 2021, so every replay has failed to parse since.
- Hero data came from `hotsapi.net`, which is offline.
- The gulp 3 / webpack 4 build cannot run on any supported Node version.

## Where the work continues

The successor repository carries this history, so `git log` and `git blame` there still
reach these commits. One package became four:

| Was                                          | Is now                                                             |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `Replay`, protocol loading, decoders         | `@myrddraall/heroprotocol` — protocols as data, best-effort decode |
| `ReplayWorker`, analysers' cached state      | `@myrddraall/heroprotocol-db` — normalized model in IndexedDB, ingest worker, client |
| `BasicReplayAnalyser` … `XPAnalyser`         | `@myrddraall/heroprotocol-analysis` — the same analyses as pure functions over the model |
| `heroData` / hotsapi                         | `@myrddraall/hero-data` — injectable provider over HeroesToolChest/heroes-data |

```bash
# .npmrc
@myrddraall:registry=https://npm.pkg.github.com
```

```bash
pnpm add @myrddraall/heroprotocol-db @myrddraall/heroprotocol-analysis dexie
```

The successor's README explains the model and the analyser framework; the analysis
package's README lists where its results deliberately differ from this repository's
analysers (each a bug here).
