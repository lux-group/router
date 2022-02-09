#!/usr/bin/env node

require('ts-node').register({ transpileOnly: true })

const { promisify } = require('util')
const { exec } = require('child_process')
const { generateTypes } = require('./index')

const exit = (message) => {
  console.error(message)
  process.exit(1)
}

const routerPath = process.argv[2]
if (!routerPath) {
  exit('Usage: yarn generateTypes <path-to-router> <path-to-contract>')
}

const contractPath = process.argv[3]
if (!contractPath) {
  exit('Usage: yarn generateTypes <path-to-router> <path-to-contract>')
}

const isCI = process.argv[4] === '--ci'

const getMount = () => {
  try {
    const { mount } = require(process.cwd() + '/' + routerPath)
    if (typeof mount !== 'function') exit(`Error: ${routerPath} does not export a mount function`)
    return mount
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      exit(e.message)
    }
    throw e
  }
}

async function generate () {
  const mount = getMount()

  await generateTypes(mount, process.cwd() + '/' + contractPath)

  const { stdout } = await promisify(exec)(`git diff ${contractPath}`)

  const pendingCommits = !!stdout

  if (pendingCommits) {
    console.log('Types have changed since the last commit.')
    console.log(stdout)

    if (isCI) return

    const contractDirectoryPath = contractPath.substring(0, contractPath.lastIndexOf('/'))

    var pjson = require(process.cwd() + '/' + contractDirectoryPath + '/package.json')

    console.log(`Currrent contract version is ${pjson.version}. Attempting to increment package version.`)
    const result = await promisify(exec)(`npm --prefix ${contractDirectoryPath} --no-git-tag-version version patch`)
    console.log('Package version incremented to ' + result.stdout)
  } else {
    console.log('No changes.')
  }

  return !!pendingCommits
}

generate()
  .then((pendingCommits) => {
    const exitCode = isCI && pendingCommits ? 1 : 0
    process.exit(exitCode)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
