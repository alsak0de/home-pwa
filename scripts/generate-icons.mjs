import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Resolve paths relative to current working directory to avoid sandbox path quirks
const projectRoot = process.cwd();
const srcImage = path.resolve(projectRoot, 'public/icons/source.png');
const outDir = path.resolve(projectRoot, 'public/icons');

async function ensureDir(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

async function generateStandardIcon(size, filename) {
	const outputPath = path.join(outDir, filename);
	// Use a dark background to avoid transparent edges on various launchers
	await sharp(srcImage)
		.resize(size, size, {
			fit: 'contain',
			background: '#0b0f14'
		})
		.png()
		.toFile(outputPath);
}

async function generateMaskableIcon(size, filename) {
	const outputPath = path.join(outDir, filename);
	// Use contain with background to keep safe padding around the logo
	await sharp(srcImage)
		.resize(size, size, {
			fit: 'contain',
			background: '#0b0f14'
		})
		.png()
		.toFile(outputPath);
}

async function main() {
	if (!fs.existsSync(srcImage)) {
		console.error(`Source image not found at: ${srcImage}`);
		process.exit(1);
	}
	await ensureDir(outDir);

	// Android (any)
	await generateStandardIcon(192, 'icon-192.png');
	await generateStandardIcon(512, 'icon-512.png');

	// Android (maskable)
	await generateMaskableIcon(192, 'maskable-192.png');
	await generateMaskableIcon(512, 'maskable-512.png');

	// iOS apple-touch-icon (180x180)
	await generateStandardIcon(180, 'icon-180.png');

	// Optional extras (useful for desktop/browsers)
	await generateStandardIcon(256, 'icon-256.png');
	await generateStandardIcon(384, 'icon-384.png');

	console.log('Icons generated in /public/icons');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});


