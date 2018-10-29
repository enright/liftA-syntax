![lifta image](https://s3-us-west-1.amazonaws.com/bill-enright-personal/Asset+5.svg)

lifta-syntax

There are a number of packages/repos related to liftA. This repository provides the fluent syntax  that I believe improves clarity when constructing asynchronous arrows. To accomplish this, it adds a significant number of properties and functions to Function.prototype.

The "lifta" package of high-order functions (combinators) provides the underlying construction. Note that "lifta-syntax" itself requires the "lifta" package. There is no need to require both.

Examples of asynchronous arrow construction with lifta-syntax:

```javascript
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

  // an arrow to get user and read html in parallel and combine the outputs
  let getUserAndHTML = getDynamoUser.fan(readHTML).then(combineUserAndHTML);
```
