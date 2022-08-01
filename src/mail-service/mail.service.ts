import { Injectable } from '@nestjs/common';
import * as nm from 'nodemailer'
@Injectable()
export class MailService {
    private readonly transporter = nm.createTransport({
        service: 'hotmail',
        auth: {
            user: "gcomercial-pronaca@outlook.com",
            pass: "skjiQ#dh67Pa^@"
        }
    });

    constructor() {}

    async enviarFactura(factura, correoDestinatario, numeroPedido){
        return await this.transporter.sendMail({
            from: "gcomercial-pronaca@outlook.com",
            to: correoDestinatario,
            html: factura,
            subject: `Factura pedido #${numeroPedido}`
        });
    }

    async enviarReporte(reporte, correo){
        return await this.transporter.sendMail({
            from: "gcomercial-pronaca@outlook.com",
            to: correo,
            html: reporte,
            subject: "Reporte semanal de observaciones de entrega"
        });
    }
}
