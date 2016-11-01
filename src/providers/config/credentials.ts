import _ from "lodash";
import {Injectable} from "@angular/core";

import {Cognito} from "../aws/cognito";
import {FBConnect} from "../facebook/fb_connect";
import {Logger} from "../util/logging";

const logger = new Logger("Credentials");

@Injectable()
export class Credentials {
    constructor(private cognito: Cognito, private fb: FBConnect) { }

    private _username: string;

    async join(): Promise<void> {
        await this.cognito.joinFacebook();
        this.update();
    }

    private async update(): Promise<void> {
        const id = await this.cognito.identity;
        if (id.isJoinFacebook) {
            this._username = await this.fb.getName();
            logger.debug(() => `Username: ${this._username}`);
        }
    }

    get username(): string {
        if (_.isNil(this._username)) {
            this._username = "";
            this.update();
        }
        return this._username;
    }
}
