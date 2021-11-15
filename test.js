/* global QUnit */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const serverFile = path.join(__dirname, 'server.js');

QUnit.config.reorder = false;

QUnit.assert.passed = function (message) {
  this.pushResult({ result: true, actual: 'N/A', expected: 'N/A', message });
};

QUnit.assert.failed = function (message) {
  this.pushResult({ result: false, actual: 'N/A', expected: 'N/A', message });
};

QUnit.done(({ failed }) => {
  process.exit(failed ? -1 : 0);
});

if (process.env.SINGLE) {
  QUnit.testDone((details) => {
    if (details.failed > 0) {
      QUnit.config.queue.length = 0;
    }
  });
}

/*
 * Create the file that you will submit.
 */
QUnit.test(
  'Create a file `server.js`',
  (assert) => {
    try {
      fs.accessSync(serverFile, fs.F_OK);
      assert.passed('`server.js` created');
    } catch (e) {
      assert.failed('`server.js` is missing - please create it');
    }
  }
);

/*
 * Does the server actually work?
 * The most basic HTTP server that serves any content
 * from teh route / should pass this test.
 */
asyncTest(
  `Start server`,
  async (assert) => {
    console.log(STARTING_MSG);
    require(serverFile);

    assert.deepEqual(
      await getResponseStatus(assert, 'GET', '/'),
      200,
      'the server should serve something successfully'
    );
  }
);

/*
 * Here we are testing for the presence of a file
 * within the 'public' folder. Your server needs to serve
 * all the files in `public`.
 */
asyncTest(
  `Static routes`,
  async (assert) => {
    const response = await getResponseText(assert, 'GET', '/testfile.txt');
    assert.deepEqual(
      response.trim(),
      'one two three test test test',
      'the server should serve static files from ./public'
    );
  }
);

/*
 * You can't serve files that are not there.  We expect HTTP 
 * status codes of 404 in such cases, so we test for these.
 */
asyncTest(
  `Server handles 404`,
  async (assert) => {
    assert.deepEqual(
      await getResponseStatus(assert, 'GET', '/test404'),
      404,
      'the server should not (ever) have anything at /test404'
    );
  }
);

/*
 * This is the first test where we expect you to be generating
 * an image at the /img/{width}/{height} route.  We have reference
 * images in the resources folder that we compare your output with.
 */
asyncTest(
  `Basic 10x10 image`,
  async (assert) => {
    assert.ok(
      compareArrays(
        await getResponseBinary(assert, 'GET', '/img/10/10'),
        testFile10x10x50
      ),
      'basic 10x10 file is just yellow'
    );
  }
);

/*
 * This check that you are using the 'square' query parameter correctly 
 */
asyncTest(
  `Setting square size`,
  async (assert) => {
    assert.ok(
      compareArrays(
        await getResponseBinary(assert, 'GET', '/img/10/10?square=10'),
        testFile10x10x50
      ),
      'square size 10'
    );
    assert.ok(
      compareArrays(
        await getResponseBinary(assert, 'GET', '/img/10/10?square=5'),
        testFile10x10x5
      ),
      'square size 5'
    );
  }
);

/*
 * This check that your server does not generate images larger
 * than 2000 pixels in width or height.  We're testing numbers
 * far larger here, but you can, (of course) manually test whether
 * 2000x2000 works and 2001x2001 is rejected.
 */
asyncTest(
  `Maximum dimensions`,
  async (assert) => {
    assert.equal(
      await getResponseStatus(assert, 'GET', '/img/10000/10'),
      403,
      'width too big must return 403'
    );
    assert.equal(
      await getResponseStatus(assert, 'GET', '/img/10/10000'),
      403,
      'height too big must return 403'
    );
    assert.equal(
      await getResponseStatus(assert, 'GET', '/img/100000/10000'),
      403,
      'both too big must return 403'
    );
  }
);

/*
 * We don't want to attempt to generate images if the dimensions are
 * invalid, so here are some examples of invalid dimensions your server
 * needs to recognise.
 */
