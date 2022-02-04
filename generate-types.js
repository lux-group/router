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
  exit('Usage: yarn generateTypes <path-to-router> <path-to-contract> [<should-increment-version>] [<path-to-contract-directory>]')
}

const contractPath = process.argv[3]
if (!contractPath) {
  exit('Usage: yarn generateTypes <path-to-router> <path-to-contract> [<should-increment-version>] [<path-to-contract-directory>]')
}

const shouldIncrementVersion = process.argv[4]
let contractDirectoryPath = process.argv[5]

const getMount = () => {
  try {
    const { mount } = require(process.cwd() + '/' + routerPath)
    if (typeof mount !== 'function') exit(`Error: ${routerPath} does not export a mount function`)
    return mount
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      exit(e.message)
    }
    if (e instanceof ReferenceError) {
      console.error(e)
      exit(`Error: Could not generate types due to syntax issues.`)
    }
  }
}

async function generate () {
  const mount = getMount()

  await generateTypes(mount, process.cwd() + '/' + contractPath)

  const { stdout } = await promisify(exec)(`git diff ${contractPath}`)

  const pendingCommits = !!stdout

  if (pendingCommits) {
    console.log('Types have changed since the last commit.')
    if (shouldIncrementVersion) {
      console.log('Attempting to increment package version.')
      if (!contractDirectoryPath) {
        contractDirectoryPath = contractPath.substring(0, contractPath.lastIndexOf("/"));
        console.log(`path-to-contract-directory not set, resolving to parent folder of contract: ${contractDirectoryPath}`)
      }
      const result = await promisify(exec)(`npm --prefix ${contractDirectoryPath} --no-git-tag-version version patch`)
      console.log('Package version incremented to ' + result.stdout)
    } else {
      console.log('Please increment your contract package version.')
    }
    
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
