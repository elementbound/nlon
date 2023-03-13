import { contentsItem, describe, footer, membersOf, renderBody, summarise, title } from "./components.mjs"
import { functionBody } from "./function.mjs"

export function classBody (doclet, allDoclets) {
  const allMembers = membersOf(doclet, allDoclets)

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
