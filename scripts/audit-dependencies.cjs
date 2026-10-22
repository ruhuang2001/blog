#!/usr/bin/env node
/* Failure modes considered before implementation:
 * Installed trees omit optional platform packages: parse every lockfile package.
 * Network failures, partial GraphQL responses, pagination, and malformed ranges:
 * fail closed and preserve a machine-readable incomplete report.
 * Scoped names and peer suffixes need correct parsing; withdrawn alerts are excluded.
 * Changing the lock during the audit invalidates its evidence.
 * Findings must return a nonzero exit code; baseline comparison is supplemental.
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFile } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const yaml = require('js-yaml')
const semver = require('semver')
const lockPath = path.join(root, 'pnpm-lock.yaml')
const lockText = fs.readFileSync(lockPath, 'utf8')
const hash = text => crypto.createHash('sha256').update(text).digest('hex')
const packages = {}
for (const key of Object.keys(yaml.load(lockText).packages || {})) {
  const separator = key.lastIndexOf('@')
  const name = key.slice(0, separator)
  const version = key.slice(separator + 1).split('(')[0]
  if (!name || !semver.valid(version)) throw new Error('Unsupported package key: ' + key)
  packages[name] ||= []
  if (!packages[name].includes(version)) packages[name].push(version)
}
if (!Object.keys(packages).length) throw new Error('No locked packages found')
const output = path.resolve(root, process.env.AUDIT_OUTPUT || 'output/playwright/security/dependency-audit.json')
const beforePath = process.env.AUDIT_BASELINE || path.join(root, 'output/playwright/security/dependabot-before.json')
const report = { generatedAt: new Date().toISOString(), lockfileSha256: hash(lockText), packageNames: Object.keys(packages).length, packageVersions: Object.values(packages).reduce((n, x) => n + x.length, 0), packages, vulnerabilities: [], withdrawnAdvisories: [], errors: [] }
function matches(version, range) {
  // GitHub separates comparator intersections with commas; npm semver uses spaces.
  const normalized = typeof range === 'string' ? range.replace(/,/g, ' ') : range
  if (!semver.validRange(normalized)) throw new Error('Unsupported advisory range: ' + range)
  return semver.satisfies(version, normalized, { includePrerelease: true })
}
function add(name, range, advisory, patched) {
  const versions = packages[name].filter(version => matches(version, range))
  if (!versions.length) return
  const finding = { package: name, versions, vulnerableVersionRange: range, firstPatchedVersion: patched || null, ...advisory }
  const destination = advisory.withdrawnAt ? report.withdrawnAdvisories : report.vulnerabilities
  destination.push(finding)
}
function gh(query) {
  return new Promise((resolve, reject) => {
    const child = execFile('gh', ['api', 'graphql', '--input', '-'], { cwd: root, timeout: 60000, maxBuffer: 20971520 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(error.message + ': ' + stderr.slice(0, 1000)))
      try {
        const data = JSON.parse(stdout)
        if (data.errors) throw new Error(JSON.stringify(data.errors))
        resolve(data.data)
      } catch (error) { reject(error) }
    })
    child.stdin.end(JSON.stringify({ query }))
  })
}
async function queryBatch(names, cursors = {}) {
  const fields = names.map((name, i) => 'p' + i + ': securityVulnerabilities(first:100, ecosystem:NPM, package:' + JSON.stringify(name) + (cursors[name] ? ', after:' + JSON.stringify(cursors[name]) : '') + ') { pageInfo { hasNextPage endCursor } nodes { vulnerableVersionRange firstPatchedVersion { identifier } advisory { ghsaId severity summary withdrawnAt } } }').join(' ')
  let data
  for (let attempt = 0; attempt < 3; attempt++) {
    try { data = await gh('{ ' + fields + ' }'); break } catch (error) {
      if (attempt === 2) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
  const next = {}
  names.forEach((name, i) => {
    const result = data['p' + i]
    if (!result || !Array.isArray(result.nodes) || !result.pageInfo) throw new Error('Missing response for ' + name)
    for (const item of result.nodes) add(name, item.vulnerableVersionRange, item.advisory, item.firstPatchedVersion?.identifier)
    if (result.pageInfo.hasNextPage) {
      if (!result.pageInfo.endCursor) throw new Error('Missing cursor for ' + name)
      next[name] = result.pageInfo.endCursor
    }
  })
  if (Object.keys(next).length) await queryBatch(Object.keys(next), next)
}
async function main() {
  try {
    try {
      const response = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(packages), signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const bulk = await response.json()
      if (!bulk || Array.isArray(bulk) || typeof bulk !== 'object') throw new Error('Malformed bulk response')
      for (const [name, advisories] of Object.entries(bulk)) {
        if (!packages[name] || !Array.isArray(advisories)) throw new Error('Unexpected package ' + name)
        for (const item of advisories) add(name, item.vulnerable_versions, { ghsaId: item.url?.split('/').pop(), severity: item.severity, summary: item.title }, null)
      }
      report.source = 'npm bulk advisory endpoint'
    } catch (error) {
      report.bulkFallbackReason = error.message
      report.vulnerabilities = []; report.withdrawnAdvisories = []
      report.source = 'GitHub GraphQL securityVulnerabilities, all locked packages and complete pagination'
      const names = Object.keys(packages)
      const batches = []
      for (let i = 0; i < names.length; i += 15) batches.push(names.slice(i, i + 15))
      let cursor = 0
      let completed = 0
      const results = await Promise.allSettled(Array.from({ length: 3 }, async () => {
        while (cursor < batches.length) {
          const batch = batches[cursor++]
          await queryBatch(batch)
          completed += batch.length
          console.error('Audited ' + completed + '/' + names.length + ' package names')
        }
      }))
      for (const result of results) if (result.status === 'rejected') throw result.reason
    }
    if (fs.existsSync(beforePath)) {
      const baseline = JSON.parse(fs.readFileSync(beforePath, 'utf8'))
      report.baseline = { source: beforePath, count: baseline.length, results: baseline.map(alert => {
        const name = alert.dependency.package.name
        const versions = packages[name] || []
        const range = alert.security_vulnerability.vulnerable_version_range
        const withdrawn = Boolean(alert.security_advisory.withdrawn_at)
        const affectedVersions = withdrawn ? [] : versions.filter(version => matches(version, range))
        return { number: alert.number, ghsaId: alert.security_advisory.ghsa_id, package: name, vulnerableVersionRange: range, currentVersions: versions, affectedVersions, status: withdrawn ? 'withdrawn advisory' : affectedVersions.length ? 'still vulnerable' : versions.length ? 'fixed version' : 'removed dependency' }
      }) }
    } else report.baseline = { source: beforePath, status: 'optional historical comparison unavailable' }
    if (hash(fs.readFileSync(lockPath, 'utf8')) !== report.lockfileSha256) throw new Error('Lockfile changed during audit; rerun required')
    report.complete = true
  } catch (error) { report.errors.push(error.stack); report.complete = false }
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ output, complete: report.complete, packageNames: report.packageNames, packageVersions: report.packageVersions, vulnerabilities: report.vulnerabilities.length, baselineUnresolved: report.baseline?.results?.filter(x => x.affectedVersions.length).length, errors: report.errors }, null, 2))
  if (!report.complete || report.vulnerabilities.length || report.baseline?.results?.some(x => x.affectedVersions.length)) process.exitCode = 1
}
main()
