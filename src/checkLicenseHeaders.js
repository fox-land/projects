import * as fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as readline from 'node:readline/promises'
import { parseArgs } from 'node:util'

import { Octokit } from '@octokit/rest'
import micromatch from 'micromatch'
import { globby, globbyStream } from 'globby'
import { execa } from 'execa'
import assert from 'node:assert'
import * as jsoncParser from 'jsonc-parser'
import untildify from 'untildify'
import yn from 'yn'
import { forEachRepository } from './util.js'
import walk from 'ignore-walk'
import { minimatch } from 'minimatch'

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
export async function checkLicenseHeaders({ octokit, config }) {
	async function onFile(/** @type {string} */ filepath) {
		const filename = path.basename(filepath)

		if (
			micromatch.isMatch(
				filename,
				[
					'*.{js{,x},{m,c}js,ts{,x},{m,c}ts,svelte,vue,java,kt,gradle,groovy,properties,rs,c,h,cc,cpp,hpp,go}',
				],
				{ dot: true, nocase: true },
			)
		) {
			// console.log('//')
		} else if (
			micromatch.isMatch(
				filename,
				[
					'*.{py,rb,sh,bash,bats,zsh,ksh,fish,elv,nu,ps1,yml,yaml,jsonc,jq,Containerfile,Dockerfile,service,desktop,conf,ini,mk,pl,inc,hcl}',
					'Vagrantfile',
					'meson.build',
					'Containerfile',
					'Dockerfile',
					'.*ignore',
					'.gitattributes',
					'.editorconfig',
					'.gemspec',
					'makefile',
				],
				{ dot: true, nocase: true },
			)
		) {
			// console.log('#')
		} else if (
			micromatch.isMatch(filename, ['*.{xml,html,md,toml,pro}'], {
				dot: true,
				nocase: true,
			})
		) {
			// console.log('<!-- -->')
		} else if (
			micromatch.isMatch(filename, '*.{css,scss,sass,less,styl}', {
				dot: true,
				nocase: true,
			})
		) {
			// console.log('/* */')
		} else if (
			micromatch.isMatch(filename, '*.{1,2,3,4,5,6,7,8,9,njk,m4,ml,hbs,rst}', {
				dot: true,
				nocase: true,
			})
			// .\"
		) {
		} else if (
			micromatch.isMatch(
				filename,
				[
					[
						'*.{json,sublime-snippet,webmanifest,code-snippets,map,gradlew,webp,bat,jar,woff,woff2,png,jpg,jpeg,ttf,eot,svg,ico,gif,lock,zip,7z,gz,content,bin,asc,gpg,snap,txt,sum,work,test,log,emu,parsed,patch,diff,flattened,pdf,csv}',
						'*.a*',
						'*.so*',
						'*.env*',
						'*.txt',
						'*.test',
						'1.*',
						'CNAME',
						'go.mod',
					],
					'*LICENSE*',
					'*COPYING*',
					'bake',
				],
				{ dot: true, nocase: true },
			) ||
			path.parse(filepath).ext === ''
		) {
			// skip
		} else {
			// console.log(`Not recognized: ${filepath}`)
		}
	}

	await forEachRepository(
		config.organizationsDir,
		{ ignores: config.ignoredOrganizations },
		async function run({ orgDir, orgEntry, repoDir, repoEntry }) {
			// Unfortunately, globby is too buggy when finding and using ignore files.
			// Instead, use 'ignore-walk', which does require a few hacks.
			const walker = new walk.Walker({
				path: repoDir,
				ignoreFiles: ['.gitignore', '.ignore', '__custom_ignore__'],
			})
			walker.ignoreRules['__custom_ignore__'] = ['.git'].map(
				(dirname) =>
					new minimatch.Minimatch(`**/${dirname}/*`, {
						dot: true,
						flipNegate: true,
					}),
			)
			walker.on('done', async (files) => {
				for (const file of files) {
					const filepath = path.join(repoDir, file)
					await onFile(filepath)
				}
			})
			walker.on('error', (err) => {
				if (err) {
					throw err
				}
			})
			walker.start()
		},
	)
}
