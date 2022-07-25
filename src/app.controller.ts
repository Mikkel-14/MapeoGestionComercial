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
            this.appService.registrarDetallePedido(registerId,detallePedido)
                .subscribe(
                    {
                        complete: () => {
                            response.status(201).send({"idPedido": registerId});
                        }
                    }
                );
          }
        })

  }

  @Post('pedido-detalle')
    detallePedido(@Body() body, @Res() response: Response){
      let idPedido = body.id
      this.appService.leerDetallePedido(idPedido)
          .subscribe({
              next: value => {
                  let detallePedido:any[] = value.data;
                  let infoAEnviar = detallePedido.map(
                      (detalleObj) =>{
                          return {
                              "Código": `${detalleObj.codigo_producto}`,
                              "Nombre": `${detalleObj.nombre_producto}`,
                              "Precio Unitario": `${detalleObj.precio_producto}`,
                              "Cantidad": `${detalleObj.cantidad_producto}`
                          }
                      }
                  );
                  response.status(200).send({"tabla": infoAEnviar});
              }
          });
  }

  @Post('existencias')
    verificarExistencias(@Body() body, @Res() response: Response){
      const idPedido = body.id;
      this.appService.verificarExistencias(idPedido)
          .subscribe(
              {
                  next: resultado => {
                      response.status(200).send({valor:resultado});
                  }
              }
          );
  }

}
