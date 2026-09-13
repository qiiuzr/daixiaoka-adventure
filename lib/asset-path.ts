const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

export function assetPath(path: string) {
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}

export function sitePath(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
