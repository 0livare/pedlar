import {Pedlar} from './pedlar'

let pedlar: Pedlar

beforeEach(() => {
  pedlar = new Pedlar()
})

describe('perform()', () => {
  it('immediately invokes the effect function', () => {
    let effect = jest.fn()
    pedlar.perform(effect)
    expect(effect).toBeCalledTimes(1)
  })

  it('throws an error if non-functions are returned', () => {
    expect(() => {
      pedlar.perform(() => false)
    }).toThrowError()

    expect(() => {
      pedlar.perform(() => 'zach')
    }).toThrowError()

    expect(() => {
      pedlar.perform(() => 4)
    }).toThrowError()

    expect(() => {
      pedlar.perform(() => null as any)
    }).not.toThrowError()

    expect(() => {
      pedlar.perform(() => undefined as any)
    }).not.toThrowError()
  })

  it('does not immediately invoke cleanup function', () => {
    let effect = jest.fn()
    let cleanup = jest.fn()

    pedlar.perform(() => {
      effect()
      return cleanup
    })

    expect(effect).toHaveBeenCalled()
    expect(cleanup).not.toHaveBeenCalled()
  })

  describe('.performAgain()', () => {
    it("doesn't run the effect again if the dependencies haven't changed", () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect, [1])
      expect(effect).toBeCalledTimes(1)

      result.performAgain([1])
      expect(effect).toBeCalledTimes(1)
    })

    it('runs the effect if the dependencies have changed', () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect, [1])
      expect(effect).toBeCalledTimes(1)

      result.performAgain([2])
      expect(effect).toBeCalledTimes(2)

      result.performAgain([3])
      expect(effect).toBeCalledTimes(3)
    })

    it('runs the effect if only one of multiple dependencies have changed', () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect, [1, 2, false])
      expect(effect).toBeCalledTimes(1)

      result.performAgain([3, 2, false])
      expect(effect).toBeCalledTimes(2)

      result.performAgain([3, 2, true])
      expect(effect).toBeCalledTimes(3)
    })

    it('runs the effect if multiple of multiple dependencies have changed', () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect, [1, 2, 3, 4, false])
      expect(effect).toBeCalledTimes(1)

      result.performAgain([4, 3, 2, 1, false])
      expect(effect).toBeCalledTimes(2)

      result.performAgain([4, 3, 2, 44, true])
      expect(effect).toBeCalledTimes(3)
    })

    it('runs the effect if the dependencies change back to original value', () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect, [1])
      expect(effect).toBeCalledTimes(1)

      result.performAgain([2])
      expect(effect).toBeCalledTimes(2)

      result.performAgain([1])
      expect(effect).toBeCalledTimes(3)
    })

    it('runs the effect if the dependencies have changed to a different type', () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect, [1, '2'])
      result.performAgain(['1', '2'])
      expect(effect).toBeCalledTimes(2)
    })

    it("doesn't run the effect again if dependency is the same object", () => {
      let effect = jest.fn()
      let o = {}
      let result = pedlar.perform(effect, [o])

      result.performAgain([o])
      expect(effect).toBeCalledTimes(1)
    })

    it('runs the effect again if dependency is a different object', () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect, [{}])
      expect(effect).toBeCalledTimes(1)

      result.performAgain([{}])
      expect(effect).toBeCalledTimes(2)
    })

    it('runs the effect again if dependency is a prototype linked object', () => {
      let effect = jest.fn()
      let one = Object.create(null)
      let result = pedlar.perform(effect, [one])
      expect(effect).toBeCalledTimes(1)

      let two = Object.create(one)
      result.performAgain([two])
      expect(effect).toBeCalledTimes(2)
    })

    it('runs the effect again if no dependencies are passed', () => {
      let effect = jest.fn()
      let result = pedlar.perform(effect)
      expect(effect).toBeCalledTimes(1)

      result.performAgain()
      expect(effect).toBeCalledTimes(2)

      result.performAgain()
      expect(effect).toBeCalledTimes(3)
    })

    it("doesn't run the destroyer if the dependencies have not changed", () => {
      let destroyer = jest.fn()
      let effect = jest.fn(() => destroyer)

      let result = pedlar.perform(effect, [1])
      expect(effect).toBeCalledTimes(1)
      expect(destroyer).not.toBeCalled()

      result.performAgain([1])
      expect(destroyer).not.toBeCalled()
    })

    it('runs the destroyer between executions', () => {
      let destroyer = jest.fn()
      let effect = jest.fn(() => destroyer)

      let result = pedlar.perform(effect, [1])
      expect(destroyer).not.toBeCalled()

      result.performAgain([2])
      expect(effect).toBeCalledTimes(2)
      expect(destroyer).toBeCalledTimes(1)

      result.performAgain([3])
      expect(effect).toBeCalledTimes(3)
      expect(destroyer).toBeCalledTimes(2)
    })

    it('allows no destroyer to be passed', () => {
      let effect = jest.fn(() => null)
      let result = pedlar.perform(effect, [1])

      result.performAgain([1])
      expect(effect).toBeCalledTimes(1)

      result.performAgain([2])
      expect(effect).toBeCalledTimes(2)
    })

    it('throws error if different length dependency arrays are passed', () => {
      let destroyer = jest.fn()
      let result = pedlar.perform(() => destroyer, [1])
      expect(() => result.performAgain([1, 2])).toThrowError()
    })

    it('throws error if dependency array is passed inconsistently', () => {
      let effect = () => null as string
      let result = pedlar.perform(effect)
      expect(() => result.performAgain([1])).toThrowError()

      result = pedlar.perform(effect, [1])
      expect(() => result.performAgain()).toThrowError()

      result = pedlar.perform(effect, [1])
      result.performAgain([2])
      expect(() => result.performAgain()).toThrowError()
    })

    it('does not throw error if destroy() has already been called', () => {
      let effect = () => null as string
      let result = pedlar.perform(effect)

      pedlar.destroy(result.id)
      expect(() => result.performAgain()).not.toThrowError()
    })

    it('does not throw error if destroyAll() has already been called', () => {
      let effect = () => null as string
      let result = pedlar.perform(effect)

      pedlar.destroyAll()
      expect(() => result.performAgain()).not.toThrowError()
    })
  })
})

