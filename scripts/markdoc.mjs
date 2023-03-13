import * as fs from 'node:fs'

/**
* @typedef {object} Doclet
* @property {string} comment
* @property {object} meta
* @property {string} meta.filename
* @property {number} meta.lineno
* @property {number} meta.columnno
* @property {string} meta.path
* @property {object} meta.code
* @property {string} meta.code.id
* @property {string} meta.code.name
* @property {string} meta.code.type
* @property {string} meta.code.value
* @property {string[]} meta.code.paramnames
* @property {number[]} meta.range
* @property {object} meta.vars
* @property {null} meta.vars.
* @property {string} meta.vars.result
* @property {string} meta.vars.error
* @property {string} description
* @property {string} kind
* @property {string} name
* @property {object} type
* @property {string[]} type.names
* @property {string} memberof
* @property {string} longname
* @property {string} scope
* @property {boolean} undocumented
* @property {object[]} params
* @property {object} params.type
* @property {string[]} params.type.names
* @property {boolean} params.optional
* @property {string} params.description
* @property {string} params.name
* @property {string} summary
* @property {string[]} examples
* @property {string} classdesc
* @property {string} access
* @property {string[]} fires
* @property {object[]} returns
* @property {object} returns.type
* @property {string[]} returns.type.names
* @property {string} returns.description
* @property {object[]} exceptions
* @property {string} exceptions.description
* @property {boolean} async
* @property {boolean} generator
* @property {string[]} augments
* @property {string} overrides
* @property {object[]} properties
* @property {object} properties.type
* @property {string[]} properties.type.names
* @property {boolean} properties.optional
* @property {string} properties.defaultvalue
* @property {string} properties.description
* @property {string} properties.name
* @property {boolean} nullable
* @property {boolean} readonly
* @property {boolean} isEnum
* @property {string[]} see
* @property {string[]} files
* @property {string} inherits
* @property {boolean} inherited
*/

function isObject (v) {
  return typeof v === 'object' && v !== null && (!Array.isArray(v))
}