asyncTest(
  `Invalid dimensions`,
  async (assert) => {
    let status = await getResponseStatus(assert, 'GET', '/img/0/10');
    assert.ok(
      status === 404 || status === 400,
      'invalid dimensions must return 400 or 404'
    );

    status = await getResponseStatus(assert, 'GET', '/img/10/0');
    assert.ok(
      status === 404 || status === 400,
      'invalid dimensions must return 400 or 404'
    );

    status = await getResponseStatus(assert, 'GET', '/img/10/-10');
    assert.ok(
      status === 404 || status === 400,
      'invalid dimensions must return 400 or 404'
    );

    status = await getResponseStatus(assert, 'GET', '/img/10/0.3');
    assert.ok(
      status === 404 || status === 400,
      'invalid dimensions must return 400 or 404'
    );

    status = await getResponseStatus(assert, 'GET', '/img/10.3/10');
    assert.ok(
      status === 404 || status === 400,
      'invalid dimensions must return 400 or 404'
    );

    status = await getResponseStatus(assert, 'GET', '/img/harambe/0');
    assert.ok(
      status === 404 || status === 400,
      'invalid dimensions must return 400 or 404'
    );

    status = await getResponseStatus(assert, 'GET', '/img/4/kit');
    assert.ok(
      status === 404 || status === 400,
      'invalid dimensions must return 400 or 404'
    );
  }
);

/*
 * More query validation tests
 */
asyncTest(
  `Invalid square size`,
  async (assert) => {
    let status = await getResponseStatus(assert, 'GET', '/img/10/10?square=0');
    assert.equal(
      status,
      400,
      'invalid square size must return 400'
    );

    status = await getResponseStatus(assert, 'GET', '/img/10/10?square=10.3');
    assert.equal(
      status,
      400,
      'invalid square size must return 400'
    );

    status = await getResponseStatus(assert, 'GET', '/img/10/10?square=-10');
    assert.equal(
      status,
      400,
      'invalid square size must return 400'
    );
  }
);

/*
 * If a square size query is present is cannot be empty.  Your server should
 send a 400 if it is. 
 */
asyncTest(
  `Empty (but present) square size`,
  async (assert) => {
    const status = await getResponseStatus(assert, 'GET', '/img/10/10?square=');
    assert.equal(
      status,
      400,
      'empty but present square size must return 400'
    );
  }
);


/*
 * If dimensions are invalud, the 403 should be send (and not the 400 that is sent
 * for invalid square parameters.
 */
asyncTest(
  `Maximum dimensions with invalid square size`,
  async (assert) => {
    assert.equal(
      await getResponseStatus(assert, 'GET', '/img/10000/10?square=0'),
      403,
      'width too big must return 403, regardless of square size'
    );
    assert.equal(
      await getResponseStatus(assert, 'GET', '/img/10/10000?square=10.3'),
      403,
      'height too big must return 403, regardless of square size'
    );
    assert.equal(
      await getResponseStatus(assert, 'GET', '/img/100000/10000?square=-5'),
      403,
      'both too big must return 403, regardless of square size'
    );
  }
);

/*
 * We cannot test that text is working perfectlt because of font rendering
 * differences across platforms, but we can check that sending a space results
 * in the appearance of no text.
 */
asyncTest(
  `Empty text`, 
  async (assert) => {
    assert.ok(
      compareArrays(
        await getResponseBinary(assert, 'GET', '/img/160/200?square=5&text=+'), // plus is a space in URL query parameters
        testFile160x200x5
      ),
      'image with no text'
    );
  }
);

// so - that's the /img/ API all tested!
// here begin the tests on the stats
// details of each API endpoint are in README.md

/*
 *         **   ******   ********   ******  ********   ******
 *        **   **    **     **     **    **    **     **    **
 *       **    **           **     **    **    **     **  
 *      **      ******      **     **    **    **      ******  
 *     **            **     **     ********    **           **  
 *    **       **    **     **     **    **    **     **    **  
 *   **         ******      **     **    **    **      ******  
 */

