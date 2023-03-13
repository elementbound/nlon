import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as child_process from 'node:child_process'
import * as util from 'node:util'
import { fileURLToPath } from 'node:url'
import { markdoc } from './markdoc/index.mjs'

const exec = util.promisify(child_process.exec)

function listPackages (root, prefix = 'packages') {
  return fs.readdir(path.join(root, prefix), {
    withFileTypes: true
  })
  .then(result => result
      .filter(d => d.isDirectory)
      .map(d => d.name)
  )
}

async function save (p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true })
  return await fs.writeFile(p, data)
}

async function recurse (directory, filter = () => true) {
  try {
    await fs.access(directory)
  } catch {
    return []
  }

  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = entries.filter(entry => entry.isFile())
  const directories = entries.filter(entry => entry.isDirectory())
    .map(d => path.join(directory, d.name))
  const recurseResult = await Promise.all(
    directories.filter(filter)
      .map(d => recurse(d, filter))
  )

  return [
    ...files.map(d => path.join(directory, d.name)),
    ...recurseResult.flat()
  ]
}

async function jsondoc (root, directory) {
  const clidir = path.join(root, 'node_modules/jsdoc/')
  const cli = 'jsdoc.js'
  const config = path.join(directory, '.jsdoc.js')
  const ignoredDirs = ['node_modules', 'jsdoc']
  const searchDirs = ['lib', 'src']
  const sourceExts = ['.mjs', '.js']

  console.log('Looking for source files', directory)

  const sources = (await Promise.all(searchDirs
    .map(d => path.join(directory, d))
    .map(d => recurse(d, r => !ignoredDirs.includes(path.dirname(r))))
  )).flat()
    .filter(p => sourceExts.includes(path.extname(p)))

  console.log('Found sources', sources)

  const cmd = ['node', cli, '-c', config, '-X', ...sources]
    .map(c => `"${c}"`)
    .join(' ')

  console.log('Running command:', cmd)
  const execResult = await exec(cmd, { cwd: clidir })

  if (execResult.stderr) {
    console.error('jsdoc failed with output:', execResult)
    throw new Error('Failed to run jsdoc')
  }

  return execResult.stdout
}

async function processReadme (p, type = '') {
  const regex = /#\s*(.+)/
  const text = (await fs.readFile(p)).toString('utf-8')

  // Retrieve page title based on regex
  const title = regex.exec(text)[1]

  // Remove line with title
  const lines = text.split('\n')
  const firstHeader = lines.findIndex(line => regex.test(line))
  const result = text.split('\n')
    .filter((_, i) => i !== firstHeader)
    .join('\n')

  // Assemble result
  const frontMatter = [
    '---',
    'layout: home',
    `title: ${type}${title}`,
    '---'
  ].join('\n')

  return frontMatter + '\n' + result
}

function processApiDoc (text, title) {
  // jsdoc2md and kramdown generate header slugs differently
  // which means we have to patch the anchors to have id's instead of names
  // this is not exactly linking to the heading itself but close enough
  const regex = /<a\s*name="(.*)"/g

  const patchedText = text.replace(regex, (match, name) => {
    return `<a id="${name}"`
  })

  const frontMatter = [
    '---',
    'layout: home',
    'title: ' + title,
    '---'
  ].join('\n')

  return frontMatter + '\n' + patchedText
}

async function main () {
  const root = [import.meta.url]
    .map(fileURLToPath)
    .map(path.dirname)
    .map(p => path.join(p, '../'))
    .map(p => path.resolve(p))
    .pop()

  const out = path.join(root, '_site')
  const siteroot = path.join(root, 'site')

  const packages = await listPackages(root, 'packages')
  const examples = await listPackages(root, 'examples')

  console.log({
    root, packages, examples
  })

  console.log('Creating destination directory', out)
  await fs.mkdir(out, { recursive: true })

  console.log('Copying site base');
  (await fs.readdir(siteroot, { withFileTypes: true }))
    .filter(d => d.isFile())
    .map(d => d.name)
    .forEach(f => {
      const from = path.join(siteroot, f)
      const to = path.join(out, f)
      console.log(`Copy ${from} => ${to}`)
      fs.copyFile(from, to)
    })

  console.log('Copying main README')
  await save(
    path.join(out, 'index.md'),
    await processReadme(path.join(root, 'README.md'))
  )

  for (const pkg of packages) {
    console.log('Processing README for package', pkg)
    await save (
      path.join(out, '_packages', `${pkg}.md`),
      await processReadme(path.join(root, 'packages', pkg, 'README.md'), '📦 ')
    )

    console.log('Generating API docs for', pkg)
    const docjson = await jsondoc(root, path.join(root, 'packages', pkg))
    const doc = markdoc(docjson)
    await save(
      path.join(out, '_reference', `${pkg}.md`),
      processApiDoc(doc, `📖 ${pkg}`)
    )
  }

  console.log('Processing docs')
  for (const doc of await recurse(path.join(root, 'doc'))) {
    if (path.extname(doc) !== '.md') {
      continue
    }

    const types = {
      spec: '📜 ',
      tutorial: 'ℹ️ '
    }
    const defaultType = '📎 '

    const collection = path.basename(path.dirname(doc))
    console.log('Processing doc', doc, 'under collection', collection)
    const name = path.basename(doc)
    await save(
      path.join(out, '_' + collection, name),
      await processReadme(doc, types[collection] ?? defaultType)
    )
  }
}

main()
