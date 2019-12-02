import compose from './compose';

function f() {
  console.log('', arguments);
}

f();

f(1, 2, 3);

f('sdf');

f([1, 2]);