describe('destroy()', () => {
  it('cleans up a single side effect', () => {
    let cleanup = jest.fn()
    let {id} = pedlar.perform(() => cleanup)

    expect(cleanup).not.toHaveBeenCalled()
    pedlar.destroy(id)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('only cleans up the specified side effect, not others', () => {
    let cleanup = jest.fn()
    let cleanup2 = jest.fn()
    let cleanup3 = jest.fn()

    let id = pedlar.perform(() => cleanup).id
    let id2 = pedlar.perform(() => cleanup2).id
    let id3 = pedlar.perform(() => cleanup3).id

    expect(cleanup).not.toHaveBeenCalled()
    pedlar.destroy(id)

    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(cleanup2).not.toHaveBeenCalled()
    expect(cleanup3).not.toHaveBeenCalled()
  })

  it('does not error if called with invalid id', () => {
    expect(() => {
      pedlar.destroy('zach')
    }).not.toThrowError()
  })

  it('allows perform() to be successfully called after deleting', () => {
    let cleanup = jest.fn()
    let {id} = pedlar.perform(() => cleanup)

    pedlar.destroy(id)
    expect(() => pedlar.perform(() => jest.fn())).not.toThrowError()
  })
})

describe('destroyAll()', () => {
  it('cleans up a single side effect', () => {
    let cleanup = jest.fn()
    pedlar.perform(() => cleanup)

    expect(cleanup).not.toHaveBeenCalled()
    pedlar.destroyAll()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('cleans up multiple side effects', () => {
    let cleanup1 = jest.fn()
    let cleanup2 = jest.fn()
    let cleanup3 = jest.fn()

    pedlar.perform(() => cleanup1)
    pedlar.perform(() => cleanup2)
    pedlar.perform(() => cleanup3)

    pedlar.destroyAll()

    expect(cleanup1).toHaveBeenCalledTimes(1)
    expect(cleanup2).toHaveBeenCalledTimes(1)
    expect(cleanup3).toHaveBeenCalledTimes(1)
  })

  it('does not error if called when no effects have been performed', () => {
    expect(() => {
      pedlar.destroyAll()
      pedlar.destroyAll()
      pedlar.destroyAll()
      pedlar.destroyAll()
    }).not.toThrowError()
  })
})

describe('addEvent()', () => {
  let handler: EventListenerOrEventListenerObject
  let el: {
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }

  beforeEach(() => {
    el = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    handler = jest.fn()
  })

  it('immediately adds the event', () => {
    pedlar.addEvent((el as unknown) as Element, 'click', handler)
    expect(el.addEventListener.mock.calls[0][0]).toEqual('click')
    expect(el.addEventListener.mock.calls[0][1]).toEqual(handler)
  })

  it('does not invoke the event handler', () => {
    pedlar.addEvent((el as unknown) as Element, 'click', handler)
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not immediately remove the event', () => {
    pedlar.addEvent((el as unknown) as Element, 'click', handler)
    expect(el.removeEventListener).not.toHaveBeenCalled()
  })

  it('removes the event when effect is destroyed', () => {
    let {id} = pedlar.addEvent((el as unknown) as Element, 'click', handler)
    pedlar.destroy(id)
    expect(el.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('properly passes options down', () => {
    let options = {zach: 'iscool'}
    pedlar.addEvent(
      (el as unknown) as Element,
      'click',
      handler,
      options as any,
    )
    expect(el.addEventListener.mock.calls[0][2]).toBe(options)
  })
})
