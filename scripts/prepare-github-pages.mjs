import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const outputDirectory = join(process.cwd(), 'dist', 'client');
const frameworkDirectory = join(outputDirectory, '_next');
const publicDirectory = join(outputDirectory, 'site-assets');
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/').at(-1) || 'daixiaoka-adventure';
const originalPrefix = `/${repositoryName}/_next/`;
const publicPrefix = `/${repositoryName}/site-assets/`;
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.txt']);

async function rewriteReferences(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteReferences(path);
    } else if (textExtensions.has(extname(entry.name))) {
      const source = await readFile(path, 'utf8');
      const rewritten = source.replaceAll(originalPrefix, publicPrefix);
      if (rewritten !== source) await writeFile(path, rewritten);
    }
  }
}

await rewriteReferences(outputDirectory);
await rename(frameworkDirectory, publicDirectory);
await writeFile(join(outputDirectory, '.nojekyll'), '');
