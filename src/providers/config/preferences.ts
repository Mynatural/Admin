import _ from "lodash";
import { Storage } from "@ionic/storage";
import { Injectable } from "@angular/core";

import { Logger } from "../util/logging";

const logger = new Logger("Preferences");

type PhotoTake = {
    always: boolean,
    count?: number
}

const COUNT_TAKE_THRESHOLD = 5;

@Injectable()
export class Preferences {
    constructor(private storage: Storage) {
        this.photoTake = new KeyValueJson<PhotoTake>(storage, "photo_take", { always: false });
    }

    private photoTake: KeyValueJson<PhotoTake>;

    private socialKey(name: string): string {
        return `social_connections.${name}`;
    }

    async getSocial(name: string): Promise<boolean> {
        return await this.storage.get(this.socialKey(name));
    }
    async setSocial(name: string, v: boolean): Promise<void> {
        await this.storage.set(this.socialKey(name), v);
    }

    async getAlwaysTake(): Promise<boolean> {
        return (await this.photoTake.cache).always;
    }
    async setAlwaysTake(v: boolean): Promise<void> {
        (await this.photoTake.cache).always = v;
        if (!v) (await this.photoTake.cache).count = 0;
        await this.photoTake.save();
    }

    async getCountTake(): Promise<number> {
        return (await this.photoTake.cache).count || 0;
    }
    async incrementCountTake(): Promise<void> {
        const cache = await this.photoTake.cache;
        if (!cache.always) {
            cache.count = (cache.count || 0) + 1;
            logger.debug(() => `Incremented countTake: ${cache.count}`);
            if (COUNT_TAKE_THRESHOLD <= cache.count) {
                cache.always = true;
            }
            await this.photoTake.save();
        }
    }
    async clearCountTake(): Promise<void> {
        (await this.photoTake.cache).count = 0;
        await this.photoTake.save();
    }
}

class KeyValueJson<T> {
    constructor(private storage: Storage, private key: string, defaultValue: T) {
        this._cache = this.load(defaultValue);
    }

    private _cache: Promise<T>;

    get cache(): Promise<T> {
        return this._cache;
    }

    async load(defaultValue?: T): Promise<T> {
        let json: T;
        try {
            json = JSON.parse(await this.storage.get(this.key));
        } catch (ex) {
            logger.warn(() => `Failed to get Local Storage ${this.key}: ${ex}`);
        }
        if (!json && defaultValue) {
            json = defaultValue;
            this.save(json);
        }
        logger.debug(() => `Loaded Local Storage ${this.key}: ${JSON.stringify(json)}`);
        return json;
    }

    async save(v?: T): Promise<void> {
        v = v || await this._cache;
        const json = JSON.stringify(v);
        logger.debug(() => `Saving ${this.key}: ${json}`);
        await this.storage.set(this.key, json);
    }
}
