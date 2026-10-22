const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '../..')
// Resolve the dependency consumed by micromatch, rather than a staged patch copy.
const micromatch = require.resolve('micromatch', { paths: [path.join(root, 'node_modules/.pnpm/node_modules')] })
const packagePath = path.dirname(createRequire(micromatch).resolve('braces/package.json'))
const methods = ['compile', 'expand', 'stringify']
const deepPatterns = {
  braces: '{'.repeat(4000) + 'x' + '}'.repeat(4000),
  parentheses: '('.repeat(4000) + 'x' + ')'.repeat(4000),
  mixed: '{('.repeat(2000) + 'x' + ')}'.repeat(2000),
  unclosed: '{('.repeat(3000) + 'x',
  boundary: '{'.repeat(129) + 'x' + '}'.repeat(129)
}
const compatibility = [
  ['a/{b,c}/d', 'a/(b|c)/d', ['a/b/d', 'a/c/d'], 'a/{b,c}/d'],
  ['file-{1..3}.js', 'file-([1-3]).js', ['file-1.js', 'file-2.js', 'file-3.js'], 'file-{1..3}.js'],
  ['{a,{b,c}}', '(a|(b|c))', ['a', 'b', 'c'], '{a,{b,c}}'],
  ['a{b,c', 'a{b,c', ['a{b,c'], 'a{b,c'],
  ['a(b', 'a(b', ['a(b'], 'a(b'],
  ['{a..b,c}', '(a..b|c)', ['a..b', 'c'], '{a..b,c}'],
  ['{}', '{}', ['{}'], '{}']
]

function assert (condition, message) {
  if (!condition) throw new Error(message)
}

function externalAST (kind) {
  const ast = { type: 'root', nodes: [] }
  if (kind === 'cycle') {
    ast.nodes.push(ast)
    return ast
  }
  let current = ast
  for (let index = 0; index < 6000; index++) {
    const node = { type: 'paren', nodes: [], parent: current }
    current.nodes.push(node)
    current = node
  }
  current.nodes.push({ type: 'text', value: 'x' })
  return ast
}

function runCase (test) {
  const braces = require(packagePath)
  if (test.kind === 'compatibility') {
    for (const [pattern, ...expected] of compatibility) {
      for (const [index, method] of methods.entries()) {
        assert(JSON.stringify(braces[method](pattern)) === JSON.stringify(expected[index]), `${method} changed ${pattern}`)
        assert(JSON.stringify(braces[method](braces.parse(pattern))) === JSON.stringify(expected[index]), `${method} changed parsed AST ${pattern}`)
      }
    }
    assert(JSON.stringify(braces(['{a,b}', '{b,c}'], { expand: true, nodupes: true })) === '["a","b","c"]', 'Main entry changed')
    assert(JSON.stringify(braces.expand('{,a,a}', { noempty: true, nodupes: true })) === '["a"]', 'Expansion options changed')
  } else if (test.kind === 'literals') {
    const bracesText = '{'.repeat(2000) + 'x' + '}'.repeat(2000)
    for (const [input, expected] of [
      ['"' + bracesText + '"', bracesText],
      ['[' + bracesText + ']', '[' + bracesText + ']'],
      ['\\{'.repeat(2000) + 'x' + '\\}'.repeat(2000), bracesText],
      ['{'.repeat(128) + 'x' + '}'.repeat(128), '{'.repeat(128) + 'x' + '}'.repeat(128)]
    ]) {
      assert(braces.compile(input) === expected, 'Literal compile changed')
      assert(braces.stringify(input) === expected, 'Literal stringify changed')
      assert(JSON.stringify(braces.expand(input)) === JSON.stringify([expected]), 'Literal expansion changed')
    }
  } else {
    const operation = test.direct ? require(path.join(packagePath, 'lib', test.method)) : braces[test.method]
    let input = deepPatterns[test.pattern]
    if (test.kind === 'ast') input = externalAST(test.pattern)
    if (test.kind === 'parent-cycle') {
      const node = { type: 'paren', nodes: [{ type: 'text', value: 'x' }] }
      node.parent = node
      input = { type: 'root', nodes: [node] }
    }
    let rejection
    try { operation(input, test.options || {}) } catch (error) { rejection = error }
    assert(rejection?.code === 'ERR_BRACES_DEPTH', `Expected bounded depth rejection, got ${rejection?.stack || 'success'}`)
    assert(rejection instanceof RangeError && /maximum depth \(128\)/.test(rejection.message), 'Depth rejection must explain the fixed bound')
    assert(braces.compile('{a,b}') === '(a|b)', 'Rejected input broke subsequent compilation')
    return { name: test.name, passed: true, rejection: { name: rejection.name, code: rejection.code, message: rejection.message } }
  }
  return { name: test.name, passed: true }
}