asyncTest(
  `Recent paths`,
  async (assert) => {
    let data = await getResponseJSON(assert, 'GET', '/stats/paths/recent');
    assert.ok(
      Array.isArray(data),
      'recent paths must be an array'
    );
    assert.equal(
      data.length,
      4,
      'there are 4 recent successful paths above'
    );
    assert.equal(
      data[0],
      '/img/160/200?square=5&text=%20',
      'text parameter must be encoded with encodeURIComponent (so a space becomes a safe %20, similarly to other special characters)'
    );
    assert.equal(
      data[3],
      '/img/10/10',
      "if square size wasn't specified, it shouldn't be there"
    );
    assert.deepEqual(
      data,
      [
        '/img/160/200?square=5&text=%20',
        '/img/10/10?square=5',
        '/img/10/10?square=10',
        '/img/10/10'
      ],
      'lists all recent paths after all the above tests'
    );

    await getResponseStatus(assert, 'GET', '/img/160/201?text=foo&square=15');
    data = await getResponseJSON(assert, 'GET', '/stats/paths/recent');
    assert.equal(
      data[0],
      '/img/160/201?square=15&text=foo',
      'if both text and square are specified, they must be returned square first, text second'
    );
    assert.deepEqual(
      data,
      [
        '/img/160/201?square=15&text=foo',
        '/img/160/200?square=5&text=%20',
        '/img/10/10?square=5',
        '/img/10/10?square=10',
        '/img/10/10'
      ],
      'adds the path we just called'
    );

    await getResponseStatus(assert, 'GET', '/img/160/201?text=brexit');
    data = await getResponseJSON(assert, 'GET', '/stats/paths/recent');
    assert.equal(
      data[0],
      '/img/160/201?text=brexit',
      'if only text is specified, only it must be in the path'
    );
    assert.deepEqual(
      data,
      [
        '/img/160/201?text=brexit',
        '/img/160/201?square=15&text=foo',
        '/img/160/200?square=5&text=%20',
        '/img/10/10?square=5',
        '/img/10/10?square=10',
        '/img/10/10'
      ],
      'adds the path we just called'
    );

    await getResponseStatus(assert, 'GET', '/img/10/10?square=50');
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/paths/recent'),
      [
        '/img/10/10?square=50',
        '/img/160/201?text=brexit',
        '/img/160/201?square=15&text=foo',
        '/img/160/200?square=5&text=%20',
        '/img/10/10?square=5',
        '/img/10/10?square=10',
        '/img/10/10'
      ],
      'adds the path we just called'
    );

    await getResponseStatus(assert, 'GET', '/img/10/10?square=10');
    await getResponseStatus(assert, 'GET', '/img/10/10?square=5');
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/paths/recent'),
      [
        '/img/10/10?square=5',
        '/img/10/10?square=10',
        '/img/10/10?square=50',
        '/img/160/201?text=brexit',
        '/img/160/201?square=15&text=foo',
        '/img/160/200?square=5&text=%20',
        '/img/10/10'
      ],
      'reorders the most recent path to the front'
    );
  }
);

asyncTest(
  `Recent sizes`,
  async (assert) => {
    const data = await getResponseJSON(assert, 'GET', '/stats/sizes/recent');
    assert.ok(
      Array.isArray(data),
      'recent sizes must be an array'
    );
    assert.equal(
      data.length,
      3,
      'there are 3 recent successful sizes above'
    );
    assert.deepEqual(
      data,
      [
        { w: 10, h: 10 },
        { w: 160, h: 201 },
        { w: 160, h: 200 }
      ],
      'lists all recent sizes after all the above tests'
    );

    await getResponseStatus(assert, 'GET', '/img/99/98');
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/sizes/recent'),
      [
        { w: 99, h: 98 },
        { w: 10, h: 10 },
        { w: 160, h: 201 },
        { w: 160, h: 200 }
      ],
      'adds the size we just called'
    );

    await getResponseStatus(assert, 'GET', '/img/160/201?square=20');
    await getResponseStatus(assert, 'GET', '/img/10/10?square=7');
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/sizes/recent'),
      [
        { w: 10, h: 10 },
        { w: 160, h: 201 },
        { w: 99, h: 98 },
        { w: 160, h: 200 }
      ],
      'reorders the most recent sizes to the front'
    );
  }
);

asyncTest(
  `Recent texts`,
  async (assert) => {
    const data = await getResponseJSON(assert, 'GET', '/stats/texts/recent');
    assert.ok(
      Array.isArray(data),
      'recent texts must be an array'
    );
    assert.equal(
      data.length,
      3,
      'there are 3 recent successful texts above'
    );
    assert.deepEqual(
      data,
      [
        'brexit',
        'foo',
        ' '
      ],
      'lists all recent texts after all the above tests'
    );

    await getResponseStatus(assert, 'GET', '/img/99/98?text=harambe');
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/texts/recent'),
      [
        'harambe',
        'brexit',
        'foo',
        ' '
      ],
      'adds the text we just called'
    );

    await getResponseStatus(assert, 'GET', '/img/160/201?square=20&text=foo');
    await getResponseStatus(assert, 'GET', '/img/10/10?text=+&square=7');
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/texts/recent'),
      [
        ' ',
        'foo',
        'harambe',
        'brexit'
      ],
      'reorders the most recent texts to the front'
    );
  }
);

