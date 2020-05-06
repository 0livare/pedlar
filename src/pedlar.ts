import {generateId} from './generateId'

export type PedlarSideEffect = () => (() => void) | void

export type PedlarEffect = {
  id: string
  perform: (currentDependencies?: any[]) => void
}

/**
 * A utility for logically grouping the performance and
 * destruction of side effects. Inspired by React's useEffect() hook.
 */
export class Pedlar {
  private destroyers: {[id: string]: Function} = {}

  /**
   * Create a side effect and immediately specify the work required
   * to clean up that that side effect.  This ensures that these
   * highly related functions are logically grouped in your code.
   *
   * @param sideEffect The side effect to eventually perform.  This
   * effect can return another function that when invoked will clean
   * up the original effect.  The returned function will automatically
   * be invoked when the side effect is destroyed.
   * @returns A `PedlarEffect` object containing:
   *   - The ID of this side effect that can be used to individually
   *    clean it up by calling the `destroy()` method
   *   - A `perform()` function that can be used to perform the side
   *     effect again, after automatically calling the destroyer
   */
  public create<D extends any[]>(sideEffect: PedlarSideEffect): PedlarEffect {
    return {
      pedlar: this,
      id: null,
      perform(currentDependencies?: D) {
        let neverRan = this.id === null

        if (neverRan) {
          this.id = generateId()
          this.dependencies = currentDependencies

          let destroyer = sideEffect()

          if (destroyer !== undefined && destroyer !== null) {
            validateDestroyer(destroyer as Function)
            this.pedlar.destroyers[this.id] = destroyer
          }
        } else {
          if (!dependenciesChanged(this.dependencies, currentDependencies)) {
            return
          }

          this.dependencies = currentDependencies
          let currentDestroyer = this.pedlar.destroyers[this.id]

          if (currentDestroyer) {
            currentDestroyer()
            let newDestroyer = sideEffect()
            this.pedlar.destroyers[this.id] = newDestroyer
          } else {
            // If the effect did not originally return a destroyer, it is not
            // allowed to return one on subsequent calls
            sideEffect()
          }
        }
      },
    } as PedlarEffect
  }

  /**
   * Perform a side effect and immediately specify the work required
   * to clean up that that side effect.  This ensures that these
   * highly related functions are logically grouped in your code.
   *
   * @param sideEffect The side effect to perform.  This effect can
   * return another function that when invoked will clean up the
   * original effect.  The returned function will automatically be
   * invoked when the side effect is destroyed.
   * @returns A `PedlarEffect` object containing:
   *   - The ID of this side effect that can be used to individually
   *    clean it up by calling the `destroy()` method
   *   - A `perform()` function that can be used to perform the side
   *     effect again, after automatically calling the destroyer
   */
  public perform<D extends any[]>(
    sideEffect: PedlarSideEffect,
    dependencies?: D,
  ): PedlarEffect {
    let effect = this.create(sideEffect)
    effect.perform(dependencies)
    return effect
  }

  /**
   * Clean up a particular side effect that has been `perform`ed.
   * @param id The id os fht side effect to clean up
   */
  public destroy(id: string) {
    let destroyer = this.destroyers[id]
    if (!destroyer) return

    destroyer()
    delete this.destroyers[id]
  }

  /**
   * Clean up all side effects that have been `perform`ed since
   * the last time this function was called.
   */
  public destroyAll() {
    Object.keys(this.destroyers).forEach(this.destroy, this)
  }

  /**
   * A shorthand for `perform()` that performs the specific
   * effect of adding an event listener to an element.  This
   * listener is then automatically removed when the side effect
   * is destroyed.
   *
   * This function is identical to `addCustomEvent()` except that
   * it is statically typed to only allow predefined HTML event types.
   *
   * @param el The Element to add this event to
   * @param eventType The type of event to add to the element
   * @param handler The handler that should be invoked when the event is emitted
   * @param options Event listener options
   */
  public addEvent(
    el: Element,
    eventType: keyof HTMLElementEventMap,
    handler: EventListener,
    options?: boolean | EventListenerOptions,
  ): PedlarEffect {
    return this.addCustomEvent.call(this, ...arguments)
  }

  /**
   * A shorthand for `perform()` that performs the specific
   * effect of adding an event listener to an element.  This
   * listener is then automatically removed when the side effect
   * is destroyed.
   *
   * @param el The Element to add this event to
   * @param eventType The type of event to add to the element
   * @param handler The handler that should be invoked when the event is emitted
   * @param options Event listener options
   */
  public addCustomEvent(
    el: Element,
    eventType: string,
    handler: EventListener,
    options?: boolean | EventListenerOptions,
  ): PedlarEffect {
    return this.perform(() => {
      el.addEventListener(eventType, handler, options)
      return () => el.removeEventListener(eventType, handler, options)
    })
  }
}

function validateDestroyer(destroyer: Function) {
  if (typeof destroyer === 'function') return
  throw new Error(
    'Effect must return undefined, null, or a function; found: ' +
      typeof destroyer,
  )
}

/**
 * @returns `true` if the arrays are different when the values are
 * compared index by index, using strict equality comparison.
 *
 * Objects are compared by reference, so two objects, even if they
 * have the same contents, are considered different.  Conversely,
 * if the same object has been mutated, no change will be detected.
 */
function dependenciesChanged<T extends any[]>(
  oldDependencies: T,
  newDependencies: T,
) {
  // If no dependencies are passed, we just run the side effect again
  if (!oldDependencies && !newDependencies) return true

  // If one of them is falsy but not the other
  if (!oldDependencies || !newDependencies) {
    throw new Error(
      'The same dependency array must always be passed to perform()',
    )
  }

  if (oldDependencies.length !== newDependencies.length) {
    throw new Error(
      'Dependency arrays must always be the same length for each effect',
    )
  }

  for (let i = 0; i < oldDependencies.length; ++i) {
    let oldValue = oldDependencies[i]
    let newValue = newDependencies[i]
    if (oldValue === newValue) continue
    return true
  }
  return false
}

export default Pedlar
