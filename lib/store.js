import { mkdir, readFile, writeFile, rename, readdir, stat, copyFile, unlink } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'

export function createStore(dataDir) {
  const root = dataDir || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'soul')

  async function ensure() {
    await mkdir(root, { recursive: true })
  }

  async function read(name, fallback = null) {
    try {
      const raw = await readFile(join(root, name), 'utf8')
      return JSON.parse(raw)
    } catch {
      return fallback
    }
  }

  async function write(name, data) {
    await ensure()
    const target = join(root, name)
    const tmp = `${target}.${process.pid}.tmp`
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
    await rename(tmp, target)
  }

  return {
    root,
    ensure,
    read,
    write,
    join: (...parts) => join(root, ...parts),
    fs: { mkdir, readFile, writeFile, readdir, stat, copyFile, unlink, basename }
  }
}