asyncTest(
  `Overflow of recent texts/sizes/paths`,
  async (assert) => {
    await getResponseStatus(assert, 'GET', `/img/112/44`);
    for (let i = 42; i < 49; i++) {
      await getResponseStatus(assert, 'GET', `/img/${i}/10?square=${i - 10}`);
    }
    const paths = await getResponseJSON(assert, 'GET', '/stats/paths/recent');
    assert.equal(
      paths.length,
      10,
      'recent paths only shows up to 10'
    );
    assert.deepEqual(
      paths,
      [
        '/img/48/10?square=38',
        '/img/47/10?square=37',
        '/img/46/10?square=36',
        '/img/45/10?square=35',
        '/img/44/10?square=34',
        '/img/43/10?square=33',
        '/img/42/10?square=32',
        '/img/112/44',
        '/img/10/10?square=7&text=%20',
        '/img/160/201?square=20&text=foo'
      ],
      'the correct paths are listed based on the above requests'
    );

    const sizes = await getResponseJSON(assert, 'GET', '/stats/sizes/recent');
    assert.equal(
      sizes.length,
      10,
      'recent sizes only shows up to 10'
    );
    assert.deepEqual(
      sizes,
      [
        { w: 48, h: 10 },
        { w: 47, h: 10 },
        { w: 46, h: 10 },
        { w: 45, h: 10 },
        { w: 44, h: 10 },
        { w: 43, h: 10 },
        { w: 42, h: 10 },
        { w: 112, h: 44 },
        { w: 10, h: 10 },
        { w: 160, h: 201 }
      ],
      'the correct sizes are listed based on the above requests'
    );

    for (let i = 58; i > 50; i--) {
      await getResponseStatus(assert, 'GET', `/img/10/10?text=Pegasi+${i}b`);
    }
    const texts = await getResponseJSON(assert, 'GET', '/stats/texts/recent');
    assert.equal(
      texts.length,
      10,
      'recent texts only shows up to 10'
    );
    assert.deepEqual(
      texts,
      [
        'Pegasi 51b',
        'Pegasi 52b',
        'Pegasi 53b',
        'Pegasi 54b',
        'Pegasi 55b',
        'Pegasi 56b',
        'Pegasi 57b',
        'Pegasi 58b',
        ' ',
        'foo'
      ],
      'the correct texts are listed based on the above requests'
    );
  }
);

asyncTest(
  `Popular sizes`,
  async (assert) => {
    let data = await getResponseJSON(assert, 'GET', '/stats/sizes/top');
    assert.equal(
      data.length,
      10,
      'top sizes should only show top ten sizes'
    );
    assert.deepEqual(
      data.slice(0, 3),
      [
        {
          w: 10,
          h: 10,
          n: 16
        },
        {
          w: 160,
          h: 201,
          n: 4
        },
        {
          w: 99,
          h: 98,
          n: 2
        }
      ],
      'the first three top sizes are 10x10, 160x201, 99x98'
    );

    for (let i = 3; i < 10; i++) {
      assert.equal(
        data[i].n,
        1,
        'the remaining sizes have only been used once'
      );
    }

    await getResponseStatus(assert, 'GET', '/img/99/98');
    data = await getResponseJSON(assert, 'GET', '/stats/sizes/top');
    assert.deepEqual(
      data[2],
      {
        w: 99,
        h: 98,
        n: 3
      },
      '99x98 has now been requested 3 times'
    );
  }
);

asyncTest(
  `Popular referrers`,
  async (assert) => {
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/referrers/top'),
      [],
      'no test up to now has specified any referrer'
    );

    for (let i = 1; i <= 11; i++) {
      for (let j = 1; j <= i; j++) {
        await getResponseStatus(assert, 'GET', `/img/10/10`, {
          headers: {
            Referer: `https://test.example/${i}`
          }
        });
      }
    }

    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/referrers/top'),
      [
        {
          ref: 'https://test.example/11',
          n: 11
        },
        {
          ref: 'https://test.example/10',
          n: 10
        },
        {
          ref: 'https://test.example/9',
          n: 9
        },
        {
          ref: 'https://test.example/8',
          n: 8
        },
        {
          ref: 'https://test.example/7',
          n: 7
        },
        {
          ref: 'https://test.example/6',
          n: 6
        },
        {
          ref: 'https://test.example/5',
          n: 5
        },
        {
          ref: 'https://test.example/4',
          n: 4
        },
        {
          ref: 'https://test.example/3',
          n: 3
        },
        {
          ref: 'https://test.example/2',
          n: 2
        }
      ],
      'the top 10 referrers as filled above'
    );
  }
);

