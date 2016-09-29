import {Injectable} from "@angular/core";

import {Cognito} from "../aws/cognito";
import {FBConnect} from "../facebook/fb_connect";
import {Logger} from "../../util/logging";

const logger = new Logger("Credentials");

@Injectable()
export class Credentials {
    constructor(private cognito: Cognito, private fb: FBConnect) { }

    private async checkAuth(): Promise<boolean> {
        const id = await this.cognito.identity;
        if (id.isJoinFacebook) {
            const name = await this.fb.getName();
            logger.debug(() => `Logged in as ${name}`);
        }
        return false;
    }

    get isAuthorized(): Promise<boolean> {
        return this.checkAuth();
    }
}