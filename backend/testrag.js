require("dotenv").config();
const { ChatGroq } = require("@langchain/groq");
const { MemoryVectorStore } = require("@langchain/classic/vectorstores/memory");
const { Embeddings } = require("@langchain/core/embeddings");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { PromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence, RunnablePassthrough } = require("@langchain/core/runnables");

// Custom local bag-of-words embedding class to avoid HF API key requirements
class SimpleLocalEmbeddings extends Embeddings {
    constructor() {
        super({});
        this.vocab = [];
    }

    buildVocab(texts) {
        const words = new Set();
        for (const text of texts) {
            const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
            for (const t of tokens) {
                words.add(t);
            }
        }
        this.vocab = Array.from(words);
    }

    async embedDocuments(documents) {
        if (this.vocab.length === 0) {
            this.buildVocab(documents);
        }
        return documents.map((doc) => this.embed(doc));
    }

    async embedQuery(document) {
        return this.embed(document);
    }

    embed(text) {
        const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
        const vector = new Array(Math.max(1, this.vocab.length)).fill(0);
        for (const token of tokens) {
            const idx = this.vocab.indexOf(token);
            if (idx !== -1) {
                vector[idx] += 1;
            }
        }
        return vector;
    }
}

// Initialize your LLM
const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0, // Lower temperature is best for factual QA
});

// Using our custom local embeddings
const embeddings = new SimpleLocalEmbeddings();

async function runRAG() {
    // ==========================================
    // STEP 1: LOAD & SPLIT DOCUMENT
    // ==========================================
    console.log("Loading document...");
    const rawText = `
    Product Profile: Dr. Morepen GlucoOne BG-03
    - Uses: Measures blood glucose levels.
    - Test Time: 5 seconds.
    - Sample Volume: 0.5 microliters.
    - Memory: Stores up to 300 test results.
    - Warning: Do not expose strips to direct sunlight. Store at room temperature (4-30°C).
    - Support Email: support@morepen.com
  `;

    // Split text into small chunks of 200 characters with 50 characters overlap
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 200,
        chunkOverlap: 50,
    });
    const docs = await splitter.createDocuments([rawText]);
    console.log(`split documents into ${docs.length} chunks`);

    // ==========================================
    // STEP 2: CREATE EMBEDDINGS & STORE IN VECTOR STORE
    // ==========================================
    console.log("creating embeddings and vector store");
    // MemoryVectorStore is a pure JS, in-memory vector database
    const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
    const retriever = vectorStore.asRetriever(2); // Get top 2 matching chunks

    // ==========================================
    // STEP 3: CONSTRUCT THE PROMPT TEMPLATE
    // ==========================================
    const prompt = PromptTemplate.fromTemplate(`answer the question based on the following context only. If the answer is not in the context, return 'I don't know'.
    
Context: {context}
Question: {question}
Answer:`);

    // Helper to format retrieved documents into a single block of text
    const formatDocs = (documents) => documents.map((doc) => doc.pageContent).join('\n\n');

    // ==========================================
    // STEP 4: DEFINE THE RETRIEVAL CHAIN
    // ==========================================
    const chain = RunnableSequence.from([
        {
            context: retriever.pipe(formatDocs),
            question: new RunnablePassthrough(),
        },
        prompt,
        model,
        new StringOutputParser(),
    ]);

    // ==========================================
    // STEP 5: RUN THE CHAIN
    // ==========================================
    const question = "How many test results can the GlucoOne BG-03 store in its memory?";
    console.log(`\nUser Question: "${question}"`);

    const response = await chain.invoke(question);
    console.log(`AI Answer: "${response}"`);
}

runRAG().catch(console.error);
