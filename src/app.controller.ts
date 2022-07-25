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

  @Post('pedido-detalle')
    detallePedido(@Body() body, @Res() response: Response){
      let idPedido = body.id
      this.appService.leerDetallePedido(idPedido)
          .subscribe({
              next: value => {
                  let detallePedido:any[] = value.data;
                  let infoAEnviar: DetallePedidoInterface[] = detallePedido.map(
                      (detalleObj) =>{
                          return {
                              "Cod": `${detalleObj.codigo_producto}`,
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
      console.log(body);
      response.status(200).send({valor:false});
  }

}
