import {Body, Controller, Get, Post, Res} from '@nestjs/common';
import { AppService } from './app.service';
import {Response} from "express";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('pedido')
  creacionPedido(@Body() body, @Res() response: Response) {
    //primero se crea el pedido
    this.appService.registrarPedido(body)
        .subscribe({
          next: (returnedInfo) =>{
            let registerId = returnedInfo.data.id;
            let detallePedido: any[] = body.tabla;
            this.appService.registrarDetallePedido(registerId,detallePedido);
            response.status(201).send({"idPedido": registerId});
          }
        })

  }

  @Get('pedido')
    detallePedido(@Body() body, @Res() response: Response){
      let idPedido = body.id
      this.appService.leerDetallePedido(idPedido)
          .subscribe({
              next: value => {
                  let dummy = [
                      {
                          "Código": "PAV001",
                          "Nombre": "Pavita",
                          "Precio Unitario": "29.75",
                          "Cantidad": "133"
                      },
                      {
                          "Código": "PAV002",
                          "Nombre": "Pavita",
                          "Precio Unitario": "32",
                          "Cantidad": "233"
                      }
                  ];
                  response.status(200).send({"tabla": dummy});
              }
          });
  }
}
