import { rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDirectory = join(process.cwd(), 'dist', 'client');
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/').at(-1) || 'daixiaoka-adventure';
const nestedBaseDirectory = join(outputDirectory, repositoryName);
const nestedFrameworkDirectory = join(nestedBaseDirectory, '_next');
const publicFrameworkDirectory = join(outputDirectory, '_next');

// Vinext nests framework files below the configured base path. GitHub Pages
// already provides that path in the public URL, so lift `_next` to this root.
await rename(nestedFrameworkDirectory, publicFrameworkDirectory);
await rm(nestedBaseDirectory, { recursive: true, force: true });
await writeFile(join(outputDirectory, '.nojekyll'), '');
