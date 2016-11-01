import { Device } from "ionic-native";
import { Injectable } from "@angular/core";

import { S3File } from "../aws/s3file";
import { Logger } from "../util/logging";

const logger = new Logger("Configuration");

@Injectable()
export class Configuration {
    private static unauthorized: Promise<Unauthorized> = null;
    private static authorized: Promise<Authorized> = null;

    constructor(private s3: S3File) { }

    private async loadS3(path: string): Promise<{ [key: string]: any }> {
        logger.info(() => `Loading settings file: ${path}`);
        return JSON.parse(await this.s3.read(path));
    }

    get server(): Promise<Unauthorized> {
        if (_.isNil(Configuration.unauthorized)) {
            const p = this.loadS3("unauthorized/client.json");
            Configuration.unauthorized = p.then((m) => new Unauthorized(m));
        }
        return Configuration.unauthorized;
    }

    get authorized(): Promise<Authorized> {
        if (_.isNil(Configuration.authorized)) {
            const p = this.loadS3("authorized/settings.json");
            Configuration.authorized = p.then((m) => new Authorized(m));
        }
        return Configuration.authorized;
    }
}

export class Unauthorized {
    constructor(private src: { [key: string]: any }) { }

    get appName(): string {
        return this.src["appName"];
    }

    get googleProjectNumber(): string {
        return this.src["googleProjectNumber"];
    }

    get googleBrowserKey(): string {
        return this.src["googleBrowserKey"];
    }

    get snsPlatformArn(): string {
        const s = Device.device.platform === "Android" ? "google" : "apple";
        return this.src["snsPlatformArn"][s];
    }

    get photo(): Photo {
        return new Photo(this.src["photo"]);
    }

    get advertisement(): Advertisement {
        return new Advertisement(this.src["advertisement"]);
    }

    get api(): ServerApiMap {
        return new ServerApiMap(this.src["api"]);
    }
}

export class Photo {
    constructor(private src: { [key: string]: any }) { }

    /**
    in Milliseconds
    */
    get urlTimeout(): number {
        return this.src["urlTimeout"] * 1000;
    }
}

export class Advertisement {
    constructor(private src: { [key: string]: any }) { }

    get admob(): { [key: string]: any } {
        let result = this.src["AdMob"];
        if (!result) result = this.src["AdMod"];
        return result;
    }
}

export class ServerApiMap {
    constructor(private src: { [key: string]: any }) { }

    private makeInfo(name: string): ApiInfo {
        return {
            url: `${this.src["base_url"]}/${this.src["gateways"][name]}`,
            key: this.src["key"],
            retryLimit: this.src["retry_limit"],
            retryDuration: this.src["retry_duration"]
        };
    }

    get paa(): ApiInfo {
        return this.makeInfo("paa");
    }
}

export type ApiInfo = {
    url: string,
    key: string,
    retryLimit: number,
    retryDuration: number // in Milliseconds
}

export class Authorized {
    constructor(private src: { [key: string]: any }) { }

    get facebook(): FBConfig {
        return new FBConfig(this.src["facebook"]);
    }
}

export class FBConfig {
    constructor(private src: { [key: string]: string }) { }

    get hostname(): string {
        return this.src["host"];
    }

    get appName(): string {
        return this.src["appName"];
    }

    get appId(): string {
        return this.src["appId"];
    }

    get imageTimeout(): string {
        return this.src["imageTimeout"];
    }

    get actionName(): string {
        return this.src["actionName"];
    }

    get objectName(): string {
        return this.src["objectName"];
    }
}
