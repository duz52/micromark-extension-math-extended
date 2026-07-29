# micromark-extension-math-extended

## Extended mathematical notation support for micromark

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]

[micromark][] extensions to support math with dollar delimiters (`$C_L$`),
TeX-style inline delimiters (`\(C_L\)`), and TeX-style display delimiters
(`\[C_L\]`).

## Notice

This package is an **extended version** of the MIT-licensed
`micromark-extension-math`.
It adds LaTeX-style bracket notation support based on:

* Functional specification derived from behavioral observation
* Standard LaTeX mathematical notation practices
* Existing micromark extension patterns and APIs

**Original work**: `micromark-extension-math` (c) Titus Wormer
(MIT License)

## Contents

* [What is this?](#what-is-this)
* [When to use this](#when-to-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`math(options?)`](#mathoptions)
  * [`mathHtml(options?)`](#mathhtmloptions)
  * [`HtmlOptions`](#htmloptions)
  * [`Options`](#options)
* [Authoring](#authoring)
* [HTML](#html)
* [CSS](#css)
* [Syntax](#syntax)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package contains two extensions that add support for math syntax
in markdown to [`micromark`][micromark].

As there is no spec for math in Markdown, dollar-delimited math follows how
code (fenced and text) works in CommonMark.
Backslash-delimited math follows TeX’s paired `\( ... \)` and `\[ ... \]`
semantics.

## When to use this

This project is useful when you want to support math in markdown.
Extending markdown with a syntax extension makes the markdown less portable.
LaTeX equations are also quite hard.
But this mechanism works well when you want authors, that have some LaTeX
experience, to be able to embed rich diagrams of math in scientific text.

You can use these extensions when you are working with [`micromark`][micromark]
already.

When you need a syntax tree, you can combine this package with
[`mdast-util-math`][mdast-util-math].

All these packages are used [`remark-math`][remark-math], which focusses on
making it easier to transform content by abstracting these internals away.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

[npm][]:

```sh
npm install micromark-extension-math-extended
```

In Deno with [`esm.sh`][esmsh]:

```js
import {math, mathHtml} from 'https://esm.sh/micromark-extension-math-extended@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {math, mathHtml} from 'https://esm.sh/micromark-extension-math-extended@3?bundle'
</script>
```

## Use

Say our document `example.md` contains:

```markdown
Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following equation.

$$
L = \frac{1}{2} \rho v^2 S C_L
$$
```

...and our module `example.js` looks as follows:

```js
import fs from 'node:fs/promises'
import {micromark} from 'micromark'
import {math, mathHtml} from 'micromark-extension-math-extended'

const output = micromark(await fs.readFile('example.md'), {
  extensions: [math()],
  htmlExtensions: [mathHtml()]
})

console.log(output)
```

...now running `node example.js` yields (abbreviated):

```html
<p>Lift(<span class="math math-inline"><span class="katex">...</span></span>)
can be determined by Lift Coefficient
(<span class="math math-inline"><span class="katex">...</span></span>)
like the following equation.</p>
<div class="math math-display"><span class="katex-display"><span class="katex">...</span></span></div>
```

## API

This package exports the identifiers [`math`][api-math] and
[`mathHtml`][api-math-html].
There is no default export.

The export map supports the [`development` condition][development].
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition, production code is loaded.

### `math(options?)`

Create an extension for `micromark` to enable math syntax.

###### Parameters

* `options` ([`Options`][api-options], default: `{}`)
  — configuration

###### Returns

Extension for `micromark` that can be passed in `extensions`, to enable math
syntax ([`Extension`][micromark-extension]).

### `mathHtml(options?)`

Create an extension for `micromark` to support math when serializing to HTML.

> 👉 **Note**: this uses KaTeX to render math.

###### Parameters

* `options` ([`HtmlOptions`][api-html-options], default: `{}`)
  — configuration

###### Returns

Extension for `micromark` that can be passed in `htmlExtensions`, to support
math when serializing to HTML ([`HtmlExtension`][micromark-html-extension]).

### `HtmlOptions`

Configuration for HTML output (optional).

> 👉 **Note**: passed to [`katex.renderToString`][katex-options].
> `displayMode` is overwritten by this plugin, to `false` for math in text
> (inline), and `true` for math in flow (block).

###### Type

```ts
type Options = Omit<import('katex').KatexOptions, 'displayMode'>
```

### `Options`

Configuration (TypeScript type).

###### Fields

* `backslashDelimiters` (`boolean`, default: `true`)
  — whether to support TeX-style `\( ... \)` inline math and `\[ ... \]`
  display math.
  These sequences are character escapes in CommonMark, so enabling this option
  changes their normal Markdown meaning.
  Set this option to `false` when CommonMark-compatible escapes are preferred.
* `singleDollarTextMath` (`boolean`, default: `true`)
  — whether to support math (text, inline) with a single dollar.
  Single dollars work in Pandoc and many other places, but often interfere
  with “normal” dollars in text.
  If you turn this off, you use two or more dollars for text math.

## Authoring

When authoring markdown with math, keep in mind that math doesn’t work in most
places.
Notably, GitHub currently has a really weird crappy client-side regex-based
thing.
But on your own (math-heavy?) site it can be great!
You can use code (fenced) with an info string of `math` to improve this, as
that works in many places.

Use `\( ... \)` for inline backslash-delimited math:

```markdown
The result is \(a + b\).
```

Use `\[ ... \]` for display math.
The opening delimiter must occur where a flow construct can start, and the
closing delimiter must be followed only by spaces and a line ending or the end
of the document.
The content and closing delimiter can be on the opening line:

```markdown
\[a + b\]
```

They can also span lines:

```markdown
\[
a + b\]
```

Or all delimiters can occur on separate lines:

```markdown
\[
a + b
\]
```

A matching `\]` is required.
Without one, the opening `\[` is treated as normal Markdown instead of
consuming the remainder of the document.

> 👉 **Compatibility note**: CommonMark normally interprets `\(` and `\[`
> as character escapes.
> Pass `backslashDelimiters: false` to preserve that behavior.

## HTML

Math (flow) does not relate to HTML elements.
`MathML`, which is sort of like SVG but for math, exists but it doesn’t work
well and isn’t widely supported.
Instead, this uses [KaTeX][], which generates MathML as a fallback but also
generates a bunch of divs and spans so math look pretty.
The KaTeX result is wrapped in `<div>` (for flow, block) and `<span>` (for text,
inline) elements, with two classes: `math` and either `math-display` or
`math-inline`.
Backslash parentheses produce inline math and backslash brackets produce
display math.

When turning markdown into HTML, each line ending in math (text) is turned
into a space.

## CSS

The HTML produced by KaTeX requires CSS to render correctly.
You should use `katex.css` somewhere on the page where the math is shown to
style it properly.
At the time of writing, the last version is:

<!-- To do: update and copy paste the one from: https://katex.org/docs/browser -->

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
```

## Syntax

Math forms with the following simplified BNF:

```abnf
mathText ::= mathTextDollar / mathTextBackslash
mathTextDollar ::= sequenceDollarText 1*byte sequenceDollarText
mathTextBackslash ::= "\\(" *byte "\\)"

mathFlow ::= mathFlowDollar / mathFlowBackslash
mathFlowDollar ::= fenceDollarOpen *( eol *line ) [ eol fenceDollarClose ]
mathFlowBackslash ::= "\\[" *byte "\\]" *spaceOrTab ( eol / eof )
; Restriction: an unescaped nested "\\[" cannot occur in
; `mathFlowBackslash` content.  Paired backslashes remain content, so the
; common TeX line-break form "\\\\[2pt]" is allowed.

fenceDollarOpen ::= sequenceDollarFlow *spaceOrTab [meta]
fenceDollarClose ::= sequenceDollarFlow *spaceOrTab
sequenceDollarText ::= 1*"$"
sequenceDollarFlow ::= 2*"$"
meta ::= 1*line

; Character groups for informational purposes.
byte ::= %x00-FFFF
eol ::= "\n" | "\r" | "\r\n"
eof ::= end of file
line ::= byte - eol
```

For dollar-delimited math, the opening and closing sequences must contain the
same number of markers.
A dollar cannot occur in flow meta.
Dollar flow meta is optional and ignored when rendering.

Dollar sequences are greedy: they cannot be preceded or followed by more dollar
markers.
You can include dollar delimiters inside math text by stacking more markers or
mixing delimiter styles:

```markdown
Mix styles: \( $a$ \) or include more markers: $a$$b$.
```

It is also possible to include one dollar marker by padding with a longer
fence:

```markdown
Include just one: $$ $ $$.
```

To illustrate dollar greediness:

```markdown
Not math: $$x$.

Not math: $x$$.

Escapes work, this is math: \$$x$.

Escapes work, this is math: $x$\$.
```

Yields:

```html
<p>Not math: $$x$.</p>
<p>Not math: $x$$.</p>
<p>Escapes work, this is math: $<span>...</span>.</p>
<p>Escapes work, this is math: <span>...</span>$.</p>
```

When turning math text into HTML, the first and last space are removed if both
exist and there is also a non-space in the math.
Line endings are considered spaces at that stage.

The above grammar does not show how indentation of each line is handled.
To parse dollar math flow, let `x` be the number of `space_or_tab` characters
before the opening fence sequence, after interpreting tabs based on how many
virtual spaces they represent.
Each line of text is then allowed (not required) to be indented with up
to `x` spaces or tabs, which are then ignored as an indent instead of being
considered as part of the content.
This indent does not affect the closing fence.
It can be indented up to a separate 3 real or virtual spaces.
A bigger indent makes it part of the content instead of a fence.

Dollar flow `meta` is interpreted as the
[string][micromark-content-types] content type.
That means that character escapes and character references are allowed.

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`HtmlOptions`][api-html-options]
and [`Options`][api-options].

## Compatibility

The current release line supports Node.js 16 and later.

This package works with `micromark` version `3` and later.

This package extends `micromark-extension-math` with backslash delimiters.
When `backslashDelimiters` is enabled, it intentionally changes the CommonMark
meaning of `\(` and `\[`.
`mdast-util-math` and `remark-math` can consume the resulting math tokens, but
their Markdown serializer emits dollar delimiters.
Round trips therefore preserve the math value and display/inline kind, but not
the original delimiter style.

## Security

This package is safe assuming that you trust KaTeX.
Any vulnerability in it could open you to a [cross-site scripting (XSS)][xss]
attack.

## Related

* [`remark-math`][remark-math]
  — remark (and rehype) plugins to support math
* [`mdast-util-math`][mdast-util-math]
  — mdast utility to support math

## Contribute

See [`contributing.md` in `micromark/.github`][contributing] for ways to get
started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

MIT © 2020 [Titus Wormer][author].

Extended modifications © 2025–2026 [Jerry Ho][fork-author].
See [license][].

<!-- Definitions -->

[build-badge]: https://github.com/duz52/micromark-extension-math-extended/actions/workflows/main.yml/badge.svg

[build]: https://github.com/duz52/micromark-extension-math-extended/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/duz52/micromark-extension-math-extended.svg

[coverage]: https://codecov.io/github/duz52/micromark-extension-math-extended

[downloads-badge]: https://img.shields.io/npm/dm/micromark-extension-math-extended.svg

[downloads]: https://www.npmjs.com/package/micromark-extension-math-extended

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=micromark-extension-math-extended

[size]: https://bundlejs.com/?q=micromark-extension-math-extended

[npm]: https://docs.npmjs.com/cli/install

[esmsh]: https://esm.sh

[license]: license

[author]: https://wooorm.com

[fork-author]: https://angelrose.org

[contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[support]: https://github.com/micromark/.github/blob/main/support.md

[coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[typescript]: https://www.typescriptlang.org

[development]: https://nodejs.org/api/packages.html#packages_resolving_user_conditions

[micromark]: https://github.com/micromark/micromark

[micromark-content-types]: https://github.com/micromark/micromark#content-types

[micromark-html-extension]: https://github.com/micromark/micromark#htmlextension

[micromark-extension]: https://github.com/micromark/micromark#syntaxextension

[mdast-util-math]: https://github.com/syntax-tree/mdast-util-math

[remark-math]: https://github.com/remarkjs/remark-math

[katex]: https://katex.org

[katex-options]: https://katex.org/docs/options.html

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[api-math]: #mathoptions

[api-math-html]: #mathhtmloptions

[api-options]: #options

[api-html-options]: #htmloptions
