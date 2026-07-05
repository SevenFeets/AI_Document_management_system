import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';

@Module({
  imports: [ConfigModule],
  providers: [AIService],
  exports: [AIService],
})
export class AIServiceModule {}
/*
  this module is responsible for the ai service
  it uses the AIService class to generate a summary of a document
  
  - Registers the AI service as a NestJS module
  - Imports ConfigModule to read environment variables
  - Provides AIService so it can be injected elsewhere
  - Exports AIService so other modules can use it
*/
