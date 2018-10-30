# lifta-syntax

There are a number of packages/repos related to liftA. This repository provides the fluent syntax  that I believe improves clarity when constructing asynchronous arrows. To accomplish this, it adds a significant number of properties and functions to Function.prototype.

The "lifta" package of high-order functions (combinators) provides the underlying construction. Note that "lifta-syntax" itself requires the "lifta" package. If you are requiring lifta-syntax, there is no need to separately require lifta.

## Examples of asynchronous arrow construction with lifta-syntax:

```javascript
// fluent syntax
let lifta = require('lifta-syntax');
// dynamo asynchronous arrows
let dyna = require('lifta-dynamo')({
	"accessKeyId": "NOTHISISNOTREALLYANID",
	"secretAccessKey": "n0+7h15+15+n07+r3411y+4n+4cc355+k3y/K3Y",
	"region": "us-west-1"
});

// create dynamo query parameter for getting a user by id
// we are setting up the first of the tuple from information in the second
function setUserReqParams(x) {
  let second = x.second;
  return [{
    TableName: second.userTableName,
    Key: {
      id: {
        S: second.userid
      }
    }
  }, second];
}

// create an arrow that will get the user from the dynamo db
// note that dyna.getItemA acts on the first of the tuple only
// it only needs the query (first), not the context (second)
let getDynamoUser = setUserReqParams.then(dyna.getItemA.first);

// continue combining
// create an arrow to get user and read html in parallel and combine the outputs
let getUserAndHTML = getDynamoUser.fan(readHTML).then(combineUserAndHTML);

// run (p.cancelAll() allows for arrow 'in-flight'  cancellation)
let p = getUserAndHTML.run([undefined, {
  userTableName: "user-table",
  userid: "dave@daveco.co",
  htmlFile: "yourPage.html"
}]);
```

## Some things to note about the code above:

Combining functions (like setUserReqParams) and arrows (like dyna.getItemA) into arrows is a _process of construction_. Arrows don't _run_ until you tell them to _run_. We can easily combine into rather complex parallelized, branching, and repeating structures. Clarity is gained when easily understood arrows are combined together.

We start running an arrow with a _tuple_. A general practice is to use the second of the tuple as contextual information for the arrow and let the context flow through the computation, typically adding to the context, sometimes modifying it. See lifta-thumbnail for examples from a working web service.

In the descriptions below, b represents an arrow. The properties and functions of b construct a new arrow (such that b.first is a new arrow, it is not b). 'a' and 'c' represent arrows that are passed as parameters to functions such as _b.then(a)_. 't#' represents a tuple. For example t1.first is the [0] element of the tuple. t1.second is the [1] (wunth?)

## General Combinators

+ .then(a) - _b.then(a)_ run b(t1) to produce t2, then run a(t2) to produce t3.

+ .first - _b.first_ constructs an arrow from b to operate on only t1.first (t1.second is preserved), the new arrow produces t2[b(t1.first), t1.second]. Note that this implies that b in this case does not take in or produce a tuple! Please see "Function of x, Returning x" below.

+ .second - _b.second_ constructs an arrow from b to operate on only t1.second (t1.first is preserved), new arrow produces t2[t1.first, b(t1.second)]

+ .product(a) - _b.product(a)_ in parallel, run b on t1.first and a on t1.second, produces t2[b(t1.first), a(t1.second)].

+ .fan(a) - _b.fan(a)_ in parallel, run b on t1 and a on t1, producing t2[b(t1), a(t1)], which is a tuple of tuples. Generally, when fanning, you will want to reduce the results of the fanned arrows to create a new tuple, in most cases _preserving t1.second_. For example _b.fan(a).then(c)_ where your reducer c produces t3[\<reduce t2.first.first and t2.second.first\>, t2.first.second]

+ .either(a) - _b.either(a)_ similar to fan in that it runs b on t1 and a on t1, but when the first of the arrows completes, the other is cancelled. Produces either t2[b(t1).first, b(t1).second] or t2[a(t1).first, a(t1).second]. Because only one arrow completes, I don't imagine that you want to reduce.

