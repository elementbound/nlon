import { merge, uniq } from "./utils.mjs";

const links = new Map()

export function createLinks (doclets) {
  links.clear()

  doclets.forEach(doclet => {
    const link = '#' + slug(doclet)

    if (!links.has(doclet.name) || doclet.scope == 'global') {
      links.set(doclet.name, link)
    }

    links.set(doclet.longname, link)
  })
}

export function tryLink (type) {
  return links.has(type)
    ? `<a href="${links.get(type)}">${type}</a>`
    : type
}

export function getLinks () {
  return [...links.entries()]
}

/**
* @param {Doclet} doclet
* @returns {string}
*/
export function slug (doclet) {
  return [doclet.scope, doclet.kind, doclet.longname]
    .filter(s => !!s)
    .join('-')
}

export function titleParams (doclet) {
  if (doclet.kind !== 'function') {
    return ''
  }

  const paramList = (doclet.params ?? [])
    .map(p => p.optional
      ? `[${p.name}]`
      : p.name
    ).join(', ')

  return `(${paramList})`
}

export function titleReturns (doclet) {
  return (doclet.returns?.length)
    ? (' ⇒ ' + doclet.returns.map(r => type(r.type)).join(', '))
    : '';
}

export function titleType (doclet) {
  if (doclet.kind === 'function' || doclet.kind === 'class') {
    return ''
  }

  if (!doclet.type) {
    return ''
  }

  return ` : <code>${type(doclet.type)}</code>`
}

export function titleAugments (doclet) {
  return doclet.augments?.length
    ? (' ⇐ ' + doclet.augments.map(tryLink).join(', '))
    : ''
}

export function title (doclet, indent) {
  return [
    '#'.repeat(indent ?? 2),
    doclet.async ? '`async` ' : '',
    doclet.longname,
    titleParams(doclet),
    titleReturns(doclet),
    titleType(doclet),
    titleAugments(doclet),
    `<a id="${slug(doclet)}"></a>`
  ]
    .filter(s => !!s)
    .join(' ')
}

export function contentsItem (doclet) {
  return [
    `<a href="#${slug(doclet)}">`,
    doclet.async ? '`async` ' : '',
    doclet.name,
    titleParams(doclet),
    '</a>',
    titleReturns(doclet),
    titleType(doclet),
    titleAugments(doclet)
  ]
    .filter(s => !!s)
    .join(' ')
}

export function contentsList (doclets, title, indent) {
  if (!doclets?.length) {
    return ''
  }

  title = title
    ? ('#'.repeat(indent ?? 2) + ' ' + title + '\n')
    : ''

  return [
    title,
    '<dl>',
    ...doclets.flatMap(d => [
      `<dt>${contentsItem(d)}</dt>`,
      `<dd>${summarise(d)}</dd>`
    ]),
    '</dl>',
    ''
  ].join('\n')
}

export function summarise (doclet) {
  return doclet.summary ?? ''
}

export function describe (doclet) {
  return doclet.classdesc ?? doclet.description ?? ''
}

/**
* @param {Doclet} doclet
* @returns {string}
*/
export function kind (doclet) {
  const kindString = [doclet.scope, doclet.kind]
    .filter(v => !!v)
    .join(' ')

  return kindString
    ? `**Kind:** ${kindString}`
    : ''
}

export function type (t) {
  return (t?.names ?? [])
    .map(t => tryLink(t))
    .join(', ')
}

export function prefixList (list, prefix, mapper) {
  if (!list?.length) {
    return ''
  }

  mapper ??= i => i

  if (list.length === 1) {
    return `${prefix} ${mapper(list[0])}`
  }

  return [
    prefix,
    ...list.map(mapper)
      .map(s => ' * ' + s)
  ].join('\n') + '\n'
}

export function see (doclet) {
  return prefixList(doclet.see, '**See:**', tryLink)
}

export function augments (doclet) {
  return prefixList(doclet.augments, '**Extends:**', tryLink)
}

export function fires (doclet) {
  return prefixList(doclet.fires, '**Fires:**', tryLink)
}

export function throws (doclet) {
  return prefixList(doclet.exceptions, '**Throws:**', e =>
    e.type?.names?.length
    ? `<code>${type(e.type)}</code> ${e.description}`
    : e.description
  )
}

export function examples (doclet) {
  if (!doclet.examples?.length) {
    return ''
  }

  return [
    '**Examples:**',
    doclet.examples.map(e => '```js\n' + e + '\n```')
  ].flat().join('\n\n')
}

export function footer (doclet) {
  return [
    kind(doclet),
    paramTable(doclet),
    returns(doclet),
    throws(doclet),
    augments(doclet),
    fires(doclet),
    see(doclet),
    examples(doclet)
  ]
    .filter(l => !!l)
    .join('\n\n') + '\n'
}

/**
* @param {Doclet} doclet
* @returns {string[]}
*/
export function returns (doclet) {
  return doclet.returns?.length
    ? type(doclet.returns)
    : undefined
}

/**
* @param {Doclet} doclet
* @returns {string}
*/
export function paramTable (doclet) {
  if (!doclet.params?.length) {
    return ''
  }

  return [
    '<table>',
    '<thead>',
    '<tr><th>Param</th><th>Type</th><th>Description</th></tr>',
    '</thead>',
    doclet.params.map(p =>
      `<tr><td>${p.name}</td>` +
        `<td>${type(p.type)}</td>` +
        `<td>${p.description ?? ''}</td></tr>`
    ),
    '</table>'
  ].flat().join('\n') + '\n'
}

/**
* @param {Doclet[]} doclets
* @returns {Doclet[]}
*/
export function extractByType (doclets, type) {
  const hits = doclets
    .filter(d => d.kind === type)
    .filter(d => !d.memberof)

  const names = uniq(hits.map(d => d.name))

  return names
    .map(name => hits.filter(d => d.name === name && d.kind === type))
    .map(da => da.reduce(merge, {}))
}

export function membersOf (target, doclets) {
  return doclets
    .filter(d => d.memberof === target.longname)
    .filter(d => !d.undocumented)
}

export function renderBody (doclet, indent) {
  return [
    title(doclet, indent),
    summarise(doclet),
    describe(doclet),
    footer(doclet)
  ].join('\n\n')
}

export function renderBodies (doclets, indent) {
  return doclets
    .map(doclet => renderBody(doclet, indent))
    .join('\n---\n')
}
