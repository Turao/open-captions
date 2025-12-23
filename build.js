import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist');
}

// Copy static files to dist
const staticFiles = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'styles.css',
];

const staticDirs = [
  'icons',
];

function copyStaticFiles() {
  console.log('📦 Copying static files...');
  
  for (const file of staticFiles) {
    if (existsSync(file)) {
      cpSync(file, join('dist', file));
    }
  }
  
  for (const dir of staticDirs) {
    if (existsSync(dir)) {
      cpSync(dir, join('dist', dir), { recursive: true });
    }
  }
}

// Build configuration for content script (IIFE format for Chrome extension)
const contentScriptConfig = {
  entryPoints: ['src/content.ts'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
  minify: false,
};

// Build configuration for popup script
const popupScriptConfig = {
  entryPoints: ['src/popup.ts'],
  bundle: true,
  outfile: 'dist/popup.js',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
  minify: false,
};

async function build() {
  try {
    console.log('🔨 Building extension...');
    
    copyStaticFiles();
    
    await Promise.all([
      esbuild.build(contentScriptConfig),
      esbuild.build(popupScriptConfig),
    ]);
    
    console.log('✅ Build complete! Output in dist/');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  console.log('👀 Watching for changes...');
  
  copyStaticFiles();
  
  const contexts = await Promise.all([
    esbuild.context(contentScriptConfig),
    esbuild.context(popupScriptConfig),
  ]);
  
  await Promise.all(contexts.map(ctx => ctx.watch()));
  
  console.log('✅ Initial build complete! Watching for changes...');
}

if (isWatch) {
  watch();
} else {
  build();
}

