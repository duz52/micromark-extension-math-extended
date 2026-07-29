/**
 * @import {Construct, State, TokenizeContext, Tokenizer} from 'micromark-util-types'
 */

import {ok as assert} from 'devlop'
import {factorySpace} from 'micromark-factory-space'
import {markdownLineEnding} from 'micromark-util-character'
import {codes, constants, types} from 'micromark-util-symbol'

/** @type {Construct} */
export const mathFlowDollar = createDollarMathFlowConstruct()

/** @type {Construct} */
export const mathFlowBackslash = {
  tokenize: tokenizeMathFlowBackslash,
  concrete: true,
  name: 'mathFlow'
}

/**
 * Preserve the historical export name for the dollar-based construct so that
 * downstream integrations continue to function without changes.
 *
 * @type {Construct}
 */
export const mathFlow = mathFlowDollar

/** @type {Construct} */
const nonLazyContinuation = {
  tokenize: tokenizeNonLazyContinuation,
  partial: true
}

/**
 * Create a dollar-delimited math flow construct.
 *
 * @returns {Construct}
 *   Dollar-delimited math flow construct.
 */
function createDollarMathFlowConstruct() {
  return {
    tokenize: tokenizeMathFenced,
    concrete: true,
    name: 'mathFlow'
  }

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeMathFenced(effects, ok, nok) {
    const self = this
    const tail = self.events[self.events.length - 1]
    const initialSize =
      tail && tail[1].type === types.linePrefix
        ? tail[2].sliceSerialize(tail[1], true).length
        : 0
    let sizeOpen = 0

    return start

    /**
     * Start of math.
     *
     * ```markdown
     * > | $$
     *     ^
     *   | \frac{1}{2}
     *   | $$
     * ```
     *
     * @type {State}
     */
    function start(code) {
      assert(code === codes.dollarSign, 'expected `$`')
      effects.enter('mathFlow')
      effects.enter('mathFlowFence')
      effects.enter('mathFlowFenceSequence')
      return sequenceOpen(code)
    }

    /**
     * In opening fence sequence.
     *
     * ```markdown
     * > | $$
     *      ^
     *   | \frac{1}{2}
     *   | $$
     * ```
     *
     * @type {State}
     */
    function sequenceOpen(code) {
      if (code === codes.dollarSign) {
        effects.consume(code)
        sizeOpen++
        return sequenceOpen
      }

      if (sizeOpen < 2) {
        return nok(code)
      }

      effects.exit('mathFlowFenceSequence')
      return factorySpace(effects, metaBefore, types.whitespace)(code)
    }

    /**
     * In opening fence, before meta.
     *
     * ```markdown
     * > | $$asciimath
     *       ^
     *   | x < y
     *   | $$
     * ```
     *
     * @type {State}
     */
    function metaBefore(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        return metaAfter(code)
      }

      effects.enter('mathFlowFenceMeta')
      effects.enter(types.chunkString, {
        contentType: constants.contentTypeString
      })
      return meta(code)
    }

    /**
     * In meta.
     *
     * ```markdown
     * > | $$asciimath
     *        ^
     *   | x < y
     *   | $$
     * ```
     *
     * @type {State}
     */
    function meta(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit(types.chunkString)
        effects.exit('mathFlowFenceMeta')
        return metaAfter(code)
      }

      if (code === codes.dollarSign) {
        return nok(code)
      }

      effects.consume(code)
      return meta
    }

    /**
     * After meta.
     *
     * ```markdown
     * > | $$
     *       ^
     *   | \frac{1}{2}
     *   | $$
     * ```
     *
     * @type {State}
     */
    function metaAfter(code) {
      effects.exit('mathFlowFence')

      if (self.interrupt) {
        return ok(code)
      }

      return effects.attempt(
        nonLazyContinuation,
        beforeNonLazyContinuation,
        after
      )(code)
    }

    /**
     * At eol/eof after a non-lazy continuation is not used.
     *
     * ```markdown
     *   | $$
     *   | \frac{1}{2}
     * > | $$
     *       ^
     * ```
     *
     * @type {State}
     */
    function beforeNonLazyContinuation(code) {
      return effects.attempt(
        {tokenize: tokenizeClosingFence, partial: true},
        after,
        contentStart
      )(code)
    }

    /**
     * At math content.
     *
     * ```markdown
     *   | $$
     * > | \frac{1}{2}
     *     ^
     *   | $$
     * ```
     *
     * @type {State}
     */
    function contentStart(code) {
      return (
        initialSize
          ? factorySpace(
              effects,
              beforeContentChunk,
              types.linePrefix,
              initialSize + 1
            )
          : beforeContentChunk
      )(code)
    }

    /**
     * Before math content, after optional prefix.
     *
     * ```markdown
     *   | $$
     * > | \frac{1}{2}
     *     ^
     *   | $$
     * ```
     *
     * @type {State}
     */
    function beforeContentChunk(code) {
      if (code === codes.eof) {
        return after(code)
      }

      if (markdownLineEnding(code)) {
        return effects.attempt(
          nonLazyContinuation,
          beforeNonLazyContinuation,
          after
        )(code)
      }

      effects.enter('mathFlowValue')
      return contentChunk(code)
    }

    /**
     * In math content.
     *
     * ```markdown
     *   | $$
     * > | \frac{1}{2}
     *      ^
     *   | $$
     * ```
     *
     * @type {State}
     */
    function contentChunk(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit('mathFlowValue')
        return beforeContentChunk(code)
      }

      effects.consume(code)
      return contentChunk
    }

    /**
     * Attempt to close math.
     *
     * @type {Tokenizer}
     */
    function tokenizeClosingFence(effects, ok, nok) {
      let size = 0

      assert(self.parser.constructs.disable.null, 'expected `disable.null`')

      return factorySpace(
        effects,
        beforeSequenceClose,
        types.linePrefix,
        self.parser.constructs.disable.null.includes('codeIndented')
          ? undefined
          : constants.tabSize
      )

      /**
       * Enter the closing fence sequence.
       *
       * @type {State}
       */
      function beforeSequenceClose(code) {
        effects.enter('mathFlowFence')
        effects.enter('mathFlowFenceSequence')
        return sequenceClose(code)
      }

      /**
       * Consume the closing fence sequence.
       *
       * @type {State}
       */
      function sequenceClose(code) {
        if (code === codes.dollarSign) {
          size++
          effects.consume(code)
          return sequenceClose
        }

        if (size < sizeOpen) {
          return nok(code)
        }

        effects.exit('mathFlowFenceSequence')
        return factorySpace(effects, afterSequenceClose, types.whitespace)(code)
      }

      /**
       * After the closing fence sequence.
       *
       * @type {State}
       */
      function afterSequenceClose(code) {
        if (code === codes.eof || markdownLineEnding(code)) {
          effects.exit('mathFlowFence')
          return ok(code)
        }

        return nok(code)
      }
    }

    /**
     * After math content.
     *
     * ```markdown
     *   | $$
     *   | \frac{1}{2}
     * > | $$
     *       ^
     * ```
     *
     * @type {State}
     */
    function after(code) {
      effects.exit('mathFlow')
      return ok(code)
    }
  }
}

