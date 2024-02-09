import * as fs from 'node:fs/promises'
import * as path from 'node:path'

/**
 * @typedef {import('node:fs').Dirent} Dirent
 * @typedef {import('./main.js').Config} Config
 */

/**
 * @typedef RunnerParam
 * @property {string} orgDir
 * @property {Dirent} orgEntry
 * @property {string} repoDir
 * @property {Dirent} repoEntry
 *
 * @typedef RunnerOptions
 * @property {string[]} [ignores]

 *
 * @param {string} organizationsDir
 * @param {RunnerOptions} options
 * @param {(arg0: RunnerParam) => Promise<void>} fn
 */
export async function forEachRepository(organizationsDir, options, fn) {
	if (typeof options === 'function') {
		fn = options
		options = {}
	}

	for (const orgEntry of await fs.readdir(organizationsDir, {
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

			if (Array.isArray(options.ignores)) {
				const shouldSkip = options.ignores.some((ignoreEntry) => {
					if (ignoreEntry === orgEntry.name) {
						return true
					}

					if (ignoreEntry === `${orgEntry.name}/${repoEntry.name}`) {
						return true
					}

					return false
				})

				if (shouldSkip) {
					continue
				}
			}

			await fn({ orgDir, orgEntry, repoDir, repoEntry })
		}
	}
}
