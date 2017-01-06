var expect = require('chai').expect
var gibberish = require('../')

var asciiLetters = [
      { start: 65, end: 90 },
      { start: 97, end: 122 }
    ]
var iso8859Letters = [
      asciiLetters[0],
      asciiLetters[1],
      { start: 192, end: 214 },
      { start: 216, end: 223 },
      { start: 224, end: 246 },
      { start: 248, end: 255 }
    ]
var win1252Extras = [ 138, 140, 142, 154, 156, 158, 159 ]

function isLetterOrSpace(val, encoding)
{
  if (val < 32) return false
  if (val == 32) return true
  var grp = encoding === 'ascii' ? asciiLetters : iso8859Letters
  for (var set = 0; set < grp.length; set++) {
    if (val >= grp[set].start && val <= grp[set].end)
      return true;
  }
  return encoding === 'win1252' && win1252Extras.indexOf(val) != -1
}

// There's two cases for the last line:
// * EOL marker at end of buffer, so that end = length - eol.size;
// * No EOL marker, so that end = length
function consumesBufferCorrectly(buffer, endIndex, eolMarker)
{
  var i = endIndex
  if (i == buffer.length) return true
  if (eolMarker == 'crlf') {
    return (i != buffer.length - 2 || buffer[i] != 13 || buffer[i+1] != 10) ?
      false : true
  }

  var eolVal
  if (eolMarker == 'lf') eolVal = 10
  else if (eolMarker == 'cr') eolVal = 13
  else if (eolMarker == 'nel') eolVal = 133
  else throw new Error("Invalid EOL marker " + JSON.stringify(eolMarker))

  return i == buffer.length - 1 && buffer[i] == eolVal
}

function runDataTests(options, done)
{
  // expected defaults
  var bufSize = 16 * 1024
  var encoding = 'ascii'
  var eol = 'lf'
  var offset = 1

  if (options) {
    bufSize = options.size || bufSize
    encoding = (options.encoding || encoding).toLowerCase()
    eol = (options.eol || eol).toLowerCase()
    if (eol === 'crlf') offset = 2
    gibberish(options, testCb)
  }
  else gibberish(testCb)

  function testCb(err, data) {
    expect(err).to.be.null
    expect(data).to.have.property('buffer')
    expect(data.buffer instanceof Buffer).to.be.true
    expect(data.buffer.length).to.eql(bufSize)
    expect(data).to.have.property('lines')
    expect(data.lines instanceof Array).to.be.true
    expect(data.lines.length > 0).to.be.true
    var prevEnd, currLnObj
    for (var l = 0; l < data.lines.length; l++) {
      currLnObj = data.lines[l]
      expect(currLnObj).to.have.property('start')
      expect(typeof currLnObj.start).to.eql('number')
      expect(currLnObj).to.have.property('end')
      expect(typeof currLnObj.end).to.eql('number')
      if (l === 0) expect(currLnObj.start).to.eql(0)
      else expect(currLnObj.start).to.eql(prevEnd + offset)
      // Minimum length of a line is 1
      expect(currLnObj.start < currLnObj.end).to.be.true

      if (l === data.lines.length - 1)
        expect(consumesBufferCorrectly(data.buffer, currLnObj.end, eol)).to.be.true
      else {
        expect(currLnObj.end < data.buffer.length - 1).to.be.true
        if (eol === 'crlf') {
          expect(data.buffer[currLnObj.end]).to.eql(13)
          expect(data.buffer[currLnObj.end + 1]).to.eql(10)
        }
        else {
          var eolVal
          switch (eol) {
            case '\n':
            case 'lf': eolVal = 10; break
            case '\r':
            case 'cr': eolVal = 13; break
            case 'nel': eolVal = 133; break
          }
          expect(data.buffer[currLnObj.end]).to.eql(eolVal)
        }
      }

      for (var cn = currLnObj.start; cn < currLnObj.end; cn++) {
        if (!isLetterOrSpace(data.buffer[cn], encoding))
          console.log("BAD CHAR VAL FOR", encoding, "IS", data.buffer[cn])
        expect(isLetterOrSpace(data.buffer[cn], encoding)).to.be.true
      }

      prevEnd = currLnObj.end
    }
    done()
  }
}

describe('literal-gibberish module tests', function() {

  it('should provide a function', function() {
    expect(typeof gibberish).to.eql('function')
  })

  it('should use default options when none specified, and give valid data',
     function(done) {
       runDataTests(null, done)
  })

  it('should accept a set of valid options, and give corresponding valid data (1)',
     function(done) {
       runDataTests({ encoding: 'latin1', eol: 'nel', size: 32000 }, done)
  })

  it('should accept a set of valid options, and give corresponding valid data (2)',
     function(done) {
       runDataTests({ encoding: 'win1252', eol: 'CRLF', size: 32000 }, done)
  })

  it('should throw assertion exception for missing callback', function() {
    expect(function() { gibberish() }).to.throw(Error, 'Must provide callback')
  })

  var dummyCb = function() {}

  it('should throw assertion exception for invalid size option values', function() {
    var n = null
      , f = function() { gibberish({size: n}, dummyCb) }
      , errMsg = '"size" option must be a positive integer'

    expect(f).to.throw(Error, errMsg)
    n = 0
    expect(f).to.throw(Error, errMsg)
    n = -42
    expect(f).to.throw(Error, errMsg)
    n = "nonsense"
    expect(f).to.throw(Error, errMsg)
  })

  it('should throw assertion exception for invalid encoding option values', function() {
    var enc = null
      , f = function() { gibberish({encoding: enc}, dummyCb) }
      , nonstringErr = '"encoding" option must be a string'
      , unrecogErr = 'Unrecognized value for encoding option: '

    expect(f).to.throw(Error, nonstringErr)
    enc = 8859
    expect(f).to.throw(Error, nonstringErr)
    enc = 'base64'
    expect(f).to.throw(Error, unrecogErr + enc)
  })

  it('should throw assertion exception for invalid eol option values', function() {
    var eol = null
      , f = function() { gibberish({eol: eol}, dummyCb) }
      , nonstringErr = '"eol" option must be a string'
      , unrecogRE = /Unrecognized value for eol option: /

    expect(f).to.throw(Error, nonstringErr)
    eol = 10
    expect(f).to.throw(Error, nonstringErr)
    eol = 'newline'
    expect(f).to.throw(Error, unrecogRE)
  })

  it('should throw assertion exception for invalid option combinations', function() {
    var enc = 'ascii'
      , options = { encoding: enc, eol: 'nel' }
      , f = function() { gibberish(options, dummyCb) }
      , errRE = /eol option "nel" is invalid for /

    expect(f).to.throw(Error, errRE)
    enc = 'win1252'
    expect(f).to.throw(Error, errRE)
  })
})

