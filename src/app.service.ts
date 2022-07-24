import { Injectable } from '@nestjs/common';
import {HttpService} from "@nestjs/axios";

@Injectable()
export class AppService {
  private readonly apiKey: string = "3809ccdc104d405f5387031f81abcf9cadba6f1767fcdff3";
  constructor(private readonly httpClient:HttpService) {
  }
  getHello(): string {
    return 'Hello World!';
  }
}
