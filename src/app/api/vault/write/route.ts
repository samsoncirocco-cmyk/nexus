import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { revalidatePath } from 'next/cache';
import { VAULT_PATH, WRITABLE_VAULT, writablePath } from '@/lib/paths';

const vaultPath = VAULT_PATH;

export async function POST(req: NextRequest) {
  try {
    const { slug, content, frontmatter, createNew } = await req.json();

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const filePath = path.join(vaultPath, `${slug}.md`);
    
    // If not creating new, validate that file exists
    if (!createNew) {
      try {
        await fs.access(filePath);
      } catch {
        return NextResponse.json({ error: 'File does not exist' }, { status: 404 });
      }
    }

    // Build the full markdown file with frontmatter
    const yamlData = {
      title: frontmatter?.title || '',
      ...(frontmatter?.description && { description: frontmatter.description }),
      ...(frontmatter?.date && { date: frontmatter.date }),
      ...(frontmatter?.tags && frontmatter.tags.length > 0 && { tags: frontmatter.tags }),
    };

    const fullContent = matter.stringify(content || '', yamlData);

    // Ensure directory exists (use WRITABLE_VAULT for the base)
    const writableFilePath = writablePath(filePath);
    await fs.mkdir(path.dirname(writableFilePath), { recursive: true });

    // Write to file
    await fs.writeFile(writableFilePath, fullContent, 'utf8');

    // Revalidate the doc page and category pages
    revalidatePath(`/doc/${slug}`);
    const category = slug.split('/')[0];
    revalidatePath(`/doc/${category}`);
    revalidatePath('/doc');

    return NextResponse.json({ 
      success: true, 
      message: 'Document saved successfully',
      slug 
    });
  } catch (error) {
    console.error('Error writing vault file:', error);
    return NextResponse.json(
      { error: 'Failed to save document', details: (error as Error).message },
      { status: 500 }
    );
  }
}
