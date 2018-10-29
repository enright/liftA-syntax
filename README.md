![lifta image](https://s3-us-west-1.amazonaws.com/bill-enright-personal/Asset+5.svg)

lifta-syntax

There are a number of packages/repos related to liftA. This repository provides the fluent syntax  that I believe improves clarity when constructing asynchronous arrows. To accomplish this, it adds a significant number of properties and functions to Function.prototype.

The "lifta" package of high-order functions (combinators) provides the underlying construction. Note that "lifta-syntax" itself requires the "lifta" package. There is no need to require both.

Examples of asynchronous arrow construction with lifta-syntax:

```javascript
  let lifta = require('lifta-syntax');
  // dynamo asynchronous arrows
  let dyna = require('lifta-dynamo');

  // create dynamo parameter for getting a user by id
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

  // an arrow that will get the user from the dynamo db ()
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

Some things to note about the code above:

Combining functions (like setUserReqParams) and arrows (like dyna.getItemA) into arrows is a process of construction. Arrows don't _run_ until you tell them to _run_. We can easily combine into rather complex parallelized, branching, and repeating structures. Clarity is gained when easily understood arrows are combined together.

We start running an arrow with a _tuple_. A general practice is to use the second of the tuple as contextual information for the arrow and let the context flow through the computation, typically adding to the context, sometimes modifying it. See lifta-thumbnail for examples from a working web service.
