# Pedlar

A utility for logically grouping the performance and destruction of [side effects][wiki]. Inspired by React's `useEffect` hook.

[wiki]: https://en.wikipedia.org/wiki/Side_effect_%28computer_science%29

## Problem

Most JavaScript frameworks have some type of "init" and "destroy" life cycle functions. For example, React has `componentDidMount()` and `componentWillUnmount()`; and similarly Angular has `ngOnInit()` and `ngOnDestroy()`.

The problem with these functions is that often times the work that you have to do on "init" closely mirrors the work that you have to do on "destroy". So you end up with this highly coupled code split between two different functions.

Pedlar addresses that problem by letting you declare both the "init" and "destroy" logic at the same time in the same place. It's just not all run at the same time. The function that you pass to `perform()` (the side effect) is run immediately, and the function that you return from the side effect is not run until you tell Pedlar to destroy that side effect.

Additionally, there's also usually an "update" life cycle function (`componentDidUpdate()` / `ngOnChanges()`). Oftentimes identical or similar work takes place in the "update" and "init" functions. Pedlar also provides the ability to re-perform a particular effect at any time. It can even skip running the effect if dependencies that you specify have not changed!

## Installation

```bash
# Install with yarn
yarn add pedlar

# Or install with npm
npm i pedlar
```

## Examples

### Simple Usage

```ts
import Pedlar from 'pedlar'

let pedlar = new Pedlar()

pedlar.perform(() => {
  console.log('Side effect 1 performed')
  return () => console.log('Side effect 1 cleaned up!')
})

// LOG: 'Side effect 1 performed'

pedlar.perform(() => {
  console.log('Side effect 2 performed')
  return () => console.log('Side effect 2 cleaned up!')
})

// LOG: 'Side effect 2 performed'

pedlar.destroyAll()

// LOG: 'Side effect 1 cleaned up!'
// LOG: 'Side effect 2 cleaned up!'
```

### Add and automatically remove an event

```ts
import Pedlar from 'pedlar'

let pedlar = new Pedlar()
let el = document.getElementById('my-button')

// Adds the click event
pedlar.addEvent(el, 'click', () => console.log('My button was clicked'))

// ...

// Removes the click event, along with cleaning up all other side effects
pedlar.destroyAll()
```

### Re-perform an event when dependencies have changed

```ts
import {Pedlar, PedlarEffect} from 'pedlar'

let pedlar = new Pedlar()
let consoleEffect: PedlarEffect

consoleEffect = pedlar.perform(() => {
  console.log('Side effect performed')
  return () => console.log('Side effect cleaned up!')
}, ['my-dependency'])

// LOG: 'Side effect performed'
// You can avoid this initial run of the side effect by
// calling `pedlar.create()` instead of `pedlar.perform()`

consoleEffect.perform(['my-dependency'])
// Effect is not performed again, dependencies have not changed

consoleEffect.perform(['my-changed-dependency'])

// LOG: 'Side effect cleaned up!'
// LOG: 'Side effect performed'
```

## Types

### `PedlarEffect`

A Pedlar Effect is the object returned from either `Pedlar.perform()` or `Pedlar.create()`. It has two properties:

- id - `string` - The ID of this effect. This ID can be passed to `Pedlar.destroy()` to individually destroy this effect.
- perform - `(currentDependencies?) => void` - Run the side effect. If dependencies are passed, the side effect will only be run if the dependencies have changed. If this is not the first time the side effect is being run, the destroyer (if one exists) will be executed before the side effect is re-run.

### `PedlarSideEffect`

The side effect that you wish to run. This is a function that either returns nothing, or another function that cleans up the side effect.

## API

### `create(sideEffect: PedlarSideEffect): PedlarEffect`

Create a `PedlarEffect` without initially running the side effect. You can optionally return a function from the `sideEffect` that cleans it up. The side effect can be run at any time by invoking `PedlarEffect.perform()`.

### `perform(sideEffect: PedlarSideEffect, dependencies?: any[]): PedlarEffect`

Perform a side effect. You can optionally return a function from the `sideEffect` that cleans it up. The side effect can be re-run at any time by invoking `PedlarEffect.perform()`.

This is very similar to the `Pedlar.create()` function, except that this also runs the side effect immediately.

### `destroy(id)`

Clean up a particular side effect that has been performed.

```ts
import Pedlar from 'pedlar'

let pedlar = new Pedlar()

let {id} = pedlar.perform(() => {
  console.log('Side effect 1 performed')
  return () => console.log('Side effect 1 cleaned up!')
})

pedlar.destroy(id)
```

