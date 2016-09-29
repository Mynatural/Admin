import {Injectable} from "@angular/core";

import {Cognito} from "../aws/cognito";
import {FBConnect} from "../facebook/fb_connect";
import {Logger} from "../../util/logging";

const logger = new Logger("Credentials");

@Injectable()
export class Credentials {
    constructor(private cognito: Cognito, private fb: FBConnect) { }

    get username(): Promise<string> {
        return this.cognito.identity.then(async (id) => {
            if (id.isJoinFacebook) {
                return await this.fb.getName();
            }
            return null;
        });
    }
}
