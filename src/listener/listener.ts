/**
 * Created by rolando on 02/08/2018.
 */
import {RabbitConnectionProperties, RabbitMessagingProperties} from "../common/types";
import amqp, {Message} from "amqplib";
import IHandler from "./handlers/handler";
import Promise from "bluebird";
import * as url from "url";
import {RejectMessageException} from "./messging-exceptions";


class Listener {

    rabbitConnectionProperties: RabbitConnectionProperties;
    rabbitMessagingProperties: RabbitMessagingProperties
    rabbitUrl: URL;
    handler?: IHandler;

    constructor(rabbitConnectionProperties: RabbitConnectionProperties, rabbitMessagingProperties: RabbitMessagingProperties) {
        this.rabbitConnectionProperties = rabbitConnectionProperties;
        this.rabbitMessagingProperties = rabbitMessagingProperties;
        this.rabbitUrl = new url.URL(`${rabbitConnectionProperties.scheme}://${rabbitConnectionProperties.host}:${rabbitConnectionProperties.port}`);
    }

    start(){
        console.log(`listening ${this.rabbitConnectionProperties.scheme}://${this.rabbitConnectionProperties.host}:${this.rabbitConnectionProperties.port}`);
        amqp.connect(String(this.rabbitUrl)).then((conn) => {
            return conn.createChannel();
        }).then(ch => {
            ch.assertExchange(this.rabbitMessagingProperties.exchange, this.rabbitMessagingProperties.exchangeType).then(() => {
                ch.assertQueue(this.rabbitMessagingProperties.queueName, {durable: false}).then(() => {
                    ch.bindQueue(this.rabbitMessagingProperties.queueName, this.rabbitMessagingProperties.exchange, this.rabbitMessagingProperties.queueName).then(() => {
                        ch.prefetch(100).then(() => {
                            ch.consume(this.rabbitMessagingProperties.queueName, (msg: Message|null) => {
                                try {
                                    this.handle(msg).then(success => {
                                        if(success) {
                                            ch.ack(msg!);
                                        } else {
                                            console.error(`Failed to process message: ${msg!.content}`);
                                            ch.nack(msg!, false, false);
                                        }
                                    }).catch(RejectMessageException, err => {
                                        console.error(`Logging unretryable error: ${err.stack} \n ..for message: ${msg!.content}`);
                                        ch.nack(msg!, false, false);
                                    }).catch(Error, err => {
                                        console.error(`Logging unexpected error: ${err.stack} \n ..for message: ${msg!.content}`);
                                        ch.ack(msg!);
                                    });
                                } catch (e) {
                                    console.error(`Logging unexpected exception: ${e.stack} \n ..for message: ${msg!.content}`);
                                    ch.ack(msg!)
                                }
                            }, {noAck : false});
                        })
                    })
                })
            })

        }).catch((error) => {
            console.error('Error starting listener:', error.message);
        });
    }

    setHandler(handler: IHandler) {
        this.handler = handler;
    }

    handle(msg: Message | null) : Promise<boolean>{
        return this.handler!.handle(msg!.content.toString());
    }

}

export default Listener;
