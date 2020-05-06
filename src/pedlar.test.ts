import {Pedlar} from './pedlar'

let pedlar: Pedlar
let destroyer = jest.fn()
let sideEffect = jest.fn(() => destroyer)

beforeEach(() => {
  pedlar = new Pedlar()
  destroyer.mockClear()
  sideEffect.mockClear()
})

describe('create()', () => {
  it('does not immediately invoke the side effect function', () => {
    pedlar.create(sideEffect)
    expect(sideEffect).not.toHaveBeenCalled()
  })

  it('does not immediately invoke the destroyer', () => {
    pedlar.create(sideEffect)
    expect(destroyer).not.toHaveBeenCalled()
  })

  describe('PedlarEffect.perform()', () => {
    it('can be performed for the first time', () => {
      let pedlarEffect = pedlar.create(sideEffect)
      pedlarEffect.perform()
      expect(sideEffect).toBeCalledTimes(1)
    })

    it('runs the effect when dependencies are passed for the first time', () => {
      let pedlarEffect = pedlar.create(sideEffect)
      pedlarEffect.perform([1])
      expect(sideEffect).toBeCalledTimes(1)
    })

    it("doesn't run the effect again if the dependencies haven't changed", () => {
      let pedlarEffect = pedlar.create(sideEffect)
      pedlarEffect.perform([1])
      pedlarEffect.perform([1])
      expect(sideEffect).toBeCalledTimes(1)
    })

    it('runs the effect if the dependencies have changed', () => {
      let pedlarEffect = pedlar.create(sideEffect)
      pedlarEffect.perform([1])
      pedlarEffect.perform([2])
      expect(sideEffect).toBeCalledTimes(2)
    })

    it('can be run without dependencies', () => {
      let pedlarEffect = pedlar.create(sideEffect)
      pedlarEffect.perform()
      pedlarEffect.perform()
      pedlarEffect.perform()
    })

    it('throws error if dependency array is passed inconsistently', () => {
      let pedlarEffect = pedlar.create(sideEffect)

      pedlarEffect.perform()
      expect(() => pedlarEffect.perform([1])).toThrowError()

      pedlarEffect = pedlar.create(sideEffect)
      pedlarEffect.perform([1])
      expect(() => pedlarEffect.perform()).toThrowError()

      pedlarEffect = pedlar.create(sideEffect)
      pedlarEffect.perform([1])
      expect(() => pedlarEffect.perform([1, 2])).toThrowError()
    })
  })
})