### `destroyAll()`

Clean up all side effects that have been performed since the last time this function was called.

### `addEvent(el, eventType, handler, options)`

Perform the specific side effect of adding an event listener to an element. This event is then automatically removed when the side effect is destroyed.

| Argument name | Type                                 | Description                                                                             |
| ------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| element       | `Element`                            | The element to add the event listener to                                                |
| eventType     | `keyof HTMLElementEventMap` (string) | The [type][event-types] of event to add                                                 |
| handler       | `EventListenerOrEventListenerObject` | The event handler                                                                       |
| options       | `boolean \| EventListenerOptions`    | Optional. These options get passed directly through to the `addEventListener` function. |

[event-types]: https://developer.mozilla.org/en-US/docs/Web/Events

### `addCustomEvent(el, eventType, handler, options)`

Identical to `addEvent()` except that the `eventType` argument is typed to accept any string

### `waitForEvent(el, eventType, handler, options)`

Add an event listener to an element that is immediately removed after the event fires. The listener is guaranteed to only fire once.

| Argument name | Type                                 | Description                                                                             |
| ------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| element       | `Element`                            | The Element wait for the event to fire on                                               |
| eventType     | `keyof HTMLElementEventMap` (string) | The [type][event-types] of event to wait for                                            |
| handler       | `EventListenerOrEventListenerObject` | The event handler                                                                       |
| options       | `boolean \| EventListenerOptions`    | Optional. These options get passed directly through to the `addEventListener` function. |

### `waitForCustomEvent(el, eventType, handler, options)`

Identical to `waitForEvent()` except that the `eventType` argument is typed to accept any string

## Additional Examples

### An Angular directive with `OnInit` and `OnChanges`

Here is a small Angular directive that has a single input, `isDisabled`. The directive pushes most of its functionality off to a plan old JavaScript object called `myComponent`. The directive just needs to set the `.disabled` property of `myComponent` when the value of the the `isDisabled` input changes.

**Without Pedlar**, this looks like:

```ts
export class MyDirective implements OnInit, OnChanges, OnDestroy {
  @Input() isDisabled = false

  private elementRef: ElementRef
  private myComponent: MyComponent

  constructor(elementRef: ElementRef) {
    this.elementRef = elementRef
  }

  ngOnInit() {
    this.myComponent = new MyComponent(this.elementRef.nativeElement)
    // Perform the side effect of modifying the component
    // for the first time
    this.myComponent.disabled = this.isDisabled
  }

  ngOnChanges(changes: SimpleChanges) {
    // Explicitly check for changes to EVERY dependency
    if (changes.isDisabled.currentValue !== changes.isDisabled.previousValue) {
      // Perform the side effect of modifying the component
      // for the SECOND time
      this.myComponent.disabled = changes.isDisabled.currentValue
    }
  }

  ngOnDestroy() {
    this.myComponent.destroy()
  }
}
```

**With Pedlar**, this code can improved by:

- Removing the duplicate code that sets `this.myComponent.disabled`
- Remove the code that explicitly checks for changes to the dependencies

```ts
export class MyDirective implements OnInit, OnChanges, OnDestroy {
  @Input() isDisabled = false

  private elementRef: ElementRef
  private myComponent: MyComponent

  private pedlar: Pedlar
  private disabledEffect: PedlarEffect

  constructor(elementRef: ElementRef) {
    this.elementRef = elementRef
    this.pedlar = new Pedlar()
  }

  ngOnInit() {
    this.myComponent = new MyComponent(this.elementRef.nativeElement)

    // Create and perform the side effect
    this.disabledEffect = this.pedlar.perform(() => {
      this.myComponent.disabled = this.isDisabled
    }, [this.isDisabled])
  }

  ngOnChanges(changes: SimpleChanges) {
    // Automatically re-perform the side effect if the dependency has changed
    this.disabledEffect.perform([changes.isDisabled.currentValue])
  }

  ngOnDestroy() {
    this.myComponent.destroy()
    this.pedlar.destroyAll()
  }
}
```

The difference may seem minor here because we wanted to keep the examples pretty simple. But as `MyDirective` grows and adds more and more inputs (and therefore more side effects), the benefits of writing the code to perform each side effect only once grows exponentially.

Additionally, if the (potentially) complicated logic of performing your side effect changes, you don't have to remember to update the logic in multiple places.
