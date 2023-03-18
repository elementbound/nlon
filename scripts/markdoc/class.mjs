import { describe, examples, fieldsTable, fires, footer, membersOf, renderBody, see, summarise, throws, title } from "./components.mjs"
import { functionBody } from "./function.mjs"

export function extractClasses (doclets) {
  const hits = doclets
    .filter(d => d.kind === 'class')
    .filter(d => d.comment)
    .filter(d => !d.memberof)
    .filter(d => !d.params)

  return hits
}

export function constructorBody (doclet) {
  return [
    title(doclet, 3),
    summarise(doclet),
    describe(doclet),
    fieldsTable(doclet.params, 'Param'),
    throws(doclet),
    fires(doclet),
    see(doclet),
    examples(doclet)
  ].join('\n\n')
}

export function classBody (doclet, allDoclets) {
  const allMembers = membersOf(doclet, allDoclets)

  const constructors = allDoclets
    .filter(d => d.kind === 'class')
    .filter(d => d.memberof === doclet.longname)
    .filter(d => d.scope === 'instance')
  const memberFunctions = allMembers.filter(m => m.kind === 'function')
  const members = allMembers.filter(m => m.kind === 'member')
  const events = allMembers.filter(m => m.kind === 'event')

  return [
    title(doclet),
    '',
    summarise(doclet),
    describe(doclet),
    '',
    footer(doclet),
    '',
    constructors.map(c => constructorBody(c)).join('\n'),
    '',
    memberFunctions.map(f => functionBody(f, 3)).join('\n'),
    members.map(m => renderBody(m, 3)).join('\n'),
    events.map(m => renderBody(m, 3)).join('\n')
  ].join('\n')
}

export function classBodies (doclets, allDoclets) {
  return doclets
    .map(doclet => classBody(doclet, allDoclets))
    .join('\n---\n')
}
