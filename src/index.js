import createStore from './createStore';

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
function counter(state = {}, action) {
  const { x } = state;
  const { payload: { value = 0 } = {} } = action;
  console.log('value', value);
  switch (action.type) {
    case 'INCREMENT':
      return { x: x + value };
    case 'DECREMENT':
      state.x = 888;
      return { x: state.x - value };
    case 'HACK':
      state.x = 999;
      break;
    default:
      return state;
  }
}

// Create a Redux store holding the state of your app.
// Its API is { subscribe, dispatch, getState }.
let store = createStore(counter, { x: 123 });

// You can use subscribe() to update the UI in response to state changes.
// Normally you'd use a view binding library (e.g. React Redux) rather than subscribe() directly.
// However it can also be handy to persist the current state in the localStorage.

store.subscribe(() => console.log('z', store.getState()));

// The only way to mutate the internal state is to dispatch an action.
// The actions can be serialized, logged or stored and later replayed.
store.dispatch({ type: 'INCREMENT', payload: { value: 3 } });
// 1
store.dispatch({ type: 'INCREMENT', payload: { value: 3 } });
// 2
store.dispatch({ type: 'DECREMENT', payload: { value: 3 } });
// 1

console.log('store', store);

const st = store.getState();

console.log('st', st);
st.zz = 0;

console.log('store.getState()', store.getState());
// store.dispatch({ type: 'HACK', payload: { value: 3 } });

// console.log('store.getState()', store.getState());
