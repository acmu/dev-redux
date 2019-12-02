import ActionTypes from './utils/actionTypes';
import isPlainObject from './utils/isPlainObject';

export default function createStore(reducer, preloadedState, enhancer) {
  // 当前的 reducer 函数
  let currentReducer = reducer;
  // 当前的 state ，也就是 store ，只是一个普通的对象而已
  let currentState = preloadedState;
  // 监听函数的数组集合，如果state发生改变，就要调用这里的监听函数
  let currentListeners = [];
  //
  let nextListeners = currentListeners;
  // 是否正在 dispatching
  let isDispatching = false;

  // 把当前的监听数组做一个浅拷贝，目的是改变 nextListeners 时，currentListeners 不受到影响
  // 浅拷贝就是只把第一层做一次拷贝
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  // 很简单，就只是返回当前的 state
  function getState() {
    return currentState;
  }

  function subscribe(listener) {
    let isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      const index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
      // 这里为啥要null jj
      currentListeners = null;
    };
  }

  function dispatch(action) {
    if (!isPlainObject(action) || typeof action.type === 'undefined') {
      return;
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    const listeners = (currentListeners = nextListeners);
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }

    return action;
  }

  // 替换reducer，以下情况可能会用到：
  // 1. 实现代码分割
  // 2. 动态加载 reducer 
  // 3. 实现热重载
  function replaceReducer(nextReducer) {
    currentReducer = nextReducer;

    dispatch({ type: ActionTypes.REPLACE });
  }

  // 执行初始化
  dispatch({ type: ActionTypes.INIT });
  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
  };
}
