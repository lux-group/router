'use strict'

function sanitizeObject (obj, sanitizeKeyOrPaths) {
  if (!obj || !sanitizeKeyOrPaths || sanitizeKeyOrPaths.length === 0) {
    return obj
  }

  if (typeof obj === 'object') {
    const sanitizePaths = sanitizeKeyOrPaths.filter((key) => isPath(key))
    sanitizePath(obj, sanitizePaths)

    const sanitizeKeys = sanitizeKeyOrPaths.filter((key) => !isPath(key))
    Object.keys(obj).forEach((key) => {
      if (matchKeys(key, sanitizeKeys)) {
        obj[key] = maskValue(obj[key])
      } else {
        sanitizeObject(obj[key], sanitizeKeys)
      }
    })
  }
  return obj
}

function isPath (key) {
  return typeof key === 'string' && key.indexOf('.') !== -1
}

function sanitizePath (obj, paths) {
  paths.forEach((path) => {
    const pathParts = path.split('.')
    if (hasPath(obj, pathParts)) {
      maskPath(obj, pathParts)
    }
  })
}

function hasPath (obj, pathParts) {
  let current = obj
  for (let i = 0; i < pathParts.length; i++) {
    if (!current[pathParts[i]]) {
      return false
    }
    current = current[pathParts[i]]
  }
  return true
}

function maskPath (obj, pathParts) {
  let current = obj
  for (let i = 0; i < pathParts.length; i++) {
    if (i === pathParts.length - 1) {
      current[pathParts[i]] = maskValue(current[pathParts[i]])
    } else {
      current = current[pathParts[i]]
    }
  }
}

function matchKeys (key, sanitizeKeys) {
  return sanitizeKeys.some((sanitizeKey) => {
    if (typeof sanitizeKey === 'string') {
      return sanitizeKey === key
    } else if (sanitizeKey instanceof RegExp) {
      return sanitizeKey.test(key)
    }
  })
}

function maskValue (value) {
  if (!value) {
    return value
  }

  if (typeof value === 'string') {
    return '********'
  }
  if (Array.isArray(value)) {
    return maskArray(value)
  }
  if (typeof value === 'object') {
    maskObject(value)
  }
  return value
}

function maskArray (obj) {
  return obj.map((item) => {
    return maskValue(item)
  })
}

function maskObject (obj) {
  Object.keys(obj).forEach((key) => {
    obj[key] = maskValue(obj[key])
  })
}

module.exports = {
  sanitizeObject: sanitizeObject
}
