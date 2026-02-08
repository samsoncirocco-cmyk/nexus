import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const vaultPath = path.join(process.cwd(), 'vault');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const filePath = path.join(vaultPath, `${slug}.md`);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContents = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    return NextResponse.json({
      slug,
      content,
      frontmatter: data,
    });
  } catch (error) {
    console.error('Error reading vault file:', error);
    return NextResponse.json(
      { error: 'Failed to read document', details: (error as Error).message },
      { status: 500 }
    );
  }
}
