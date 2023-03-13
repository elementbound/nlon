import * as fs from 'node:fs'
import { classBodies } from './class.mjs'
import { contentsList, extractByType, renderBodies } from './components.mjs'
import { functionBodies } from './function.mjs'

function main () {
  const raw = fs.readFileSync(process.stdin.fd, 'utf-8')

  /** @type {Doclet[]} */
  const doclets = JSON.parse(raw)
    .filter(d => d.access !== 'private')

  const classes = extractByType(doclets, 'class')
  const functions = extractByType(doclets, 'function')
  const typedefs = extractByType(doclets, 'typedef')
  const constants = extractByType(doclets, 'constant')
    .filter(doclet => !doclet.undocumented)

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
    '\n---\n',
    classBodies(classes, doclets),
    functionBodies(functions),
    renderBodies(typedefs),
    renderBodies(constants)
  ].flat()
    .filter(l => l !== undefined)

  result.forEach(l => console.log(l))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
