# lifta-syntax

There are a number of packages/repos related to liftA. This repository provides the fluent syntax  that I believe improves clarity when constructing asynchronous arrows. To accomplish this, it adds a significant number of properties and functions to Function.prototype.

The "lifta" package of high-order functions (combinators) provides the underlying construction. Note that "lifta-syntax" itself requires the "lifta" package. There is no need to require both.

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

In the discussion below, b represents an arrow. The properties and functions of b construct a new arrow (such that b.first is a new arrow, it is not b). 'a' and 'c' represent arrows that are passed as parameters to functions such as _b.then(a)_. 't#' represents a tuple. For example t1.first is the 0th element of the tuple. t1.second is the 1th (wunth?)

## General Combinators

+ .then(a) - _b.then(a)_ run b(t1) to produce t2, then run a(t2) to produce t3.

+ .first - _b.first_ constructs an arrow from b to operate on only t1.first (t1.second is preserved), the new arrow produces t2[b(t1.first), t1.second]

+ .second - _b.second_ constructs an arrow from b to operate on only t1.second (t1.first is preserved), new arrow produces t2[t1.first, b(t1.second)]

+ .product(a) - _b.product(a)_ in parallel, run b on t1.first and a on t1.second, produces t2[b(t1.first), a(t1.second)]

+ .fan(a) - _b.fan(a)_ in parallel, run b on t1 and a on t1, producing t2[b(t1), a(t1)], which is a tuple of tuples. Generally, when fanning, you will want to reduce the results of the fanned arrows to create a new tuple, in most cases _preserving t1.second_. For example _b.fan(a).then(c)_ where your reducer c produces t3[\<reduce t2.first.first and t2.second.first\>, t2.first.second]

+ .either(a) - _b.either(a)_ similar to fan in that it runs b on t1 and a on t1, but when the first of the arrows completes, the other is cancelled. Produces either t2[b(t1).first, b(t1).second] or t2[a(t1).first, a(t1).second]. Because only one arrow completes, I don't imagine that you want to reduce.

+ .repeat - _b.repeat_ repeat the arrow b as long as b produces lifta.Repeat(tn). Continue without repeating when lifta.Done(tn) is produced. Loop forever with _b.then(lifta.justRepeatA).repeat_. If you want your loop to finish, your arrow must produce lifta.Done(tn), which will cause repeating to end and will proceed with tn.

+ .lor - _b.lor(a, c)_ lor is short for "left or right", which provides branching. if b(t1) produces lifta.Left(t2), then run a on t2. If b produces lifta.Right(t2), then instead run c on t2. To branch for error handling, you can simply have your arrow produce an Error and use the _.leftError_ property. Suppose b might produce an Error: _b.leftError.lor(errorHandlerA, normalResultA)_. The Error here will still be produced by this arrow after error handling. When constructing it is typical to cope with Error flowing to downstream arrows by using the _.barrier_ property, which prevents arrows from executing if t is an Error. So if there is _more to do_ after normalResultA, use a barrier: _b.leftError.lor(errorHandlerA, normalResultA).then(moreToDoA.barrier)_

+ .leftError - _b.leftError_ if b(t1) produces t2 that either is an Error or contains an error (t2.first is Error or t2.second is Error), then produce lifta.Left(t2)

+ .barrier - _b.barrier_ if initial input t1 is or contains an Error, then do not execute b, simply produce t1

## Run

+ .run - _b.run(t)_ run an arrow with initial tuple [first, second]

## Boolean Combinators

+ .and(a) - _b.and(a)_ logical and of b.first and a.first, b.second is preserved

+ .or(a) - _b.or(a)_ logical or of b.first and a.first, b.second is preserved

+ .not - _b.not_ logical not of b.first, b.second is preserved

+ .true(a) - _b.true(a)_ if b produces first === true, run a, otherwise nothing

+ .false(a) - _b.false(a)_ if b produces first === false, run a, otherwise nothing

+ .falseError - _b.falseError_ if b produces first === false then produce an Error
