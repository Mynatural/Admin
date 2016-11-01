import _ from "lodash";
import { Injectable } from "@angular/core";
import { Http } from "@angular/http";
import Im from "immutable";

import { toPromise } from "../util/promising";
import { Logger } from "../util/logging";

const logger = new Logger("BootSettings");

@Injectable()
export class BootSettings {
    private static src: Promise<Im.Map<string, string>>;

    constructor(private http: Http) { }

    private async load(): Promise<Im.Map<string, string>> {
        logger.debug(() => `Loading settings.json...`);
        const res = await toPromise(this.http.get("settings.json"));
        return Im.Map<string, string>(JSON.parse(res.text()));
    }

    private async get(key: string): Promise<string> {
        if (_.isNil(BootSettings.src)) {
            BootSettings.src = this.load();
        }
        return (await BootSettings.src).get(key);
    }

    get facebookAppId(): Promise<string> {
        return this.get("facebookAppId");
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