describe('perform()', () => {
  it('can be run without dependencies', () => {
    pedlar.perform(sideEffect)
  })

  it('can be run with dependencies', () => {
    pedlar.perform(sideEffect, [1, 2, 3])
  })

  it('immediately invokes the side effect function', () => {
    pedlar.perform(sideEffect)
    expect(sideEffect).toBeCalledTimes(1)
  })

  it('does not immediately invoke the destroyer', () => {
    pedlar.perform(sideEffect)
    expect(destroyer).not.toHaveBeenCalled()
  })

  it('throws an error if non-functions are returned from side effect', () => {
    expect(() => {
      pedlar.perform(() => false as any)
    }).toThrowError()

    expect(() => {
      pedlar.perform(() => 'zach' as any)
    }).toThrowError()

    expect(() => {
      pedlar.perform(() => 4 as any)
    }).toThrowError()

    expect(() => {
      pedlar.perform(() => null as any)
    }).not.toThrowError()

    expect(() => {
      pedlar.perform(() => undefined as any)
    }).not.toThrowError()
  })

  describe('PedlarEffect.perform()', () => {
    it('can be run without dependencies', () => {
      let pedlarEffect = pedlar.perform(sideEffect)
      pedlarEffect.perform()
      pedlarEffect.perform()
      pedlarEffect.perform()
    })

    it("doesn't run the effect again if the dependencies haven't changed", () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1])
      pedlarEffect.perform([1])
      expect(sideEffect).toBeCalledTimes(1)
    })

    it('runs the effect if a single dependency has changed', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1])

      pedlarEffect.perform([2])
      expect(sideEffect).toBeCalledTimes(2)

      pedlarEffect.perform([3])
      expect(sideEffect).toBeCalledTimes(3)
    })

    it('runs the effect if only one of multiple dependencies have changed', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1, 2, false])
      expect(sideEffect).toBeCalledTimes(1)

      pedlarEffect.perform([3, 2, false])
      expect(sideEffect).toBeCalledTimes(2)

      pedlarEffect.perform([3, 2, true])
      expect(sideEffect).toBeCalledTimes(3)
    })

    it('runs the effect if multiple of multiple dependencies have changed', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1, 2, 3, 4, false])
      expect(sideEffect).toBeCalledTimes(1)

      pedlarEffect.perform([4, 3, 2, 1, false])
      expect(sideEffect).toBeCalledTimes(2)

      pedlarEffect.perform([4, 3, 2, 44, true])
      expect(sideEffect).toBeCalledTimes(3)
    })

    it('runs the effect if the dependencies change back to original value', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1])
      expect(sideEffect).toBeCalledTimes(1)

      pedlarEffect.perform([2])
      expect(sideEffect).toBeCalledTimes(2)

      pedlarEffect.perform([1])
      expect(sideEffect).toBeCalledTimes(3)
    })

    it('runs the effect if the dependencies change to a different type', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1, '2'])
      pedlarEffect.perform(['1', '2'])
      expect(sideEffect).toBeCalledTimes(2)
    })

    it("doesn't run the effect again if dependency is the same object", () => {
      let o = {foo: 'bar'}
      let pedlarEffect = pedlar.perform(sideEffect, [o])

      pedlarEffect.perform([o])
      expect(sideEffect).toBeCalledTimes(1)
    })

    it('runs the effect again if dependency is a different object with the same keys', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [{foo: 'bar'}])
      expect(sideEffect).toBeCalledTimes(1)

      pedlarEffect.perform([{foo: 'bar'}])
      expect(sideEffect).toBeCalledTimes(2)
    })

    it('runs the effect again if dependency is a prototype linked object', () => {
      let one = Object.create(null)
      let pedlarEffect = pedlar.perform(sideEffect, [one])
      expect(sideEffect).toBeCalledTimes(1)

      let two = Object.create(one)
      pedlarEffect.perform([two])
      expect(sideEffect).toBeCalledTimes(2)
    })

    it('runs the effect again if no dependencies are passed', () => {
      let pedlarEffect = pedlar.perform(sideEffect)
      expect(sideEffect).toBeCalledTimes(1)

      pedlarEffect.perform()
      expect(sideEffect).toBeCalledTimes(2)

      pedlarEffect.perform()
      expect(sideEffect).toBeCalledTimes(3)
    })

    it("doesn't run the destroyer if the dependencies have not changed", () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1])
      expect(sideEffect).toBeCalledTimes(1)
      expect(destroyer).not.toBeCalled()

      pedlarEffect.perform([1])
      expect(destroyer).not.toBeCalled()
    })

    it('runs the destroyer between executions', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1])
      expect(destroyer).not.toBeCalled()

      pedlarEffect.perform([2])
      expect(sideEffect).toBeCalledTimes(2)
      expect(destroyer).toBeCalledTimes(1)

      pedlarEffect.perform([3])
      expect(sideEffect).toBeCalledTimes(3)
      expect(destroyer).toBeCalledTimes(2)
    })

    it('runs the destroyer before re-running the side effect', () => {
      let destroyerLastRan
      let sideEffectLastRan

      let destroyer = jest.fn(() => {
        destroyerLastRan = Date.now()

        // Waste a few ticks here so that the time stamps
        // will be different for when the destroyer and
        // side effect ran
        for (let i = 0; i < 1000000; ++i);
      })

      let sideEffect = jest.fn(() => {
        sideEffectLastRan = Date.now()
        return destroyer
      })

      let pedlarEffect = pedlar.perform(sideEffect)
      pedlarEffect.perform()

      expect(destroyerLastRan).toBeLessThan(sideEffectLastRan)
    })

    it('allows no destroyer to be passed', () => {
      let sideEffect = jest.fn(() => null)
      let pedlarEffect = pedlar.perform(sideEffect, [1])

      pedlarEffect.perform([1])
      expect(sideEffect).toBeCalledTimes(1)

      pedlarEffect.perform([2])
      expect(sideEffect).toBeCalledTimes(2)
    })

    it('throws error if different length dependency arrays are passed', () => {
      let pedlarEffect = pedlar.perform(sideEffect, [1])
      expect(() => pedlarEffect.perform([1, 2])).toThrowError()
    })

    it('throws error if dependency array is passed inconsistently', () => {
      let pedlarEffect = pedlar.perform(sideEffect)
      expect(() => pedlarEffect.perform([1])).toThrowError()

      pedlarEffect = pedlar.perform(sideEffect, [1])
      expect(() => pedlarEffect.perform()).toThrowError()

      pedlarEffect = pedlar.perform(sideEffect, [1])
      pedlarEffect.perform([2])
      expect(() => pedlarEffect.perform([1, 2])).toThrowError()
    })

    it('does not throw error if destroy() has already been called', () => {
      let pedlarEffect = pedlar.create(sideEffect)
      pedlar.destroy(pedlarEffect.id)
      expect(() => pedlarEffect.perform()).not.toThrowError()
    })

    it('does not throw error if destroyAll() has already been called', () => {
      let pedlarEffect = pedlar.create(sideEffect)
      pedlar.destroyAll()
      expect(() => pedlarEffect.perform()).not.toThrowError()
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

  it('allows create() to be successfully called after deleting', () => {
    let cleanup = jest.fn()
    let {id} = pedlar.create(() => cleanup)

    pedlar.destroy(id)
    expect(() => pedlar.create(() => jest.fn())).not.toThrowError()
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

  it('does not error if called when no effects have been createed', () => {
    expect(() => {
      pedlar.destroyAll()
      pedlar.destroyAll()
      pedlar.destroyAll()
      pedlar.destroyAll()
    }).not.toThrowError()
  })
})

describe('addEvent()', () => {
  let handler: EventListener
  let mockEl: {
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let element: Element

  beforeEach(() => {
    mockEl = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    element = (mockEl as unknown) as Element

    handler = jest.fn()
  })

  it('immediately adds the event', () => {
    pedlar.addEvent(element, 'click', handler)
    expect(mockEl.addEventListener.mock.calls[0][0]).toEqual('click')
    expect(mockEl.addEventListener.mock.calls[0][1]).toEqual(handler)
  })

  it('does not invoke the event handler', () => {
    pedlar.addEvent(element, 'click', handler)
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not immediately remove the event', () => {
    pedlar.addEvent(element, 'click', handler)
    expect(mockEl.removeEventListener).not.toHaveBeenCalled()
  })

  it('removes the event when effect is destroyed', () => {
    let {id} = pedlar.addEvent(element, 'click', handler)
    pedlar.destroy(id)
    expect(mockEl.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('properly passes options down', () => {
    let options = {zach: 'iscool'}
    pedlar.addEvent(element, 'click', handler, options as any)
    expect(mockEl.addEventListener.mock.calls[0][2]).toBe(options)
  })
})

describe('addCustomEvent()', () => {
  let handler: EventListener
  let mockEl: {
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let element: Element

  beforeEach(() => {
    mockEl = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    element = (mockEl as unknown) as Element

    handler = jest.fn()
  })

  it('immediately adds the event', () => {
    pedlar.addCustomEvent(element, 'click', handler)
    expect(mockEl.addEventListener.mock.calls[0][0]).toEqual('click')
    expect(mockEl.addEventListener.mock.calls[0][1]).toEqual(handler)
  })

  it('does not invoke the event handler', () => {
    pedlar.addCustomEvent(element, 'click', handler)
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not immediately remove the event', () => {
    pedlar.addCustomEvent(element, 'click', handler)
    expect(mockEl.removeEventListener).not.toHaveBeenCalled()
  })

  it('removes the event when effect is destroyed', () => {
    let {id} = pedlar.addCustomEvent(element, 'click', handler)
    pedlar.destroy(id)
    expect(mockEl.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('properly passes options down', () => {
    let options = {zach: 'iscool'}
    pedlar.addCustomEvent(element, 'click', handler, options as any)
    expect(mockEl.addEventListener.mock.calls[0][2]).toBe(options)
  })
})
