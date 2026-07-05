import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
// import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
// import { ChatOllama } from '@langchain/ollama'
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import type { Runnable } from '@langchain/core/runnables';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private llm!: Runnable;
  private summarizationChain!: RunnableSequence;
  private useMockSummary: boolean;
  private provider: string;

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get('AI_PROVIDER', 'groq').toLowerCase();

    // Initialize based on provider
    this.useMockSummary = false;

    try {
      switch (this.provider) {
        case 'groq':
          this.initializeGroq();
          break;

        case 'openai':
          this.initializeOpenAI();
          break;

        // case 'gemini':
        //   this.initializeGemini()
        //   break

        // case 'ollama':
        //   this.initializeOllama()
        //   break

        default:
          this.logger.warn(
            `Unknown AI provider: ${this.provider}, using mock summaries`,
          );
          this.useMockSummary = true;
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize ${this.provider}: ${error instanceof Error ? error.message : error}`,
      );
      this.logger.warn('Falling back to mock AI summaries');
      this.useMockSummary = true;
    }
  }

  private initializeGroq() {
    const apiKey = this.configService.get('GROQ_API_KEY', '');

    if (!apiKey || apiKey === 'your-groq-api-key-here') {
      this.logger.warn(
        'GROQ_API_KEY missing or placeholder — using mock summaries',
      );
      this.useMockSummary = true;
      return;
    }

    this.logger.log('Using Groq for AI summaries');

    this.llm = new ChatGroq({
      apiKey: apiKey,
      model: this.configService.get('GROQ_MODEL', 'llama-3.3-70b-versatile'),
      temperature: 0.7,
    }) as unknown as Runnable;

    this.initializeSummarizationChain();
  }

  private initializeOpenAI() {
    const apiKey = this.configService.get('OPENAI_API_KEY', '');

    if (!apiKey || apiKey === 'sk-your-key-here') {
      this.logger.warn(
        'OPENAI_API_KEY missing or placeholder — using mock summaries',
      );
      this.useMockSummary = true;
      return;
    }

    this.logger.log('Using OpenAI for AI summaries');

    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: this.configService.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
      temperature: 0.7,
    }) as unknown as Runnable;

    this.initializeSummarizationChain();
  }

  // Requires @langchain/google-genai — enable when dependency is added
  // private initializeGemini() {
  //   const apiKey = this.configService.get('GOOGLE_API_KEY', '')
  //   if (!apiKey || apiKey === 'your-google-api-key-here') {
  //     throw new Error('GOOGLE_API_KEY not configured')
  //   }
  //   this.llm = new ChatGoogleGenerativeAI({ ... })
  //   this.initializeSummarizationChain()
  // }

  // Requires @langchain/ollama — enable when dependency is added
  // private initializeOllama() { ... }

  private initializeSummarizationChain() {
    const summarizationPrompt = PromptTemplate.fromTemplate(`
      You are an expert document summarizer. Based on the following document content and user query, provide a comprehensive summary.
      
      User Query: {query}
      
      Document Content:
      {content}
      
      Please provide a detailed summary that addresses the user's query. Focus on the most relevant information.
      
      Summary:
    `);

    this.summarizationChain = RunnableSequence.from([
      summarizationPrompt,
      this.llm,
      new StringOutputParser(),
    ]);
  }

  async summarizeDocument(content: string, query: string): Promise<string> {
    // Return mock summary if using mock mode
    if (this.useMockSummary) {
      const wordCount = content.split(/\s+/).length;
      return `[Mock Query Summary] Query: "${query}" - This document contains approximately ${wordCount} words. (AI summarization is disabled - configure AI_PROVIDER and API key to enable real summaries)`;
    }

    try {
      // Limit content length to avoid token limits
      const maxLength = 8000;
      const truncatedContent =
        content.length > maxLength
          ? content.substring(0, maxLength) + '...'
          : content;

      const result = await this.summarizationChain.invoke({
        query,
        content: truncatedContent,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Error in AI summarization: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to generate summary');
    }
  }

  async generateSummary(content: string): Promise<string> {
    // Return mock summary if using mock mode
    if (this.useMockSummary) {
      const wordCount = content.split(/\s+/).length;
      const preview = content.substring(0, 200).trim();
      return `[Mock Summary] This document contains approximately ${wordCount} words. Preview: "${preview}${content.length > 200 ? '...' : ''}" (AI summarization is disabled - configure AI_PROVIDER and API key to enable real summaries)`;
    }

    try {
      const prompt = PromptTemplate.fromTemplate(`
        Summarize the following document content in a clear and concise manner. 
        Highlight the main points and key information.
        
        Document Content:
        {content}
        
        Summary:
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const maxLength = 8000;
      const truncatedContent =
        content.length > maxLength
          ? content.substring(0, maxLength) + '...'
          : content;

      const result = await chain.invoke({ content: truncatedContent });
      return result;
    } catch (error) {
      this.logger.error(
        `Error generating summary: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to generate summary');
    }
  }
}
