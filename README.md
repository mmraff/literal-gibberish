# literal-gibberish
Generates a buffer of alphabetical pseudo-text. Alternative to [Lorem ipsum](https://en.wikipedia.org/wiki/Lorem_ipsum) sources.

- Random-length lines of random-length "words"
- Only letters and spaces in each line
- You control the buffer size
- Your choice of encoding\*
- Your choice of end-of-line marker\*\*
- No need to seed with input text
- No dependencies

\* Only single-byte encodings in this version. See **Options** below.

\*\* Of the EOL values available for single-byte encodings. Also see **Options**.  

## Install

```sh
$ npm install literal-gibberish
```
If you plan to use literal-gibberish for testing, you probably want to use the **npm install** option
`--save-dev`.  

## Usage
```js
var litGib = require('literal-gibberish');
var callback = function(error, data) {
  // Use data.lines to index into data.buffer
  // or simply use data.buffer...
}
var options = { // ...
}
litGib(options, callback);
// Or, to use all defaults:
litGib(callback);
```

## Options
*Optional.* Supply options as an object containing any of the following properties.

### size
  The number of bytes in the resulting buffer. Must be a positive integer. Default: 16384 (16KB)

### encoding
  Determines what byte values are allowed in the buffer, according to the letters that are mapped in the referenced encoding.
  The choices are:  
  * `'ascii'` (default)
  * `'latin1'` - 8-bit encoding **[Latin-1](https://en.wikipedia.org/wiki/ISO/IEC_8859-1)**, a.k.a. **[ISO 8859-1](https://en.wikipedia.org/wiki/ISO/IEC_8859-1)**
  * `'win1252'` - The notorious **[Windows-1252](https://en.wikipedia.org/wiki/Windows-1252)** encoding that is often mistaken to be the same as **Latin-1**

### eol
  The end-of-line marker to insert at each line end. The choices are:  
  * `'lf'` (default) or the equivalent `'\n'`</li>
  * `'cr'` or the equivalent `'\r'`</li>
  * `'crlf'` or the equivalent `'\r\n'`</li>
  * `'nel'` - the 8-bit **NEXT LINE** control character common to **ISO 8859** encodings.  
  Note: 'nel' is only valid with 'latin1' encoding.

EOL names in uppercase are also recognized.

## Callback Parameters

### error
  Error handed down from [crypto.randomBytes](https://nodejs.org/api/crypto.html#crypto_crypto_randombytes_size_callback).
  Any assertion error thrown by misuse will *not* come this way.

### data
An object with the following properties.
+ **buffer** - Buffer populated with values for only letters, spaces, and the specified EOL marker
+ **lines** - Array of objects, each with these two properties:
  + **start** - index of the start of the nth line in the buffer
  + **end** - index of the end of the nth line in the buffer

## Examples

### Basic
```js
var gibberish = require('literal-gibberish');

var options = { size: 5000, encoding: 'win1252', eol: 'crlf' };
gibberish(options, function(error, data) {
  // ...
})
// Example extract of data.buffer.toString('binary'):
// "SëÿQeimÂ ÿýÕyHoÚÖoË Jyàþtxxu qÊBóZcUÇÐQ àHZRyàÚüxåÊ mUDýBiâÜVuacs ..."

// No options specified - gets defaults
gibberish(function(error, data) {
  // ...
});
// Example extract of data.buffer.toString():
// "PpwjKt wjYEsnad vIhSLvJiUAAc qMtfcksRgdIV rWhiPI KtlPoWpkywnaMHB ..."
```

### Extract Lines as Strings
```js
gibberish(function(error, data) {
  data.lines.forEach(function(lineObj) {
    var s = data.buffer.toString('ascii', lineObj.start, lineObj.end);
    // Do something with s... maybe add punctuation?
  })
});
```

### Convert to a Stream
```js
var writable = getWritableStreamSomehow();
// ...
gibberish(function(error, data) {
  writable.write(data.buffer); // Or give encoding and callback args if desired
})
```

## Questions
**Who needs this gibberish?**
* A developer who must push a lot of reasonably text-like data through another
interface to test it.
* A web page developer who needs blocks of arbitrary filler text to help assess a layout.

**How random is it?**  
It uses the [crypto.randomBytes](https://nodejs.org/api/crypto.html#crypto_crypto_randombytes_size_callback) function that comes with **node.js**, so it
gives _"cryptographically strong pseudo-random data."_

**How long are the 'words'/lines?**
* Pseudo-words are 1-16 letters
* Lines are 6-36 'words' (line length does not include EOL marker)

**Are the 'words' pronouncable?**  
They're not made to be, so it's accidental if any are.
Filler text is not meant to draw attention, never mind to be _spoken_.

**Why do the lines not always start with a capital letter?**  
**Why do the words contain mixed case?**  
The next version will provide case control, so that the lines look more like
standard text at a glance.

**Why no symbol characters?**  
I think they're distracting.

**Why no punctuation?**  
Say, that's a good idea for a transform stream that you could plug this module into...

**When I convert the buffer toString(), I get a lot of question mark symbols...?**  
You specified an encoding other than 'ascii', and then you didn't pass an encoding
to `toString()`, so your bytes were "utf8-ized" because the default encoding for
`toString()` is 'utf8'. Try `toString('binary')`.

------

**License: MIT**

