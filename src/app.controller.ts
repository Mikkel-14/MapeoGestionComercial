import {Body, Controller, Get, Param, Post, Res} from '@nestjs/common';
import { AppService } from './app.service';
import {Response} from "express";
import {MailService} from "./mail-service/mail.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
              private readonly mailService: MailService) {}

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

  @Get('pedido/:id')
  leerCabeceraPedido(@Res() response: Response, @Param() params){
        this.appService
            .leerPedido(params.id)
            .subscribe({
                next: value => {
                    response.status(200).send({"fecha": value.data.fecha_entrega});
                }
            });
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
      let detalleProductos = {
          "pavita":0,
          "mediano": 0,
          "grande": 0,
          "extraGrande": 0,
          "extra2Grande": 0,
          "precio_pavita":0,
          "precio_mediano": 0,
          "precio_grande": 0,
          "precio_extraGrande": 0,
          "precio_extra2Grande": 0
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
                      this.appService.generarOrdenEntrega(body.idPedido, body.restarStock == "true", body.fechaEntrega)
                          .subscribe({
                              complete: ()=>{
                                  this.appService.leerPrecioProductos()
                                      .subscribe(
                                          {
                                              next: valores => {
                                                  let infoProductos:any[] = valores.data;
                                                  infoProductos
                                                      .forEach(
                                                          (producto) => {
                                                              let codigoProducto:string = producto.codigo;
                                                              switch (codigoProducto){
                                                                  case "PAV001":
                                                                      detalleProductos.precio_pavita = producto.precio_unitario;
                                                                      break;
                                                                  case "PAV002":
                                                                      detalleProductos.precio_mediano = producto.precio_unitario;
                                                                      break;
                                                                  case "PAV003":
                                                                      detalleProductos.precio_grande = producto.precio_unitario;
                                                                      break;
                                                                  case "PAV004":
                                                                      detalleProductos.precio_extraGrande = producto.precio_unitario;
                                                                      break;
                                                                  case "PAV005":
                                                                      detalleProductos.precio_extra2Grande = producto.precio_unitario;
                                                                      break;
                                                              }
                                                          }
                                                      );
                                                  response.status(200).send({direccionEntrega, ...detalleProductos});
                                              }
                                          }
                                      );

                              }
                          })
                  }
              }
          );
  }

  @Post('factura/:idPedido')
    enviarFactura(@Res() response: Response, @Param() params, @Body() body){
      this.appService.generarFactura(params.idPedido, body.costoDelivery, body.fecha)
          .then(valor =>{
              return this.mailService.enviarFactura(valor["factura"],valor["correoDestinatario"],valor["numeroPedido"])
          })
          .then(
              resultado =>{
                  return this.appService.registrarDetalleServicio(params.idPedido, body.costoDelivery)
              }
          )
          .then(
              resultado => {
                  response.status(200).send();
              }
          )
          .catch(
              (error) => {
                  console.log("Error al enviar el correo", error)
              }
          );
  }

  @Post('resumen-semanal')
    generarReporteDeVentas(@Res() response: Response, @Body() body){
      this.appService.leerObservaciones()
          .subscribe({
              next: value => {
                  let observaciones: ObservacionInterface[] = value.data;
                  this.appService.crearReporteObservaciones(observaciones)
                      .then( reporteGenerado =>{
                          return this.mailService.enviarReporte(reporteGenerado, body.email)
                      })
                      .then(value =>{
                          this.appService.actualizarObservaciones(observaciones)
                              .subscribe({
                                  complete: () => {
                                      response.status(200).send();
                                  }
                              });
                      });
              }
          });
  }

  @Post('reportes')
    generacionReportes(@Res() response: Response, @Body() body){
      console.log(body);
      let metadatosReporte = body as MetadatosReporteInterface;
      console.log(metadatosReporte);
      this.appService.consolidarReporte(metadatosReporte)
          .then(resultado =>{
              response.status(200).send({tabla: resultado});
          });

  }

}
