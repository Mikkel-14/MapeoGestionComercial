import { Injectable } from '@nestjs/common';
import {HttpService} from "@nestjs/axios";

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
        (producto)=>{
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
              .subscribe()
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
}