/**
 * Tokenize display math delimited by `\[` and `\]`.
 *
 * Unlike dollar-delimited flow math, backslash-delimited display math follows
 * TeX delimiter semantics: it has no meta string, the closing delimiter can
 * occur on the opening line or after content on a later line, and a matching
 * closing delimiter is required.
 *
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizeMathFlowBackslash(effects, ok, nok) {
  const self = this
  const tail = self.events[self.events.length - 1]
  const initialSize =
    tail && tail[1].type === types.linePrefix
      ? tail[2].sliceSerialize(tail[1], true).length
      : 0

  return start

  /** @type {State} */
  function start(code) {
    assert(code === codes.backslash, 'expected `\\`')
    effects.enter('mathFlow')
    effects.enter('mathFlowFence')
    effects.enter('mathFlowFenceSequence')
    effects.consume(code)
    return open
  }

  /** @type {State} */
  function open(code) {
    if (code !== codes.leftSquareBracket) {
      return nok(code)
    }

    effects.consume(code)
    effects.exit('mathFlowFenceSequence')
    effects.exit('mathFlowFence')
    return beforeContent
  }

  /** @type {State} */
  function beforeContent(code) {
    if (code === codes.eof) {
      return nok(code)
    }

    if (markdownLineEnding(code)) {
      return effects.attempt(nonLazyContinuation, contentStart, nok)(code)
    }

    if (code === codes.backslash) {
      return effects.attempt(
        {tokenize: tokenizeClosingFence, partial: true},
        after,
        valueStart
      )(code)
    }

    effects.enter('mathFlowValue')
    return value(code)
  }

  /** @type {State} */
  function contentStart(code) {
    return (
      initialSize
        ? factorySpace(
            effects,
            beforeContent,
            types.linePrefix,
            initialSize + 1
          )
        : beforeContent
    )(code)
  }

  /** @type {State} */
  function valueStart(code) {
    assert(code === codes.backslash, 'expected `\\`')
    effects.enter('mathFlowValue')
    effects.consume(code)
    return valueAfterBackslash
  }

  /** @type {State} */
  function valueAfterBackslash(code) {
    // `\\` is an atomic TeX line-break command.  A following `[` starts its
    // optional argument (for example, `\\[2pt]`), not a display delimiter.
    if (code === codes.backslash) {
      effects.consume(code)
      return value
    }

    // Nested display delimiters are invalid in TeX.  Fail at the next opener
    // so malformed input can recover there without repeatedly scanning to EOF.
    if (code === codes.leftSquareBracket) {
      return nok(code)
    }

    return value(code)
  }

  /** @type {State} */
  function value(code) {
    if (
      code === codes.eof ||
      code === codes.backslash ||
      markdownLineEnding(code)
    ) {
      effects.exit('mathFlowValue')
      return beforeContent(code)
    }

    effects.consume(code)
    return value
  }

  /**
   * @type {Tokenizer}
   */
  function tokenizeClosingFence(effects, ok, nok) {
    return start

    /** @type {State} */
    function start(code) {
      assert(code === codes.backslash, 'expected `\\`')
      effects.enter('mathFlowFence')
      effects.enter('mathFlowFenceSequence')
      effects.consume(code)
      return close
    }

    /** @type {State} */
    function close(code) {
      if (code !== codes.rightSquareBracket) {
        return nok(code)
      }

      effects.consume(code)
      effects.exit('mathFlowFenceSequence')
      return factorySpace(effects, afterClose, types.whitespace)
    }

    /** @type {State} */
    function afterClose(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit('mathFlowFence')
        return ok(code)
      }

      return nok(code)
    }
  }

  /** @type {State} */
  function after(code) {
    effects.exit('mathFlow')
    return ok(code)
  }
}

/**
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizeNonLazyContinuation(effects, ok, nok) {
  const self = this

  return start

  /** @type {State} */
  function start(code) {
    if (code === null) {
      return ok(code)
    }

    assert(markdownLineEnding(code), 'expected eol')
    effects.enter(types.lineEnding)
    effects.consume(code)
    effects.exit(types.lineEnding)
    return lineStart
  }

  /** @type {State} */
  function lineStart(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code)
  }
}
