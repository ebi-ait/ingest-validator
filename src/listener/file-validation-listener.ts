import {RabbitConnectionProperties, RabbitMessagingProperties} from "../common/types";
import IHandler from "./handlers/handler";
import Listener from "./listener";

/**
 * Created by rolando on 01/08/2018.
 */

class FileValidationListener {
    rabbitConnectionProperties: RabbitConnectionProperties;
    rabbitMessagingProperties: RabbitMessagingProperties;
    handler: IHandler;
    listener: Listener;

    constructor(rabbitConnectionProperties: RabbitConnectionProperties, rabbitMessagingProperties: RabbitMessagingProperties, handler: IHandler) {
        this.rabbitConnectionProperties = rabbitConnectionProperties;
        this.rabbitMessagingProperties = rabbitMessagingProperties;
        this.handler = handler;

        this.listener = new Listener(rabbitConnectionProperties, rabbitMessagingProperties);
        this.listener.setHandler(this.handler);
    }

    start(){
        console.log('starting file validation listener...');
        this.listener.start();
        console.log('started file validation listener...');
    }
}

export default FileValidationListener;
