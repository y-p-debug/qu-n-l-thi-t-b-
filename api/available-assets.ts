import fs from 'fs';
import path from 'path';

const DEFAULT_IMAGES = [
  'IMG_6485.jpg',
  'IMG_6728.jpg',
  'TKT00800.JPG',
  'TKT00988.JPG',
  'TKT01182.JPG',
  'TKT01309.JPG',
  'TKT01795.JPG',
  'TKT01948.JPG',
  'TKT01968.JPG',
  '_N2K1748.jpg',
  'DSC06471.JPG',
  'DSC06946.JPG',
  'DSC07428.JPG',
  'DSC07753.JPG',
  'DSC07863.JPG'
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const assetsJsonPath = path.join(process.cwd(), 'public', 'assets', 'assets.json');
    if (fs.existsSync(assetsJsonPath)) {
      const content = fs.readFileSync(assetsJsonPath, 'utf8');
      const parsed = JSON.parse(content);
      const files = Array.isArray(parsed.images)
        ? Array.from(new Set([...parsed.images, ...DEFAULT_IMAGES]))
        : DEFAULT_IMAGES;
      return res.json({
        ok: true,
        files,
        video: typeof parsed.video === 'string' ? parsed.video : 'DYM V2 のコピー.mp4',
        backgroundLogo: typeof parsed.backgroundLogo === 'string' ? parsed.backgroundLogo : 'bg_logo.jpg'
      });
    }

    return res.json({
      ok: true,
      files: DEFAULT_IMAGES,
      video: 'DYM V2 のコピー.mp4',
      backgroundLogo: 'bg_logo.jpg'
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: errMsg });
  }
}
