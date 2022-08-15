import { Injectable } from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {Observable, Subject} from "rxjs";
import * as hb from 'handlebars';
import * as fs from "fs";

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

    leerPedido(idPedido){
        let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/orden_pedido_com?paramName=Id&paramValue=${idPedido}`;
        return this.httpClient
            .get(
                url,
                {headers:{
                        'Content-Type': 'application/json'
                    }}
            );
    }

    leerCliente(idCliente){
        let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/cliente_com?paramName=Id&paramValue=${idCliente}`;
        return this.httpClient
            .get(
                url,
                {headers:{
                        'Content-Type': 'application/json'
                    }}
            );
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

    generarOrdenEntrega(idPedido, debeDescontar:boolean, fechaEntrega){
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
                "estado": "confirmado",
                "fecha_entrega": fechaEntrega
            },
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
                                        let llamadasAComprobar = new Subject();
                                        llamadasAComprobar.subscribe(
                                            {
                                                next: numLlamadas => {
                                                    if (numLlamadas === detallePedido.length){
                                                        llamadasAComprobar.complete();
                                                    }
                                                },
                                                complete: () =>{
                                                    this.actualizacionDeInventarioRecursiva(arregloActualizacionesInventario, controladorDeRegistro);
                                                }
                                            }

                                        );
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
                                                            let peticionActualizacion = this.httpClient.put(
                                                                urlInventarios,
                                                                {
                                                                    "Id": existencias["Id"],
                                                                    "Stock": productoSobrante
                                                                },
                                                                CABECERAS_ACTUALIZACION
                                                            );
                                                            arregloActualizacionesInventario.push(peticionActualizacion);
                                                            llamadasAComprobar.next(indice+1);
                                                        }
                                                    })

                                            }
                                        );
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

    leerPrecioProductos(){
        let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=catalogo_productos_com`;
        return this.httpClient
            .get(
                url,
                {headers: {
                        'Content-Type': 'application/json'
                    }}
            );
    }

    generarFactura(idPedido, costoDelivery,fechaEmision){
        return new Promise((res, rej) =>{
            this.leerPedido(idPedido)
                .subscribe({
                    next: value => {
                        let idCliente = value.data.ruc_cliente;
                        this.leerCliente(idCliente).subscribe({
                            next: value =>{
                                let informacionCliente = value.data;
                                this.leerDetallePedido(idPedido).subscribe({
                                    next: value => {
                                        let informacionPedido:any[] = value.data;
                                        let detallePedido = informacionPedido.map(
                                            (detalle) => {
                                                let total = +detalle["cantidad_producto"] * +detalle["precio_producto"];
                                                return {
                                                    codigo: detalle["codigo_producto"],
                                                    nombre: detalle["nombre_producto"],
                                                    cantidad: detalle["cantidad_producto"],
                                                    precioU: detalle["precio_producto"],
                                                    precioT: total
                                                }
                                            }
                                        );
                                        detallePedido.push({
                                            codigo: "SD0001",
                                            nombre: "Servicio de delivery",
                                            cantidad: 1,
                                            precioU: costoDelivery,
                                            precioT: +costoDelivery
                                        });
                                        let subtotal = detallePedido
                                            .map(
                                                producto => producto.precioT
                                            )
                                            .reduce(
                                                (acc, cur) => {
                                                    return acc + cur
                                                },
                                                0
                                            );
                                        let impuestos = subtotal * 0.12;
                                        let total = subtotal + impuestos;
                                        let contextoFactura = {
                                            nombre_cliente: informacionCliente.nombre_razonSocial,
                                            id_pedido: idPedido,
                                            direccion: informacionCliente.direccion,
                                            fecha: fechaEmision,
                                            ruc_cliente: informacionCliente.ruc,
                                            telefono: informacionCliente.telefono,
                                            tabla: detallePedido,
                                            subtotal,
                                            impuesto: impuestos,
                                            total
                                        };
                                        fs.promises.readFile("./templates/factura.hbs",'utf-8')
                                            .then((valor) => {
                                                let plantilla = hb.compile(valor);
                                                res({
                                                    factura:plantilla(contextoFactura),
                                                    correoDestinatario: informacionCliente.email,
                                                    numeroPedido: idPedido
                                                });
                                            })
                                    }
                                });
                            }
                        });
                    }
                });
        })
    }

    leerObservaciones(){
        let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=observaciones_entrega_com&paramName=estado&paramValue=sin_revisar`;
        return this.httpClient
            .get(
                url,
                {headers:{
                        'Content-Type': 'application/json'
                    }}
            );
    }

    actualizarObservaciones(observaciones:ObservacionInterface[]){
        const CABECERAS_ACTUALIZACION = {headers:{
                'Content-Type': 'application/json',
                'X-Api-Key': this.apiKey,
                'X-Username': 'cesar.leon03@epn.edu.ec'
            }};
        let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/observaciones_entrega_com/update?withInsert=false`;
        let controladorDeRegistro = new Subject();
        let solicitudesActualizacion = observaciones.map(
            obs => {
                return this.httpClient
                    .put(
                        url,
                        {
                            "Id": obs.Id,
                            "estado": "revisado"
                        },
                        CABECERAS_ACTUALIZACION
                    )
            }
        )
        this.actualizacionRecursivaObservaciones(solicitudesActualizacion,controladorDeRegistro);
        return controladorDeRegistro;
    }

    private actualizacionRecursivaObservaciones(actualizaciones:Observable<any>[], controlador:Subject<any>){
        if(actualizaciones.length == 0) {
            controlador.complete();
        }
        else {
            let peticionActualizacion = actualizaciones.pop();
            peticionActualizacion.subscribe({
                next: value=> {
                    this.actualizacionRecursivaObservaciones(actualizaciones, controlador);
                }
            });
        }

    }

    async crearReporteObservaciones(observaciones:ObservacionInterface[]){
        let totalObservacionesRecibidas = observaciones.length;
        let observaciones7 = observaciones.filter(
            observacion => {
                return observacion.calificacion == '7'
            }
        ).length;
        let observaciones6 = observaciones.filter(
            observacion => {
                return observacion.calificacion == '6'
            }
        ).length;
        let observaciones5 = observaciones.filter(
            observacion => {
                return observacion.calificacion == '5'
            }
        ).length;
        let observaciones4 = observaciones.filter(
            observacion => {
                return observacion.calificacion == '4'
            }
        ).length;
        let observaciones3 = observaciones.filter(
            observacion => {
                return observacion.calificacion == '3'
            }
        ).length;
        let observaciones2 = observaciones.filter(
            observacion => {
                return observacion.calificacion == '2'
            }
        ).length;
        let observaciones1 = observaciones.filter(
            observacion => {
                return observacion.calificacion == '1'
            }
        ).length;
        let datosObservaciones = {
            totalObs: totalObservacionesRecibidas,
            p7: 100*observaciones7/totalObservacionesRecibidas,
            p6: 100*observaciones6/totalObservacionesRecibidas,
            p5: 100*observaciones5/totalObservacionesRecibidas,
            p4: 100*observaciones4/totalObservacionesRecibidas,
            p3: 100*observaciones3/totalObservacionesRecibidas,
            p2: 100*observaciones2/totalObservacionesRecibidas,
            p1: 100*observaciones1/totalObservacionesRecibidas,
        }
        let plantilla = await fs.promises.readFile("./templates/reporteObs.hbs",'utf-8')
        let plantillaCompilada = hb.compile(plantilla);
        return plantillaCompilada(datosObservaciones);
    }

    async registrarDetalleServicio(idPedido, costoServicio){
        let url = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/orden_pedido_detalle_servicio_com`;
        return new Promise((res, rej) => {
            let resultadoRegistro$ = this.httpClient.put(
                url,
                {
                    id_pedido: idPedido,
                    nombre_servicio: "Servicio de delivery",
                    precio: costoServicio,
                    //fecha: fecha
                },
                {headers:{
                        'Content-Type': 'application/json',
                        'X-Api-Key': this.apiKey,
                        'X-Username': 'cesar.leon03@epn.edu.ec'
                    }}
            );

            resultadoRegistro$.subscribe({
                next: resultado => {
                    res(resultado);
                }
            });
        })
    }

    async consolidarReporte(infoR:MetadatosReporteInterface){
        let urlBaseDetallePedidos = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=orden_pedido_detalle_com`;
        let urlCabecerasPedido =`https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=orden_pedido_com`;
        let urlBaseDetalleServicio = `https://app.flokzu.com/flokzuopenapi/api/${this.apiKey}/database/list?dbase=orden_pedido_detalle_servicio_com`
        return new Promise((resolve,reject)=>{
            //consulta de las cabeceras del pedido
            let consultaCabeceras$ = this.httpClient.get(
                urlCabecerasPedido,
                {headers:{
                        'Content-Type': 'application/json',
                    }}
            )
            consultaCabeceras$.subscribe({
                next: rawHeaders =>{
                    let datosCabeceras = rawHeaders.data as any[];
                    let cabecerasValidas = datosCabeceras.filter(
                        (elemento) => {
                            return elemento.estado == 'confirmado';
                        }
                    )
                    let identificadoresFactValidos = cabecerasValidas.map(
                        (elemento) => {
                            return elemento.Id;
                        }
                    )
                    let cabecerasFechas = cabecerasValidas.filter(
                        (elemento) => {
                            if(infoR.tieneFecha == 'true') {
                                let fechaInicio = new Date(infoR.fecha_ini);
                                let fechaFin = new Date(infoR.fecha_fin);
                                let fechaCabecera = new Date(elemento.fecha_entrega);
                                console.log("Fecha Cabecera:", fechaCabecera.getTime());
                                console.log("Fecha Fin:", fechaFin.getTime())
                                console.log("Fecha Inicio:", fechaInicio.getTime())
                                return (fechaCabecera.getTime() <= fechaFin.getTime()) && (fechaCabecera.getTime() >= fechaInicio.getTime())
                            }
                            return elemento;
                        }
                    ).map(
                        (elementoFiltrado) => {
                            return elementoFiltrado.Id;
                        }
                    );
                    console.log(cabecerasFechas);
                    let cabeceraPorUsuario = cabecerasValidas.filter(
                        (elemento) => {
                            if(infoR.tieneCliente == 'true'){
                                return  elemento.ruc_cliente == infoR.ruc;
                            }
                            return elemento;
                        }
                    ).map(
                        (elementoFiltrado) =>{
                            return elementoFiltrado.Id;
                        }
                    );
                    if(infoR.tipo == "Servicios"){
                        let consultaBatchServicios$ = this.httpClient.get(
                            urlBaseDetalleServicio,
                            {headers:{
                                    'Content-Type': 'application/json',
                                }}
                        );
                        consultaBatchServicios$.subscribe({
                            next: rawData => {
                                let listaServicios: any[] = rawData.data;
                                let detalleReporte = listaServicios.filter(
                                    (item) => {
                                        return identificadoresFactValidos.includes(item.id_pedido);
                                    }
                                ).filter( //filtro de fechas
                                    (elemento) => {
                                        if(infoR.tieneFecha == 'true'){
                                            //aqui filtramos las cabeceras para luego filtrar la lista
                                            return cabecerasFechas.includes(elemento.id_pedido);
                                        }
                                        return elemento;
                                    }
                                ).filter( // filtrar el usuario
                                    (elemento) => {
                                        if(infoR.tieneCliente == 'true'){
                                            return cabeceraPorUsuario.includes(elemento.id_pedido)
                                        }
                                        return elemento;
                                    }
                                ).map(
                                    (elemento) => {
                                        return {
                                            "Numero Factura": elemento.id_pedido,
                                            "Nombre item": elemento.nombre_servicio,
                                            "Cantidad": 1,
                                            "Precio total": elemento.precio
                                        }
                                    }
                                );
                                resolve(detalleReporte);
                            }
                        });
                    }
                    else
                    {
                        //codigo para productos
                        let consultaBatchDetalle$ = this.httpClient.get(
                            urlBaseDetallePedidos,
                            {headers:{
                                    'Content-Type': 'application/json',
                                }}
                        );
                        consultaBatchDetalle$.subscribe({
                            next: rawData => {
                                let listaProductos = rawData.data as any[];
                                let detalleReporte = listaProductos.filter(
                                    (elementoSinEstdo) => {
                                        return identificadoresFactValidos.includes(elementoSinEstdo.id_pedido)
                                    }
                                ).filter( //filtro de fechas
                                    (elemento) =>{
                                        if(infoR.tieneFecha == 'true'){
                                            //aqui filtramos las cabeceras para luego filtrar la lista
                                            return cabecerasFechas.includes(elemento.id_pedido);
                                        }
                                        return elemento;
                                    }
                                ).filter(
                                    (elemento) => {//filtro de usuarios
                                        if(infoR.tieneCliente == 'true'){
                                            return cabeceraPorUsuario.includes(elemento.id_pedido)
                                        }
                                        return elemento;
                                    }
                                ).filter( //filtro por producto
                                    (elemento) => {
                                        if(infoR.codProd){
                                            return elemento.codigo_producto == infoR.codProd;
                                        }
                                        return elemento
                                    }
                                ).map(
                                    (elementoFiltrado) => {
                                        return {
                                            "Numero Factura": elementoFiltrado.id_pedido,
                                            "Nombre item": elementoFiltrado.nombre_producto,
                                            "Cantidad": elementoFiltrado.cantidad_producto,
                                            "Precio total": +elementoFiltrado.precio_producto * +elementoFiltrado.cantidad_producto
                                        }
                                    }
                                );
                                resolve(detalleReporte);
                            }
                        });
                    }

                }
            });
        });


    }
}


