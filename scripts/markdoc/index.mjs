import * as fs from 'node:fs'
import { classBodies } from './class.mjs'
import { contentsList, createLinks, extractByType, getLinks, renderBodies } from './components.mjs'
import { functionBodies } from './function.mjs'

function main () {
  const raw = fs.readFileSync(process.stdin.fd, 'utf-8')

  /** @type {Doclet[]} */
  const doclets = JSON.parse(raw)
    .filter(d => d.access !== 'private')
    .filter(d => d.scope !== 'inner')

  const classes = extractByType(doclets, 'class')
  const functions = extractByType(doclets, 'function')
  const typedefs = extractByType(doclets, 'typedef')
  const constants = extractByType(doclets, 'constant')
    .filter(doclet => !doclet.undocumented)
  const externals = extractByType(doclets, 'external')

  externals
    .forEach(e => {
      e.name = e.name.replace(/"([^"]+)"/g, (_, c) => c)
    })

  createLinks([
    ...doclets,
    ...externals
  ])

  const frontMatter = [
    '---',
    'title: Documentation',
    'layout: home',
    '---'
  ]

  const result = [
    ...frontMatter,
    contentsList(classes, 'Classes'),
    contentsList(functions, 'Functions'),
    contentsList(typedefs, 'Typedefs'),
    contentsList(constants, 'Constants'),
    contentsList(externals, 'External'),
    '\n---\n',
    classBodies(classes, doclets),
    functionBodies(functions),
    renderBodies(typedefs),
    renderBodies(constants),
    renderBodies(externals),
    '\n---\n',
    '```',
    getLinks().map(([a, b]) => `${a} => ${b}`),
    '```'
  ].flat()
    .filter(l => l !== undefined)

  result.forEach(l => console.log(l))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
