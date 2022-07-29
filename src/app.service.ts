import { Injectable } from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {Observable, Subject} from "rxjs";

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
    let productosARegistrar = datosTabla.map(
        (producto, index)=>{
          let registroBase = {
            "id_pedido": id,
            "nombre_producto": producto.Nombre,
            "codigo_producto": producto["Código"],
            "cantidad_producto": producto.Cantidad,
            "precio_producto": producto["Precio Unitario"]
          };
          return this.httpClient
              .put(
              url,
              registroBase,
              {headers:{
                  'Content-Type': 'application/json',
                  'X-Api-Key': this.apiKey,
                  'X-Username': 'cesar.leon03@epn.edu.ec'
                }}
              )
        }
    );
    let controladorDeRegistro = new Subject();
    this.registroProductoRecursivo(productosARegistrar,controladorDeRegistro);
    return controladorDeRegistro;
  }

  private registroProductoRecursivo(arregloProductos:Observable<any>[], controlador:Subject<any>){
      //caso base
      if(arregloProductos.length == 0){
          return controlador.complete();
      }
      else //caso recursivo
      {
          let detalleProducto = arregloProductos.pop();
          detalleProducto.subscribe(
              {
                  next: resultado =>{
                      controlador.next(resultado.data);
                      this.registroProductoRecursivo(arregloProductos, controlador);
                  }
              }
          );
      }
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
                                      const existencias:number = +datosInventario.filter(
                                          currentVal => {
                                              return currentVal.IdPlanta == 1;
                                          }
                                      )[0]["Stock"];
                                      let cantidadProducto = +ordenProucto.cantidad_producto;
                                      existenSuficientes = existenSuficientes && (cantidadProducto <= existencias);
                                      llamadasAComprobar.next(indice+1);
                                  }
                              })

                      }
                  );

              }
          });

      return resultadoExistencias.asObservable();
  }

  generarOrdenEntrega(idPedido, debeDescontar:boolean){
      const CABECERAS_ACTUALIZACION = {headers:{
              'Content-Type': 'application/json',
              'X-Api-Key': this.apiKey,
              'X-Username': 'cesar.leon03@epn.edu.ec'
          }};
      let urlPedido = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/orden_pedido_com/update?withInsert=false`;
      let urlInventarios = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/Inventario/update?withInsert=false`;
      let urlPedidos = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=Inventario&paramName=IdCatalogoProducto&paramValue=`;
      let controladorDeRegistro = new Subject();
      //actualizamos el pedido a confirmado
      this.httpClient.put(
          urlPedido,
          {"Id": idPedido,
              "estado": "confirmado"},
          CABECERAS_ACTUALIZACION
      )
          .subscribe(
              {
                  next: result => {
                      let arregloActualizacionesInventario = [];
                      if(debeDescontar){
                          this.leerDetallePedido(idPedido)
                              .subscribe({
                                  next: value => {
                                      const detallePedido:any[] = value.data;
                                      detallePedido.forEach(
                                          (ordenProucto, indice) => {
                                              let codigoProducto:string = ordenProucto.codigo_producto;
                                              this.httpClient
                                                  .get(urlPedidos + codigoProducto,
                                                      {headers: {
                                                              'Content-Type': 'application/json'
                                                          }}
                                                  )
                                                  .subscribe({
                                                      next: result =>{
                                                          let datosInventario:any[] = result.data;
                                                          const existencias = datosInventario.filter(
                                                              currentVal => {
                                                                  return currentVal.IdPlanta == 1;
                                                              }
                                                          )[0];
                                                          let cantidadProducto = +ordenProucto.cantidad_producto;
                                                          let productoSobrante = +existencias["Stock"] - cantidadProducto;
                                                          arregloActualizacionesInventario.push(
                                                              this.httpClient.put(
                                                                  urlInventarios,
                                                                  {
                                                                      "Id": existencias["Id"],
                                                                      "Stock": productoSobrante
                                                                  },
                                                                  CABECERAS_ACTUALIZACION
                                                              )
                                                          );
                                                      }
                                                  })

                                          }
                                      );
                                      this.actualizacionDeInventarioRecursiva(arregloActualizacionesInventario, controladorDeRegistro)

                                  }
                              });
                      }
                      else{
                          controladorDeRegistro.complete();
                      }
                  }
              }
          );
        return controladorDeRegistro;
  }

  private actualizacionDeInventarioRecursiva(arregloActualizaciones:Observable<any>[], controlador:Subject<any>){
      if(arregloActualizaciones.length == 0) {
        controlador.complete();
      }
      else
      {
          let peticionActualizacion = arregloActualizaciones.pop();
          peticionActualizacion.subscribe({
              next: value => {
                  this.actualizacionDeInventarioRecursiva(arregloActualizaciones, controlador);
              }
          });
      }
  }
}