+ .repeat - _b.repeat_ repeat the arrow b as long as b produces lifta.Repeat(tn). Continue without repeating when lifta.Done(tn) is produced. Loop forever with _b.then(lifta.justRepeatA).repeat_. If you want your loop to finish, your arrow must produce lifta.Done(tn), which will cause repeating to end and will proceed with tn.

+ .lor - _b.lor(a, c)_ lor is short for "left or right", which provides branching. if b(t1) produces lifta.Left(t2), then run a on t2. If b produces lifta.Right(t2), then instead run c on t2. To branch for error handling, you can simply have your arrow produce an Error and use the _.leftError_ property. Suppose b might produce an Error: _b.leftError.lor(errorHandlerA, normalResultA)_. The Error here will still be produced by this arrow after error handling. When constructing it is typical to cope with Error flowing to downstream arrows by using the _.barrier_ property, which prevents arrows from executing if t is an Error. So if there is _more to do_ after normalResultA, use a barrier: _b.leftError.lor(errorHandlerA, normalResultA).then(moreToDoA.barrier)_

+ .leftError - _b.leftError_ if b(t1) produces t2 that either is an Error or contains an error (t2.first is Error or t2.second is Error), then produce lifta.Left(t2)

+ .barrier - _b.barrier_ if initial input t1 is or contains an Error, then do not execute b, simply produce t1

## Run

+ .run - _b.run(t)_ run an arrow with initial tuple t[first, second]. This is a convenience method. You can run an arrow by simply calling it with the correct parameters: a(t, cont, p). t is the initial tuple. cont is a function (t, p) which will receive the produced tuple and the canceller. A simple do-nothing continuation is () => {}. p is required and is created with lifta.P().

## Boolean Combinators

+ .and(a) - _b.and(a)_ fan b and a over t1 and reduce with logical and. proceed with t2[b(t1).first && a(t1).first, b(t1).second]

+ .or(a) - _b.or(a)_ fan b and a over t1 and reduce with logical or. proceed with t2[b(t1).first || a(t1).first, b(t1).second]

+ .not - _b.not_ logical not of b(t1).first, while b(t1).second is preserved. proceed with t2[!b(t1).first, b(t1).second]

+ .true(a) - _b.true(a)_ run b(t1) and produce t2. if t2.first === true, run a(t2), producing t3. if t2.first !== true, produce t2.

+ .false(a) - _b.false(a)_ run b(t1) and produce t2. if t2.first === false, run a(t2), producing t3. if t2.first !== false, produce t2.

+ .falseError - _b.falseError_ if b(t1) produces t2.first === false then produce [Error, t2.second]

## Functions of x Returning x

These properties and functions have been added to Function.prototype so that they can be used to automatically "lift" functions into arrows. For arrows that are not asynchronous, you can simply write functions that take tuples and _return tuples_, or that take a value and _return a value_, and compose them along with asynchronous arrows such as those found in lifta-dynamodb or lifta-s3.

This makes your functions very simple and very _testable_.

We saw this "lift" in the source code above when we take the setUserReqParams(x) function and simply combine it with _.then(a)_. Here are the bits from that example:

```javascript
// create dynamo query parameter for getting a user by id
// we are setting up the first of the tuple from information in the second
function setUserReqParams(x) {
  let second = x.second;
  return [{
    TableName: second.userTableName,
    Key: {
      id: {
        S: second.userid
      }
    }
  }, second];
}

let getDynamoUser = setUserReqParams.then(dyna.getItemA.first);
```

We call setUserReqParams() above a "tuple-aware" function because it "knows about" the tuple nature of x (it uses x.second and when returning, creates x.first). Notice that it is a "function of x returning x", because it receives a value (in this case a tuple) and returns a value (also a tuple). Also note that it maintains the context - the second of the tuple. These are not difficult to write, and they are easy to test, but life could be simpler.

