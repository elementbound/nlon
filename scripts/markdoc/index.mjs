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
    classBodies(classes, doclets),
    functionBodies(functions),
    renderBodies(typedefs)
  ].flat()
    .filter(l => l !== undefined)

  result.forEach(l => console.log(l))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
