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

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set. AI features will not work.')
    }

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

  async summarizeDocument(content: string, query: string): Promise<string> {
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
