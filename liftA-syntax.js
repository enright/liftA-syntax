/*
MIT License

Copyright (c) 2017 Bill Enright

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/*
dot syntax on functions to support a fluent style of arrow composition
*/
(function () {
  "use strict"; // enables proper tail calls (PTC)
  let lifta = require('lifta');

  function reduceOr(x) {
    return [x.first.first || x.second.first, x.first.second];
  }

  function reduceAnd(x) {
    return [x.first.first && x.second.first, x.first.second];
  }

  let fanAndReducePairA = (f, g, r) => {
    return f.a.fan(g.a).then(r.a);
  };

  Object.defineProperty(Function.prototype, 'a', {
    get: function () {
      if (!this._a) {
        // if this is a function of three parameters
        // then presume it's an arrow already
        if (this.length === 3) {
          this._a = this;
        } else if (this.length > 1) {
          // ^ note this means functions of 1 or 0 formal params can be lifted
          return Error('incorrect number of parameters');
        } else {
          let that = this;
          let arrow = (x, cont, p) => {
            cont(that(x), p);
          }; // set 'A' to an arrow
          arrow._a = arrow; // an arrow self-references
          this._a = arrow;
        }
      }
      return this._a;
    }
  });

  function promoteError(x) {
    let first = x.first;
    if (first instanceof Error) {
      first.x = [first.x, x.second];
      return first;
    } else {
      return x;
    }
  }

  if (!Function.prototype.then) {
    Function.prototype.then = function (g) {
      return lifta.thenA(this.a, g.a);
    };
  }

  if (!Function.prototype.run) {
    Function.prototype.run = function (x) {
      let p = lifta.P();
      this.a(x, () => {}, p);
      return p;
    };
  }

  // a first property for syntatic convenience
  Object.defineProperty(Function.prototype, 'first', {
    get: function () {
      return lifta.firstA(this.a);
    }
  });

  // a second property for syntatic convenience
  Object.defineProperty(Function.prototype, 'second', {
    get: function () {
      return lifta.secondA(this.a);
    }
  });

  if (!Function.prototype.fan) {
    Function.prototype.fan = function (g) {
      return lifta.fanA(this.a, g.a);
    };
  }

  if (!Function.prototype.product) {
    Function.prototype.product = function (g) {
      return lifta.productA(this.a, g.a);
    };
  }

  if (!Function.prototype.either) {
    Function.prototype.either = function (g) {
      return lifta.eitherA(this, g);
    };
  }

  // a repeat property for syntactic convenience
  Object.defineProperty(Function.prototype, 'repeat', {
    get: function () {
      return lifta.repeatA(this.a);
    }
  });

  if (!Function.prototype.lor) {
    Function.prototype.lor = function (f, g) {
      return lifta.leftOrRightA(this.a, f.a, g.a);
    };
  }

  Object.defineProperty(Function.prototype, 'falseError', {
    get: function () {
      return this.a.then(lifta.falseErrorA);
    }
  });


  Object.defineProperty(Function.prototype, 'promoteError', {
    get: function () {
      return this.a.then(lifta.promoteErrorA);
    }
  });

  function xHasError(x) {
    return (x instanceof Error) || (x.first && x.first instanceof Error) || (x.second && x.second instanceof Error);
  }

  Object.defineProperty(Function.prototype, 'leftError', {
    get: function () {
      if (!this._leftError) {
        let f = this.a;
        this._leftError = (x, cont, p) => {
          return f(x, (x, p) => {
            return cont(xHasError(x) ? lifta.Left(x) : lifta.Right(x), p);
          }, p);
        };
      }
      return this._leftError;
    }
  });

  Object.defineProperty(Function.prototype, 'barrier', {
    get: function () {
      if (!this._barrier) {
        let f = this.a;
        this._barrier = (x, cont, p) => {
          if (x instanceof Error) {
            return cont(x, p);
          } else {
            return f(x, cont, p);
          }
        };
      }
      return this._barrier;
    }
  });

  if (!Function.prototype.or) {
    Function.prototype.or = function (g) {
      return fanAndReducePairA(this, g, reduceOr);
    };
  }

  if (!Function.prototype.and) {
    Function.prototype.and = function (g) {
      return fanAndReducePairA(this, g, reduceAnd);
    };
  }

  // allow not to be set
  Object.defineProperty(Function.prototype, 'not', {
    get: function () {
      if (this._not === undefined) {
        return this.a.then(lifta.notA);
      } else {
        return this._not;
      }
    },
    set: (v) => this._not = v
  });

  if (!Function.prototype.false) {
    Function.prototype.false = function (g) {
      return this.a.then(lifta.falseA(g.a));
    };
  }

  if (!Function.prototype.true) {
    Function.prototype.true = function (g) {
      return this.a.then(lifta.trueA(g.a));
    };
  }

  lifta.fanAndReducePairA = fanAndReducePairA;
  lifta.promoteErrorA = promoteError.a;
  module.exports = lifta;
}());