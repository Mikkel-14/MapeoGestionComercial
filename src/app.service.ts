import { Injectable } from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {Subject} from "rxjs";

@Injectable()
export class AppService {
  private readonly apiKey: string = "3809ccdc104d405f5387031f81abcf9cadba6f1767fcdff3";
  constructor(private readonly httpClient:HttpService) {
  }
  registrarPedido(datosCliente){
    let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/orden_pedido_com`;
    let registroBase = {
      "nombre_cliente": datosCliente.nombreCliente,
      "ruc_cliente": datosCliente.ruc,
      "ciudad": datosCliente.ciudad,
      "provincia": datosCliente.provincia,
      "direccion": datosCliente.direccion,
      "fecha_entrega": datosCliente.fechaEntrega,
      "estado": "sin_confirmar"
    };
    return this.httpClient.put(url,registroBase,{headers:{
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        'X-Username': 'cesar.leon03@epn.edu.ec'
      }})
  }

  registrarDetallePedido(id, datosTabla:any[]){
    let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/orden_pedido_detalle_com`;
    datosTabla.forEach(
        (producto, index)=>{
          let registroBase = {
            "id_pedido": id,
            "nombre_producto": producto.Nombre,
            "codigo_producto": producto["Código"],
            "cantidad_producto": producto.Cantidad,
            "precio_producto": producto["Precio Unitario"]
          };
          this.httpClient
              .put(
              url,
              registroBase,
              {headers:{
                  'Content-Type': 'application/json',
                  'X-Api-Key': this.apiKey,
                  'X-Username': 'cesar.leon03@epn.edu.ec'
                }}
              )
              .subscribe({
                  next: value => {
                      console.log(`Elemento ${index} del arreglo procesado con exito`, value.data)
                  },
                  error: value => {
                      console.log(`Error en ${index}`);
                  }
              })
        }
    );

  }

  leerDetallePedido(idPedido){
      let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=orden_pedido_detalle_com&paramName=id_pedido&paramValue=${idPedido}`;
      return this.httpClient
          .get(url,
              {headers: {
                      'Content-Type': 'application/json'
                  }}
              );
  }

  verificarExistencias(idPedido){
      let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=Inventario&paramName=IdCatalogoProducto&paramValue=`;
      let resultadoExistencias = new Subject()
      this.leerDetallePedido(idPedido)
          .subscribe({
              next: value => {
                  const detallePedido:any[] = value.data;
                  let existenSuficientes = true;
                  let llamadasAComprobar = new Subject();
                  llamadasAComprobar.subscribe(
                      {
                          next: numLlamadas => {
                              if (numLlamadas === detallePedido.length){
                                  llamadasAComprobar.complete();
                              }
                          },
                          complete: () =>{
                            resultadoExistencias.next(existenSuficientes);
                          }
                      }

                  );
                  detallePedido.forEach(
                      (ordenProucto, indice) => {
                          let codigoProducto:string = ordenProucto.codigo_producto;
                          this.httpClient
                              .get(url + codigoProducto,
                                  {headers: {
                                          'Content-Type': 'application/json'
                                      }}
                              )
                              .subscribe({
                                  next: result =>{
                                      let datosInventario:any[] = result.data;
                                      const existencias:number = datosInventario.reduce(
                                          (accumulator, curentVal) => {
                                              let disponibilidad = +curentVal.Stock
                                              return accumulator + disponibilidad;
                                          },
                                          0
                                      );
                                      let cantidadProducto = ordenProucto.cantidad_producto;
                                      existenSuficientes = existenSuficientes && cantidadProducto <= existencias;
                                      llamadasAComprobar.next(indice+1);
                                  }
                              })

                      }
                  );

              }
          });

      return resultadoExistencias.asObservable();
  }
}

