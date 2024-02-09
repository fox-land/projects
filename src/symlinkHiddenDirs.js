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

/**
 * @typedef {import('@octokit/rest').Octokit} Octokit
 * @typedef {import('./main.js').Config} Config
 */

/**
 * @typedef FunctionOptions
 * @property {Octokit} octokit
 * @property {Config} config
 *
 * @param {FunctionOptions} options
 */
export async function symlinkHiddenDirs({ octokit, config }) {
	for (const orgEntry of await fs.readdir(config.organizationsDir, {
		withFileTypes: true,
	})) {
		const orgDir = path.join(orgEntry.path, orgEntry.name)
		if (!orgEntry.isDirectory()) {
			continue
		}

		for (const repoEntry of await fs.readdir(orgDir, {
			withFileTypes: true,
		})) {
			const repoDir = path.join(repoEntry.path, repoEntry.name)
			if (!repoEntry.isDirectory()) {
				continue
			}

			const oldHiddenDir = path.join(repoDir, '.hidden')
			const newHiddenDir = path.join(
				untildify(config.hiddenDirsRepositoryDir),
				repoEntry.name,
			)
			const newHiddenDirPretty = path.join(
				path.basename(path.dirname(newHiddenDir)),
				path.basename(newHiddenDir),
			)

			let oldHiddenDirStat
			let newHiddenDirStat
			const restat = async function restat() {
				try {
					oldHiddenDirStat = await fs.lstat(oldHiddenDir)
				} catch (err) {
					if (err.code !== 'ENOENT') {
						throw err
					}
				}

				try {
					newHiddenDirStat = await fs.lstat(newHiddenDir)
				} catch (err) {
					if (err.code !== 'ENOENT') {
						throw err
					}
				}
			}
			await restat()

			if (
				oldHiddenDirStat &&
				!oldHiddenDirStat.isSymbolicLink() &&
				!oldHiddenDirStat.isDirectory()
			) {
				console.error(`Error: Hidden directory must be a directory: ${oldHiddenDir}`)
				process.exit(1)
			}

			if (
				newHiddenDirStat &&
				!newHiddenDirStat.isSymbolicLink() &&
				!newHiddenDirStat.isDirectory()
			) {
				console.error(`Error: Hidden directory must be a directory: ${newHiddenDir}`)
				process.exit(1)
			}

			// The 'newHiddenDir' now is either a directory or does not exist.
			if (
				!newHiddenDirStat &&
				oldHiddenDirStat &&
				!oldHiddenDirStat.isSymbolicLink() &&
				oldHiddenDirStat.isDirectory()
			) {
				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout,
				})
				const input = await rl.question(`Move? ${newHiddenDirPretty} (y/n): `)
				rl.close()
				if (yn(input)) {
					await fs.mkdir(path.dirname(newHiddenDir), { recursive: true, mode: 0o755 })
					await fs.rename(oldHiddenDir, newHiddenDir)
					await restat()
				}
			}

			await fs.rm(oldHiddenDir, { force: true })
			if (newHiddenDirStat) {
				await fs.symlink(newHiddenDir, oldHiddenDir)
			}
		}
	}
}
