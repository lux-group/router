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

const getMount = () => {
  try {
    const { mount } = require(process.cwd() + '/' + routerPath)
    if (typeof mount !== 'function') exit(`Error: ${routerPath} does not export a mount function`)
    return mount
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      exit(`Error: Could not find router at ${process.cwd() + '/' + routerPath}`)
    }
  }
}

async function generate () {
  const mount = getMount()

  await generateTypes(mount, process.cwd() + '/' + contractPath)

  const { stdout } = await promisify(exec)(`git diff ${contractPath}`)

  const pendingCommits = !!stdout

  if (pendingCommits) {
    console.log('Types has changed since the last commit.')
    console.log(stdout)
  } else {
    console.log('No changes.')
  }

  return !!pendingCommits
}

generate()
  .then((pendingCommits) => {
    const exitCode = process.argv[4] === '--ci' && pendingCommits ? 1 : 0
    process.exit(exitCode)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })