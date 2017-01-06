// The Literal Gibberish Generator

// ASCII has word characters in these ranges:
//   uppercase letters 65-90; lowercase 97-122 (26 chars for each range)
// ISO-8859-1 has more word characters in these ranges:
//   uppercase 192-214, 216-223; lowercase 224-246, 248-255 (23, 8; ditto)
// Windows-1252 has word characters in these extra locations:
//   138, 140, 142, 154, 156, 158, 159
//   and uses 133 as an ellipsis symbol, where ISO-8859 has ctrl char NEL
// TODO (maybe): add support for ISO-8859-15, which is like ISO-8859-1, but with
// a few more letters in place of symbols: 166,168,180,184,188-190

var assert = require('assert')
var crypto = require('crypto')

// Get a random value between 6 and 36 by combining two random byte values
function wordsPerLine(m, n)
{
  // Sometimes sum of 2 random values can be 0, which we don't want
  return (m >> 4) + (n >> 4) + 6
}

function generateBuffer(encoding, size, eol, cb)
{
  crypto.randomBytes(size, function(err, buf) {
    if (err) return cb(err)

    var wordSize = 1 + buf[0] % 16
    var wordLimit = wordsPerLine(buf[0], buf[1])
    var lines = []
    var lnStart = 0

    for (var i = 0; i < size; i++) {

      if (wordSize == 0) {
        wordSize = 1 + buf[i] % 16 // initialize for next word
        wordLimit-- // because we have just finished a word towards current quota
        if (wordLimit == 0) { // end of current 'sentence'
          if (i < size - 1) wordLimit = wordsPerLine(buf[i], buf[i+1])
          lines.push({ start: lnStart, end: i })
          if (eol === 'crlf') {
            if (i < size - 1) {
              buf[i++] = 13; buf[i] = 10
            }
          }
          switch (eol) {
            case 'lf': buf[i] = 10; break
            case 'cr': buf[i] = 13; break
            case 'nel': buf[i] = 133; break
          }
          lnStart = i + 1
        }
        else buf[i] = 32 // space
        continue
      }
      wordSize-- // because we now count a character towards current word

      if (encoding === 'ascii') buf[i] %= 128 // If ASCII, limit byte values to 7 bits

      // Positions 0..31 are strictly control characters.
      // Turn a control char from the low 26 into a capital letter:
      if (buf[i] < 26) buf[i] += 65
      // Turn a control char from 26..31 into a..f:
      else if (buf[i] < 32) buf[i] += 71

      // We don't need punctuation or digits (33..64);
      // push the char from 32..57 up to lowercase:
      else if (buf[i] < 58) buf[i] += 65 // map to a..z
      // punctuation symbols following the digits
      else if (buf[i] < 65) buf[i] += 45 // map to g..m

      else if (buf[i] < 91) continue // Uppercase letters

      // More symbols in 91..96
      else if (buf[i] < 97) buf[i] += 19 // map to n..s

      else if (buf[i] < 123) continue // Lowercase letters

      // More symbols, DEL, and a couple of 8-bit control chars
      else if (buf[i] < 130) buf[i] -= 7 // map to t..z

      // More 8-bit control chars
      else if (buf[i] < 153) {
        if (encoding === 'win1252' && [138, 140, 142].indexOf(buf[i]) != -1)
          continue;
        buf[i] += 62 // map from 130..152 to 192..214 (most of the 8-bit uppercase)
      }
      // Remaining 8-bit control chars, & most of the 8-bit symbol chars.
      // Avoid mapping to 215: multiplication symbol nested among letters.
      else if (buf[i] < 184) {
        if (encoding === 'win1252' && [154, 156, 158, 159].indexOf(buf[i]) != -1)
          continue;
        buf[i] += 63 // map from 153..183 to 216..246 (remaining 8-bit uppercase + most of lowercase)
      }
      // The rest of the 8-bit symbol char block.
      // Avoid mapping to 247: division symbol nested among letters.
      else if (buf[i] < 192) buf[i] += 64 // map from 184..191 to 248..255

      // Pesky symbol remnants
      else if (buf[i] === 215) buf[i] = 223 // arbitrary choice of 1st lowercase 8-bit
      else if (buf[i] === 247) buf[i] = 224 // arbitrary choice of 2nd lowercase 8-bit
    }

    // Handle buffer tail with no EOL
    if (lnStart < size) lines.push({ start: lnStart, end: size })

    return cb(null, { buffer: buf, lines: lines })
  })
}

/*
// If:
     var yada = require('yada-file')
// Then can be called:
     yada(cb)          // uses default options
     yada(options, cb) // uses given options
//
// cb parameters:
// * err
// * data -- object with the following fields:
//     buffer
//       Buffer of alphabetical pseudo-words separated by spaces and EOL markers
//     lines
//       array of { start: i, end: j }, where
//         i is the index of the start of the nth line
//         j is the index of the end of the nth line; may be buffer size + 1
*/
module.exports = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = null
  }
  assert(typeof cb === 'function', 'Must provide callback')

  options = options || {}

  if ('encoding' in options) {
    assert(typeof options.encoding === 'string', '"encoding" option must be a string')
    options.encoding = options.encoding.toLowerCase()
    assert(['ascii', 'latin1', 'win1252'].indexOf(options.encoding) != -1,
      'Unrecognized value for encoding option: ' + options.encoding)
  }
  else options.encoding = 'ascii'

  if ('size' in options) {
    var x = options.size
    assert(!isNaN(parseInt(x)) && x.toString() === parseInt(x).toString() && x > 0,
      '"size" option must be a positive integer')
  }
  else options.size = 16 * 1024

  if ('eol' in options) {
    assert(typeof options.eol === 'string', '"eol" option must be a string')
    options.eol = options.eol.toLowerCase()
    assert(['\n', '\r', '\r\n', 'lf', 'cr', 'crlf', 'nel'].indexOf(options.eol) != -1,
      'Unrecognized value for eol option: ' + JSON.stringify(options.eol))
    if (options.eol === '\n') options.eol = 'lf'
    else if (options.eol === '\r') options.eol = 'cr'
    else if (options.eol === '\r\n') options.eol = 'crlf'
    else if (options.eol === 'nel')
      assert(options.encoding === 'latin1',
        'eol option "nel" is invalid for ' + options.encoding)
  }
  else options.eol = 'lf'

  generateBuffer(options.encoding, options.size, options.eol, cb)
}