if (process.argv[2] === '--case') {
  try {
    process.stdout.write(JSON.stringify(runCase(JSON.parse(process.argv[3]))) + '\n')
  } catch (error) {
    process.stdout.write(JSON.stringify({ passed: false, error: error.stack }) + '\n')
    process.exitCode = 1
  }
} else {
  const tests = [{ name: 'normal, malformed and AST compatibility', kind: 'compatibility' }, { name: 'literal content and depth boundary', kind: 'literals' }]
  for (const method of ['parse', ...methods, 'create']) {
    for (const pattern of Object.keys(deepPatterns)) tests.push({ name: `${method} rejects ${pattern}`, kind: 'pattern', method, pattern })
  }
  for (const method of methods) {
    for (const pattern of ['deep', 'cycle']) {
      for (const direct of [false, true]) tests.push({ name: `${direct ? 'direct' : 'public'} ${method} rejects ${pattern} AST`, kind: 'ast', method, pattern, direct })
    }
  }
  for (const options of [{ maxDepth: false }, { maxDepth: Infinity }, { rangeLimit: false }, { maxLength: Infinity }]) {
    // JSON cannot preserve Infinity; use a large finite value in the subprocess.
    const serializable = JSON.parse(JSON.stringify(options, (_, value) => value === Infinity ? 1000000000 : value))
    tests.push({ name: `caller options cannot disable depth guard ${JSON.stringify(serializable)}`, kind: 'pattern', method: 'expand', pattern: 'boundary', options: serializable })
  }
  for (const direct of [false, true]) tests.push({ name: `${direct ? 'direct' : 'public'} expand rejects parent cycle`, kind: 'parent-cycle', method: 'expand', direct })
  const report = {
    advisory: 'GHSA-vfj7-8cjw-p6xm',
    node: process.version,
    packagePath,
    version: require(path.join(packagePath, 'package.json')).version,
    patchSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'patches/braces@3.0.3.patch'))).digest('hex'),
    checks: []
  }
  const guard = path.join(packagePath, 'lib/depth.js')
  report.installedGuardSha256 = fs.existsSync(guard) ? crypto.createHash('sha256').update(fs.readFileSync(guard)).digest('hex') : null
  for (const test of tests) {
    const child = spawnSync(process.execPath, [__filename, '--case', JSON.stringify(test)], { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 128 * 1024 })
    let result
    try { result = JSON.parse(child.stdout) } catch { result = { passed: false, error: child.stdout || 'Missing JSON child result' } }
    report.checks.push({ name: test.name, ...result, passed: result.passed === true && child.status === 0 && !child.error, exitCode: child.status, signal: child.signal, processError: child.error?.message, stderr: child.stderr })
  }
  report.passed = report.checks.filter(check => check.passed).length
  report.failed = report.checks.filter(check => !check.passed)
  const destination = path.join(root, 'output/playwright/security/braces.json')
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n')
  console.log(`${report.passed}/${report.checks.length} braces process scenarios passed; ${destination}`)
  if (report.failed.length || !report.installedGuardSha256) process.exitCode = 1
}
