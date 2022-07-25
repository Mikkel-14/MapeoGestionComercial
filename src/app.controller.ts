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
                  let detallePedido:any[] = value.data;
                  // let infoAEnviar: DetallePedidoInterface[] = detallePedido.map(
                  //     (detalleObj) =>{
                  //         return {
                  //             "Cod": `${detalleObj.codigo_producto}`,
                  //             "Nombre": `${detalleObj.nombre_producto}`,
                  //             "Precio Unitario": `${detalleObj.precio_producto}`,
                  //             "Cantidad": `${detalleObj.cantidad_producto}`
                  //         }
                  //     }
                  // );
                  const infoAEnviar = this.transformarDetalle(detallePedido);
                  let dummy = [
                      {
                          "Cod": "PAV001",
                          "Nombre": "Pavita",
                          "Precio Unitario": "29.75",
                          "Cantidad": "133"
                      },
                      {
                          "Cod": "PAV002",
                          "Nombre": "Pavita",
                          "Precio Unitario": "32",
                          "Cantidad": "233"
                      }
                  ];
                  response.status(200).send({"tabla": infoAEnviar});
              }
          });
  }

  transformarDetalle(arreglo:any[]){
      let detalleAEnviar:DetallePedidoInterface[] = [];
      arreglo.forEach(
          (elemento) => {
              detalleAEnviar.push({
                  "Cod": `${elemento.codigo_producto}`,
                  "Nombre": `${elemento.nombre_producto}`,
                  "Precio Unitario": `${elemento.precio_producto}`,
                  "Cantidad": `${elemento.cantidad_producto}`
              })
          }
      );
      return detalleAEnviar;
  }
}
