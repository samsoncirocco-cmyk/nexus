import { BigQuery } from '@google-cloud/bigquery';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { helpers } from '@google-cloud/aiplatform';

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'killuacode';
const LOCATION = 'us-central1';
const PUBLISHER = 'google';
const MODEL = 'text-embedding-005';

// Initialize Clients
const bigquery = new BigQuery({ projectId: PROJECT_ID });

const clientOptions = {
  apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
};

const predictionServiceClient = new PredictionServiceClient(clientOptions);

export interface SearchResult {
  source: string;
  title: string;
  preview: string;
  url?: string;
  score: number;
  timestamp?: string;
}

/**
 * Generate embeddings for a query using Vertex AI
 */
async function embedQuery(text: string): Promise<number[]> {
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/${PUBLISHER}/models/${MODEL}`;
  
  const instance = {
    content: text,
    task_type: 'RETRIEVAL_QUERY',
  };
  
  const instanceValue = helpers.toValue(instance);
  const instances = [instanceValue];

  const request = {
    endpoint,
    instances,
  };

  try {
    const [response] = await predictionServiceClient.predict(request);
    const predictions = response.predictions;
    
    if (predictions && predictions.length > 0) {
        const embedding = predictions[0].structValue?.fields?.embeddings?.structValue?.fields?.values?.listValue?.values;
        if (embedding) {
            return embedding.map(v => v.numberValue || 0);
        }
    }
    throw new Error('No embedding returned from Vertex AI');
  } catch (error) {
    console.error('Vertex AI Embedding Error:', error);
    throw error;
  }
}

/**
 * Perform semantic search across BigQuery tables
 */
export async function semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    // 1. Generate Query Embedding
    const queryVector = await embedQuery(query);

    // 2. Build SQL Query (UNION ALL for multiple tables)
    // We search openclaw.embeddings (Vault) and openclaw.semantic_chunks (Paul's Index)
    // Adjust table names if needed based on actual schema
    
    const vectorString = JSON.stringify(queryVector);

    const sqlQuery = `
      WITH combined_results AS (
        SELECT 
          event_id as id,
          source,
          content_preview as preview,
          embedding,
          timestamp,
          'vault' as type
        FROM \`${PROJECT_ID}.openclaw.embeddings\`
        WHERE embedding IS NOT NULL
        
        UNION ALL
        
        SELECT 
          chunk_id as id,
          'paul_index' as source,
          chunk_text as preview,
          embedding,
          created_at as timestamp,
          'external' as type
        FROM \`${PROJECT_ID}.openclaw.semantic_chunks\`
        WHERE embedding IS NOT NULL
      )
      SELECT
        id,
        source,
        preview,
        timestamp,
        (
          SELECT SUM(v1 * v2) 
          FROM UNNEST(embedding) v1 WITH OFFSET i 
          JOIN UNNEST(${vectorString}) v2 WITH OFFSET j 
          ON i = j
        ) as score
      FROM combined_results
      ORDER BY score DESC
      LIMIT @limit
    `;

    const options = {
      query: sqlQuery,
      params: { limit },
    };

    const [rows] = await bigquery.query(options);

    return rows.map((row: any) => ({
      source: row.source,
      title: row.id, // Using ID as title for now, can refine
      preview: row.preview,
      score: row.score,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : undefined,
    }));

  } catch (error) {
    console.error('Semantic Search Error:', error);
    // Return empty array on error to be graceful, or throw?
    // For now, rethrow to let API handler deal with it
    throw error;
  }
}
