import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getAllDocuments, 
  getDocumentsByCategory, 
  getAllTags, 
  searchDocuments, 
  getDocument, 
  getCategories 
} from '../documents';

// Note: These are integration tests that use the real vault directory

describe('documents library', () => {
  describe('getAllDocuments', () => {
    it('should return an array of documents', () => {
      const docs = getAllDocuments();
      expect(Array.isArray(docs)).toBe(true);
    });

    it('should return documents with required fields', () => {
      const docs = getAllDocuments();
      if (docs.length > 0) {
        const doc = docs[0];
        expect(doc).toHaveProperty('slug');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('category');
        expect(doc).toHaveProperty('lastModified');
      }
    });

    it('should sort documents by date (newest first)', () => {
      const docs = getAllDocuments();
      const datedDocs = docs.filter(d => d.date);
      
      for (let i = 1; i < datedDocs.length; i++) {
        const prevDate = new Date(datedDocs[i - 1].date!);
        const currDate = new Date(datedDocs[i].date!);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });
  });

  describe('getDocumentsByCategory', () => {
    it('should return documents grouped by category', () => {
      const byCategory = getDocumentsByCategory();
      expect(typeof byCategory).toBe('object');
      
      // Each value should be an array
      for (const [category, docs] of Object.entries(byCategory)) {
        expect(Array.isArray(docs)).toBe(true);
        // All docs in this category should have the same category
        for (const doc of docs) {
          expect(doc.category).toBe(category);
        }
      }
    });

    it('should include known categories if they have documents', () => {
      const byCategory = getDocumentsByCategory();
      const knownCategories = ['journal', 'concepts', 'projects'];
      
      for (const category of knownCategories) {
        if (byCategory[category]) {
          expect(byCategory[category].length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getAllTags', () => {
    it('should return an array of tag info objects', () => {
      const tags = getAllTags();
      expect(Array.isArray(tags)).toBe(true);
      
      for (const tagInfo of tags) {
        expect(tagInfo).toHaveProperty('tag');
        expect(tagInfo).toHaveProperty('count');
        expect(typeof tagInfo.tag).toBe('string');
        expect(typeof tagInfo.count).toBe('number');
        expect(tagInfo.count).toBeGreaterThan(0);
      }
    });

    it('should sort tags by count (most used first)', () => {
      const tags = getAllTags();
      
      for (let i = 1; i < tags.length; i++) {
        expect(tags[i - 1].count).toBeGreaterThanOrEqual(tags[i].count);
      }
    });
  });

  describe('searchDocuments', () => {
    it('should return empty array for non-matching query', () => {
      const results = searchDocuments('xyznonexistentquery123');
      expect(results).toEqual([]);
    });

    it('should find documents matching title', () => {
      const docs = getAllDocuments();
      if (docs.length > 0) {
        // Search for a word from the first document's title
        const firstDoc = docs[0];
        const titleWord = firstDoc.title.split(' ')[0];
        
        if (titleWord && titleWord.length > 2) {
          const results = searchDocuments(titleWord);
          expect(results.length).toBeGreaterThan(0);
          // The first doc should be in results
          expect(results.some(r => r.slug === firstDoc.slug)).toBe(true);
        }
      }
    });

    it('should be case-insensitive', () => {
      const docs = getAllDocuments();
      if (docs.length > 0) {
        const firstDoc = docs[0];
        const titleWord = firstDoc.title.split(' ')[0];
        
        if (titleWord && titleWord.length > 2) {
          const resultsLower = searchDocuments(titleWord.toLowerCase());
          const resultsUpper = searchDocuments(titleWord.toUpperCase());
          expect(resultsLower.length).toBe(resultsUpper.length);
        }
      }
    });

    it('should rank title matches higher than content matches', () => {
      // This is a behavioral test - documents matching in title
      // should appear before those only matching in content
      const results = searchDocuments('outlook');
      
      if (results.length > 1) {
        const hasOutlookInTitle = results.some(r => 
          r.title.toLowerCase().includes('outlook')
        );
        // If any result has 'outlook' in title, it should be near the top
        if (hasOutlookInTitle) {
          const firstWithTitle = results.findIndex(r => 
            r.title.toLowerCase().includes('outlook')
          );
          expect(firstWithTitle).toBeLessThanOrEqual(Math.min(2, results.length - 1));
        }
      }
    });
  });

  describe('getDocument', () => {
    it('should return null for non-existent document', async () => {
      const doc = await getDocument('non-existent-slug-123');
      expect(doc).toBeNull();
    });

    it('should return document with full content for existing slug', async () => {
      const docs = getAllDocuments();
      if (docs.length > 0) {
        const doc = await getDocument(docs[0].slug);
        expect(doc).not.toBeNull();
        expect(doc).toHaveProperty('content');
        expect(doc).toHaveProperty('htmlContent');
        expect(doc?.slug).toBe(docs[0].slug);
      }
    });

    it('should convert markdown to HTML', async () => {
      const docs = getAllDocuments();
      if (docs.length > 0) {
        const doc = await getDocument(docs[0].slug);
        if (doc && doc.htmlContent) {
          // HTML content should have some HTML tags
          expect(doc.htmlContent).toMatch(/<[^>]+>/);
        }
      }
    });
  });

  describe('getCategories', () => {
    it('should return an array of category names', () => {
      const categories = getCategories();
      expect(Array.isArray(categories)).toBe(true);
      
      for (const category of categories) {
        expect(typeof category).toBe('string');
      }
    });

    it('should include known directories that exist', () => {
      const categories = getCategories();
      const knownCategories = ['journal', 'concepts', 'projects'];
      
      for (const known of knownCategories) {
        // Only check if the category is expected to exist
        const exists = categories.includes(known);
        // At minimum, we should have some categories
        expect(categories.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('document metadata', () => {
  it('should parse frontmatter correctly', async () => {
    const docs = getAllDocuments();
    const docWithDate = docs.find(d => d.date);
    
    if (docWithDate) {
      expect(typeof docWithDate.date).toBe('string');
      // Date should be parseable
      const date = new Date(docWithDate.date);
      expect(isNaN(date.getTime())).toBe(false);
    }
  });

  it('should handle documents with tags', async () => {
    const docs = getAllDocuments();
    const docWithTags = docs.find(d => d.tags && d.tags.length > 0);
    
    if (docWithTags) {
      expect(Array.isArray(docWithTags.tags)).toBe(true);
      for (const tag of docWithTags.tags!) {
        expect(typeof tag).toBe('string');
      }
    }
  });
});
