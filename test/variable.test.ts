/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import plugin = require('../src/variable');
import {type RenamingMap} from '../src/options';
import postcss, {LazyResult} from 'postcss';

function run(input: string, options?: plugin.Options): LazyResult {
  return postcss([plugin(options)]).process(input, {from: undefined});
}

function assertPostcss(result: LazyResult, output: string): void {
  expect(result.css).toEqual(output);
  expect(result.warnings()).toHaveLength(0);
}

function assertMapEquals(
  input: string,
  expected: RenamingMap,
  options: plugin.Options = {},
): void {
  let outputMap: RenamingMap | null = null;
  run(input, {
    ...options,
    outputMapCallback: map => {
      outputMap = map;
    },
  }).sync();
  expect(outputMap).toEqual(expected);
}

describe('with strategy "none"', () => {
  describe('with no variables', () => {
    const input = `
      .no-variables-here {
        absolutely: "nothing";
      }
    `;

    const options: plugin.Options = {
      strategy: 'none',
    };

    it('does nothing', () => {
      assertPostcss(run(input, options), input);
    });
  });

  describe('with single declaration', () => {
    const input = `
      .some-class-here {
        --some-variable-here: 999px;
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        'some-variable-here': 'some-variable-here',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: ['some-variable-here'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-variable-here': 'pf-some-variable-here',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with single use with no default', () => {
    const input = `
      .some-other-class-here {
        color: var(--some-color-here);
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        'some-color-here': 'some-color-here',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: ['some-color-here'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'pf-some-color-here',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with single use with default', () => {
    const input = `
      .some-other-class-here {
        color: var(--some-color-here, 123px);
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        'some-color-here': 'some-color-here',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: ['some-color-here'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'pf-some-color-here',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with deeply nested var uses', () => {
    const input = `
      .foo {
        color: var(--foo, var(--bar, var(--baz, var(--qux, #c0ffee))));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz',
        qux: 'qux',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar',
          baz: 'baz',
        },
        {
          except: ['foo', 'qux'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo',
          qux: 'qux',
        },
        {
          except: [/ba/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo',
          bar: 'pf-bar',
          baz: 'pf-baz',
          qux: 'pf-qux',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with extraneous parentheses', () => {
    const input = `
      .extraneous-parens {
        not-a-custom-property: (((var(--three-extra-paren))));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        'three-extra-paren': 'three-extra-paren',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: ['three-extra-paren'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          except: [/extra/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'three-extra-paren': 'pf-three-extra-paren',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with calc', () => {
    const input = `
      .class {
        number: var(--foo, calc(1 + var(--bar)));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        foo: 'foo',
        bar: 'bar',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar',
        },
        {
          except: ['foo'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo',
        },
        {
          except: [/ba/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo',
          bar: 'pf-bar',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });

  describe('with deeply nested functions', () => {
    const input = `
      .class {
        number: var(--foo, rgb(var(--bar), var(--baz, var(--biz)), var(--boz)));
      }
    `;

    it('does nothing with no options', () => {
      assertPostcss(run(input), input);
    });

    it('does nothing with an explicit strategy', () => {
      assertPostcss(run(input, {strategy: 'none'}), input);
    });

    it('emits an output map', () => {
      assertMapEquals(input, {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz',
        biz: 'biz',
        boz: 'boz',
      });
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar',
          baz: 'baz',
          biz: 'biz',
        },
        {
          except: ['foo', 'boz'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo',
        },
        {
          except: [/b/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo',
          bar: 'pf-bar',
          baz: 'pf-baz',
          biz: 'pf-biz',
          boz: 'pf-boz',
        },
        {
          prefix: 'pf',
        },
      );
    });
  });
});

describe('with strategy "debug"', () => {
  describe('with no variables', () => {
    const input = `
      .no-variables-here {
        absolutely: "nothing";
      }`;

    const options: plugin.Options = {
      strategy: 'debug',
    };

    it('does nothing', () => {
      assertPostcss(run(input, options), input);
    });
  });

  describe('with single declaration', () => {
    const input = '.some-class-here { --some-variable-here: 999px; }';

    it('adds an underscore after every name', () => {
      assertPostcss(
        run(input, {strategy: 'debug'}),
        '.some-class-here { --some-variable-here_: 999px; }',
      );
    });

    it('emits an output map', () => {
      assertMapEquals(
        input,
        {
          'some-variable-here': 'some-variable-here_',
        },
        {
          strategy: 'debug',
        },
      );
    });

    it('omits excluded names from final css', () => {
      assertPostcss(
        run(input, {strategy: 'debug', except: ['some-variable-here']}),
        '.some-class-here { --some-variable-here: 999px; }',
      );
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: ['some-variable-here'],
        },
      );
    });

    it('omits excluded regexes from final css', () => {
      assertPostcss(
        run(input, {strategy: 'debug', except: [/some/]}),
        '.some-class-here { --some-variable-here: 999px; }',
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-variable-here': 'pf-some-variable-here_',
        },
        {
          strategy: 'debug',
          prefix: 'pf',
        },
      );
    });
  });

  describe('with single use with no default', () => {
    const input = '.some-other-class-here { color: var(--some-color-here); }';

    it('adds an underscore after every name', () => {
      assertPostcss(
        run(input, {strategy: 'debug'}),
        '.some-other-class-here { color: var(--some-color-here_); }',
      );
    });

    it('emits an output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'some-color-here_',
        },
        {strategy: 'debug'},
      );
    });

    it('omits excluded names from the final css', () => {
      assertPostcss(
        run(input, {strategy: 'debug', except: ['some-color-here']}),
        '.some-other-class-here { color: var(--some-color-here); }',
      );
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: ['some-color-here'],
        },
      );
    });

    it('omits excluded regexes from the final css', () => {
      assertPostcss(
        run(input, {strategy: 'debug', except: [/some/]}),
        '.some-other-class-here { color: var(--some-color-here); }',
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'pf-some-color-here_',
        },
        {
          strategy: 'debug',
          prefix: 'pf',
        },
      );
    });
  });

  describe('with single use with default', () => {
    const input =
      '.some-other-class-here { color: var(--some-color-here, 123px); }';

    it('adds an underscore after every name', () => {
      assertPostcss(
        run(input, {strategy: 'debug'}),
        '.some-other-class-here { color: var(--some-color-here_, 123px); }',
      );
    });

    it('emits an output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'some-color-here_',
        },
        {strategy: 'debug'},
      );
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: ['some-color-here'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: [/some/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'some-color-here': 'pf-some-color-here_',
        },
        {
          strategy: 'debug',
          prefix: 'pf',
        },
      );
    });
  });

  describe('with deeply nested var uses', () => {
    const input =
      '.foo { color: var(--foo, var(--bar, var(--baz, var(--qux, #c0ffee)))); }';

    it('adds an underscore after every name', () => {
      assertPostcss(
        run(input, {strategy: 'debug'}),
        '.foo { color: var(--foo_, var(--bar_, var(--baz_, var(--qux_, #c0ffee)))); }',
      );
    });

    it('emits an output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo_',
          bar: 'bar_',
          baz: 'baz_',
          qux: 'qux_',
        },
        {strategy: 'debug'},
      );
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar_',
          baz: 'baz_',
        },
        {
          strategy: 'debug',
          except: ['foo', 'qux'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo_',
          qux: 'qux_',
        },
        {
          strategy: 'debug',
          except: [/ba/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo_',
          bar: 'pf-bar_',
          baz: 'pf-baz_',
          qux: 'pf-qux_',
        },
        {
          strategy: 'debug',
          prefix: 'pf',
        },
      );
    });
  });

  describe('with extraneous parentheses', () => {
    const input =
      '.extraneous-parens { not-a-custom-property: (((var(--three-extra-paren)))); }';

    it('adds an underscore after every name', () => {
      assertPostcss(
        run(input, {strategy: 'debug'}),
        '.extraneous-parens { not-a-custom-property: (((var(--three-extra-paren_)))); }',
      );
    });

    it('emits an output map', () => {
      assertMapEquals(
        input,
        {
          'three-extra-paren': 'three-extra-paren_',
        },
        {strategy: 'debug'},
      );
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: ['three-extra-paren'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {},
        {
          strategy: 'debug',
          except: [/extra/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          'three-extra-paren': 'pf-three-extra-paren_',
        },
        {
          strategy: 'debug',
          prefix: 'pf',
        },
      );
    });
  });

  describe('with calc', () => {
    const input = '.class { number: var(--foo, calc(1 + var(--bar))); }';

    it('does nothing with an explicit strategy', () => {
      assertPostcss(
        run(input, {strategy: 'debug'}),
        '.class { number: var(--foo_, calc(1 + var(--bar_))); }',
      );
    });

    it('emits an output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo_',
          bar: 'bar_',
        },
        {strategy: 'debug'},
      );
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar_',
        },
        {
          strategy: 'debug',
          except: ['foo'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo_',
        },
        {
          strategy: 'debug',
          except: [/ba/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo_',
          bar: 'pf-bar_',
        },
        {
          strategy: 'debug',
          prefix: 'pf',
        },
      );
    });
  });

  describe('with deeply nested functions', () => {
    const input =
      '.class { number: var(--foo, rgb(var(--bar), var(--baz, var(--biz)), var(--boz))); }';

    it('does nothing with an explicit strategy', () => {
      assertPostcss(
        run(input, {strategy: 'debug'}),
        '.class { number: var(--foo_, rgb(var(--bar_), var(--baz_, var(--biz_)), var(--boz_))); }',
      );
    });

    it('emits an output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo_',
          bar: 'bar_',
          baz: 'baz_',
          biz: 'biz_',
          boz: 'boz_',
        },
        {
          strategy: 'debug',
        },
      );
    });

    it('omits excluded names from the output map', () => {
      assertMapEquals(
        input,
        {
          bar: 'bar_',
          baz: 'baz_',
          biz: 'biz_',
        },
        {
          strategy: 'debug',
          except: ['foo', 'boz'],
        },
      );
    });

    it('omits excluded regexes from the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'foo_',
        },
        {
          strategy: 'debug',
          except: [/b/],
        },
      );
    });

    it('includes the prefix in the output map', () => {
      assertMapEquals(
        input,
        {
          foo: 'pf-foo_',
          bar: 'pf-bar_',
          baz: 'pf-baz_',
          biz: 'pf-biz_',
          boz: 'pf-boz_',
        },
        {
          strategy: 'debug',
          prefix: 'pf',
        },
      );
    });
  });
});
