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
})

describe('destroy()', () => {
  it('cleans up a single side effect', () => {
    let cleanup = jest.fn()
    let id = pedlar.perform(() => cleanup)

    expect(cleanup).not.toHaveBeenCalled()
    pedlar.destroy(id)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('only cleans up the specified side effect, not others', () => {
    let cleanup = jest.fn()
    let cleanup2 = jest.fn()
    let cleanup3 = jest.fn()

    let id = pedlar.perform(() => cleanup)
    let id2 = pedlar.perform(() => cleanup2)
    let id3 = pedlar.perform(() => cleanup3)

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
    let id = pedlar.perform(() => cleanup)

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
    pedlar.addEvent((el as unknown) as Element, 'zach', handler)
    expect(el.addEventListener.mock.calls[0][0]).toEqual('zach')
    expect(el.addEventListener.mock.calls[0][1]).toEqual(handler)
  })

  it('does not invoke the event handler', () => {
    pedlar.addEvent((el as unknown) as Element, 'zach', handler)
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not immediately remove the event', () => {
    pedlar.addEvent((el as unknown) as Element, 'zach', handler)
    expect(el.removeEventListener).not.toHaveBeenCalled()
  })

  it('removes the event when effect is destroyed', () => {
    let id = pedlar.addEvent((el as unknown) as Element, 'zach', handler)
    pedlar.destroy(id)
    expect(el.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('properly passes options down', () => {
    let options = {zach: 'iscool'}
    pedlar.addEvent((el as unknown) as Element, 'zach', handler, options as any)
    expect(el.addEventListener.mock.calls[0][2]).toBe(options)
  })
})
