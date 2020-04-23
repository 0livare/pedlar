import {generateId} from './generateId'

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
   * @returns The ID of this side effect, that can be used to
   * individually clean it up by calling the `destroy() method.
   */
  public perform(effect: Function): string {
    let destroyer = effect()

    if (destroyer === undefined || destroyer === null) return
    if (typeof destroyer !== 'function') {
      throw new Error(
        'Effect must return undefined, null, or a function; found: ' +
          typeof destroyer,
      )
    }

    let key = generateId()
    this.destroyers[key] = destroyer
    return key
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
  public addEvent(
    el: Element,
    eventType: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): string {
    return this.perform(() => {
      el.addEventListener(eventType, handler, options)
      return () => el.removeEventListener(eventType, handler, options)
    })
  }
}
