# Transaction

## Chrome Extension下的持久层事务问题（Transaction）

1. 当前采用PGLite，其事务的调用采用异步调用下的在回调函数里进行，如

```javascript
await pg.transaction(async (tx) => {
  await tx.query(
    'INSERT INTO test (name) VALUES ('$1');',
    [ 'test' ]
  );
  return await tx.query('SELECT * FROM test;');
});
```

2. Chrome Extension的调用链为

```text
ContentScript（或SidePanel） -> Background -> OffScreen -> WebWorker
```

而持久层（即PGLite）是在WebWorker进行调用，而运行逻辑部份是放在Background或ContentScript(或SidePanel)里，这样会出现一个问题，怎样使得逻辑的调用链处在事务的回调函数里？

## 可能的解决方案

1. 传递tx对象

伪代码：

```javascript
let idAndTxMap = new Map();
let idAndTxPromiseResolveReject = new Map()

async function startTransaction(){
    await pg.transaction(async (tx) => {
    let id = genId();
    idAndTxMap.set(id,tx);
    postMessage(message,id);
    return new Promise((resolve,reject)=>{
        idAndTxPromiseResolveReject.set(id,{resolve,reject});
    });
    });
}

async function endTransaction(id){
    idAndTxPromiseResolveReject.get(id).resolve();
}

async function update(param,{transactionId=null}={}){
    let connection = idAndTxMap.get(transactionId)??await getDb();
    connection.query("update....",param);
}

async main(){
    let id = await startTransaction();
    update(param,{transactionId:id})
    await endTransaction(id);
}

```

2. 将逻辑都放到WebWorker里

## 选择的解决方案

1. 选择将逻辑都放到WebWorker里。
