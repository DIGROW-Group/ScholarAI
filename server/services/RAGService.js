const { ChromaClient } = require('chromadb');
const OpenAI = require('openai');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
require('dotenv').config();

class RAGService {
  constructor() {
    this.chromaClient = new ChromaClient({
      path: process.env.CHROMA_HOST || 'http://localhost:8100'
    });
    
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://host.docker.internal:11434';
    this.ollamaEmbedModel = process.env.OLLAMA_EMBED_MODEL || process.env.OLLAMA_MODEL || 'nomic-embed-text';

    if (this.provider === 'ollama') {
      this.isOllama = true;
      this.isMock = false;
      console.log(`🤖 RAGService configured to use Ollama embeddings with model "${this.ollamaEmbedModel}" at ${this.ollamaHost}`);
    } else {
      this.isOllama = false;
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey.trim() !== '') {
        this.openai = new OpenAI({
          apiKey: apiKey
        });
        this.isMock = false;
      } else {
        this.openai = null;
        this.isMock = true;
        console.warn('⚠️ OPENAI_API_KEY is missing. RAGService running in MOCK mode.');
      }
    }

    this.allSubjects = ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
    this.collections = {};
    for (const sub of this.allSubjects) {
      this.collections[sub] = null;
    }
  }

  async initialize() {
    try {
      // Create or get collections for each subject
      for (const subject of this.allSubjects) {
        try {
          this.collections[subject] = await this.chromaClient.getOrCreateCollection({
            name: `rmatss_${subject}`,
            metadata: { description: `Course documents for ${subject}` }
          });
          console.log(`✅ RAG ChromaDB collection initialized for subject "${subject}"`);
        } catch (error) {
          console.warn(`ChromaDB collection notice for ${subject}:`, error.message);
        }
      }
    } catch (error) {
      console.warn('ChromaDB initialization notice:', error.message);
    }
  }

  async generateEmbedding(text) {
    if (this.isOllama) {
      try {
        const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.ollamaEmbedModel,
            prompt: text
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama embedding request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.embedding;
      } catch (error) {
        console.error('Ollama Embedding generation error:', error);
        throw error;
      }
    }

    if (this.isMock) {
      // Return a random vector array of 1536 dimension (standard text-embedding-3-small dimension)
      return new Array(1536).fill(0).map(() => Math.random());
    }

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

  async extractTextFromFile(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      if (filePath.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfData = await pdfParse(fileBuffer);
          if (pdfData && pdfData.text && pdfData.text.trim().length > 10) {
            return pdfData.text;
          }
        } catch (pdfErr) {
          console.warn(`pdfParse warning on ${filePath}, using text stream fallback:`, pdfErr.message);
        }

        // PDF text stream fallback extractor
        const rawString = fileBuffer.toString('binary');
        const matches = rawString.match(/\(([^()]{2,})\)/g) || [];
        const extractedStrings = matches
          .map(m => m.replace(/^\(|\)$/g, '').replace(/\\/g, ''))
          .filter(str => str.length > 2 && !str.startsWith('%PDF'));

        if (extractedStrings.length > 0) {
          return extractedStrings.join('\n');
        }

        return fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\x0A\x0D\xC0-\xFF\u00C0-\u017F]/g, ' ');
      } else {
        const rawText = fileBuffer.toString('utf-8');
        return rawText.replace(/[^\x20-\x7E\x0A\x0D\xC0-\xFF\u00C0-\u017F]/g, ' ');
      }
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
      return '';
    }
  }

  async processDocument(filePath, subject, documentId, metadata = {}) {
    try {
      // Read and parse document
      const text = await this.extractTextFromFile(filePath);

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

  async getDbFallbackDocuments(subject, query, nResults = 3) {
    try {
      const { CourseDocument } = require('../database/models');
      let docs = await CourseDocument.findAll({
        where: { subject }
      });

      if (!docs || docs.length === 0) {
        return {
          documents: [
            `Ceci est un document de cours simulé pour ${subject} concernant votre question : "${query}".`,
            `Guide de révision et formules clés pour ${subject}.`
          ],
          metadatas: [
            { title: `${subject.toUpperCase()} Fundamentals`, documentId: 'mock-doc-1', chunkIndex: 0 },
            { title: `${subject.toUpperCase()} Formulas`, documentId: 'mock-doc-2', chunkIndex: 0 }
          ],
          sources: [
            { documentId: 'mock-doc-1', chunkIndex: 0, title: `${subject.toUpperCase()} Fundamentals`, relevance: 0.95 },
            { documentId: 'mock-doc-2', chunkIndex: 0, title: `${subject.toUpperCase()} Formulas`, relevance: 0.85 }
          ]
        };
      }

      // Extract text content for scoring
      for (const doc of docs) {
        let fileText = '';
        if (doc.filePath) {
          fileText = await this.extractTextFromFile(doc.filePath).catch(() => '');
        }
        doc._fileText = fileText;
      }

      // Relevance scoring based on query terms
      const stopWords = new Set(['cours', 'apres', 'donne', 'moi', 'comment', 'demontrer', 'que', 'trois', 'points', 'sont', 'dans', 'avec', 'les', 'des', 'pour', 'sur', 'est', 'une', 'd\'un', 'd\'une', 'du', 'de', 'la', 'le', 'en']);
      const queryLower = (query || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const terms = queryLower.split(/\s+/).filter(t => t.length > 2 && !stopWords.has(t));

      const scoredDocs = docs.map(doc => {
        let score = 0;
        const title = (doc.title || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const desc = (doc.description || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const chapter = (doc.chapter || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const tags = Array.isArray(doc.tags) ? doc.tags.join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
        const fileText = (doc._fileText || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        for (const term of terms) {
          if (title.includes(term)) score += 15;
          if (chapter.includes(term)) score += 10;
          if (tags.includes(term)) score += 8;
          if (desc.includes(term)) score += 5;
          if (fileText.includes(term)) score += 6;
        }
        return { doc, score };
      });

      // Sort by score descending
      scoredDocs.sort((a, b) => b.score - a.score);

      // Keep only docs with score >= 5, or fallback to single top document
      let matching = scoredDocs.filter(d => d.score >= 5).map(d => d.doc);
      if (matching.length === 0 && scoredDocs.length > 0) {
        matching = [scoredDocs[0].doc];
      }

      // Limit to max 1 top relevant doc if top score is strong
      matching = matching.slice(0, nResults || 1);

      const documents = [];
      const metadatas = [];
      const sources = [];

      for (const doc of matching) {
        let fileText = '';
        if (doc.filePath) {
          fileText = await this.extractTextFromFile(doc.filePath).catch(() => '');
        }

        let contentSnippet = `Titre du support: ${doc.title}\n`;
        if (doc.chapter) contentSnippet += `Chapitre: ${doc.chapter}\n`;
        if (doc.description) contentSnippet += `Description: ${doc.description}\n`;
        if (doc.guidelines) contentSnippet += `Consignes du professeur: ${doc.guidelines}\n`;
        if (fileText) {
          contentSnippet += `Contenu du support:\n${fileText.substring(0, 2000)}`;
        }

        documents.push(contentSnippet);
        metadatas.push({
          title: doc.title,
          documentId: doc.id,
          chapter: doc.chapter,
          chunkIndex: 0
        });
        sources.push({
          id: doc.id,
          documentId: doc.id,
          chunkIndex: 0,
          title: doc.title,
          chapter: doc.chapter,
          subject: doc.subject,
          relevance: 1.0
        });
      }

      return { documents, metadatas, sources };
    } catch (error) {
      console.error('Error fetching DB fallback documents:', error);
      return { documents: [], metadatas: [], sources: [] };
    }
  }

  async queryDocuments(subject, query, nResults = 3) {
    try {
      return await this.getDbFallbackDocuments(subject, query, nResults);
      
      const results = await this.collections[subject].query({
        queryEmbeddings: [queryEmbedding],
        nResults
      });

      if (!results.documents[0] || results.documents[0].length === 0) {
        return await this.getDbFallbackDocuments(subject, query, nResults);
      }

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
      console.error('Query error, switching to DB fallback:', error);
      return await this.getDbFallbackDocuments(subject, query, nResults);
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

