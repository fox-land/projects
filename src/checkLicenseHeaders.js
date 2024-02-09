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
export async function checkLicenseHeaders({ octokit, config }) {}
