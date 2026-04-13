const { ChromaClient } = require('chromadb');
const OpenAI = require('openai');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
require('dotenv').config();

class RAGService {
  constructor() {
    this.chromaClient = new ChromaClient({
      path: process.env.CHROMA_HOST || 'http://localhost:8000'
    });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.collections = {
      math: null,
      physics: null
    };
  }

  async initialize() {
    try {
      // Create or get collections for each subject
      for (const subject of ['math', 'physics']) {
        try {
          this.collections[subject] = await this.chromaClient.getOrCreateCollection({
            name: `rmatss_${subject}`,
            metadata: { description: `Course documents for ${subject}` }
          });
        } catch (error) {
          console.warn(`ChromaDB not available for ${subject}, RAG will be limited:`, error.message);
        }
      }
    } catch (error) {
      console.warn('ChromaDB not available, RAG will use fallback mode:', error.message);
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw error;
    }
  }

  async processDocument(filePath, subject, documentId, metadata = {}) {
    try {
      // Read and parse document
      const fileBuffer = await fs.readFile(filePath);
      let text = '';

      if (filePath.endsWith('.pdf')) {
        const pdfData = await pdfParse(fileBuffer);
        text = pdfData.text;
      } else {
        text = fileBuffer.toString('utf-8');
      }

      // Chunk the text (simple chunking by paragraphs with overlap)
      const chunks = this.chunkText(text, 500, 50);

      if (!this.collections[subject]) {
        console.warn(`ChromaDB collection not available for ${subject}`);
        return { chunkCount: chunks.length, embeddingId: null };
      }

      // Generate embeddings and store
      const embeddings = [];
      const documents = [];
      const ids = [];
      const metadatas = [];

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.generateEmbedding(chunks[i]);
        embeddings.push(embedding);
        documents.push(chunks[i]);
        ids.push(`${documentId}_chunk_${i}`);
        metadatas.push({
          ...metadata,
          documentId,
          chunkIndex: i,
          totalChunks: chunks.length
        });
      }

      await this.collections[subject].add({
        ids,
        embeddings,
        documents,
        metadatas
      });

      return {
        chunkCount: chunks.length,
        embeddingId: documentId
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  chunkText(text, chunkSize = 500, overlap = 50) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  async queryDocuments(subject, query, nResults = 3) {
    try {
      if (!this.collections[subject]) {
        return {
          documents: [],
          metadatas: [],
          sources: []
        };
      }

      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await this.collections[subject].query({
        queryEmbeddings: [queryEmbedding],
        nResults
      });

      const sources = results.metadatas[0].map((meta, idx) => ({
        documentId: meta.documentId,
        chunkIndex: meta.chunkIndex,
        title: meta.title || 'Untitled',
        relevance: 1 - (results.distances[0][idx] || 0)
      }));

      return {
        documents: results.documents[0] || [],
        metadatas: results.metadatas[0] || [],
        sources
      };
    } catch (error) {
      console.error('Query error:', error);
      return {
        documents: [],
        metadatas: [],
        sources: []
      };
    }
  }

  async deleteDocument(subject, documentId) {
    try {
      if (!this.collections[subject]) {
        return;
      }

      // Delete all chunks for this document
      const allIds = await this.collections[subject].get();
      const idsToDelete = allIds.ids.filter(id => id.startsWith(`${documentId}_`));
      
      if (idsToDelete.length > 0) {
        await this.collections[subject].delete({
          ids: idsToDelete
        });
      }
    } catch (error) {
      console.error('Document deletion error:', error);
      throw error;
    }
  }
}

module.exports = new RAGService();

