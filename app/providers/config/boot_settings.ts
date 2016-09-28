import {Injectable} from "@angular/core";

import {toPromise} from "../../util/promising";
import {Logger} from "../../util/logging";

const logger = new Logger("BootSettings");

@Injectable()
export class BootSettings {
    private async get(key: string): Promise<string> {
        return process.env[key];
    }

    get awsRegion(): Promise<string> {
        return this.get("awsRegion");
    }

    get cognitoPoolId(): Promise<string> {
        return this.get("cognitoPoolId");
    }

    get s3Bucket(): Promise<string> {
        return this.get("s3Bucket");
    }
}
