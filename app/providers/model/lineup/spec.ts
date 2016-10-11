import {SafeUrl} from '@angular/platform-browser';

import * as Json from "./_info.d";
import {LineupController} from "./lineup";
import {ItemGroup, Item} from "./item";
import {DerivGroup, Deriv} from "./deriv";
import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup.Spec");

export class SpecGroup {
    static async byJSONs(ctrl: LineupController, item: Item, jsons: Json.SpecGroup[], specs: Json.Spec[]): Promise<SpecGroup[]> {

        const allKeys = _.uniq(_.flatMap(jsons, (json) => json.value.availables));
        /*{
            key: string,
            json: Json.Spec,
            global: boolean
        }*/
        const all = await Promise.all(_.map(allKeys, async (key) => {
            try {
                let v = _.find(specs, {key: key});
                let global = false;
                if (_.isNil(v)) {
                    v = await ctrl.loadSpec(key);
                    global = true;
                }
                return {
                    key: key,
                    json: v,
                    global: global
                };
            } catch (ex) {
                logger.warn(() => `Failed to load spec info: ${key}`);
                return null;
            }
        }));

        return _.filter(await Promise.all(_.map(jsons, async (json) => {
            const sg = new SpecGroup(ctrl, item, json.key, json.name, json.side, json.canSame, []);
            const infos = _.filter(_.map(json.value.availables, (a) =>
                _.find(all, {key: a})
            ));
            sg.availables = _.filter(await Promise.all(_.map(infos, (info) =>
                Spec.byJSON(ctrl, sg, info.json, info.global)
            )));
            return _.isEmpty(sg.availables) ? null : sg;
        })));
    }

    private _current: Spec;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private ctrl: LineupController,
            public item: Item,
            private _key: string,
            public name: string,
            public side: Json.SpecSide,
            public canSame: string,
            public availables: Spec[]
    ) { }

    get asJSON() {
        return {
            key: this._key,
            name: this.name,
            side: this.side,
            canSame: this.canSame,
            value: {
                availables: _.map(this.availables, (o) => o.key)
            }
        };
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.specGroupKey(this, async () => {
                this._key = v;
            });
        });
    }

    get current(): Spec {
        if (_.isNil(this._current)) {
            this._current = _.head(this.availables);
        }
        return this._current;
    }

    set current(v: Spec) {
        if (_.find(this.availables, {key: v.key}) && !_.isEqual(this.current.key, v.key)) {
            this._current = v;
            this.item.onChangedSpecCurrent();
        }
    }

    get(key: string) {
        return  _.find(this.availables, {key: key});
    }

    async remove(o: Spec): Promise<void> {
        if (_.size(this.availables) < 2) return;
        await this.ctrl.onRemoving.spec(o, async () => {
            _.remove(this.availables, {key: o.key});
        });
    }

    async createNew(): Promise<Spec> {
        const key = await this.ctrl.createNewKey("new_value", async (key) => this.get(key));
        const one = new Spec(this.ctrl, this, false, key, "新しい仕様の値", "", 100, []);
        this.availables.unshift(one);
        return one;
    }
}

export class Spec {
    static async byJSON(ctrl: LineupController, sg: SpecGroup, json: Json.Spec, isGlobal: boolean): Promise<Spec> {
        const result = new Spec(ctrl, sg, isGlobal, json.key, json.name, json.description, json.price, []);

        result.derivGroups = await DerivGroup.byJSONs(ctrl, result, json.derivGroups);

        return result;
    }

    private _image: CachedImage;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private ctrl: LineupController,
            public specGroup: SpecGroup,
            private _global: boolean,
            private _key: string,
            public name: string,
            public description: string,
            public price: number,
            public derivGroups: DerivGroup[]
    ) { }

    get asJSON() {
        return {
            key: this._key,
            name: this.name,
            description: this.description,
            price: this.price,
            derivGroups: _.map(this.derivGroups, (o) => o.asJSON)
        };
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.specKey(this, async () => {
                this._key = v;
            });
        });
    }

    get isGlobal(): boolean {
        return this._global;
    }

    set isGlobal(v: boolean) {
        this.ctrl.onChanging.specGlobal(this, async () => {
            this._global = v;
        });
    }

    onChangedDerivCurrent() {
        this.specGroup.item.onChangedSpecCurrent();
        this.refreshIllustrations();
    }

    refreshIllustrations() {
        this.refreshImage(true);
    }

    private refreshImage(clear = false): CachedImage {
        if (clear || _.isNil(this._image)) {
            this._image = this.ctrl.illust.specCurrent(this);
        }
        return this._image;
    }

    async changeImage(file: File): Promise<void> {
        await this.ctrl.illust.uploadSpecCurrent(this, file);
        this.refreshImage(true);
    }

    get image(): SafeUrl {
        return this.refreshImage().url;
    }

    get imagePath(): string[] {
        return this.refreshImage().listPath
    }

    getDeriv(key: string): DerivGroup {
        return _.find(this.derivGroups, {key: key});
    }

    async removeDeriv(o: DerivGroup): Promise<void> {
        await this.ctrl.onRemoving.derivGroup(o, async () => {
            _.remove(this.derivGroups, {key: o.key});
        });
    }

    async createDeriv(): Promise<DerivGroup> {
        const key = await this.ctrl.createNewKey("new_deriv", async (key) => this.getDeriv(key));
        const one = new DerivGroup(this.ctrl, this, key, "新しい派生", []);
        await one.createNew();
        this.derivGroups.unshift(one);
        return one;
    }
}
