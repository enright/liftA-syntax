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

## General Combinators

+ .then(a) - _b.then(a)_ run b, then run a with results of b

+ .first - _b.first_ modifies b to operate on only first (second is preserved), produces [b(first), second]

+ .second - _b.second_ modifies b to operate on only second (first is preserved), produces [first, b(second)]

+ .product(a) - _b.product(a)_ in parallel, run b on first and a on second, produces [b(first), a(second)]

+ .fan(a) - _b.fan(a)_ in parallel, run b on the tuple and a on the tuple

+ .either(a) - _b.either(a)_ similar to fan, but when first of the arrows completes, the other is cancelled

+ .repeat - _b.repeat_ repeat the arrow b until lifta.Done is produced

+ .lor - _b.lor(a, c)_ if b produces lifta.Left, a runs. if b produces lifta.Right, c runs

+ .leftError - _b.leftError_ if b produces Error, then produce lifta.Left

+ .barrier - _b.barrier_ if initial input is Error, then do not execute b

## Run

+ .run - _b.run(t)_ run an arrow with initial tuple [first, second]

## Boolean Combinators

+ .and(a) - _b.and(a)_ logical and of b.first and a.first, b.second is preserved

+ .or(a) - _b.or(a)_ logical or of b.first and a.first, b.second is preserved

+ .not - _b.not_ logical not of b.first, b.second is preserved

+ .true(a) - _b.true(a)_ if b produces first === true, run a, otherwise nothing

+ .false(a) - _b.false(a)_ if b produces first === false, run a, otherwise nothing

+ .falseError - _b.falseError_ if b produces first === false then produce an Error
