export default function compose(...funcs) {
  if (funcs.length === 0) {
    return f => f
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((acc, cur) => {
    return (...args) => {
      return acc(cur(...args))
    }
  })
}
