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

  @Post('scm')
    transformarDireccionyDetalle(@Body() body, @Res() response: Response){
      const direccionEntrega = `${body.direccionEspecifica}, ${body.ciudad}, ${body.provincia}`;
      console.log(body.comprobanteSubido);
      let detalleProductos = {
          "pavita":0,
          "mediano": 0,
          "grande": 0,
          "extraGrande": 0,
          "extra2Grande": 0
      };
      this.appService.leerDetallePedido(body.idPedido)
          .subscribe(
              {
                  next: value =>{
                      const detallePedido:any[] = value.data;
                      detallePedido.forEach(
                          (ordenProducto) => {
                              let cantidadProducto = ordenProducto.cantidad_producto;
                              let codigoProducto:string = ordenProducto.codigo_producto;
                              switch (codigoProducto){
                                  case "PAV001":
                                      detalleProductos.pavita = cantidadProducto;
                                      break;
                                  case "PAV002":
                                      detalleProductos.mediano = cantidadProducto;
                                      break;
                                  case "PAV003":
                                      detalleProductos.grande = cantidadProducto;
                                      break;
                                  case "PAV004":
                                      detalleProductos.extraGrande = cantidadProducto;
                                      break;
                                  case "PAV005":
                                      detalleProductos.extra2Grande = cantidadProducto;
                                      break;
                              }
                          }
                      );
                      this.appService.generarOrdenEntrega(body.idPedido, body.restarStock == "true")
                          .subscribe({
                              complete: ()=>{
                                  response.status(200).send({direccionEntrega, ...detalleProductos});
                              }
                          })
                  }
              }
          );
  }

}
