import fs from 'fs';
import path from 'path';

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
      return res.json({ ok: true, files: parsed.images || [] });
    }
    return res.json({ ok: true, files: [] });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: errMsg });
  }
}
