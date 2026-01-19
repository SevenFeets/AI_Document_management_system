import { Controller, Get, Post, Query, Body } from '@nestjs/common'
import { SearchService } from './search.service'

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('q') query: string) {
    if (!query) {
      return []
    }
    return await this.searchService.search(query)
  }

  @Post('summarize')
  async summarize(
    @Body() body: { documentId: string; query: string },
  ) {
    return await this.searchService.summarizeDocument(
      body.documentId,
      body.query,
    )
  }
}