We can easily imagine another scenario where perhaps the first of the tuple _contains all the information that setUserReqParams needs_. In this case we can write a "function of x returning x" that operates on a single value, not a tuple, and returns a single value, not a tuple. And we can use the _.first_ combinator along with this simpler function.

```javascript
// a simple setUserReqParams
// incoming x is a simple data object containing the data we need to set up the query
// we don't need to know anything about tuples
// we produce the query object and return it
function setUserReqParams(x) {
  // return the query object
  return {
    TableName: x.userTableName,
    Key: {
      id: {
        S: x.userid
      }
    }
  };
}

// notice that 'first' is applied to the complete arrow
// so setUserReqParams only receives t.first
let getDynamoUser = setUserReqParams.then(dyna.getItemA).first;

getDynamoUser.run([{
  userTableName: "user-table",
  userid: "dave@daveco.co"
}, { context: "all the other context" }]);
```

The properties and functions added to Function.prototype recognize when a function has an arity of 1 (has one parameter). When you use a combinator, a special property is added to your function that is a "lifted" arrow version of your function. It has the arrow signature. The combinators use this lifted version.

Writing _functions of x returning x_ that deal with values, not tuples, lets you write and test much simpler code that can combine into powerful, complex arrows. But it is typical to need to move data from context (t.second) to data (t.first) - and vice versa - at various points. You need to understand both tuple-aware and single-value forms.

## Writing Your Own Arrows

When you need to write an asynchronous arrow, you simply use the three-parameter signature of an arrow: a(t, cont, p). When your asynchronous work completes, you call cont(t2, p). If you follow this pattern, and make your arrow cancellable, _all of the combinators will work_.

It is not overly complicated to convert Node.js "errorback" methods to arrows, and there is significant benefit to using combinators with converted "errorbacks": _callback hell disappears_. Here is a converted fs.readFile.

+ We've created a new arrow readFileA
+ Note the arrow signature (x, cont, p).
+ Note that a simple canceller is added to p
+ Look at the provided errorback (err, data) passed to fs.readFile.
+ "cont" is what "continues" moving data through the arrow.
+ When the callback completes we check for cancelled and do nothing if cancelled.
+ If the error back produces an Error, we simply continue with it (we have the tools, like _.leftError_ and _.lor_ to handle errors strategically when we combine arrows)
+ Otherwise we continue with the data.

```javascript
let readFileA = (x, cont, p) => {
  let cancelled = false;
  let cancelId;
  fs.readFile(x, (err, data) => {
    // if not cancelled, advance and continue
    if (!cancelled) {
      p.advance(cancelId);
      if (err) {
        err.x = x;
        return cont(err, p);
      } else {
        return cont(data, p);
      }
    }
  });
  cancelId = p.add(() => cancelled = true);
  return p;
};
```

For many libraries, it is possible to write some simple transformation functions to convert the entire API to an arrow form. For example here is a function "dynamoErrorBack" that converts many of the dynamoDB API calls into arrows. The method parameter is the name of the api call such as "batchGetItem". The "dynamo" variable is a configured dynamo instance. This can be found in lifta-dynamodb.

+ dynamoErrorBack returns a function with the arrow signature (x, cont, p) for the specified method
+ The arrow uses x as the request object and calls dynamo[method] (so use _.first_ when combining)
+ The SDK's req.abort feature is easily incorporated into the canceller
+ The callback will continue the arrow with an Error or with data (if req not aborted)

```javascript
let cb = (x, cont, p, advance, err, data) => {
  if (err) {
    err.x = x;
    x = err;
  } else {
    x = data;
  }
  advance();
  cont(x, p);
};

function dynamoErrorBack(method) {
  return function (x, cont, p) {
    let cancelId;
    let advance = () => p.advance(cancelId);
    let req = dynamo[method](x, cb.bind(undefined, x, cont, p, advance));
    cancelId = p.add(() => req.abort());
    return cancelId;
  };
}
```

## TL; DR
Did you scroll to the bottom? Regardless, thank you.

lifta-thumbnail has significant examples of using "functions of x returning x", home-brewed arrows (one for exec'ing phantomjs), and dynamodb usage.
