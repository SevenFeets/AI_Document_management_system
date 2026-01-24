import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'

@Injectable()
export class AIService {
  private llm: ChatOpenAI
  private summarizationChain: RunnableSequence
  private useMockSummary: boolean

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY', '')
    
    // Use mock summary if API key is not configured or is a test value
    this.useMockSummary = !apiKey || 
                          apiKey === 'test-key' || 
                          apiKey === 'sk-your-key-here' ||
                          apiKey.startsWith('test')
    
    if (this.useMockSummary) {
      console.log('Using mock AI summaries (OpenAI API key not configured)')
    } else {
      console.log('Using OpenAI for AI summaries')
      
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.configService.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
        temperature: 0.7,
      })

      const summarizationPrompt = PromptTemplate.fromTemplate(`
        You are an expert document summarizer. Based on the following document content and user query, provide a comprehensive summary.
        
        User Query: {query}
        
        Document Content:
        {content}
        
        Please provide a detailed summary that addresses the user's query. Focus on the most relevant information.
        
        Summary:
      `)

      this.summarizationChain = RunnableSequence.from([
        summarizationPrompt,
        this.llm,
        new StringOutputParser(),
      ])
    }
  }

  async summarizeDocument(content: string, query: string): Promise<string> {
    // Return mock summary if using mock mode
    if (this.useMockSummary) {
      const wordCount = content.split(/\s+/).length
      return `[Mock Query Summary] Query: "${query}" - This document contains approximately ${wordCount} words. (AI summarization is disabled - configure OPENAI_API_KEY to enable real summaries)`
    }

    try {
      // Limit content length to avoid token limits
      const maxLength = 8000
      const truncatedContent =
        content.length > maxLength
          ? content.substring(0, maxLength) + '...'
          : content

      const result = await this.summarizationChain.invoke({
        query,
        content: truncatedContent,
      })

      return result
    } catch (error) {
      console.error('Error in AI summarization:', error)
      throw new Error('Failed to generate summary')
    }
  }

  async generateSummary(content: string): Promise<string> {
    // Return mock summary if using mock mode
    if (this.useMockSummary) {
      const wordCount = content.split(/\s+/).length
      const preview = content.substring(0, 200).trim()
      return `[Mock Summary] This document contains approximately ${wordCount} words. Preview: "${preview}${content.length > 200 ? '...' : ''}" (AI summarization is disabled - configure OPENAI_API_KEY to enable real summaries)`
    }

    try {
      const prompt = PromptTemplate.fromTemplate(`
        Summarize the following document content in a clear and concise manner. 
        Highlight the main points and key information.
        
        Document Content:
        {content}
        
        Summary:
      `)

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser(),
      ])

      const maxLength = 8000
      const truncatedContent =
        content.length > maxLength
          ? content.substring(0, maxLength) + '...'
          : content

      const result = await chain.invoke({ content: truncatedContent })
      return result
    } catch (error) {
      console.error('Error generating summary:', error)
      throw new Error('Failed to generate summary')
    }
  }
}
