export class Doclet {
  meta = {}
  tags = []
  memberof = ''
  longname = ''
  scope = ''

  /**
   * A list of symbols that are borrowed by this one, if any.
   * @type {Array.<string>}
   */
  borrowed

  /**
 * A list of symbols that are mixed into this one, if any.
 * @type Array.<string>
 */
  mixes

  /**
 * A list of symbols that are augmented by this one, if any.
 * @type Array.<string>
 */
  augments

  summary = ''
  description = ''
  classdesc = ''
  access = ''
  kind = ''
  name = ''
  type = {
    names: ['']
  }

  undocumented = false

  params = [{
    type: {
      names: ['']
    },
    name: '',
    description: '',
    optional: false
  }]

  examples = ['']
  fires = ['']
  augments = ['']

  returns = [{
    type: {
      names: ['']
    },
    description: ''
  }]

  exceptions = [{
    type: {
      names: ['']
    },
    description: ''
  }]

  async = false
  generator = false
  overrides = ''
  properties = [{
    type: {
      names: ['']
    },
    optional: false,
    defaultvalue: '',
    description: '',
    name: '',
  }]

  nullable = false
  readonly = false
  isEnum = false

  see = ['']
  files = ['']
  inherits = ''
  inherited = false
}
