import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import {LineupController} from "./lineup";
import {ItemGroup, Item} from "./item";
import {DerivGroup, Deriv} from "./deriv";
import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup.Spec");

type InfoSpec = {
    key: string,
    info: Info.Spec,
    global: boolean
}

export class SpecGroup {
    static async createGroups(ctrl: LineupController, item: Item, infos: Info.SpecGroup[]): Promise<SpecGroup[]> {
        const allKeys = _.uniq(_.flatten(_.map(infos, (info) => info.value.availables)));
        const all = await Promise.all(_.map(allKeys, async (key) => {
            try {
                let v = _.find(item.info.specs, {key: key});
                let global = false;
                if (_.isNil(v)) {
                    v = await ctrl.loadSpec(key);
                    global = true;
                }
                return {
                    key: key,
                    info: v,
                    global: global
                };
            } catch (ex) {
                logger.warn(() => `Failed to load spec info: ${key}`);
                return null;
            }
        }));
        return _.filter(_.map(infos, (info) => {
            const availables = _.filter(_.map(_.uniq(info.value.availables), (a) => _.find(all, {key: a})));
            return _.isEmpty(availables) ? null : new SpecGroup(ctrl, item, info, availables);
        }));
    }

    availables: Spec[];
    private _current: Spec;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private ctrl: LineupController, public item: Item, public info: Info.SpecGroup, specs: InfoSpec[]) {
        this.availables = specs.map((s) => new Spec(ctrl, this, s.info, s.global));
    }

    get key(): string {
        return this.info.key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.specGroupKey(this, async () => {
                this.info.key = v;
            });
        });
    }

    get current(): Spec {
        if (_.isNil(this._current)) {
            this._current = this.get(this.info.value.initial) || _.head(this.availables);
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
            _.remove(this.info.value.availables, {key: o.key});
            if (_.isEqual(this.info.value.initial, o.key)) {
                this.info.value.initial = _.head(this.availables).key;
            }
        });
    }

    async createNew(): Promise<Spec> {
        const key = await this.ctrl.createNewKey("new_value", async (key) => this.get(key));
        const one = new Spec(this.ctrl, this, {
            name: "新しい仕様の値",
            key: key,
            description: "",
            deriveGroups: [],
            price: 100
        }, false);
        this.availables.unshift(one);
        this.item.info.specs.unshift(one.info);
        this.info.value.availables.unshift(one.key);
        return one;
    }
}

export class Spec {
    deriveGroups: DerivGroup[];
    private _image: CachedImage;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private ctrl: LineupController, public specGroup: SpecGroup, public info: Info.Spec, private _global: boolean) {
        this.deriveGroups = _.map(info.deriveGroups, (o) => new DerivGroup(ctrl, this, o));
    }

    onChangedDerivCurrent() {
        this.specGroup.item.onChangedSpecCurrent();
        this.refreshIllustrations();
    }

    refreshIllustrations() {
        this.refreshImage(true);
    }

    get key(): string {
        return this.info.key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.specKey(this, async () => {
                if (_.isEqual(this.specGroup.info.value.initial, this.key)) {
                    this.specGroup.info.value.initial = v;
                }
                const index = _.indexOf(this.specGroup.info.value.availables, this.key);
                if (index) {
                    this.specGroup.info.value.availables.splice(index, 1, v);
                }
                this.info.key = v;
            });
        });
    }

    get global(): boolean {
        return this._global;
    }

    set global(v: boolean) {
        this.ctrl.onChanging.specGlobal(this, async () => {
            this._global = v;
        });
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

    getDeriv(key: string): DerivGroup {
        return _.find(this.deriveGroups, {key: key});
    }

    async removeDeriv(o: DerivGroup): Promise<void> {
        await this.ctrl.onRemoving.derivGroup(o, async () => {
            _.remove(this.deriveGroups, {key: o.key});
            _.remove(this.info.deriveGroups, {key: o.key});
        });
    }

    async createDeriv(): Promise<DerivGroup> {
        const key = await this.ctrl.createNewKey("new_deriv", async (key) => this.getDeriv(key));
        const one = new DerivGroup(this.ctrl, this, {
            name: "新しい派生",
            key: key,
            value: {
                initial: "",
                availables: []
            }
        });
        const initial = await one.createNew();
        one.info.value.initial = initial.key;
        this.deriveGroups.unshift(one);
        this.info.deriveGroups.unshift(one.info);
        return one;
    }
}