asyncTest(
  'Resetting counters',
  async (assert) => {
    assert.equal(
      await getResponseStatus(assert, 'DELETE', '/stats'),
      200,
      'reset counters should return successfully'
    );

    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/paths/recent'),
      [],
      'after reset, we have no recent paths'
    );
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/sizes/recent'),
      [],
      'after reset, we have no recent sizes'
    );
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/texts/recent'),
      [],
      'after reset, we have no recent texts'
    );
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/sizes/top'),
      [],
      'after reset, we have no top-10 sizes'
    );
    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/referrers/top'),
      [],
      'after reset, we have no top-10 referrers'
    );

    // check that stats continue working after a reset
    for (let i = 1; i <= 11; i++) {
      for (let j = 1; j <= i; j++) {
        await getResponseStatus(assert, 'GET', `/img/${i * 10}/10?square=${i}`, {
          headers: {
            Referer: `https://test.example/${i}`
          }
        });
      }
    }

    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/referrers/top'),
      [
        {
          ref: 'https://test.example/11',
          n: 11
        },
        {
          ref: 'https://test.example/10',
          n: 10
        },
        {
          ref: 'https://test.example/9',
          n: 9
        },
        {
          ref: 'https://test.example/8',
          n: 8
        },
        {
          ref: 'https://test.example/7',
          n: 7
        },
        {
          ref: 'https://test.example/6',
          n: 6
        },
        {
          ref: 'https://test.example/5',
          n: 5
        },
        {
          ref: 'https://test.example/4',
          n: 4
        },
        {
          ref: 'https://test.example/3',
          n: 3
        },
        {
          ref: 'https://test.example/2',
          n: 2
        }
      ],
      'after reset, referrers are still working'
    );

    const sizes = await getResponseJSON(assert, 'GET', '/stats/sizes/top');
    assert.deepEqual(
      sizes[9],
      { w: 20, h: 10, n: 2 },
      'after reset, top-10 sizes are still working'
    );
    const paths = await getResponseJSON(assert, 'GET', '/stats/paths/recent');
    assert.equal(
      paths[7],
      '/img/40/10?square=4',
      'after reset, recent paths are still working'
    );
  }
);

asyncTest(
  'Hit counts',
  async (assert) => {
    let hits = await getResponseJSON(assert, 'GET', '/stats/hits');
    assert.notEqual(
      hits[2].count,
      0,
      'because of all the reuqests above, hit count cannot be 0'
    );

    await getResponseStatus(assert, 'DELETE', '/stats');

    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/hits'),
      [
        {
          title: '5s',
          count: 0
        },
        {
          title: '10s',
          count: 0
        },
        {
          title: '15s',
          count: 0
        }
      ],
      'because of all the reuqests above, hit count cannot be 0'
    );

    for (let i = 1; i <= 10; i++) {
      await getResponseStatus(assert, 'GET', `/img/10/10`);
    }

    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/hits'),
      [
        {
          title: '5s',
          count: 10
        },
        {
          title: '10s',
          count: 10
        },
        {
          title: '15s',
          count: 10
        }
      ],
      'after 10 quick requests, hit counts should all be 10'
    );

    await delay(6500);
    await getResponseStatus(assert, 'GET', `/img/10/10`);

    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/hits'),
      [
        {
          title: '5s',
          count: 1
        },
        {
          title: '10s',
          count: 11
        },
        {
          title: '15s',
          count: 11
        }
      ],
      'with 1 request 6.5s after 10 quick requests, hit counts should be 1,11,11'
    );

    await delay(5000);

    assert.deepEqual(
      await getResponseJSON(assert, 'GET', '/stats/hits'),
      [
        {
          title: '5s',
          count: 0
        },
        {
          title: '10s',
          count: 1
        },
        {
          title: '15s',
          count: 11
        }
      ],
      '5s later, hit counts should be 0,1,11'
    );
  }
);

