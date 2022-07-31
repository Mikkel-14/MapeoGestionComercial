import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {HttpModule} from "@nestjs/axios";
import { MailService } from './mail-service/mail.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
