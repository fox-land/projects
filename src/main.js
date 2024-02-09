import * as fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as readline from 'node:readline/promises'

import { Octokit } from '@octokit/rest'
import micromatch from 'micromatch'
import { globby } from 'globby'
import { execa } from 'execa'
import assert from 'node:assert'
import * as jsoncParser from 'jsonc-parser'
import untildify from 'untildify'
import yn from 'yn'
import { parseArgs } from 'node:util'

import { syncRepositories } from './syncRepositories.js'
import { symlinkHiddenDirs } from './symlinkHiddenDirs.js'
import { checkLicenseHeaders } from './checkLicenseHeaders.js'

/**
 * @typedef {import('@octokit/types').GetResponseDataTypeFromEndpointMethod} GetResponseDataTypeFromEndpointMethod
 */

/**
 * @typedef Config
 * @property {string} organizationsDir
 * @property {string} hiddenDirsRepositoryDir
 * @property {string[]} ignoredOrganizations
 * @exports Config
 */

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		help: {
			type: 'boolean',
			short: 'h',
		},
	},
})

{
	const usageText = `Usage: repos [all|sync-repositories|symlink-hidden-dirs|check-license-headers] --help`

	if (values.help) {
		console.log(usageText)
		process.exit(0)
	}

	if (positionals.length === 0) {
		console.error('No command specified')
		console.error(usageText)
		process.exit(1)
	}
}

{
	const octokit = new Octokit({
		auth: process.env.GITHUB_AUTH_TOKEN,
	})

	/** @type {Config} */
	const config = jsoncParser.parse(await fs.readFile('config.jsonc', 'utf-8'))
	config.organizationsDir = untildify(config.organizationsDir)
	config.hiddenDirsRepositoryDir = untildify(config.hiddenDirsRepositoryDir)
	config.ignoredOrganizations = config.ignoredOrganizations || []

	if (positionals[0] === 'all') {
		await syncRepositories({ octokit, config })
		await symlinkHiddenDirs({ octokit, config })
		await checkLicenseHeaders({ octokit, config })
	} else if (positionals[0] === 'sync-repositories') {
		await syncRepositories({ octokit, config })
	} else if (positionals[0] === 'symlink-hidden-dirs') {
		await symlinkHiddenDirs({ octokit, config })
	} else if (positionals[0] === 'check-license-headers') {
		await checkLicenseHeaders({ octokit, config })
	} else {
		console.error('Unknown command:', positionals[0])
		process.exit(1)
	}
}
