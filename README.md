# Pedlar

A utility for logically grouping the performance and destruction of side effects. Inspired by React's `useEffect` hook.

## Problem

Most JavaScript frameworks have some type of "init" and "destroy" life cycle functions. For example, React has `componentDidMount()` and `componentWillUnmount()`; and similarly Angular has `ngOnInit()` and `ngOnDestroy()`.

The problem with these functions is that often times the work that you have to do on "init" closely mirrors the work that you have to do on "destroy". So you end up with this highly coupled code split between two different functions.

Pedlar addresses that problem by letting you declare both the "init" and "destroy" logic at the same time in the same place. It's just not all run at the same time. The function that you pass to `perform()` (the effect) is run immediately, and the function that you return from the effect is not run until you tell Pedlar to destroy that side effect.

## Installation

```bash
# Install with yarn
yarn add pedlar

# Install with npm
npm i pedlar
```

## Example usage

```js
import Pedlar from 'pedlar'

let pedlar = new Pedlar()

pedlar.perform(() => {
  console.log('Side effect 1 performed')
  return () => console.log('Side effect 1 cleaned up!')
})

pedlar.perform(() => {
  console.log('Side effect 2 performed')
  return () => console.log('Side effect 2 cleaned up!')
})

pedlar.destroyAll()
```

## API

### `perform(effect)`

Perform a side effect. You can optionally return a function from the `effect` that cleans up the effect. This ensures that these highly related functions are logically grouped in your code.

### `destroy(id)`

Clean up a particular side effect that has been performed.

```js
let pedlar = new Pedlar()

let id = pedlar.perform(() => {
  console.log('Side effect 1 performed')
  return () => console.log('Side effect 1 cleaned up!')
})

pedlar.destroy(id)
```

### `destroyAll()`

Clean up all side effects that have been performed since the last time this function was called.

### `addEvent(el, eventType, handler)`

Perform the specific effect of adding an event listener to an element. This event is then automatically removed when the side effect is destroyed.

```js
let pedlar = new Pedlar()
let el = document.getElementById('my-button')

// Adds the click event
pedlar.addEvent(el, 'click', () => console.log('My button was clicked'))

// ...

// Removes the click event, along with cleaning up all other side effects
pedlar.destroyAll()
```

| Argument name | Type                                 | Description                                                                             |
| ------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| element       | `Element`                            | The element to add the event listener to                                                |
| eventType     | `string`                             | The type of event to add                                                                |
| handler       | `EventListenerOrEventListenerObject` | The event handler                                                                       |
| options       | `boolean \| EventListenerOptions`    | Optional. These options get passed directly through to the `addEventListener` function. |
