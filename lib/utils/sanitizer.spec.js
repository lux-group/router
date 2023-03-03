const { sanitizeObject } = require('./sanitizer')

describe('sanitizeObject function', () => {
  const event = {
    request: {
      cookies: {
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: 'password123'
      },
      data: {
        id: 1,
        name: 'Product',
        price: 9.99,
        travellers: [
          {
            name: 'John Doe',
            email: 'john.doe@test.com',
            title: null
          },
          {
            name: 'Jane Doe',
            email: 'jane.doe@test.com',
            title: null
          }
        ],
        user: {
          email: 'user@test.com'
        }
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123'
      }
    }
  }
  const sanitizeKeys = [/^password$/, 'Authorization', 'travellers', 'user.email']

  it('should sanitize keys in request.cookies', () => {
    sanitizeObject(event.request.cookies, sanitizeKeys)
    expect(event.request.cookies).toEqual({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: '********'
    })
  })

  it('should sanitize keys in request.data', () => {
    sanitizeObject(event.request.data, sanitizeKeys)
    expect(event.request.data).toEqual({
      id: 1,
      name: 'Product',
      price: 9.99,
      travellers: [
        {
          name: '********',
          email: '********',
          title: null
        },
        {
          name: '********',
          email: '********',
          title: null
        }
      ],
      user: {
        email: '********'
      }
    })
  })

  it('should sanitize keys in request.headers', () => {
    sanitizeObject(event.request.headers, sanitizeKeys)
    expect(event.request.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: '********'
    })
  })

  it('should do nothing if sanitizeKeys is empty', () => {
    sanitizeObject(event)
    expect(event.request).toEqual(event.request)

    sanitizeObject(event, [])
    expect(event.request).toEqual(event.request)
  })
})
