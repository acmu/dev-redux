本文将会讲解 Redux 和 redux-thunk 的源码，并抄写一个无类型检测、易懂的版本。

## 环境准备

Redux 源码使用了 ES6 语法，rollup 打包。这里我使用 Parcel 打包，因为它可以零配置，安装了直接用就 ok。

1. 新建文件夹 `mkdir dev-redux && cd dev-redux`
2. 初始化项目 `yarn init -y`
3. 安装 parcel `yarn add parcel-bundler --dev`
4. 在`package.json`中添加 dev 命令 `parcel ./src/index.html`

`package.json` 如下：

```json
{
  "name": "dev-redux",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "scripts": {
    "dev": "parcel ./src/index.html"
  },
  "devDependencies": {
    "parcel-bundler": "^1.12.3"
  }
}
```

## 目录结构

在[Redux 仓库](https://github.com/reduxjs/redux)的 src 目录下，有几个文件，这就是它的全部源码：

![](https://user-gold-cdn.xitu.io/2019/7/28/16c3680019a31238?w=536&h=540&f=png&s=58747)

在我们的项目中，新建一个文件夹`src`，创建如上面相同的 js 文件即可，最后再新建一个`index.html`，作为 Parcel 打包的入口，html 中引入 index.js，`<script src="./index.js"></script>`。目录如下：

![](https://user-gold-cdn.xitu.io/2019/7/28/16c3713067105402?w=460&h=568&f=png&s=55821)

这时，可以在 index.js 中写一个 log，执行`yarn dev`，打开`localhost:1234`，看到控制台的输出，就代表已经配置完成。

## 代码编写

下面，我先介绍一下`utils`，它是一些工具函数，代码如下：

### `/utils`

`warning.js` 输出 error

```js
export default function warning(message) {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
}
```

`isPlainObject.js` 判断是否为纯对象，dispatch 的 action 就会由他判断

```js
export default function isPlainObject(obj) {
  // 因为 typeof null 等于 'object' 所以需要特殊判断一下
  if (typeof obj !== 'object' || obj === null) return false;

  // 并不是所有 typeof 值为 object 的都是纯对象，比如 typeof [] 等于 'object'
  // 所以需要判断原型链，设纯对象的原型是A，那么A的原型一定是 null
  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    console.log('proto', proto);
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}
```

`actionTypes.js` 定义了三个 action 类型

```js
// 这里是随机一个 [0-9a-z] (36进制) 的字符串，选7以后的字符原因
// 我认为是：生成字符串的长度大约为 8 位到 15 位不等
// 这就让后面的字符除了[0-9a-z]这36种可能外，又多了一种不存在的可能，增大了不相等的概率
const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7)
    .split('')
    .join('.');

const ActionTypes = {
  INIT: `@@redux/INIT${randomString()}`,
  REPLACE: `@@redux/REPLACE${randomString()}`,
  PROBE_UNKNOW_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}`,
};

export default ActionTypes;
```

至此，`utils`目录工具函数已经结束，接下来便依次讲解其他文件。

`compose.js` 当你调用`compose(a, b, c)(1, 2, 3)`后，会返回`a(b(c(1, 2, 3)))`的相同结果，这个函数，也被当面试题问过。

```js
export default function compose(...funcs) {
  // 如果没参数，返回一个函数
  if (funcs.length === 0) {
    return f => f;
  }
  // 如果只有一个参数，直接返回
  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((accumulator, currentValue) => {
    return (...args) => {
      return accumulator(currentValue(...args));
    };
  });
}
```

这里的 reduce 需要仔细理解一下：

accumulator：累计器 currentValue：当前的值，`funcs.reduce`的返回值是一个函数，这里可以这样理解：调用方式是： `compose(a, b, c)` a b c 都是函数。此时 funcs 是 `[a, b, c]`

| 执行次数 | accumulator 值             | currentValue 值 |
| -------- | -------------------------- | --------------- |
| 1        | `a`                        | `b`             |
| 2        | `(...arg) => a(b(...arg))` | `c`             |

最后，它的返回值就是`(...arg) => a(b(c(...arg)))`，我们可以在`index.js`中写入测试代码，执行`yarn dev`，一看便知：

```js
import compose from './compose';

function fun1(value) {
  console.log('fun1: ', value);
  return value + 'fun1';
}

function fun2(value) {
  console.log('fun2: ', value);
  return value + 'fun2';
}

function fun3(value) {
  console.log('fun3: ', value);
  return value + 'fun3';
}

const thunk = compose(fun1, fun2, fun3);

console.log(thunk('MinYuan'));
```

![](https://user-gold-cdn.xitu.io/2019/7/28/16c3835db74aa4d8?w=432&h=256&f=png&s=18410)

这个文件在源码中写的很高大上，其实就是为了实现上述功能，并不难。

接下来，就要进入`createStore.js`部分的讲解，这是 Redux 中最重要的部分。

### `createStore.js`

> 这里教大家一个 VSCode 快捷键，`cmd + k 和 cmd + n` 意思是以第 n 层级为准对代码进行折叠，比如 `cmd + 2` 是第二层级， `cmd + 3` 就是第三层级。折叠之后全部展开的快捷键是 `cmd + k 和 cmd + j`

虽然 `createStore.js` 中的代码有点长，但不用怕，折叠二层级后发现有用的，就这几个函数：

![](https://user-gold-cdn.xitu.io/2019/11/18/16e7bb1b583254e9?w=972&h=1546&f=png&s=176012)

我们写完如下：

```js
js;
```

当实现了这个之后，我们就可以运行 redux 官方 Demo 代码了：

```js
import { createStore } from 'redux';

/**
 * This is a reducer, a pure function with (state, action) => state signature.
 * It describes how an action transforms the state into the next state.
 *
 * The shape of the state is up to you: it can be a primitive, an array, an object,
 * or even an Immutable.js data structure. The only important part is that you should
 * not mutate the state object, but return a new object if the state changes.
 *
 * In this example, we use a `switch` statement and strings, but you can use a helper that
 * follows a different convention (such as function maps) if it makes sense for your
 * project.
 */
function counter(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1;
    case 'DECREMENT':
      return state - 1;
    default:
      return state;
  }
}

// Create a Redux store holding the state of your app.
// Its API is { subscribe, dispatch, getState }.
let store = createStore(counter);

// You can use subscribe() to update the UI in response to state changes.
// Normally you'd use a view binding library (e.g. React Redux) rather than subscribe() directly.
// However it can also be handy to persist the current state in the localStorage.

store.subscribe(() => console.log(store.getState()));

// The only way to mutate the internal state is to dispatch an action.
// The actions can be serialized, logged or stored and later replayed.
store.dispatch({ type: 'INCREMENT' });
// 1
store.dispatch({ type: 'INCREMENT' });
// 2
store.dispatch({ type: 'DECREMENT' });
// 1
```

你可以输出 `store` 看一下，它只是一个简单的对象，里面包含了几个方法。

![](https://user-gold-cdn.xitu.io/2019/12/5/16ed4a8459a3f281?w=958&h=200&f=png&s=51017)

`store` 并没有把 `currentState` 暴露出来，而是通过 dispatch action 之后传给 reducer 去修改，返回一个全新的 `store` ，并且通过 `getState` 去获取内容。

Redux 通过闭包的方式去隐藏 `currentState` 但我们还是有 2 种方式可以直接获取到 `currentState` 的值，分别是 `currentState = currentReducer(currentState, action);` 的 reducer 和 `return currentState;` 的 getState。也就是说，你可以通过这 2 种方式直接去改变 `currentState` ，而不需要 dispatch action ，也不会触发 listeners ，当然，这是正常开发下不想看到的效果，所以要保证每个 reducer 是纯函数、无副作用，最好是使用 [immutable.js](https://immutable-js.github.io/immutable-js/)，这样 store 中的数据天生就不可修改，很符合当前使用场景。

完成 `createStore` 后，就已经完成了 Redux 的大部分功能。

### `combineReducers`

随着你的 App 变得复杂，store 也会变得很庞大，我们可以通过 `combineReducers` 组合 reducer 函数，简化 store。

使用如下：


## 结语

虽然如今 Redux 已用 TS 重写，但核心代码基本没变，只是添加一些类型声明而已。

## 记录

中间件使你能包裹 dispatch 方法