// That's it!
// That's all the tests.
// What's below is just data and functions.
//
// When you have all the tasts passing (well done) work on code clarity
// and maintainability (and remember to keep running the tests so you 
// can be sure your improvements don't break anything that you already
// completed).

/*
 *
 *   #####  ####   ####  #         ###### #    # #    #  ####  ##### #  ####  #    #  ####
 *     #   #    # #    # #         #      #    # ##   # #    #   #   # #    # ##   # #
 *     #   #    # #    # #         #####  #    # # #  # #        #   # #    # # #  #  ####
 *     #   #    # #    # #         #      #    # #  # # #        #   # #    # #  # #      #
 *     #   #    # #    # #         #      #    # #   ## #    #   #   # #    # #   ## #    #
 *     #    ####   ####  ######    #       ####  #    #  ####    #   #  ####  #    #  ####
 *
 */


function delay (ms) {
  return new Promise((resolve, reject) => {
    console.log(`sleeping for ${ms / 1000} seconds...`);
    setTimeout(resolve, ms);
  });
}

const STARTING_MSG =
`starting server
if you see EADDRINUSE errors, something is blocking port 8080.
if you see ECONNREFUSED errors, your server fails to start on port 8080.`;

const testFile10x10x50 = fs.readFileSync(path.join(__dirname, 'resources', '10x10x50.png'));
const testFile10x10x5 = fs.readFileSync(path.join(__dirname, 'resources', '10x10x5.png'));
const testFile160x200x5 = fs.readFileSync(path.join(__dirname, 'resources', '160x200x5.png'));


function asyncTest (testName, testFunction) {
  QUnit.test(
    testName,
    async (assert) => {
      const done = assert.async();

      try {
        await testFunction(assert);
      } catch (e) {
        assert.failed(e.message);
      }

      done();
    }
  );
}

// retrieve a JSON response from the given API path
// this will fail if the response status is not 200 OK or if the body is not JSON
// it will also fail in case of timeout or network issues
async function getResponseJSON (assert, method, path) {
  try {
    const response = await fetchPath(method, path);
    assert.equal(response.status, 200, `successful ${method} ${path} should return status code 200`);
    assert.ok(response.headers.get('Content-type').startsWith('application/json'), `response from ${path} should have an 'application/json' content type`);
    try {
      return await response.json();
    } catch (e) {
      assert.failed(`response to ${path} must be JSON`);
    }
  } catch (e) {
    assert.failed(`error in ${path}: ${e}`);
  }
  throw new Error('aborting some tests due to the errors above');
}

async function getResponseBinary (assert, method, path) {
  try {
    const response = await fetchPath(method, path);
    assert.equal(response.status, 200, `successful ${method} ${path} should return status code 200`);
    try {
      return await response.buffer();
    } catch (e) {
      assert.failed(`error getting response array buffer on ${path}`);
    }
  } catch (e) {
    assert.failed(`error in ${path}: ${e}`);
  }
  throw new Error('aborting some tests due to the errors above');
}

async function getResponseText (assert, method, path) {
  try {
    const response = await fetchPath(method, path);
    assert.equal(response.status, 200, `successful ${method} ${path} should return status code 200`);
    assert.ok(response.headers.get('Content-type').startsWith('text/plain'), `response from ${path} should have an 'text/plain' content type`);
    try {
      return await response.text();
    } catch (e) {
      assert.failed(`error getting response text on ${path}`);
    }
  } catch (e) {
    assert.failed(`error in ${path}: ${e}`);
  }
  throw new Error('aborting some tests due to the errors above');
}

// wrap fetch in order to set hostname, port, and timeout
function fetchPath (method, path, options) {
  const opts = Object.assign({}, { method, timeout: 1000 }, options);
  return fetch(`http://localhost:8080${path}`, opts);
}

// retrieve the response status from the given API path
// it will fail in case of timeout or network issues
async function getResponseStatus (assert, method, path, options) {
  try {
    const response = await fetchPath(method, path, options);
    return response.status;
  } catch (e) {
    assert.failed(`error in ${path}: ${e}`);
  }
  throw new Error('aborting some tests due to the errors above');
}

function compareArrays (a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) && !(a instanceof Buffer)) return false;
  if (!Array.isArray(b) && !(b instanceof Buffer)) return false;

  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

// Hello you.
// Not everyone will read this, but we knew *you* would.
// We apppreciate your attention to detail.