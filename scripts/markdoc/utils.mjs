
export function isObject (v) {
  return typeof v === 'object' && v !== null && (!Array.isArray(v))
}

export function merge (a, b) {
  const result = { ...a }

  Object.entries(b).forEach(([key, value]) => {
    if (!a[key]) {
      result[key] = value
    } else if (isObject(value)) {
      const target = isObject(a[key]) ? a[key] : {}
      result[key] = merge(target, value)
    } else if (Array.isArray(value)) {
      const target = Array.isArray(a[key]) ? a[key] : []
      result[key] = target.length > value.length
        ? target
        : value
    } else {
      result[key] = value
    }
  })

  return result
}

export function uniq (items) {
  const result = []
  const known = new Set()

  for (const item of items) {
    if (!known.has(item)) {
      known.add(item)
      result.push(item)
    }
  }

  return result
}
