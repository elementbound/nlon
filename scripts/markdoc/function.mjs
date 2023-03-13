import { contentsItem, describe, footer, summarise, title } from "./components.mjs";

/**
* @param {Doclet[]} doclets
* @returns {string[]}
*/
export function functionList (doclets) {
  return [
    '## Functions',
    '',
    '<dl>',
    ...doclets.flatMap(d => [
      `<dt>${contentsItem(d)}</dt>`,
      `<dd>${summarise(d)}</dd>`
    ]),
    '</dl>',
    ''
  ]
}

export function functionBody (doclet, indent) {
  return [
    title(doclet, indent),
    summarise(doclet),
    describe(doclet),
    footer(doclet)
  ].join('\n\n')
}

export function functionBodies (doclets, indent) {
  return doclets.map(d => functionBody(d, indent))
    .join('\n---\n')
}
