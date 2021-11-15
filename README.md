# WebScript Server Coursework

**Before** you start coding, read _all_ of this document.

----
Welcome!

Your task is to build a server.

You will be submitting a single file called `server.js` which
you are going to write from scratch.  The only library you are
permitted to use is _Express_, so we have included this as a
dependency in `package.json` for your convenience.  

**Before** you start coding, read _all_ of this document.

We have (as usual) provided a suite of QUnit tests that help
to specify the correct operation of your server.  Instructions
on running the tests are provided at the end of this document.

The service that you are building is called __PlacePort__.
It is a web app that generates placeholder images on demand.

We provide (in the `public` folder) web pages that show how
to use the service. These pages use an API that you need to
implement. Your server must serve these pages as well as the
API. We suggest using `express.static` to serve the
pages.

You can see it all working at
[placeport.boakes.org:8080](http://placeport.boakes.org:8080)

__Note__ this site is behind the uni firewall, so you must be
onsite, use the VPN, or the
[web proxy](https://kb.myport.ac.uk/Article/Index/12/4?id=2547)
to see it. 


----

## PlacePort API

The service has a two-part API: serving the images, and
various runtime statistics:

- `/img` serves the images
- `/stats` provides runtime stats

### Serving the Images

When request an image, its width and height are specified in
the URL path:

`/img/{width}/{height}`

There are two optional query parameters:

- `square` sets the size of the colourful squares that
  appear within the image
- `text` controls what text goes in the centre of the image

For example `/img/240/180?square=60&text=Example` will serve
a 240x180 image with 60x60 squares and the text "Example" in
the centre, like this:

![  for example:  ](
  http://placeport.boakes.org:8080/img/240/180?square=60&text=Example
)

#### Limits

There must be runtime limits to the above image parameters:

- width and height must be:
  - integer
  - positive (at least 1)
  - less than or equal to 2000
- square size must be a positive integer

If a request exceeds the width or height limit, or any of
these parameters is invalid, appropriate  HTTP status codes
should be returned; we check for these in the tests.

#### Imager module

We provide you with a library called __imager__ that handles
image generation. It exports a single function:

```javascript
sendImage(res, width, height, square, text)
```

The function creates the image and streams it to the client
using the `res` parameter.  The parameters are defined as follows:
 
* @param res     An Express.js response object that this function
                 uses to send the generated image to a client.    
* @param width   The width of the image to be generated
                 (a positive integer).
* @param height  The height of the image to be generated
                 (a positive integer).
* @param square  Optional: The preferred square size of the image
                 (positive integer, null, or can be omitted).
* @param text    Optional: Text to be rendered in the image
                 (string, null, or can be omitted).




## Statistics

Your server should keep  statistics of successful image
requests. The stats are showcased on a page called
`/stats.html`, provided in the `public` folder. See them in
action at
[placeport.boakes.org:8080](http://placeport.boakes.org:8080/stats.html).

The stats are returned under the following API routes:

- `/stats/paths/recent`
- `/stats/texts/recent`
- `/stats/sizes/recent`
- `/stats/sizes/top`
- `/stats/referrers/top`
- `/stats/hits`

There are detailed tests for each of these API routes.


#### Recent Paths: `/stats/paths/recent`

An array of the ten most recent unique paths requested and
served. Paths shouldn't be repeated; the most recent request
should be at the beginning of the array. Optional parameters
are not included in the paths if they were not specified in
the request. The `square` query parameter is always
presented first.

 Example:

```javascript
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
]
```


#### Recent Texts: `/stats/texts/recent`

An array of the ten most recent unique texts requested and
served in the images. Texts shouldn't be repeated; the most
recent text should be at the beginning of the array.

In this example, only three custom text images have been
requested from the server, the first being "hello" and the
most recent being "example":

```javascript
[
  'example',
  'world',
  'hello'
]
```

#### Recent Sizes: `/stats/sizes/recent`

An array of the ten most recent image sizes served. Image
sizes shouldn't be repeated; the most recent one should be
at the beginning of the array.

Example:

```javascript
[
  { w: 99, h: 98 },
  { w: 10, h: 10 },
  { w: 160, h: 201 },
  { w: 160, h: 200 }
]
```

#### Top-10 Sizes: `/stats/sizes/top`

An array of the top ten most-served image sizes, with how
many times they have been requested. The array must be
ordered from the most-requested size to the least-requested
one.

In this example, the most-requested size is 10x10, and the
server served an image with that size 16 times:

```javascript
[
  { w: 10,  h: 10,  n: 16 },
  { w: 160, h: 201, n: 4  },
  { w: 99,  h: 98,  n: 2  }
]
```

#### Top-10 Referrers: `/stats/referrers/top`


An array of the top ten requesters of PlacePort images.
To identify a requester, we use the
[HTTP referer header](https://en.wikipedia.org/wiki/HTTP_referer)
so this stat counts the non-empty unique referrers.

__Note__ that the HTTP spec spells the word "referrer"
wrongly as "referer" (no double-r)!

In this example, the page `https://test.example/11`
caused 11 successful requests for placeholder images:

```javascript
[
  { ref: 'https://test.example/11', n: 11 },
  { ref: 'https://test.example/10', n: 10 },
  { ref: 'https://test.example/9',  n: 9  }
]
```

#### Hit counts: `/stats/hits`

An array of three hit counts, reporting the number of
successful images served in the last 5, 10 and 15 seconds.

In this example, there have been no successful image
requests in the last 5 seconds, but 11 in the last 15
seconds. One image was requested 7.5 seconds ago, and 10
images were requested about 12 seconds ago.


```javascript
[
  { title: '5s',  count: 0  },
  { title: '10s', count: 1  },
  { title: '15s', count: 11 }
]
```

#### Resetting statistics

When an HTTP `DELETE` request comes to `/stats`, all
statistics must be cleared as if the server just started.





## Running the tests

As usual, first

```bash
npm install
```

This will install `express`, and the libraries that `imager` needs
in order to work.

To run the tests:

- `npm test` will run all the tests but stop at the first
  failed test; this should help you work through the
  coursework methodically, one capability at a time.

  __NB:__ This approach avoids screenfulls of errors
  when you start developing, however, a side effect (on linux at
  least) is that the number of passing tests is not reported
  correctly (because tests that have not been run are mis-reporded
  as _passes_).  

- `npm run test-all` will run all the tests _and_ report every
  failure.  You will be familiar with this behavour from previous
  exercises.


If a test is failing, subsequent tests may fail as well even if
all the code is there and correct; therefore always fix the first
reported problem first. `npm test` will help you with this.


At the end, the output should look like this:

```
TAP version 13
ok 1 Create a file `server.js`
starting server
if you see EADDRINUSE errors, something is blocking port 8080.
if you see ECONNREFUSED errors, your server fails to start on port 8080.
Getting canvas and context...
started
ok 2 Start server
ok 3 Static routes
ok 4 Server handles 404
ok 5 Basic 10x10 image
ok 6 Setting square size
ok 7 Maximum dimensions
ok 8 Invalid dimensions
ok 9 Invalid square size
ok 10 Empty (but present) square size
ok 11 Maximum dimensions with invalid square size
ok 12 Empty text
ok 13 Recent paths
ok 14 Recent sizes
ok 15 Recent texts
ok 16 Overflow of recent texts/sizes/paths
ok 17 Popular sizes
ok 18 Popular referrers
ok 19 Resetting counters
sleeping for 6.5 seconds...
sleeping for 5 seconds...
ok 20 Hit counts
1..20
# pass 20
# skip 0
# todo 0
# fail 0
```

When you're done, submit your `server.js` on Moodle.

We hope you have as much fun implementing this as we've had
creating it!