function merge (a, b) {
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

function uniq (array) {
  const result = []
  const known = new Set()

  for (const item of array) {
    if (!known.has(item)) {
      result.push(item)
      known.add(item)
    }
  }

  return result
}

/**
* @param {Doclet} doclet
* @returns {string}
*/
function slug (doclet) {
  return [doclet.scope, doclet.kind, doclet.longname]
    .filter(s => !!s)
    .join('-')
}

/**
* @param {Doclet[]} doclets
* @returns {Doclet[]}
*/
function extractClasses (doclets) {
  const classes = doclets
    .filter(d => d.kind === 'class')
    .filter(d => !d.memberof)

  const names = uniq(classes.map(d => d.name))

  return names
    .map(name => classes.filter(d => d.name === name))
    .map(da => da.reduce(merge, {}))
}

/**
* @param {Doclet[]} doclets
* @returns {Doclet[]}
*/
function extractFunctions (doclets) {
  const functions = doclets
    .filter(d => d.kind === 'function')
    .filter(d => !d.memberof)

  const names = uniq(functions.map(d => d.name))

  return names
    .map(name => functions.filter(d => d.name === name))
    .map(da => da.reduce(merge, {}))
}

/**
* @param {Doclet[]} doclets
* @returns {Doclet[]}
*/
function extractTypedefs (doclets) {
  const typedefs = doclets
    .filter(d => d.kind === 'typedef')
    .filter(d => !d.memberof)

  const names = uniq(typedefs.map(d => d.name))

  return names
    .map(name => typedefs.filter(d => d.name === name))
    .map(da => da.reduce(merge, {}))
}

/**
* @param {Doclet} doclet
* @returns string
*/
function classSignature (doclet) {
  const slg = slug(doclet)
  const name = doclet.name
  const augments = doclet.augments?.length
    ? (' ⇐ ' + doclet.augments.join(', '))
    : ''

  return `<a href=#${slg}>${name}</a>${augments}`
}

/**
* @param {Doclet} doclet
* @returns string
*/
function classTitle (doclet) {
  const name = doclet.name
  const augments = doclet.augments?.length
    ? (' ⇐ ' + doclet.augments.join(', '))
    : ''

  return `${name}${augments}`
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function classList (doclets) {
  return [
    '## Classes',
    '',
    '<dl>',
    ...doclets.flatMap(d => [
      `<dt><a href="#${slug(d)}">${classSignature(d)}</a></dt>`,
      `<dd>${d.classdesc ?? d.summary ?? ''}</dd>`
    ]),
    '</dl>',
    ''
  ]
}

/**
* @param {Doclet} doclet
* @returns string
*/
function functionSignature (doclet) {
  const slg = slug(doclet)
  const name = doclet.longname
  const params = '(' + (doclet.params ?? [])
    .map(p => p.optional
      ? `[${p.name}]`
      : p.name
    ).join(', ') +
    ')'
  const returns = (doclet.returns?.length)
    ? (' ⇒ ' + doclet.returns.map(r => r.type.names[0]).join(', '))
    : '';

  return `<a href="#${slg}">${name}${params}</a>${returns}`
}

/**
* @param {Doclet} doclet
* @returns string
*/
function functionTitle (doclet) {
  const name = doclet.longname
  const params = '(' + (doclet.params ?? [])
    .map(p => p.optional
      ? `[${p.name}]`
      : p.name
    ).join(', ') +
    ')'
  const returns = (doclet.returns?.length)
    ? (' ⇒ ' + doclet.returns.map(r => r.type.names[0]).join(', '))
    : '';

  return `${name}${params}${returns}`
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function functionList (doclets) {
  return [
    '## Functions',
    '',
    '<dl>',
    ...doclets.flatMap(d => [
      `<dt>${functionSignature(d)}</dt>`,
      `<dd>${d.summary ?? d.description ?? ''}</dd>`
    ]),
    '</dl>',
    ''
  ]
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function typedefList (doclets) {
  return [
    '## Typedefs',
    '',
    '<dl>',
    ...doclets.flatMap(d => [
      `<dt><a href="#${slug(d)}">${d.longname}</a> : ` +
        `<code>${d.type.names.join(', ')}</code></dt>`,
      `<dd>${d.summary ?? ''}</dd>`
    ]),
    '</dl>',
    ''
  ]
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function memberBodies (doclets) {
  return doclets.flatMap(doclet => {
    return [
      `### ${doclet.name} <a id="${slug(doclet)}"></a>`,
      '',
      doclet.summary && `${doclet.summary}\n`,
      doclet.description && `${doclet.description}\n`,
      `**Kind**: ${kind(doclet)}\n`,
      `**Type**: \`${doclet.type?.names?.join(', ') ?? ''}\`\n`,
      ...see(doclet)
    ]
  })
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function eventBodies (doclets) {
  return doclets.flatMap(doclet => [
    `### ${doclet.name} : \`event\` <a id="${slug(doclet)}"></a>`,
    '',
    doclet.summary && `${doclet.summary}\n`,
    doclet.description && `${doclet.description}\n`,
    `**Kind**: ${kind(doclet)}\n`,
    `**Type**: \`${doclet.type?.names?.join(', ') ?? ''}\`\n`,
    ...see(doclet)
  ])
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function classBodies (doclets, allDoclets) {
  return doclets.flatMap(doclet => {
    const members = membersOf(doclet, allDoclets)

    return [
      `## ${classTitle(doclet)} <a id="${slug(doclet)}"></a>`,
      '',
      doclet.classdesc && `${doclet.classdesc}\n`,
      doclet.description && `${doclet.description}\n`,
      `**Kind**: ${kind(doclet)}`,
      '',
      ...augments(doclet),
      ...see(doclet),
      ...functionBodies(members.filter(m => m.kind === 'function'))
        .map(l => l?.startsWith('#') ? ('#' + l) : l),
      ...memberBodies(members.filter(m => m.kind === 'member')),
      ...eventBodies(members.filter(m => m.kind === 'event'))
    ]
  })
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function functionBodies (doclets) {
  return doclets.flatMap(doclet => [
    `## ${functionTitle(doclet)} <a id="${slug(doclet)}"></a>`,
    '',
    doclet.summary && `${doclet.summary}\n`,
    doclet.description && `${doclet.description}\n`,
    `**Kind**: ${kind(doclet)}\n`,
    returns(doclet) ? '**Returns:** ' + returns(doclet) : undefined,
    '',
    ...paramTable(doclet),
    ...throws(doclet),
    ...fires(doclet),
    ...see(doclet)
  ])
}

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
function typedefBodies (doclets) {
  return doclets.flatMap(doclet => [
    `## ${doclet.longname} : \`${doclet.type.names.join(', ')}\`` +
      `<a id="${slug(doclet)}"></a>`,
    '',
    doclet.summary && `${doclet.summary}\n`,
    doclet.description && `${doclet.description}\n`,
    `**Kind**: ${kind(doclet)}`,
    '',
    ...paramTable(doclet),
    ...see(doclet)
  ])
}

/**
* @param {Doclet} doclet
* @returns {string}
*/
function kind (doclet) {
  return [doclet.scope, doclet.kind]
    .filter(v => !!v)
    .join(' ')
}

/**
* @param {Doclet} doclet
* @returns {string[]}
*/
function paramTable (doclet) {
  if (!doclet.params?.length) {
    return []
  }

  return [
    '<table>',
    '<thead>',
    '<tr><th>Param</th><th>Type</th><th>Description</th></tr>',
    '</thead>',
    doclet.params.map(p =>
      `<tr><td>${p.name}</td>` +
        `<td>${p.type.names.join(', ')}</td>` +
        `<td>${p.description ?? ''}</td></tr>`
    ),
    '</table>',
    ''
  ].flat()
}

/**
* @param {Doclet} doclet
* @returns {string[]}
*/
function see (doclet) {
  if (!doclet.see?.length) {
    return []
  }

  if (doclet.see.length === 1) {
    return [`**See:** ${doclet.see[0]}`, '']
  }

  return [
    '**See**:',
    doclet.see.map(s => ` * ${s}`),
    ''
  ].flat()
}

/**
* @param {Doclet} doclet
* @returns {string[]}
*/
function augments (doclet) {
  if (!doclet.augments?.length) {
    return []
  }

  if (doclet.augments.length === 1) {
    return [`**Extends:** ${doclet.augments[0]}`, '']
  }

  return [
    `**Extends:**`,
    doclet.augments.map(a => ` * ${a}`),
    ''
  ].flat()
}

/**
* @param {Doclet} doclet
* @returns {string[]}
*/
function fires (doclet) {
  if (!doclet.fires?.length) {
    return []
  }

  if (doclet.fires.length === 1) {
    return [`**Fires:** ${doclet.fires[0]}`, '']
  }

  return [
    `**Fires:**`,
    doclet.fires.map(a => ` * ${a}`),
    ''
  ].flat()
}

/**
* @param {Doclet} doclet
* @returns {string[]}
*/
function throws (doclet) {
  if (!doclet.exceptions?.length) {
    return []
  }

  return [
    '**Throws:**\n',
    doclet.exceptions
      .map(e => e.type?.names?.length
        ? `\`${e.type.names.join(', ')}\` ${e.description}`
        : e.description)
      .map(e => ` * ${e}`),
    ''
  ].flat()
}

/**
* @param {Doclet} doclet
* @returns {string[]}
*/
function returns (doclet) {
  return doclet.returns?.length
    ? doclet.returns.flatMap(r => r.type.names).join(', ')
    : undefined
}

function membersOf (target, doclets) {
  return doclets
    .filter(d => d.memberof === target.longname)
    .filter(d => !d.undocumented)
}

function main () {
  const raw = fs.readFileSync(process.stdin.fd, 'utf-8')

  /** @type {Doclet[]} */
  const doclets = JSON.parse(raw)
    .filter(d => d.access !== 'private')

  const classes = extractClasses(doclets)
  const functions = extractFunctions(doclets)
  const typedefs = extractTypedefs(doclets)

  const frontMatter = [
    '---',
    'title: Documentation',
    'layout: home',
    '---'
  ]

  const result = [
    ...frontMatter,
    classList(classes),
    functionList(functions),
    typedefList(typedefs),
    classBodies(classes, doclets),
    functionBodies(functions),
    typedefBodies(typedefs)
  ].flat()
    .filter(l => l !== undefined)

  result.forEach(l => console.log(l))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
