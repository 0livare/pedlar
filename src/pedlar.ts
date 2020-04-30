import {generateId} from './generateId'

type PerformanceResult<D> = {
  id: string
  performAgain: (currentDependencies?: D) => void
  [key: string]: any
}

/**
 * A utility for logically grouping the performance and
 * destruction of side effects. Inspired by React's useEffect() hook.
 */
export class Pedlar {
  private destroyers: {[id: string]: Function} = {}

  /**
   * Perform a side effect and immediately specify the work required
   * to clean up that that side effect.  This ensures that these
   * highly related functions are logically grouped in your code.
   *
   * @param effect The side effect to perform.  This effect can
   * return another function that when invoked will clean up the
   * original effect.  The returned function will automatically be
   * invoked when the side effect is destroyed.
   * @returns An object containing:
   *   - The ID of this side effect that can be used to individually
   *    clean it up by calling the `destroy()` method
   *   - A `performAgain()` function that can be used to perform the side
   *     effect again, after automatically calling the destroyer
   */
  public perform<D extends any[]>(
    effect: Function,
    dependencies?: D,
  ): PerformanceResult<D> {
    let destroyer = effect()
    let id = generateId()

    if (destroyer !== undefined && destroyer !== null) {
      validateDestroyer(destroyer)
      this.destroyers[id] = destroyer
    }

    return {
      pedlar: this,
      id,
      dependencies,
      performAgain(currentDependencies?: D) {
        let hasChanged = compare(this.dependencies, currentDependencies)
        if (!hasChanged) return

        this.dependencies = currentDependencies
        let currentDestroyer = this.pedlar.destroyers[id]

        if (currentDestroyer) {
          currentDestroyer()
          let newDestroyer = effect()
          this.pedlar.destroyers[id] = newDestroyer
        } else {
          // If the effect did not originally return a destroyer, it is not
          // possible for it to return one on subsequent calls
          effect()
        }
      },
    }
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
   * @param el The Element to add this event to
   * @param eventType The type of event to add to the element
   * @param handler The handler that should be invoked when the event is emitted
   * @param options Event listener options
   */
  public addEvent<K extends keyof HTMLElementEventMap, D extends any[]>(
    el: Element,
    eventType: K,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): PerformanceResult<D> {
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

function compare<T extends any[]>(oldValues: T, newValues: T) {
  if (!oldValues && !newValues) return true

  // If one of them is falsy but not the other
  if (!oldValues || !newValues) {
    throw new Error(
      'The same dependency array must always be passed to perform() and performAgain()',
    )
  }

  if (oldValues.length !== newValues.length) {
    throw new Error(
      'Dependency arrays must always be the same length for each effect',
    )
  }

  for (let i = 0; i < oldValues.length; ++i) {
    let oldValue = oldValues[i]
    let newValue = newValues[i]
    if (oldValue === newValue) continue
    return true
  }
  return false
}

export default Pedlar
