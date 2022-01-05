#!/usr/bin/env node

require('ts-node').register({ transpileOnly: true })

const { promisify } = require('util')
const { exec } = require('child_process')
const { generateTypes } = require('./index')

const routerPath = process.argv[2]
if (!routerPath) throw new Error('Usage: yarn generateTypes <path-to-router> <path-to-contract>')

const contractPath = process.argv[3]
if (!contractPath) throw new Error('Usage: yarn generateTypes <path-to-router> <path-to-contract>')

const { mount } = require(process.cwd() + '/' + routerPath)

async function generate () {
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
    const exitCode = process.argv[2] === 'ci' && pendingCommits ? 1 : 0
    process.exit(exitCode)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
